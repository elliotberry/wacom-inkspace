"use strict";

const {Payload, Node} = require('./node');
const {NodeEdit, AttrEdit, TagEdit} = require('./node-edit');
const DiffSyncDoc = require('./diff-sync-doc');
const {DiffSync, VersionedEdit, Shadow, BackupShadow, EditList} = require('./diff-sync');
const {SyncCommand, SyncFailedCommand, SequenceUpdated} = require('./command');
const sequenceUtil = require('./sequence-util');
const diffPatchProvider = require('./diff-patch-provider');

const diffSyncFormat = require('./format/diff-sync-format');
const commandFormat = require('./format/command-format');

const protobuf = require("protobufjs");
// Encode

/**
 * @param {Payload} payload
 */
function fillPayloadMessage(payload) {
    return diffSyncFormat.Payload.create({ type: payload['type'], content: payload['content'] });
}

/**
 * @param {Payload[]} payloads
 */
function fillPayloadSequenceMessage(payloads) {
    return diffSyncFormat.PayloadSequence.create({
        seq: payloads.map(payload => fillPayloadMessage(payload))
    });
}

/**
 * @param {Node} node
 */
function fillNodeMessage(node) {
    return diffSyncFormat.Node.create({
        payload: fillPayloadMessage(node.payload),
        tags: [...node.tags],
        attribs: [...node.attrs].map(kv => {
            let [key, value] = kv;
            return diffSyncFormat.KeyValuePair.create({ key, value })
        })
    })
}

/**
 * @param {EditList} editList
 * @returns {*}
 */
function fillSequenceEditListMessage(editList) {
    return diffSyncFormat.SequenceEditList.create({
        docRemoteVersion: editList.docRemoteVersion,
        sequenceEdits: editList.edits.map(edit => diffSyncFormat.SequenceEditList.create({
            docLocalVersion: edit.docLocalVersion,
            docChecksum: edit.docChecksum,
            nodeEdits: edit.nodeEdits.map(nodeEdit => diffSyncFormat.NodeEdit.create({
                beforeIndex: nodeEdit.beforeIdx,
                afterIndex: nodeEdit.afterIdx,
                type: nodeEdit.sesType,
                payload: nodeEdit.payload,
                tagEdits: nodeEdit.tagEdits.map(tagEdit => diffSyncFormat.TagEdit.create({ type: tagEdit.editType, tag: tagEdit.tag })),
                attrEdits: nodeEdit.attrEdits.map(attrEdit => diffSyncFormat.AttrEdit.create({ key: attrEdit.key, value: attrEdit.value, type: attrEdit.editType }))
            }))
        }))
    });
}

/**
 * @param {DiffSyncDoc} diffSyncDoc
 */
function fillDocMessage(diffSyncDoc) {
    let diffSync = diffSyncDoc.diffSync;

    return diffSyncFormat.Document.create({
        main:                     diffSync.document.map(fillNodeMessage),
        shadow:                   diffSync.shadow.map(fillNodeMessage),
        shadowLocalVersion:       diffSync.shadowLocalVersion,
        shadowRemoteVersion:      diffSync.shadowRemoteVersion,
        backupShadow:             diffSync.backupShadow.map(fillNodeMessage),
        backupShadowLocalVersion: diffSync.backupShadowLocalVersion,
        pendingEdits:             fillSequenceEditListMessage(diffSync.pendingEdits),
        shadowSameAsMain:         diffSyncDoc.shadowSameAsMain(),
        backupSameAsShadow:       diffSyncDoc.backupSameAsShadow()
    });
}

/**
 * @param {CloudCommand} cloudCommand
 */
function fillCloudCommandMessage(cloudCommand) {

    let params = {};

    if (cloudCommand instanceof SyncCommand) {
        params.syncCommand = commandFormat.SyncCommand.create({
            parent: fillPayload(cloudCommand.parent),
            edits: fillSequenceEditListMessage(cloudCommand.edits)
        });

        if (cloudCommand.shadowEdits) {
            params.syncCommand.shadowEdits = fillSequenceEditListMessage(cloudCommand.shadowEdits);
        }
    } else if (cloudCommand instanceof SyncFailedCommand) {
        params.syncFailed = commandFormat.SyncFailed.create({
            parent: fillPayload(cloudCommand.parent),
            reason: cloudCommand.reason
        })
    } else if (cloudCommand instanceof SequenceUpdated) {
        params.sequenceUpdated = commandFormat.SequenceUpdated.create({
            parent: fillPayload(cloudCommand.parent)
        })
    } else {
        throw new Error('unrecognized cloud command');
    }

    return commandFormat.MessageEnvelope.create(params)
}

function writePayload(payload) {
    return diffSyncFormat.Payload.encode(fillPayloadMessage(payload)).finish();
}

function writeNode(node) {
    return diffSyncFormat.Node.encode(fillNodeMessage(node)).finish();
}

