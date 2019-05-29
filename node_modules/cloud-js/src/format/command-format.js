"use strict";

const protobuf = require("protobufjs");

const format = protobuf.Root.fromJSON(require('./../../protobuf/command_format.json'));

module.exports = {
    SyncCommand: format.lookup('wacom.cloud.command.format.SyncCommand'),
    SyncFailed: format.lookup('wacom.cloud.command.format.SyncFailed'),
    SequenceUpdated: format.lookup('wacom.cloud.command.format.SequenceUpdated'),
    MessageEnvelope: format.lookup('wacom.cloud.command.format.MessageEnvelope'),
};