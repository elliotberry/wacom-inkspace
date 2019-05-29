"use strict";

const {DiffSync, Shadow, BackupShadow, EditList} = require('./diff-sync');

const diffPatchProvider = require('./diff-patch-provider');
const sequenceUtil = require('./sequence-util');

class DiffSyncDoc {
    /**
     * @param {DiffSync} diffSync
     */
    constructor(diffSync) {
        Object.defineProperties(this, {
            diffSync: { value: diffSync },
            main: {
                get: ()      => diffSync.document,
                set: (value) => diffSync.document = value
            },
            localVersion: {
                get: () => diffSync.shadowLocalVersion
            },
            remoteVersion: {
                get: () => diffSync.shadowRemoteVersion
            },
            pendingEdits: {
                get: () => diffSync.getEdits()
            },
            nodesCount: {
                get: () => diffSync.document.length
            }
        })
    }

    diff() {
        this.diffSync.diff();
    }

    /**
     * @param {EditList} edits
     */
    patch(edits) {
        this.diffSync.patch(edits);
    }

    /**
     * @param {EditList} edits
     */
    patchAndReturnChanges(edits) {
        return this.diffSync.patchAndReturnChanges(edits);
    }

    removeDuplications() {
        this.diffSync.removeDuplications();
    }

    getShadowAsEdits() {
        return this.diffSync.getShadowAsEdits();
    }

    /**
     * @param {EditList} edits
     */
    setShadowAsEdits(edits) {
        return this.diffSync.setShadow(edits);
    }

    rollbackToBackupShadow() {
        this.diffSync.rollbackToBackupShadow();
    }

    shadowSameAsMain() {
        return sequenceUtil.compare(this.diffSync.document, this.diffSync.shadow);
    }

    backupSameAsShadow() {
        return sequenceUtil.compare(this.diffSync.shadow, this.diffSync.backupShadow);
    }

    removeAllNodes() {
        this.diffSync.document = [];
    }

    /**
     * @param {Node} node
     */
    appendNode(node) {
        this.diffSync.document.push(node);
    }

    /**
     * @param {Node} node
     * @param {Number} atIndex
     */
    insertNode(node, atIndex) {
        this.diffSync.document.splice(atIndex, 0, node);
    }

    /**
     * @param {Number} atIndex
     */
    removeNodeAtIndex(atIndex) {
        this.diffSync.document.splice(atIndex, 1);
    }

    /**
     * @param {Number} atIndex
     * @returns {Node}
     */
    nodeAtIndex(atIndex) {
        return this.diffSync.document[atIndex];
    }

    /**
     * @param {Node[]} main
     * @param {Node[]} shadow
     * @param {Node[]} backupShadow
     */
    static create(main, shadow, backupShadow) {
        return new DiffSyncDoc(new DiffSync(diffPatchProvider, sequenceUtil, main, new Shadow(shadow, 0, 0), new BackupShadow(backupShadow, 0), new EditList(0, [])));
    }

    static createEmpty() {
        return DiffSyncDoc.create([], [], []);
    }
}

module.exports = DiffSyncDoc;