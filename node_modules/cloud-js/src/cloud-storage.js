const { Payload, Node } = require('./node');
const CloudStorageBase = require('./cloud-storage-base');

const mateRoot = Payload.createUnique(Buffer.from('__mate__'));
const bambooPaper = Payload.createUnique(Buffer.from('__bamboopaper__'));
const globalsRoot = Payload.createUnique(Buffer.from('__globals__'));
const tagNodePayload = Payload.createUnique(Buffer.from('__tags__'));

const reservedPayloads = {
  get mate() {
    return mateRoot;
  },

  get globals() {
    return globalsRoot;
  },

  get bambooPaper() {
    return bambooPaper;
  }
};

class CloudStorage extends CloudStorageBase {

  constructor(db, webSocketURL, bambooPaperSupport = false) {

    const roots = [reservedPayloads.mate, reservedPayloads.globals];

    if (bambooPaperSupport) {
        roots.push(reservedPayloads.bambooPaper);
    }

    super(db, webSocketURL, roots);
  }

  async getTags() {
    const sequence = await this.getSequence(reservedPayloads.globals);
    const node = sequence[sequence.findIndex(elem => elem.payload.equals(tagNodePayload))];

    return node ? node.tags : new Set();
  }

  async setTags(tags) {
    const sequence = await this.getSequence(reservedPayloads.globals);

    const nodeIndex = sequence.findIndex(elem => elem.payload.equals(tagNodePayload)),
      node = sequence[nodeIndex];

    const newNode = new Node(tagNodePayload, new Set(tags), node ? node.attrs : undefined);

    if (nodeIndex !== -1) {
      sequence[nodeIndex] = newNode;
    } else {
      sequence.push(newNode);
    }

    await this.setSequence(reservedPayloads.globals, sequence);
  }
}

module.exports = {
  reservedPayloads,
  CloudStorage
};