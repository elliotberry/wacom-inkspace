const fs = require("fs");
const threads = require("threads");

const {CloudStorage, Node, Payload, EncoderDecoder, reservedPayloads} = require("cloud-js");
global.Node = Node;
global.Payload = Payload;

const {CloudNote, CloudLayer, CloudEntity} = require("./CloudNote");
const CloudUtils = require("./CloudUtils");

const DBWrapper = require("./DBWrapper");
const DataMigration = require("./DataMigration");

const PromiseQueue = require("./PromiseQueue");
const fsUtils = require("./FSUtils");
const utils = require("./utils");

const ThreadBridge = require("./ThreadBridge");
const {common : consoleBridge} = require("./ConsoleBridge");

const syncConfig = require("../project.config.js")["sync"];

let storeComm;
let cloudStorage;
let syncing = false;
let exporting = false;
let firstComplete = false;
let cloudQueue = new PromiseQueue();

let syncTime = 0;
let missingPagesNotes = [];
let missingLayersNotes = [];

function sync(state, complete) {
	if (syncing == state)
		return;

	if (state)
		syncTime = Date.now();
	else {
		if (Date.now() - syncTime > 1000)
			console.info("===================== SYNC + RASTERIZATION (" + (Date.now() - syncTime) + " ms) =====================");

		if (missingPagesNotes.length) {
			console.info("===================== NOTES WITH NO PAGES (" + missingPagesNotes.length + ") =====================");
			console.info(missingPagesNotes.join(", "));

			missingPagesNotes = [];
		}

		if (missingLayersNotes.length) {
			console.info("===================== NOTES WITH NO LAYERS (" + missingLayersNotes.length + ") =====================");
			console.info(missingLayersNotes.join(", "));

			missingLayersNotes = [];
		}
	}

	if (!firstComplete && complete) {
		firstComplete = true;
		storeComm.send({action: "CLOUD_FIRST_SYNC_COMPLETED"});
	}

	syncing = state;
	storeComm.send({action: "CLOUD_SYNCING", body: syncing});
}

class DBManager {
	static get entities() {
		return {
			SETTINGS: "settings",
			PROFILE: "profile",
			DEVICE: "device",
			NOTES: "notes",
			QUEUE: "queue"
		};
	}

	constructor(root) {
		this.root = root;
		this.db = new DBWrapper(root);

		this.dbQueue = new PromiseQueue();
		this.notesQueue = new PromiseQueue();

		consoleBridge.init();

		this.glWorker = new ThreadBridge(global.ROOT + "/scripts/workers/GLWorker.js");
		this.glWorker.init({root: this.root}, consoleBridge);

		// TODO: fix && remove
		Module.InkDecoder.getStrokeBrush = (paint) => {
			return {};
		};
	}

	async openDB() {
		await this.db.open();
		await this.initCloudStorage();
	}

	async closeDB() {
		await this.db.close();
	}

	async get(entity) {
// console.info("get", entity)
		return await this.dbQueue.then(() => this.db.get(entity));
	}

	async set(entity, value) {
// console.info("set", entity, !!value)
		await this.dbQueue.then(() => this.db.set(entity, value));
// console.info("set completed")
	}

	async edit(entity, data, callback) {
// console.info("edit", entity, JSON.stringify(data))
		await this.dbQueue.then(async () => {
			let entry = await this.db.get(entity);
			if (!entry) entry = {};

			for (let name in data) {
				if (data[name] == "REMOVE")
					delete entry[name];
				else
					entry[name] = data[name];
			}

			await this.db.set(entity, entry);
		});
	}

	async remove(entity) {
// console.info("remove", entity)
		await this.dbQueue.then(() => this.db.remove(entity));
	}

