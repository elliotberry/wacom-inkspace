const uuid = require("uuid");

require("./ink-engine/");

const DeviceModel = require("./DeviceModel");
const utils = require("./utils");

const noteLocales = require("../project.config.js")["noteLocales"];

class Note {
	constructor(data) {
		if (!data.locale)
			console.warn(`[Note: ${data.id}] Locale not found`);
		else if (!data.locale.contains("_"))
			console.warn(`[Note: ${data.id}] Invalid note locale found: ${data.locale}`);

		this.id = data.id || uuid();
		this.pageId = data.pageId || uuid();
		this.title = this.title || "";
		this.creationDate = parseInt(data.creationDate) || Date.now();
		this.lastModifiedDate = parseInt(data.lastModifiedDate) || this.creationDate;
		this.size = data.size;
		this.locale = data.locale;
		this.stream = data.stream || "mate";
		this.tags = data.tags || [];

		if (data.transform)
			this.transform = data.transform;
		else if ("orientation" in data) {
			let dm = new DeviceModel(data.size, data.orientation);
			this.transform = dm.transform;
		}
		else
			this.transform = Module.MatTools.create();

		this.layers = data.layers || [];

		if (data.rawLayers)
			this.rawLayers = data.rawLayers;

		Object.defineProperties(this, {
			strokesList: {
				get: () => this.layers.map(layer => layer.strokes)
			},
			strokes: {
				get: () => [].concat(...this.strokesList)
			},
			orientation: {
				get: () => DeviceModel.getOrientation(this.transform)
			}
		});
	}

	renew() {
		this.id = uuid();
		this.pageId = uuid();
		this.layers.forEach(layer => layer.id = uuid());

		// let firstStroke = this.layers.first.strokes.first;
		// let firstStrokeCreationDate = firstStroke ? firstStroke.timestamp : this.creationDate;

		// if (this.creationDate > firstStrokeCreationDate)
		// 	this.creationDate = firstStrokeCreationDate;
	}

	clone(discardLayers) {
		return Note.fromJSON(undefined, this.toJSON(null, discardLayers));
	}

	touch() {
		this.lastModifiedDate = Date.now();
		if (this.onTouch) this.onTouch();
	}

	updateRawLayers(strokesList) {
		delete this.rawLayers;
		this.layers = strokesList.map(strokes => new Layer({lastModifiedDate: this.lastModifiedDate, strokes: strokes}));
	}

	isLandscape() {
		return this.orientation == 1 || this.orientation == 3;
	}

	hasLayers() {
		return !!this.layers.length;
	}

	hasPreview() {
		return this.hasImage("preview");
	}

	hasImage(type) {
		return IOManager.existsSync(DBManager.getNotePaths(this.id).note + "/" + type + "_" + this.lastModifiedDate + ".png");
	}

	getThumbSrc() {
		return this.getImageSrc("thumb");
	}

	getPreviewSrc() {
		return this.getImageSrc("preview");
	}

	getImageSrc(type) {
		return DBManager.getNotePaths(this.id).note + "/" + type + "_" + this.lastModifiedDate + ".png";
	}

	addLayer(data, atIndex) {
		let layer = new Layer(data);
		this.layers.splice(atIndex === undefined ? this.layers.length + 1 : atIndex, 0, layer);
		return layer;
	}

	deleteLayer(atIndex) {
		this.layers.splice(atIndex, 1);
		this.layers = [...this.layers];
	}

	toJSON(layersData, discardLayers) {
		let data = {
			id: this.id,
			pageId: this.pageId,
			title: this.title,
			creationDate: this.creationDate,
			lastModifiedDate: this.lastModifiedDate,
			size: this.size,
			transform: this.transform,
			locale: this.locale,
			stream: this.stream,
			tags: this.tags,
			layers: discardLayers ? [] : layersData || this.layers.map(layer => layer.toJSON())
		};

		if (this.rawLayers)
			data.rawLayers = StrokesCodec.encodeRawLayers(this.rawLayers);

		return data;
	}

	static fromJSON(brush, data) {
		let noteData = Object.assign({}, data);

		if (data.layers)
			noteData.layers = data.layers.map(layerData => Layer.fromJSON(brush, layerData));

		if (data.rawLayers)
			noteData.rawLayers = StrokesCodec.decodeRawLayers(data.rawLayers);

		return new global.notesContext["Note"](noteData);
	}
}

class Layer {
	constructor(data) {
		data = data || {};

		this.id = data.id || uuid();
		this.lastModifiedDate = parseInt(data.lastModifiedDate) || Date.now();
		this.strokes = data.strokes || [];
	}

