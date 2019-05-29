"use strict";

const EventEmitter = require("events");

const { SesEditType } = require("./diff");
const CloudDB = require("./cloud-db");
const CloudTransport = require("./cloud-transport");
const DiffSyncDoc = require('./diff-sync-doc');
const { SyncCommand, SyncFailedCommand, SequenceUpdated, SyncFailedReason } = require("./command");

const RETRY_INTERVAL = 10000;

class CloudStorageBase {
  /**
   * @param {LevelDB} db local storage
   * @param {string} webSocketURL web socket server location
   * @param {Payload[]} roots
   */
  constructor(db, webSocketURL, roots) {
    this.roots = Array.isArray(roots) ? roots.slice() : [roots];

    Object.defineProperty(this.roots, "includesPayload", {
      value: function(payload) {
        return this.findIndex(elem => elem.equals(payload)) !== -1
      }
    });

    this.payloadToRetrySyncTime = {};
    this.operationQueue = Promise.resolve();
    this.emitter = new EventEmitter();
    this.localStore = new CloudDB(db, this.roots);
    this.service = new CloudTransport(webSocketURL);

    this.service.on("CloudTransportOpen", () => {
      this.emitter.emit("CloudOpen");
      this.sync();
    });

    this.service.on("CloudTransportData", (e) => this.receive(e.command));

    this.service.on("CloudTransportClosed", () => {
      let unsynced = this.localStore.getUnsynchronized();

      if (unsynced.length > 0) {
        this.syncFailed(unsynced[0]);
      }

      this.emitter.emit("CloudClosed");
    });

    Object.defineProperty(this, "proxy", {
      get: () => this.service.proxy,
      set: proxy => this.service.proxy = proxy
    });

    Object.defineProperty(this, "accessToken", {
      get: () => this.service.accessToken,
      set: () => {
        throw new Error('Use the setAccessToken method.')
      }
    });
  }

  setAccessToken(value) {
    if (!value) {
      this.service.close();
      this.service.accessToken = undefined;
      return this.queue(() => this.localStore.clean())
        .then(() => this.emitter.emit("DBCleanFinished"))
    }

    return this.localStore.getUUID()
      .then(uuid => {
        this.service.accessToken = value;
        this.service.clientInstanceID = uuid;
      })
  }

  queue(func) {
    this.operationQueue = this.operationQueue.then(() => func());
    return this.operationQueue;
  }

  setDebugMode(debug) {
    this.debug = debug;
    this.localStore.debug = debug;
  }

  /**
   * @param {Payload} payload
   * @returns {Promise.<Node>}
   */
  async getNode(payload) {
    const parent = await this.localStore.getParent(payload);

    if (parent) {
      const sequence = await this.getSequence(parent);
      return sequence.find(node => node.payload.equals(payload));
    }
  }

  /**
   * @param {Payload} parent
   * @return {Promise<Array<Node>>} sequence
   */
  getSequence(parent) {
    return this.queue(async () => {
      let doc = await this.localStore.get(parent);
      return doc ? doc.main: [];
    });
  }

  /**
   * @param {Payload} parent
   * @param {Array<Node>} sequence
   * @return {Promise}
   */
  setSequence(parent, sequence) {
    return this.queue(async () => {
      let doc = await this.localStore.get(parent, true);
      doc.main = sequence;
      return await this.localStore.set(parent, doc);
    });
  }

  /**
   * Used to force a synchronization of this sequence.
   * Will get and set the sequence without modification. If the sequence for this key does not exits, will create it.
   *
   * @param {Payload|Payload[]} keys
   * @return {Promise}
   */
  touch(keys) {
    return this.queue(() => this.localStore.markForSync(Array.isArray(keys) ? keys : [keys]));
  }

  async sync() {
    await this.touch(this.roots);
    this.syncImpl();
  }

  syncImpl() {

    if (!this.service.isOpen()) {
      this.service.open();
      return;
    }

    this.queue(async () => {
      let now = Date.now();
      let changed = await this.localStore.getChanged();
      let docs = await this.localStore.getDocuments(changed);

      docs.forEach(doc => {
        if (doc) {
          doc.diff();
        }
      });

      await this.localStore.setDocuments(changed, docs);

      let unsynced = await this.localStore.getUnsynchronized();
      let unsyncedLeafs = [];

      const maxPendingUpdates = 20;

      for (let index = 0; index < unsynced.length && unsyncedLeafs.length < maxPendingUpdates; index++) {
        if (!(await this.localStore.getData(unsynced[index].encodedData))) {
          unsyncedLeafs.push(unsynced[index]);
        }
      }

      if (unsyncedLeafs.length < maxPendingUpdates) {
        unsyncedLeafs = await this.filterLeafs(unsynced);
      }

      if (unsynced.length > 0) {
        let pendingCount = 0;

        for (let index = 0; index < unsyncedLeafs.length && pendingCount < maxPendingUpdates; index++) {
          let key = unsyncedLeafs[index];
          let nextSync = this.payloadToRetrySyncTime[key.encodedDataHash];

          if (!nextSync || now >= nextSync) {
            let doc = await this.localStore.get(key);

            let exists = !!doc;
            doc = doc ? doc : DiffSyncDoc.createEmpty();

            if (this.service.send(key, doc.pendingEdits, !exists ? doc.getShadowAsEdits() : undefined)) {
              this.payloadToRetrySyncTime[key.encodedDataHash] = now + RETRY_INTERVAL;
              pendingCount += 1;
            }
          } else {
            pendingCount++;
          }
        }
      } else {
        this.emitter.emit("CloudSyncFinished", { successful: true });
      }
    });
  }