	getNotes(ids, serializeOutput, cloud) {
		if (!ids) ids = [];

		return this.notesQueue.process(() => {
			return cloudStorage.getSequence(cloudStorage.root)
				.then(documents => {
					if (ids.length)
						return documents.filter(doc => ids.indexOf(CloudUtils.bufferToUuid(doc.payload.content)) != -1);
					else
						return documents;
				})
				.then(documents => {
					return Promise.all(documents.map(document => {
						return cloudStorage.getSequence(document.payload).then(pages => {
							let noteID = CloudUtils.bufferToUuid(document.payload.content);

							if (pages.length) {
								let stream = document.attrs.get("stream");

								if (!stream || stream == "mate")
									return CloudNote.fromCloudNodes(document, pages[0]);
								else {
									// if (cloud)
									// 	console.info(noteID, "stream -", stream);

									return null;
								}
							}
							else {
								if (cloud)
									missingPagesNotes.push(noteID);
								else if (debug)
									console.warn(new Error(`[CLOUD] note with no pages detected: ${noteID}`));

								return null;
							}
						});
					}))
				})
				.then(notes => notes.filter(note => !!note))
				.then(notes => (serializeOutput ? notes.map(note => note.toJSON()) : notes))
		});
	}

	getNote(id) {
		return this.getNotes([id]).then(notes => this.getPageLayers(notes[0].pageId).then(layers => notes[0].toJSON(layers)));
	}

	editNote(note, options, callback) {
		if (!note.id) throw new Error("Note identifier is required");

		if (!callback && options) {
			if (typeof options == "function") {
				callback = options;
				options = undefined;
			}
		}

		if (callback)
			this.editNotes([note], options).then(callback).catch(console.error);
		else
			return this.editNotes([note], options);
	}

	editNotes(notes, options) {
		return this.notesQueue.process(() => {
			return new Promise((resolve, reject) => {
				this.exportNotes(notes, options, (notesLayers) => {
					notes = notes.map(noteData => {
						delete noteData.rawLayers;
						noteData.layers = notesLayers[noteData.id];

						// TODO: unlink stroke with brush
						let brush = {};
						return CloudNote.fromJSON(brush, noteData);
					});

					cloudStorage.getSequence(cloudStorage.root).then(documents => {
						notes.forEach(note => {
							note.cloudNodes = note.toCloudNodes();
							let {documentNode} = note.cloudNodes;

							let docIndex = documents.findIndex(node => node.samePayload(documentNode));

							if (docIndex == -1)
								documents.push(documentNode);
							else {
								this.fixAttributes(documents[docIndex], documentNode);
								documents[docIndex] = documentNode;
							}
						});

						return cloudStorage.setSequence(cloudStorage.root, documents)
					}).then(() => {
						let input = notes.map(note => {
							let {documentNode, pageNode} = note.cloudNodes;
							return () => this.editNodes(documentNode.payload, [pageNode]);
						});

						return PromiseQueue.serial(input);
					}).then(() => {
						let input = [].concat.apply([], notes.filter(note => note.hasLayers()).map(note => {
							let {pageNode} = note.cloudNodes;
							let layerNodes = note.layers.map(layer => layer.toCloudNode());

							return [[pageNode.payload, layerNodes]].concat(note.layers.map(layer => [layer.getLayerPayload(), layer.strokesToCloudNodes()])).map(item => {
								return () => this.editNodes(...item);
							});
						}));

						return PromiseQueue.serial(input);
					}).then(() => {
						storeComm.send({action: "UPDATE_NOTES", body: notes.map(note => note.toJSON([]))});
						resolve();
					}).catch(e => {
						console.error(e);
						reject(e);
					});
				})
			});
		});
	}