	touch() {
		this.lastModifiedDate = Date.now();
	}

	isEmpty() {
		return this.strokes.length == 0;
	}

	addStroke(stroke) {
		this.lastModifiedDate = Date.now();
		this.strokes.push(stroke);
	}

	toJSON() {
		return {id: this.id, lastModifiedDate: this.lastModifiedDate, strokes: StrokesCodec.encode(this.strokes)};
	}

	static fromJSON(brush, data) {
		return new global.notesContext["Layer"](Object.assign({}, data, {strokes: StrokesCodec.decode(brush, data.strokes)}));
	}
}

class Entity {
	constructor(type, values = []) {
		this.type = type;
		this.valueType = type.substring(0, type.length - 1);

		this.values = {};

		Object.defineProperty(this, "textValues", {get: function() {return Object.values(this.values).map(value => value.name)}});
		Object.defineProperty(this, "orderedValues", {get: function() {return Object.values(this.values).sort(utils.comparator({sortBy: "name", sortOrder: "asc", ignoreCase: true}))}});

		values.forEach(value => {
			value.entity = this;

			this.values[value.id] = value;
		});
	}

	getID(name) {
		let items = Object.values(this.values).filter(value => value.name == name);

		if (items.length) {
			if (items.length == 1)
				return items.first.id;
			else
				throw new Error("Name duplicates found: " + items.map(value => value.id));
		}
		else
			return null;
	}

	get(id) {
		return this.values[id];
	}

	add(name, dupes) {
		let id;

		if (!dupes) {
			try {
				id = this.getID(name);
			}
			catch(e) {
				console.error(e);
				return;
			}
		}

		if (!id) {
			id = uuid();

			this.values[id] = new EntityValue({id, name});
			this.values[id].entity = this;
		}

		return id;
	}

	rename(id, name) {
		if (!this.values[id]) return;
		this.values[id].name = name;
	}

	remove(id) {
		delete this.values[id];
	}

	getRelations(noteID) {
		return Object.values(this.values).filter(value => value.notes.includes(noteID));
	}

	addRelation(id, ...notes) {
		if (!this.values[id]) return;
		this.values[id].addRelation(...notes);
	}

	removeRelation(id, ...notes) {
		if (!this.values[id]) return;
		this.values[id].removeRelation(...notes);
	}

	editRelation(id, ...notes) {
		if (!this.values[id]) return;
		this.values[id].editRelation(...notes);
	}

	clearRelation(...notes) {
		Object.values(this.values).forEach(value => value.removeRelation(...notes));
	}

	cleanRelations(notes) {
		let result = {};

		Object.values(this.values).forEach(value => {
			let removed = value.notes.filter(noteID => !notes.includes(noteID));
			if (removed.length > 0) result[value.id] = removed;
		})

		Object.keys(result).forEach(valueID => this.removeRelation(valueID, ...result[valueID]));

		return (Object.keys(result).length > 0) ? result : null;
	}

	toJSON() {
		return {type: this.type, values: Object.values(this.values).map(value => value.toJSON())};
	}

	static fromJSON(data) {
		return new global.notesContext["Entity"](data.type, data.values.map(value => EntityValue.fromJSON(value)));
	}
}

class EntityValue {
	constructor(data) {
		this.id = data.id || uuid();
		this.name = data.name;
		this.stream = data.stream || "mate";
		this.creationDate = parseInt(data.creationDate) || Date.now();
		this.notes = data.notes || [];

		Object.defineProperty(this, "type", {get: function() {
			if (!this.entity) console.warn(`[EntityValue] ${this.name} has no entity relation`);
			return this.entity ? this.entity.valueType : null
		}});
	}

	addRelation(...notes) {
		notes.forEach(noteID => {
			if (this.notes.includes(noteID)) return;
			this.notes.push(noteID);
		});
	}

	removeRelation(...notes) {
		notes.forEach(noteID => this.notes.remove(noteID));
	}

	editRelation(...notes) {
		notes.forEach(noteID => {
			if (this.notes.includes(noteID))
				this.notes.remove(noteID);
			else
				this.notes.push(noteID);
		});
	}

	toJSON() {
		return {id: this.id, name: this.name, type: this.type, stream: this.stream, creationDate: this.creationDate, notes: this.notes};
	}

	static fromJSON(data) {
		return new global.notesContext["EntityValue"](data);
	}
}

global.notesContext = {
	Note: Note,
	Layer: Layer,
	Entity: Entity,
	EntityValue: EntityValue
}

module.exports = {Note, Layer, Entity, EntityValue};
