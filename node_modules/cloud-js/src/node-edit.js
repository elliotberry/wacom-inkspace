"use strict";

const {SesEditType} = require('./diff');
const diffSyncFormat = require('./format/diff-sync-format');

/**
 * @readonly
 * @enum {Number}
*/
const AttrEditType = {
    DELETE: diffSyncFormat.AttrEdit.nested.Type.values['ATTR_DELETE'],
    ADD:    diffSyncFormat.AttrEdit.nested.Type.values['ATTR_ADD']
};

class AttrEdit {
    /**
     * @param {Number} editType
     * @param {String} key
     * @param {String} [value]
     */
    constructor(editType, key, value) {
        this.editType = editType;
        this.key = key;
        this.value = value;
    }

    isAdd() {
        return this.editType == AttrEditType.ADD;
    }

    isDelete() {
        return this.editType == AttrEditType.DELETE;
    }
}

/**
 * @readonly
 * @enum {Number}
 */
const TagEditType = {
    DELETE: diffSyncFormat.TagEdit.nested.Type.values['TAG_DELETE'],
    ADD:    diffSyncFormat.TagEdit.nested.Type.values['TAG_ADD']
};

class TagEdit {
    /**
     * @param {Number} editType
     * @param {String} tag
     */
    constructor(editType, tag) {
        this.editType = editType;
        this.tag = tag;
    }

    isAdd() {
        return this.editType == TagEditType.ADD;
    }

    isDelete() {
        return this.editType == TagEditType.DELETE;
    }
}

class NodeEdit {
    /**
     * @param {Number} beforeIdx
     * @param {Number} afterIdx
     * @param {Number} sesType
     * @param {Payload} payload
     * @param {TagEdit[]} [tagEdits]
     * @param {AttrEdit[]} [attrEdits]
     */
    constructor(beforeIdx, afterIdx, sesType, payload, tagEdits, attrEdits) {
        this.beforeIdx = beforeIdx;
        this.afterIdx = afterIdx;
        this.sesType = sesType;
        this.payload = payload;
        this.tagEdits = tagEdits ? tagEdits : [];
        this.attrEdits = attrEdits ? attrEdits : [];
    }

    isDelete() {
        return this.sesType == SesEditType.DELETE;
    }

    isCommon() {
        return this.sesType == SesEditType.COMMON;
    }

    isAdd() {
        return this.sesType == SesEditType.ADD;
    }
}

module.exports = {
    AttrEdit,
    AttrEditType,
    TagEdit,
    TagEditType,
    NodeEdit
};