"use strict";

const SesEditType = {
    DELETE: -1,
    COMMON: 0,
    ADD: 1
};

function SesElem(elem, elemInfo) {
  this.elem = elem;
  this.elemInfo = elemInfo;
}

function SesElemInfo(beforeIdx, afterIdx, editType) {
  this.beforeIdx = beforeIdx;
  this.afterIdx = afterIdx;
  this.editType = editType;
}

function Point(x, y, k) {
  this.x = x;
  this.y = y;
  this.k = k;
}

class Diff {

    constructor(sequenceA, sequenceB, comparator) {
        this.path = [];
        this.pathCoordinates = [];

        this.swapped = sequenceA.length >= sequenceB.length;

        if (this.swapped) {
            this.sequenceA = sequenceB;
            this.sequenceB = sequenceA;
        } else {
            this.sequenceA = sequenceA;
            this.sequenceB = sequenceB;
        }

        this.comparator = comparator;

        this.m = this.sequenceA.length;
        this.n = this.sequenceB.length;

        this.delta = this.n - this.m;
        this.offset = this.m + 1;
        this.fp = [];

        /** @type {SesElem[]} */
        this.ses = [];
    }

    addToSes(elem, beforeIdx, afterIdx, editType) {
        this.ses.push(new SesElem(elem, new SesElemInfo(beforeIdx, afterIdx, editType)));
    }

    compose() {

        let p = -1;
        this.fp = new Array(this.m + this.n + 3);
        this.fp.fill(-1);
        this.path = new Array(this.m + this.n + 3);
        this.path.fill(-1);

        do {
            p = p + 1;

            for (let k = -p; k < this.delta; k++) {
                this.fp[k + this.offset] = this.snake(k, this.fp[k - 1 + this.offset] + 1, this.fp[k + 1 + this.offset]);
            }

            for (let k = this.delta + p; k >= this.delta + 1; k--) {
                this.fp[k + this.offset] = this.snake(k, this.fp[k - 1 + this.offset] + 1, this.fp[k + 1 + this.offset]);
            }

            this.fp[this.delta + this.offset] = this.snake(this.delta, this.fp[this.delta - 1 + this.offset] + 1, this.fp[this.delta + 1 + this.offset])

        } while (this.fp[this.delta + this.offset] != this.n);

        let r = this.path[this.delta + this.offset];

        let epc = [];

        while (r != -1) {
            epc.push(new Point(this.pathCoordinates[r].x, this.pathCoordinates[r].y));
            r = this.pathCoordinates[r].k
        }

        this.recordSequence(epc)
    }

    recordSequence(v) {
        let x = 0, y = 0;

        for (let i = v.length - 1; i >= 0; i--) {
            while (x < v[i].x || y < v[i].y) {
                if (v[i].y - v[i].x > y - x) {
                    if (!this.swapped) {
                        this.addToSes(this.sequenceB[y], 0, y + 1, SesEditType.ADD);
                    } else {
                        this.addToSes(this.sequenceB[y], y + 1, 0, SesEditType.DELETE);
                    }

                    y += 1;
                } else if (v[i].y - v[i].x < y - x) {
                    if (!this.swapped) {
                        this.addToSes(this.sequenceA[x], x + 1, 0, SesEditType.DELETE);
                    } else {
                        this.addToSes(this.sequenceA[x], 0, x + 1, SesEditType.ADD);
                    }

                    x += 1;
                } else {
                    if (!this.swapped) {
                        this.addToSes(this.sequenceA[x], x + 1, y + 1, SesEditType.COMMON);
                    } else {
                        this.addToSes(this.sequenceB[y], y + 1, x + 1, SesEditType.COMMON);
                    }

                    x += 1;
                    y += 1;
                }
            }
        }
    }

    snake(k, above, below) {

        let r = 0;

        if (above > below) {
            r = this.path[k - 1 + this.offset];
        } else {
            r = this.path[k + 1 + this.offset];
        }

        let y = Math.max(above, below);
        let x = y - k;

        while (x < this.m && y < this.n && this.comparator(this.sequenceA[x], this.sequenceB[y])) {
            x = x + 1;
            y = y + 1;
        }

        this.path[k + this.offset] = this.pathCoordinates.length;
        this.pathCoordinates.push(new Point(x, y, r));

        return y
    }

    printSES() {
        this.sesToStringList().forEach(e => console.log(e))
    }

    sesToStringList() {
        return this.ses.map(sesElem => {

            switch (sesElem.elemInfo.editType) {
                case SesEditType.ADD:
                    return "+" + sesElem.elem;
                case SesEditType.COMMON:
                    return " " + sesElem.elem;
                case SesEditType.DELETE:
                    return "-" + sesElem.elem;
            }
        })
    }
}

module.exports = {
    Diff,
    SesEditType
};