"use strict";

const {Node} = require('./node');
const {AttrEdit, AttrEditType, TagEdit, TagEditType, NodeEdit} = require('./node-edit');

const SetUtil = {
    /**
     * @param {Set} a
     * @param {Set} b
     * @returns {Set}
     */
    union(a, b) {
        return new Set([...a, ...b])
    },

    /**
     * @param {Set} a
     * @param {Set} b
     * @returns {Set}
     */
    diff(a, b) {
        return new Set([...a].filter(x => !b.has(x)));
    },

    /**
     * @param {Set} a
     * @param {Set} b
     * @returns {Set}
     */
    intersect(a, b) {
        return new Set([...a].filter(x => b.has(x)))
    }
};

module.exports = {
    /**
     * @param {Node} node1
     * @param {Node} node2
     */
    diff(node1, node2) {

        let tagEdits = [
            ...[...SetUtil.diff(node1.tags, node2.tags)].map(tag => new TagEdit(TagEditType.DELETE, tag)),
            ...[...SetUtil.diff(node2.tags, node1.tags)].map(tag => new TagEdit(TagEditType.ADD, tag))
        ];

        let node1AttrKeys = new Set([...node1.attrs.keys()]),
            node2AttrKeys = new Set([...node2.attrs.keys()]);

        let attrEdits = [
            ...[...SetUtil.intersect(node1AttrKeys, node2AttrKeys)]
                .filter(key => node1.attrs.get(key) != node2.attrs.get(key))
                .map(key => new AttrEdit(AttrEditType.ADD, key, node2.attrs.get(key))),
            ...[...SetUtil.diff(node1AttrKeys, node2AttrKeys)].map(key => new AttrEdit(AttrEditType.DELETE, key)),
            ...[...SetUtil.diff(node2AttrKeys, node1AttrKeys)].map(key => new AttrEdit(AttrEditType.ADD, key, node2.attrs.get(key)))
        ];

        return { tagEdits, attrEdits }
    },

    /**
     * @param {Node} node
     * @param {NodeEdit} nodeEdit
     */
    patch(node, nodeEdit) {

        let tags = new Set(node.tags),
            attrs = new Map(node.attrs);

        nodeEdit.tagEdits.forEach(tagEdit => {
            if (tagEdit.isAdd()) {
                tags.add(tagEdit.tag)
            } else if (tagEdit.isDelete()) {
                tags.delete(tagEdit.tag)
            }
        });

        nodeEdit.attrEdits.forEach(attrEdit => {
            if (attrEdit.isAdd()) {
                attrs.set(attrEdit.key, attrEdit.value)
            } else if (attrEdit.isDelete()) {
                attrs.delete(attrEdit.key)
            }
        });

        return new Node(nodeEdit.payload, tags, attrs);
    }
};