/**
 * @param {DiffSyncDoc} diffSyncDoc
 * @returns {Buffer}
 */
function writeDoc(diffSyncDoc) {
    return diffSyncFormat.Document.encode(fillDocMessage(diffSyncDoc)).finish();
}

/**
 * @param {Payload[]} payloads
 * @returns {Buffer}
 */
function writePayloadSequence(payloads) {
    return diffSyncFormat.PayloadSequence.encode(fillPayloadSequenceMessage(payloads)).finish();
}

/**
 * @param {CloudCommand} cloudCommand
 * @returns {Buffer}
 */
function writeCloudCommand(cloudCommand) {
    const writer = protobuf.Writer.create();
    let messageBuffer = commandFormat.MessageEnvelope.encode(fillCloudCommandMessage(cloudCommand)).finish();
    return Buffer.concat([writer.int32(messageBuffer.length).finish(), messageBuffer]);
}

// Decode

function longToInt(long) {
    return parseInt(long.toString());
}

function fillPayload(payloadMessage) {
    return Payload.createFromEncodedData(diffSyncFormat.Payload.encode(payloadMessage).finish());
}

function fillPayloadSequence(payloadMessages) {
    return payloadMessages.seq.map(fillPayload);
}

function fillNode(nodeMessage) {
    return new Node(
        fillPayload(nodeMessage.payload),
        new Set(nodeMessage.tags),
        new Map([...nodeMessage.attribs.map(kvPair => [kvPair.key, kvPair.value])])
    );
}

function fillEditList(editListMessage) {
    return new EditList(
        longToInt(editListMessage.docRemoteVersion),
        editListMessage.sequenceEdits.map(sequenceEditMessage => new VersionedEdit(
            longToInt(sequenceEditMessage.docLocalVersion),
            longToInt(sequenceEditMessage.docChecksum),
            sequenceEditMessage.nodeEdits.map(nodeEditMessage => new NodeEdit(
                nodeEditMessage.beforeIndex,
                nodeEditMessage.afterIndex,
                nodeEditMessage.type << 1 >> 1,
                fillPayload(nodeEditMessage.payload),
                nodeEditMessage.tagEdits.map(tagEditMessage => new TagEdit(tagEditMessage.type << 1 >> 1, tagEditMessage.tag)),
                nodeEditMessage.attrEdits.map(attrEditMessage => new AttrEdit(attrEditMessage.type  << 1 >> 1, attrEditMessage.key, attrEditMessage.value))
            ))
        ))
    );
}

function fillDoc(docMessage) {
    return new DiffSyncDoc(new DiffSync(
        diffPatchProvider,
        sequenceUtil,
        docMessage.main.map(fillNode),
        new Shadow(
            docMessage.shadow.map(fillNode),
            longToInt(docMessage.shadowLocalVersion),
            longToInt(docMessage.shadowRemoteVersion)
        ),
        new BackupShadow(
            docMessage.backupShadow.map(fillNode),
            longToInt(docMessage.backupShadowLocalVersion)
        ),
        fillEditList(docMessage.pendingEdits)
    ));
}

function fillCloudCommand(cloudCommandMessage) {

    if (cloudCommandMessage.syncCommand) {
        let cmd = cloudCommandMessage.syncCommand;

        return new SyncCommand(
            fillPayload(cloudCommandMessage.syncCommand.parent),
            fillEditList(cmd.edits),
            cmd.shadowEdits ? fillEditList(cmd.shadowEdits) : undefined
        );
    } else if (cloudCommandMessage.syncFailed) {
        let cmd = cloudCommandMessage.syncFailed;
        return new SyncFailedCommand(fillPayload(cmd.parent), cmd.reason);
    } else if (cloudCommandMessage.sequenceUpdated) {
        let cmd = cloudCommandMessage.sequenceUpdated;
        return new SequenceUpdated(fillPayload(cmd.parent));
    }

    return null;
}

function readPayload(buffer) {
    return fillPayload(diffSyncFormat.Payload.decode(buffer));
}

function readNode(buffer) {
    return fillNode(diffSyncFormat.Node.decode(buffer));
}

/**
 * @param {Buffer} buffer
 */
function readDoc(buffer) {
    return fillDoc(diffSyncFormat.Document.decode(buffer));
}

/**
 * @param {Buffer} buffer
 */
function readPayloadSequence(buffer) {
    return fillPayloadSequence(diffSyncFormat.PayloadSequence.decode(buffer));
}

/**
 * @param {Buffer} buffer
 */
function readCloudCommand(buffer) {
    var reader = protobuf.Reader.create(buffer);
    reader.int32();
    return fillCloudCommand(commandFormat.MessageEnvelope.decode(buffer.slice(reader.pos)));
}

module.exports = {
    readPayload,
    writePayload,

    readNode,
    writeNode,

    readPayloadSequence,
    writePayloadSequence,

    readDoc,
    writeDoc,

    readCloudCommand,
    writeCloudCommand
};