  /**
   * @param {Payload} key
   */
  syncFailed(key) {
    this.payloadToRetrySyncTime[key.encodedDataHash] = Date.now() + RETRY_INTERVAL;
    this.emitter.emit("CloudSyncFinished", { successful: false });
  }

  /**
   * @param {(SyncCommand | SyncFailedCommand | SequenceUpdated)} command
   */
  async receive(command) {
    let key = command.parent;

    if (this.debug)
      console.log(`receive: key='${key}' edits=${command.edits} shadowEdits=${command.shadowEdits}`);

    if (command instanceof SyncCommand) {

      let changes = await this.queue(async () => {

        let doc = await this.localStore.get(key, true);

        this.emitter.emit("CloudSyncSequenceBegin", {parent: key, update: command.edits.length > 0});

        if (this.debug) {
          console.log(`receive(nodes count before): ${doc.nodesCount}`);
        }

        let changes = doc.patchAndReturnChanges(command.edits);

        if (this.debug) {
          console.log(`receive(nodes count after): ${doc.nodesCount}`);
        }

        await this.localStore.set(key, doc);

        return changes;
      });

      try {
        let payloads = changes
          .filter(nodeEdit => nodeEdit.payload.isUnique() && (nodeEdit.sesType == SesEditType.ADD || nodeEdit.sesType == SesEditType.COMMON))
          .map(nodeEdit => nodeEdit.payload);

        await this.touch(payloads);
        delete this.payloadToRetrySyncTime[key];

        this.emitter.emit("CloudSyncSequenceFinished", {parent: key, changes: changes});
        this.syncImpl();
      } catch (err) {
        this.syncFailed(key);
        console.error("receive(SyncCommand):", err);
      }

    } else if (command instanceof SyncFailedCommand) {

      if (this.debug) {
        console.log(`syncFailed key='${key}' reason=${command.reason}`);
      }

      if (command.reason == SyncFailedReason.SHADOW_NOT_FOUND) {
        this.queue(async () => {

          try {
            let doc = await this.localStore.get(key, true);
            let shadowEdits;

            if (!doc) {
              doc = DiffSyncDoc.createEmpty();
              shadowEdits = doc.getShadowAsEdits();
            } else {
              doc.rollbackToBackupShadow();
              shadowEdits = doc.getShadowAsEdits();
              doc.diff();

              await this.localStore.set(key, doc);
            }

            if (this.debug) {
              console.log(`syncFailed.shadowNotFound doc=${doc.nodesCount} localVer=${doc.localVersion} remoteVer=${doc.remoteVersion}`);
            }

            if (this.service.send(key, doc.pendingEdits, shadowEdits)) {
              this.payloadToRetrySyncTime[key.encodedDataHash] = Date.now() + RETRY_INTERVAL;
            }
          } catch(err) {
            console.error("receive(SyncFailedCommand):", err);
          }
        })
      } else {
        this.syncFailed(key);
      }
    }
    else if (command instanceof SequenceUpdated) {
      console.log(`CloudStorage.cloudTransportDidReceive sequenceUpdated key='${command.parent.encodedData.toString()}'`);
    }
  }

  async filterLeafs(payloads) {
    let result = payloads.slice();

    let removeParent = async (current) => {
      let parent = await this.localStore.getParent(current);

      if (parent && !parent.equals(current)) {

        let index = result.findIndex((element) => element.equals(parent))

        if (index !== -1) {
          result.splice(index, 1);
        }

        if (!this.roots.includesPayload(parent)) {
          return removeParent(parent);
        }
      }
    };

    await Promise.all(payloads.map(payload => removeParent(payload)));

    return result;
  }

  // Events: CloudOpen, CloudClosed, CloudSyncSequenceBegin, CloudSyncSequenceFinished, CloudSyncFinished, DBCleanFinished
  on(event, fn) {
    this.emitter.on(event, fn);
  }
}

module.exports = CloudStorageBase;
