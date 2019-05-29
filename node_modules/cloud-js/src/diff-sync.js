"use strict";

class FuturePatchReceivedError extends Error {

}

class VersionedEdit {
    /**
     * @param {Number} docLocalVersion
     * @param {Number} docChecksum
     * @param {Array} nodeEdits
     */
    constructor(docLocalVersion, docChecksum, nodeEdits) {
        this.docLocalVersion = docLocalVersion;
        this.docChecksum = docChecksum;
        this.nodeEdits = nodeEdits;
    }
}

class EditList {
    /**
     * @param {Number} docRemoteVersion
     * @param {VersionedEdit[]} edits
     */
    constructor(docRemoteVersion, edits) {
        this.docRemoteVersion = docRemoteVersion;
        this.edits = edits;

        Object.defineProperty(this, "length", { get: () => this.edits.length });
    }
}

class Shadow {
    /**
     * @param {Array} sequence
     * @param {Number} localVersion
     * @param {Number} remoteVersion
     */
    constructor(sequence, localVersion, remoteVersion) {
        this.sequence = sequence;
        this.localVersion = localVersion;
        this.remoteVersion = remoteVersion;
    }
}

class BackupShadow {
    constructor(sequence, localVersion) {
        this.sequence = sequence;
        this.localVersion = localVersion;
    }
}

class DiffSync {
    /**
     * @param diffPatchProvider
     * @param sequenceUtil
     * @param document
     * @param {Shadow} shadow
     * @param {BackupShadow} backupShadow
     * @param {EditList} pendingEdits
     */
    constructor(diffPatchProvider, sequenceUtil, document, shadow, backupShadow, pendingEdits) {
        this.diffPatchProvider = diffPatchProvider;
        this.sequenceUtil = sequenceUtil;
        this.document = document;
        this.shadow = shadow.sequence;
        this.shadowLocalVersion = shadow.localVersion;
        this.shadowRemoteVersion = shadow.remoteVersion;
        this.backupShadow = backupShadow.sequence;
        this.backupShadowLocalVersion = backupShadow.localVersion;
        this.pendingEdits = pendingEdits;
    }

    getEdits() {
        this.pendingEdits.docRemoteVersion = this.shadowRemoteVersion;
        return this.pendingEdits;
    }

    getState() {
        return {
            shadow: new Shadow(this.shadow, this.shadowLocalVersion, this.shadowRemoteVersion),
            backupShadow: new BackupShadow(this.backupShadow, this.backupShadowLocalVersion),
            pendingEdits: this.getEdits()
        }
    }

    getShadowAsEdits() {
        let diff = this.diffPatchProvider.diff([], this.shadow);

        return new EditList(
            this.shadowRemoteVersion,
            [new VersionedEdit(this.shadowLocalVersion, 0/* checksum */, diff)]
        )
    }

    /**
     * @param {EditList} edits
     */
    setShadow(edits) {
        this.shadow = [];

        edits.edits.forEach(edit => {
            this.shadow = this.diffPatchProvider.patch(this.shadow, edit.nodeEdits);
            this.shadowRemoteVersion = edit.docLocalVersion;
            this.shadowLocalVersion = edits.docRemoteVersion;
        });

        this.backupShadow = this.sequenceUtil.clone(this.shadow);
        this.backupShadowLocalVersion = this.shadowLocalVersion
    }

    diff() {
        let diff = this.diffPatchProvider.diff(this.shadow, this.document);

        let vEdit = new VersionedEdit(this.shadowLocalVersion, 0/* checksum */, diff);

        this.shadow = this.sequenceUtil.clone(this.document);
        this.shadowLocalVersion += 1;

        this.pendingEdits.edits.push(vEdit);
    }

    /**
     * @param {VersionedEdit} edit
     */
    doPatch(edit) {

        if (edit.docChecksum != 0 /* checksum */) {
            throw new Error("Version matched but checksums did not! Should be impossible!")
        } else {
            //Shadow
            this.shadow = this.diffPatchProvider.patch(this.shadow, edit.nodeEdits);
            this.shadowRemoteVersion = edit.docLocalVersion + 1;

            //Doc
            this.document = this.diffPatchProvider.patch(this.document, edit.nodeEdits);
        }
    }

    /**
     * @param {VersionedEdit[]} edits
     */
    patchStage2(edits) {
        edits.forEach(edit => {
            if (this.shadowRemoteVersion == edit.docLocalVersion) {
                this.doPatch(edit)
            } else if (this.shadowRemoteVersion > edit.docLocalVersion) {
                //TODO: Remove
                console.log("Ignoring older version???");
            } else if (this.shadowRemoteVersion < edit.docLocalVersion) {
                throw new FuturePatchReceivedError();
            }
        });

        this.backupShadow = this.sequenceUtil.clone(this.shadow);
        this.backupShadowLocalVersion = this.shadowLocalVersion;
    }

    /**
     * @param {EditList} edits
     */
    patch(edits) {
        if (edits.docRemoteVersion != this.shadowLocalVersion && edits.docRemoteVersion == this.backupShadowLocalVersion) {
            this.rollbackToBackupShadow();

            //TODO: Remove
            console.log("Rollback backup shadow. You are probably diffing on the client without waiting for server acknowledgement. (Packet loss is unlikely)!")
        }

        if (edits.docRemoteVersion == this.shadowLocalVersion) {
            this.patchStage2(edits.edits)
        } else {
            //TODO: Remove
            console.log("Receiving patch for older version. You are probably diffing on the client without waiting for server acknowledgement!")
        }

        //Update outgoing updates
        while (this.pendingEdits.edits.length && edits.docRemoteVersion > this.pendingEdits.edits[0].docLocalVersion) {
            this.pendingEdits.edits = this.pendingEdits.edits.slice(1);
        }
    }

    /**
     * @param {EditList} edits
     */
    patchAndReturnChanges(edits) {

        let oldDocument = this.sequenceUtil.clone(this.document);

        this.patch(edits);

        return this.diffPatchProvider.diff(oldDocument, this.document);

    }

    rollbackToBackupShadow() {
        this.shadow = this.sequenceUtil.clone(this.backupShadow);
        this.shadowLocalVersion = this.backupShadowLocalVersion;
        this.pendingEdits.edits = [];
    }

    removeDuplications() {
        this.document = this.sequenceUtil.removeDuplicates(this.document);
    }
}

module.exports = {
    DiffSync,
    VersionedEdit,
    EditList,
    Shadow,
    BackupShadow,
    FuturePatchReceivedError
};