	editPages(notes) {
		// TODO: unlink stroke with brush
		notes = notes.map(noteData => CloudNote.fromJSON(null, noteData));

		return cloudStorage.getSequence(cloudStorage.root).then(documents => {
			notes.forEach(note => {
				note.cloudNodes = note.toCloudNodes();
				let {documentNode} = note.cloudNodes;

				let docIndex = documents.findIndex(node => node.samePayload(documentNode));

				if (docIndex == -1)
					Promise.reject(new Error(`Document ${note.id} not found`));
				else {
					this.fixAttributes(documents[docIndex], documentNode);
					documents[docIndex] = documentNode;
				}
			});

			return cloudStorage.setSequence(cloudStorage.root, documents)
		}).then(() => {
			let input = notes.map(note => {
				let {documentNode, pageNode} = note.cloudNodes;
				return () => this.editNodes(documentNode.payload, [pageNode]);
			});

			return PromiseQueue.serial(input);
		}).then(() => {
			notes.forEach(note => {
				let paths = this.getNotePaths(note.id);
				let files = fs.readdirSync(paths.note).filter(name => name.endsWith(".png"));

				files.forEach(fileName => {
					let prefix = fileName.split("_")[0];
					fs.renameSync(paths.note + "/" + fileName, paths.note + "/" + prefix + "_" + note.lastModifiedDate + ".png");
				});
			});

			storeComm.send({action: "UPDATE_NOTES", body: notes.map(note => note.toJSON([]))});
		});
	}

	editNodes(payload, nodes) {
		return cloudStorage.getSequence(payload).then(prevNodes => {
			nodes.forEach(node => {
				let idx = prevNodes.findIndex(prevNode => prevNode.samePayload(node));
				if (idx != -1) this.fixAttributes(prevNodes[idx], node);
			});

			return cloudStorage.setSequence(payload, nodes);
		});
	}

	fixAttributes(prevNode, node) {
		for (let attr of prevNode.attrs.keys()) {
			if (!node.attrs.has(attr))
				node.attrs.set(attr, prevNode.attrs.get(attr));
		}
	}

	exportNotes(notes, options, callback) {
		this.glWorker.send("EXPORT_NOTES", {input: {notes: notes, options: options}}, callback);
	}

	getNotePaths(id) {
		let notes = this.root + "/notes";
		let note = notes + "/" + id;

		return {notes, note};
	}

	getPageLayers(pageID, serializeOutput) {
		return cloudStorage.getSequence(Payload.createUnique(CloudUtils.uuidToBuffer(pageID))).then(layerNodes => {
			return Promise.all(layerNodes.map(layerNode => {
				let layer = CloudLayer.fromCloudNode(layerNode);

				return cloudStorage.getSequence(layerNode.payload).then(strokeNodes => {
					layer.strokes = CloudLayer.strokesFromCloudNodes(strokeNodes);
					return serializeOutput ? layer.toJSON() : layer;
				});
			}));
		});
	}

	deleteNote(id, callback) {
		if (callback)
			this.deleteNotes([id]).then(callback).catch(console.error);
		else
			return this.deleteNotes([id]);
	}

	deleteNotes(ids) {
		return this.notesQueue.process(() => {
			return cloudStorage.getSequence(cloudStorage.root).then(documents => {
				ids.map(id => Payload.createUnique(CloudUtils.uuidToBuffer(id))).forEach(payload => {
					let docIndex = documents.findIndex(doc => doc.payload.equals(payload));

					if (docIndex != -1)
						documents.splice(docIndex, 1);
				});

				return cloudStorage.setSequence(cloudStorage.root, documents);
			}).then(() => {
				this.deleteNotesData(ids);
			}).catch(console.error);
		});
	}

	deleteNotesData(ids) {
		if (ids) {
			storeComm.send({action: "DELETE_NOTES", body: ids});
			ids.forEach(id => fsUtils.removeSync(this.getNotePaths(id).note));
		}
		else {
			storeComm.send({action: "LIBRARY_CLEAN"});
			fsUtils.removeSync(this.root + "/notes");
		}
	}

	getTags() {
		return cloudStorage.getTags().then(tags => Array.from(tags));
	}

	setTags(tags) {
		return cloudStorage.setTags(tags);
	}

