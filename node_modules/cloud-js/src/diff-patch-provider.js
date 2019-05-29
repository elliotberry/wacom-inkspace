"use strict";

const {Diff, SesEditType} = require('./diff');
const {Node} = require('./node');
const NodeDiffPatch = require('./node-diff-patch');
const {NodeEdit} = require('./node-edit');

/**
 * @param {Payload} payload
 * @param {Node[]} sequence
 * @param {Number} supposedIndex
 */
function locateElement(payload, sequence, supposedIndex) {
    if (sequence.length > supposedIndex && sequence[supposedIndex] && sequence[supposedIndex].payload.equals(payload)) {
        return supposedIndex;
    } else {
        return sequence.findIndex(node => node.payload.equals(payload))
    }
}


module.exports = {
    /**
     * @param {Node[]} sequenceA
     * @param {Node[]} sequenceB
     */
    diff(sequenceA, sequenceB) {
        const diffTool = new Diff(sequenceA, sequenceB, Node.comparator);
        diffTool.compose();

        return diffTool.ses.map(sesElem => {
            const {elem, elemInfo} = sesElem;

            if (elemInfo.editType == SesEditType.DELETE) {
                return new NodeEdit(
                    elemInfo.beforeIdx,
                    elemInfo.afterIdx,
                    SesEditType.DELETE,
                    elem.payload
                );
            }

            if (elemInfo.editType == SesEditType.ADD) {
                let nodeDiff = NodeDiffPatch.diff(Node.empty(), sequenceB[elemInfo.afterIdx - 1])
                return new NodeEdit(
                    elemInfo.beforeIdx,
                    elemInfo.afterIdx,
                    SesEditType.ADD,
                    elem.payload,
                    nodeDiff.tagEdits,
                    nodeDiff.attrEdits
                );
            }

            if (elemInfo.editType == SesEditType.COMMON) {
                let nodeDiff = NodeDiffPatch.diff(sequenceA[elemInfo.beforeIdx - 1], sequenceB[elemInfo.afterIdx - 1])
                if (nodeDiff.attrEdits.length || nodeDiff.tagEdits.length) {
                    return new NodeEdit(
                        elemInfo.beforeIdx,
                        elemInfo.afterIdx,
                        SesEditType.COMMON,
                        elem.payload,
                        nodeDiff.tagEdits,
                        nodeDiff.attrEdits
                    );
                }
            }
        }).filter(e => !!e);
    },

    /**
     * @param {Node[]} input
     * @param {NodeEdit[]} nodeEdits
     */
    patch(input, nodeEdits) {
        let offset = 0,
            correction = 0,
            output = input.slice();

        for (let nodeEdit of nodeEdits) {

            if (nodeEdit.isAdd()) {
                let supposedIndex = nodeEdit.afterIdx + correction - 1;

                output.splice(supposedIndex, 0, NodeDiffPatch.patch(Node.empty(), nodeEdit));
                offset += 1
            }

            if (nodeEdit.isDelete()) {
                let supposedIndex = nodeEdit.beforeIdx + offset + correction - 1;
                let actualIndex = locateElement(nodeEdit.payload, output, supposedIndex);

                if (actualIndex != -1) {
                    output.splice(actualIndex, 1);
                    offset -= 1;
                    correction = correction + actualIndex - supposedIndex
                }
            }

            if (nodeEdit.isCommon()) {
                let supposedIndex = nodeEdit.afterIdx + correction - 1;
                let actualIndex = locateElement(nodeEdit.payload, output, supposedIndex);

                if (actualIndex != -1) {
                    output[actualIndex] = NodeDiffPatch.patch(output[actualIndex], nodeEdit);
                    correction = correction + actualIndex - supposedIndex;
                }
            }
        }

        return output;
    }
};