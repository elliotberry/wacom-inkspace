"use strict";

const crypto = require('crypto');
const uuid = require('uuid');
const uuidToBuffer = require('uuid/lib/bytesToUuid');

const diffSyncFormat = require('./format/diff-sync-format');

const PayloadType = {
    SEQUENCE: diffSyncFormat.Payload.nested.Type.values['SEQUENCE'],
    STROKE:   diffSyncFormat.Payload.nested.Type.values['STROKE']
};

let payloadInitializable = false;

class Payload {
    /**
     * @param {Number} type
     * @param {Buffer} content
     * @param {Buffer} encodedData
     */
    constructor(type, content, encodedData) {

        if (!payloadInitializable) {
            throw new Error("Do not call this constructor directly.");
        }

        payloadInitializable = false;

        if (type != PayloadType.SEQUENCE && type != PayloadType.STROKE) {
            throw new Error("'type' is invalid");
        }

        if (!(content instanceof Buffer)) {
            throw new Error("'content' must be Buffer");
        }

        if (encodedData && !(encodedData instanceof Buffer)) {
            throw new Error("'encodedData' must be Buffer");
        }

        this.type = type;
        this.content = content;
        this.encodedData = encodedData;

        this.encodedDataHash = crypto.createHash('sha256').update(this.encodedData).digest('hex');

        Object.freeze(this);
    }

    isUnique() {
        return this.type != PayloadType.STROKE;
    }

    /**
     * @param {Payload} payload
     */
    equals(payload) {
        return payload.encodedDataHash === this.encodedDataHash
    }

    toString() {
        if (this.isUnique()) {
            return `Payload(${uuidToBuffer(this.content)})`;
        }

        return `Payload(${this.content.toString('base64')})`;
    }

    static empty() {
        return null;
    }

    /**
     * @param {Buffer} [content]
     * @returns {Payload}
     */
    static createUnique(content) {
        payloadInitializable = true;
        const type = PayloadType.SEQUENCE;
        content = content ? content : Buffer.from(uuid.v4('binary'));
        return new Payload(type, content, diffSyncFormat.Payload.encode(diffSyncFormat.Payload.create({ type, content })).finish());
    }

    /**
     * @param {Buffer} content
     * @returns {Payload}
     */
    static create(content) {
        payloadInitializable = true;
        const type = PayloadType.STROKE;
        return new Payload(type, content, diffSyncFormat.Payload.encode(diffSyncFormat.Payload.create({ type, content })).finish());
    }

    /**
     * @param {Buffer} encodedData
     */
    static createFromEncodedData(encodedData) {
        payloadInitializable = true;
        const {type, content} = diffSyncFormat.Payload.decode(encodedData);
        return new Payload(type, content, encodedData);
    }
}

/**
 * @property {Set} tags
 */
class Node {
    /**
     * @param {Payload} payload
     * @param {Set} [tags]
     * @param {Map} [attrs]
     */
    constructor(payload, tags, attrs) {

        if (payload && !(payload instanceof Payload)) {
            throw new Error("'payload' must be instance of Payload")
        }

        if (tags && !(tags instanceof Set)) {
            throw new Error("'tags' must be instance of Set")
        }

        if (attrs && !(attrs instanceof Map)) {
            throw new Error("'attrs' must be instance of Map")
        }

        Object.defineProperties(this, {
            payload: { enumerable: true, value: payload },
            tags:    { enumerable: true, value: tags ? tags : new Set() },
            attrs:   { enumerable: true, value: attrs ? attrs : new Map() }
        });
    }

    /**
     * @param {Node} node
     * @returns {Boolean}
     */
    samePayload(node) {
        return node.payload.equals(this.payload);
    }

    /**
     * @param {Node} node
     * @returns {Boolean}
     */
    equals(node) {
        return this.samePayload(node) &&
            this.tags.size == node.tags.size && [...this.tags].every(tag => node.tags.has(tag)) &&
            this.attrs.size == node.attrs.size && [...this.attrs].every(kv => node.attrs.has(kv[0]) && node.attrs.get(kv[0]) == kv[1]);
    }

    isLeaf() {
        return !this.payload.isUnique();
    }

    static empty() {
        return new Node(Payload.empty(), new Set(), new Map());
    }

    /**
     * @param {Node} n1
     * @param {Node} n2
     */
    static comparator(n1, n2) {
        return n1.samePayload(n2)
    }

    clone() {
        return new Node(this.payload, new Set(this.tags), new Map(this.attrs));
    }
}

module.exports = {
    Payload,
    PayloadType,
    Node
};