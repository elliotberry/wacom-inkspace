"use strict";

module.exports = {

    /**
     * @param {Node[]} sequence
     */
    removeDuplicates(sequence) {
        let seen = {};

        return sequence.filter(node => {
            if (!seen[node.payload.encodedDataHash]) {
                seen[node.payload.encodedDataHash] = true;
                return true;
            } else {
                return false;
            }
        })
    },

    compare(sequenceA, sequenceB) {
        return sequenceA.length == sequenceB.length && sequenceA.every((value, key) => sequenceB[key].equals(value));
    },

    clone(sequenceA) {
        return sequenceA.map(node => node.clone());
    }
};