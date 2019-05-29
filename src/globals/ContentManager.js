import {Entity} from '../../scripts/Note';
import {comparator} from '../../scripts/utils';

let ContentManager = {
	open() {
		return DBManager.getNotes().then(notes => this.init(notes)).then(() => DBManager.getEntity("groups")).then(groups => this.setEntity(groups));
	},

	init(notes) {
		// JSON<NoteID: Note>
		this.notes = notes || {};

		// JSON<type: Entity>
		this.entities = {};

		// Array<Array<NoteID>>
		this.sections = [];

		// Array<NoteID>
		this.selected = [];

		// JSON<FilterType: value>
		this.filters = {};

		// JSON<NoteID: description>
		this.searchData = null;

		this.updateSections();
	},

	updateSections(callback) {
		let sections = [];
		let cache = new Map();

		let notes = Object.values(this.notes);

		if (this.searchData) {
			let searchIDs = Object.keys(this.searchData);
			notes = notes.filter(note => searchIDs.includes(note.id));
		}
		else {
			if (this.filters["GROUP"]) notes = notes.filter(note => this.getEntity("groups").get(this.filters["GROUP"]).notes.includes(note.id));
			if (this.filters["TAG"]) notes = notes.filter(note => note.tags.includes(this.filters["TAG"]));
		}

		notes.sort((a, b) => a.creationDate - b.creationDate).forEach(note => {
			let date = new Date(note.creationDate);
			let title = new Date(date.getFullYear(), date.getMonth(), 1).getTime();
			let section = cache.get(title);

			if (!section) {
				section = [];
				section.title = title;

				cache.set(title, section);
			}

			section.push(note.id);
		});

		for (let section of cache.values())
			sections.push(section);

		let selected = this.selected.filter(selected => notes.some(note => note.id == selected));

		if (!selected.length && sections.length)
			selected = [sections.last.last];

		if (this.searchData)
			sections = [[].concat(...sections)];

		this.sections = sections;
		this.selected = selected;

		if (callback) callback();
		this.onUpdate();
	},

	edit(notes) {
		if (debug) console.log("[CONTENT_MANAGER] edit", (notes.length == 1) ? notes.first.id : notes.map(note => note.id));

		let notesForAdd = notes.filter(note => !this.notes[note.id]);

		notes.forEach(note => {
			// when combine notes with different month or year
			if (this.notes[note.id] && this.notes[note.id].creationDate != note.creationDate)
				notesForAdd.push(note);

			this.notes[note.id] = note;
		});

		if (notesForAdd.length)
			this.updateSections();
		else
			this.onUpdate();
	},

	remove(ids, skip) {
		if (debug) console.log("[CONTENT_MANAGER] remove", ids);

		let selected = this.getNearestNeighbour(ids);
		let sections = this.sections.map(section => section.filter(id => !ids.includes(id))).filter(section => !!section.length);

		ids.forEach(id => delete this.notes[id]);

		this.sections = sections;
		this.selected = selected;

		if (!skip)
			this.onUpdate();
	},

	replace(notesForRemove, note) {
		if (debug) console.log("[CONTENT_MANAGER] replace", notesForRemove.map(note => note.id), " => ", note.id);

		this.remove(notesForRemove.filter(noteForRemove => noteForRemove.id != note.id).map(note => note.id), true);
		this.selected = [note.id];

		this.onUpdate();
	},

	getNearestNeighbour(idsForRemove) {
		let selectedIDs = this.selected;

		let result = selectedIDs.filter(noteID => {
			for (let i = 0; i < idsForRemove.length; i++) {
				if (idsForRemove[i] == noteID)
					return false;
			}

			return true;
		});

		if (result.length)
			return result;
		else
			selectedIDs = idsForRemove;

		let selectedID = selectedIDs[selectedIDs.length - 1];
		selectedIDs = selectedIDs.filter((noteID, i) => i < selectedIDs.length - 1);

		let noteIDs = [].concat(...this.sections).filter(noteID => {
			for (let i = 0; i < selectedIDs.length; i++) {
				if (selectedIDs[i] == noteID)
					return false;
			}

			return true;
		});

		let nearestNeighbour;

		for (let i = 0; i < noteIDs.length; i++) {
			if (noteIDs[i] == selectedID) {
				if (i == 0)
					nearestNeighbour = noteIDs[i+1];
				else
					nearestNeighbour = noteIDs[i-1];

				break;
			}
		}

		if (nearestNeighbour)
			result = [nearestNeighbour];

		return result;
	},

	filter(type, value) {
		if (!type || type.type != "FilterType") throw new Error("Unknown content filter found: " + type);
		if (debug) console.log("[CONTENT_MANAGER] filter", type.name, value);

		// TODO: fix value.id || value when TAGS refactoring
		if (value)
			this.filters[type.name] = value.id || value;
		else
			delete this.filters[type.name];

		this.updateSections();
	},

	getEntity(type) {
		let entity = this.entities[type];

		if (!entity) {
			entity = new Entity(type);
			this.entities[type] = entity;
		}

		return entity;
	},

	getEntityRelations(type, noteID) {
		return this.entities[type].getRelations(noteID);
	},

	getEntityNotes(type, valueID, sorted) {
		let result;
		let entity = this.getEntity(type);

		if (valueID)
			result = entity.values[valueID].notes.map(noteID => this.notes[noteID]).filter(note => !!note);
		else {
			var set = new Set();

			Object.values(entity.values).forEach(value => {
				for (let noteID of value.notes)
					set.add(noteID);
			})

			result = [...set].map(noteID => this.notes[noteID]).filter(note => !!note);
		}

		if (sorted)
			result.sort(comparator({sortBy: "creationDate", sortOrder: "asc"}));

		return result;
	},

	getEntityPages(type, valueID, sorted) {
		return this.getEntityNotes(type, valueID, sorted).map(note => note.pageId);
	},

	setEntity(entity) {
		if (debug) console.log("[CONTENT_MANAGER] setEntity", entity.type);

		this.entities[entity.type] = entity;

		// TODO: fix FilterType to valueType
		let filterType = entity.valueType.toUpperCase();
		let valueID = this.filters[filterType];

		if (valueID) {
			if (entity.get(valueID))
				this.updateSections();
			else
				this.filter(ContentManager.FilterType[filterType], null);
		}
		else
			this.onUpdate();
	},

	editEntityRelation(value, cache) {
		for (let noteID of this.selected) {
			if (cache && cache[value.id].length == this.selected.length)
				value.removeRelation(noteID);
			else {
				// value.entity.clearRelation(noteID);
				value.addRelation(noteID);
			}
		}

		this.updateSections();
	},

	cleanEntityRelations() {
		AuthenticationManager.onSyncComplete(() => {
			let entitiesToUpdate = [];
			let notes = Object.keys(this.notes);

			Object.values(this.entities).forEach(entity => {
				let removed = entity.cleanRelations(notes);

				if (removed) {
					if (debug) console.log(`[CONTENT_MANAGER] cleanEntityRelations(${entity.type}):`, removed);
					entitiesToUpdate.push(entity);
				}
			});

			Promise.all(entitiesToUpdate.map(entity => DBManager.setEntity(entity)));
		});
	},

	setSearchData(data, callback) {
		let searchData = null;

		if (data) {
			if (debug) console.log("[CONTENT_MANAGER] search");

			let notes = Object.values(this.notes);
			if (this.filters["GROUP"]) notes = notes.filter(note => this.getEntity("groups").get(this.filters["GROUP"]).notes.includes(note.id));

			searchData = {};

			data.forEach(node => {
				let index = notes.findIndex(note => note.pageId == node.nodeId);
				let note = notes[index];

				if (note)
					searchData[note.id] = node.txt;
			});

			delete this.filters["TAG"];
		}

		this.searchData = searchData;

		this.updateSections(callback);
	},

	select(ids) {
		if (ids.length == this.selected.length && !ids.filter(id => !this.selected.includes(id)).length) return;
		if (debug) console.log("[CONTENT_MANAGER] select", ids);

		this.selected = ids;
		this.onUpdate();
	},

	isSelected(id) {
		return this.selected.includes(id);
	},

	getSelectedNotes() {
		return this.selected.map(id => this.notes[id]);
	},

	getSelectedPages() {
		return this.getSelectedNotes().map(note => note.pageId);
	},

	getLatestNote(ids) {
		return ids.map(id => this.notes[id]).sort(comparator({sortBy: "lastModifiedDate"})).first;
	},

	getNote(id) {
		return this.notes[id];
	},

	getDescription(id) {
		return this.searchData[id];
	},

	onUpdate() {}
};

Function.prototype.createEnum.call(ContentManager, "FilterType", ["GROUP", "TAG"]);

export default ContentManager;
