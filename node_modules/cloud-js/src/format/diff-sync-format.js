"use strict";

const protobuf = require("protobufjs");

const format = protobuf.Root.fromJSON(require('./../../protobuf/diffsync_format.json'));

module.exports = {
    Payload:          format.lookup('wacom.cloud.diffsync.format.Payload'),
    PayloadSequence:  format.lookup('wacom.cloud.diffsync.format.PayloadSequence'),
    KeyValuePair:     format.lookup('wacom.cloud.diffsync.format.KeyValuePair'),
    Node:             format.lookup('wacom.cloud.diffsync.format.Node'),
    SequenceEditList: format.lookup('wacom.cloud.diffsync.format.SequenceEditList'),
    SequenceEdit:     format.lookup('wacom.cloud.diffsync.format.SequenceEdit'),
    NodeEdit:         format.lookup('wacom.cloud.diffsync.format.NodeEdit'),
    AttrEdit:         format.lookup('wacom.cloud.diffsync.format.AttrEdit'),
    TagEdit:          format.lookup('wacom.cloud.diffsync.format.TagEdit'),
    Document:         format.lookup('wacom.cloud.diffsync.format.Document')
};