	getEntity(type) {
		let cloudType = "__" + type + "__";
		let payload = Payload.createUnique(Buffer.from(cloudType));

		return cloudStorage.getSequence(reservedPayloads.globals).then(entities => {
			const entity = entities[entities.findIndex(entity => entity.payload.equals(payload))];

			if (entity)
				return cloudStorage.getSequence(payload)
			else
				return Promise.resolve([]);
		}).then(values => {
			return CloudEntity.fromCloudNode(type, Array.from(values)).toJSON();
		});
	}

	setEntity(json) {
		let entity = CloudEntity.fromJSON(json);
		let payload = entity.getPayload();

		return cloudStorage.getSequence(reservedPayloads.globals).then(entities => {
			const idx = entities.findIndex(item => item.payload.equals(payload));

			if (idx == -1)
				entities.push(entity.toCloudNode());
			else
				entities[idx] = entity.toCloudNode();

			return cloudStorage.setSequence(reservedPayloads.globals, entities);
		}).then(() => {
			return cloudStorage.setSequence(payload, entity.cloudValues());
		});
	}

	async initCloudStorage() {
		await this.migrateUnsynced();

		let globalsChange = null;
		let groupsPayload = CloudEntity.getPayload("groups");

		cloudStorage = new CloudStorage(this.db.conn, syncConfig.syncUrl);
		cloudStorage.root = reservedPayloads.mate;
		// cloudStorage.setDebugMode(true);

		cloudStorage.on("CloudOpen", () => {
			if (debug) console.log("[CLOUD] OPEN");
		});

		cloudStorage.on("CloudClosed", () => {
			if (debug) console.log("[CLOUD] CLOSED");
			// sync(false);
			if (!exporting) sync(false);
		});

		cloudStorage.on("CloudSyncSequenceBegin", (event) => {
			if (debug) {
				let key = event.parent.equals(cloudStorage.root)?event.parent.encodedData:CloudUtils.bufferToUuid(event.parent.content);
				console.log(`[CLOUD] SYNC SEQUENCE BEGIN (${key}, ${event.update})`);
			}
		});

		cloudStorage.on("CloudSyncSequenceFinished", (event) => {
			if (debug) console.log(`[CLOUD] SYNC SEQUENCE FINISHED (${event.changes.length})`);
			if (!event.changes.length) return;

			if (event.parent.equals(cloudStorage.root)) {
				let change = {
					update: event.changes.filter(change => !change.isDelete()).map(change => CloudUtils.bufferToUuid(change.payload.content)),
					remove: event.changes.filter(change => change.isDelete()).map(change => CloudUtils.bufferToUuid(change.payload.content))
				};

				if (debug) {
					console.log("===================== DOCUMENTS UPDATE =====================");
					console.log("update:", change.update);
					console.log("remove:", change.remove);
					console.log("===================== DOCUMENTS UPDATE =====================");
				}

				cloudQueue.process(this.get.bind(this, DBManager.entities.QUEUE)).then(queue => {
					if (!queue) queue = [];
					queue.push(change);

					return this.set(DBManager.entities.QUEUE, queue);
				}).catch(console.error);
			}
			else if (event.parent.equals(reservedPayloads.globals)) {
				let change = {
					update: event.changes.filter(change => !change.isDelete()).map(change => change.payload.content.toString()),
					remove: event.changes.filter(change => change.isDelete()).map(change => change.payload.content.toString())
				};

				if (!globalsChange)
					globalsChange = change;
				else {
					globalsChange.update = globalsChange.update.concat(change.update.filter(change => !globalsChange.update.includes(change)));
					globalsChange.remove = globalsChange.remove.concat(change.remove.filter(change => !globalsChange.remove.includes(change)));
				}

				if (debug) {
					console.log("===================== GLOBALS UPDATE =====================");
					console.log("update:", globalsChange.update);
					console.log("remove:", globalsChange.remove);
					console.log("===================== GLOBALS UPDATE =====================");
				}

				this.getTags().then(tags => {
					storeComm.send({action: "TAGS_UPDATE", body: tags});
				});
			}
			else if (event.parent.equals(groupsPayload)) {
				let change = {
					update: [groupsPayload.content.toString()],
					remove: []
				};

				if (!globalsChange)
					globalsChange = change;
				else if (!globalsChange.update.includes(groupsPayload.content.toString()))
					globalsChange.update.push(groupsPayload.content.toString());

				if (debug) {
					console.log("===================== GROUPS UPDATE =====================");
					console.log("update:", globalsChange.update);
					console.log("remove:", globalsChange.remove);
					console.log("===================== GROUPS UPDATE =====================");
				}
			}
		});

		cloudStorage.on("CloudSyncFinished", (event) => {
			if (debug) console.log(`[CLOUD] SYNC FINISHED (${event.successful}, ${exporting})`);

			if (globalsChange) {
				globalsChange.update.forEach(type => {
					cloudQueue.process(this.getEntity.bind(this, type.substring(2, type.length - 2))).then(entity => {
						storeComm.send({action: "ENTITY_UPDATE", body: entity});
					});
				});

				globalsChange = null;
			}

			storeComm.send({action: "CLOUD_DOWNLOADING", body: false});

			if (Date.now() - syncTime > 1000)
				console.info("===================== SYNC ONLY (" + (Date.now() - syncTime) + " ms) =====================");

			if (!event.successful || exporting) {
				if (!exporting) sync(false);
				return;
			}

			exporting = true;

			let change;

			cloudQueue.process(this.get.bind(this, DBManager.entities.QUEUE)).then(queue => {
				change = (queue && queue[0])?queue[0]:{update: [], remove: []};

				if (change.update.length + change.remove.length > 0)
					console.info("===================== LAST CHANGE (update -> " + change.update.length + ", remove -> " + change.remove.length + ") =====================");

				if (change.remove.length > 0) {
					this.deleteNotesData(change.remove);

					if (change.update.length == 0)
						queue.shift();
					else
						change.remove = [];

					return this.set(DBManager.entities.QUEUE, queue);
				}
				else
					return Promise.resolve();
			}).then(() => {
				if (change.update.length > 0)
					return this.getNotes(change.update, false, true);
				else {
					exporting = false;
					return [];
				}
			}).then(notes => {
				return Promise.all(notes.map(note => this.getPageLayers(note.pageId))).then(layers => ({notes, layers}));
			}).then(result => {
				let {notes, layers} = result;
				let notesData = notes.map((note, index) => note.toJSON(layers[index]));

				let synchronizing = false;
				let synchronizeCallback = null;

				let complete = (reason) => {
					if (reason) console.error(reason);

					/*if (globalsChange) {
						globalsChange.update.forEach(type => {
							cloudQueue.process(this.getEntity.bind(this, type.substring(2, type.length - 2))).then(entity => {
								storeComm.send({action: "ENTITY_UPDATE", body: entity});
							});
						});

						globalsChange = null;
					}*/

					let callback = () => {
						exporting = false;
						sync(false, true);
					};

					if (synchronizing)
						synchronizeCallback = callback;
					else
						callback();
				};

				let updateNotes = utils.synchronize((update) => {
					storeComm.send({action: "UPDATE_NOTES", body: update});
				}, 1000, synchronize => {
					synchronizing = synchronize;

					if (synchronizeCallback) {
						synchronizeCallback();
						synchronizeCallback = null;
					}
				});

				let next = () => {
					if (!syncing) return Promise.reject("Syncing is canceled. User access is not found.");

					let noteData = notesData.shift();

					if (noteData) {
						let hasLayers = noteData.layers.length > 0;
						let hasStrokes = false;
						let hasEmptyLayer = false;

						if (hasLayers) {
							noteData.layers.forEach(layer => {
								if (layer.strokes.length)
									hasStrokes = true;
								else
									hasEmptyLayer = true;
							});

							if (!hasStrokes) {
								console.warn(new Error(`[CLOUD] note with missing strokes detected: ${noteData.id}`));
								missingLayersNotes.push(noteData.id);
							}
						}
						else {
							console.warn(new Error(`[CLOUD] note with missing layers detected: ${noteData.id}`));
							missingLayersNotes.push(noteData.id);
						}

						// if (!hasLayers || !hasStrokes) {
						if (!hasLayers) {
							cloudQueue.process(this.get.bind(this, DBManager.entities.QUEUE)).then(queue => {
								if (!queue) return Promise.reject("Cloud queue is not found");

								let change = queue[0];
								change.update.splice(change.update.indexOf(noteData.id), 1);

								return this.set(DBManager.entities.QUEUE, queue);
							}).then(next).catch(complete);
						}
						else {
							if (hasEmptyLayer) {
								console.warn(new Error(`[CLOUD] note with empty layer detected: ${noteData.id}`));
								console.info(noteData.id, " -> empty layer found");
							}

							if (debug) console.log(`[CLOUD] exporting ${noteData.id} started`);

							this.exportNotes([noteData], {}, () => {
								if (debug) console.log(`[CLOUD] exporting ${noteData.id} completed`);

								cloudQueue.process(this.get.bind(this, DBManager.entities.QUEUE)).then(queue => {
									if (!queue) return Promise.reject("Cloud queue is not found");

									let change = queue[0];
									change.update.splice(change.update.indexOf(noteData.id), 1);

									updateNotes(Object.assign(noteData, {layers: []}));

									return this.set(DBManager.entities.QUEUE, queue);
								}).then(next).catch(complete);
							});
						}
					}
					else {
						cloudQueue.process(this.get.bind(this, DBManager.entities.QUEUE)).then(queue => {
							if (queue && queue.length) {
								queue.shift();

								return this.set(DBManager.entities.QUEUE, queue).then(complete);
							}
							else {
								complete();
								return Promise.resolve();
							}
						}).catch(complete);
					}
				};

				next();
			}).catch(console.error);
		});

		cloudStorage.on("DBCleanFinished", (event) => {
			if (debug) console.log("[CLOUD] DB CLEAN FINISHED");

			this.deleteNotesData();

			firstComplete = false;
			sync(false);
		});
	}

