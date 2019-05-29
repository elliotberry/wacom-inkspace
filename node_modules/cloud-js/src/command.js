"use strict";

const commandFormat = require('./format/command-format');

class SyncCommand {
    /**
     * @param {Payload} parent
     * @param {EditList} edits
     * @param {EditList} [shadowEdits]
     */
    constructor(parent, edits, shadowEdits) {
        this.parent = parent;
        this.edits = edits;
        this.shadowEdits = shadowEdits;
    }
}

const SyncFailedReason = {
    PARENT_NOT_FOUND: commandFormat.SyncFailed.nested.Reason.values.PARENT_NOT_FOUND,
    SHADOW_NOT_FOUND: commandFormat.SyncFailed.nested.Reason.values.SHADOW_NOT_FOUND,
    SERVER_ERROR:     commandFormat.SyncFailed.nested.Reason.values.SERVER_ERROR,
    SERVER_TIMEOUT:   commandFormat.SyncFailed.nested.Reason.values.SERVER_TIMEOUT
};

class SyncFailedCommand {
    /**
     * @param {Payload} parent
     * @param {Number} reason
     */
    constructor(parent, reason) {
        this.parent = parent;
        this.reason = reason;
    }
}

class SequenceUpdated {
    /**
     * @param {Payload} parent
     */
    constructor(parent) {
        this.parent = parent;
    }
}

module.exports = {
    SyncCommand,
    SyncFailedReason,
    SyncFailedCommand,
    SequenceUpdated
};