	async migrateUnsynced() {
		let bufferUnsynced = Buffer.from("__unsynced__");

		let buffer = await this.db.conn.get(bufferUnsynced).catch(reason => {
			if (reason.type != "NotFoundError")
				throw reason;
		});

		if (!buffer)
			return;

		const data = EncoderDecoder.readPayloadSequence(buffer).map(payload => payload.encodedData);

		for (let encodedData of data) {
			let entity = Buffer.concat([bufferUnsynced, encodedData]);
			await this.db.conn.put(entity, 1);
		}

		await this.db.conn.del(buffer);
	}

	syncWithCloud(accessToken, proxyAddress) {
		cloudStorage.setAccessToken(accessToken).then(() => {
			if (!accessToken) return;

			if (proxyAddress && proxyAddress != cloudStorage.proxy) {
				proxyAddress = "http://" + proxyAddress;

				if (debug) console.log("[CLOUD] PROXY DETECTED", proxyAddress);
				cloudStorage.proxy = proxyAddress;
			}

			if (!syncing) {
				sync(true);

				// if (exporting)
				cloudStorage.sync();
			}
		});
	}

	initDataMigration() {
		return this.get(DBManager.entities.SETTINGS).then(settings => {
			DataMigration.init(settings, this);
			return DataMigration.renameNotesCache();
		});
	}

	processDataMigration() {
		return DataMigration.proceed();
	}

	connectWithStore(input, done) {
		storeComm = {
			send: function(message) {
				let response = Object.assign({}, input, {redirect: true, persistent: true, response: message});
				done(response);
			}
		};
	}
}

module.exports = DBManager;
