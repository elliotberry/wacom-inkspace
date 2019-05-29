import * as Modals from '../constants/Modals';

import * as libraryAction from '../actions/library';
import * as modalsAction from '../actions/modals';

import images from '../images';

class MenuManager {
	constructor(store) {
		this.store = store;
	}

	build(...templates) {
		templates.forEach(template => this.replaceSubMenus(template));
	}

	buildMenu(items) {
		let menu = new Menu();
		let menuItems = this.buildMenuItems(items);

		menuItems.forEach(menuItem => menu.append(menuItem));

		return menu;
	}

	buildMenuItems(items) {
		return items.map(item => new MenuItem(this.replaceSubMenus(item)));
	}

	replaceSubMenus(template) {
		if (template.submenu) {
			template.submenu = Object.keys(template.submenu).map(key => {
				if (template.submenu[key].submenu)
					return this.replaceSubMenus(template.submenu[key]);
				else if (template.submenu[key].remove)
					return null;
				else
					return template.submenu[key];
			}).filter(e => !!e);
		}

		return template;
	}

	getExportTemplate() {
		let appState = this.store.getState().AppReducer;
		let libraryState = this.store.getState().LibraryReducer;
		let notes = (libraryState.context == "GROUPS" && libraryState.filterGroup) ? ContentManager.getEntityNotes("groups", libraryState.filterGroup) : ContentManager.getSelectedNotes();
		let exportEnabled = notes.length === 1;

		// let exportAsTextEnabled = false;

		// try {
		// 	exportAsTextEnabled = libraryState.profile.access.rights.indexOf("INK-TO-FORMATLESS-TEXT") != -1
		// }
		// catch (e) {}

		let template = {
			id: "export",
			label: LocalesManager.dictionary["menu.export"],
			enabled: notes.length > 0,
			submenu: {
				txt: {
					label: "   Text   ",
					enabled: appState.online, // && exportAsTextEnabled
					click: () => {
						if (AuthenticationManager.hasAccess()) {
							this.store.dispatch(modalsAction.openDialog(Modals.EXPORT_AS_TEXT));
							this.store.dispatch(libraryAction.exportAsText());
						}
						else
							AuthenticationManager.login();
					}
				},
				"docx": {
					label: "   DOC   ",
					enabled: appState.online,
					click: () => {
						if (AuthenticationManager.hasAccess())
							this.store.dispatch(libraryAction.exportNote({extension: ".docx"}));
						else
							AuthenticationManager.login();
					}
				},
				separator1: {type: "separator"},
				jpg: {
					id: "jpg",
					label: "   JPG   ",
					enabled: exportEnabled,
					click: () => this.store.dispatch(libraryAction.exportNote({extension: ".jpeg"}))
				},
				png: {
					id: "png",
					label: "   PNG   ",
					enabled: exportEnabled,
					click: () => this.store.dispatch(libraryAction.exportNote({extension: ".png"}))
				},
				psd: {
					label: "   PSD   ",
					enabled: exportEnabled && !!appState.lastLogin,
					click: () => this.store.dispatch(libraryAction.exportNote({extension: ".psd"}))
				},
				separator2: {type: "separator"},
				svg: {
					label: "   SVG   ",
					enabled: exportEnabled && !!appState.lastLogin,
					click: () => this.store.dispatch(libraryAction.exportNote({extension: ".svg"}))
				},
				separator3: {type: "separator"},
				video: {
					label: "   Video   ",
					enabled: exportEnabled && appState.online,
					click: () => {
						if (AuthenticationManager.hasAccess())
							this.store.dispatch(libraryAction.exportNote({title: "exportingVideo.title", extension: ".mp4"}));
						else
							AuthenticationManager.login();
					}
				}
			}
		};

		// TODO: menu should be disabled in GROUPS context
		if (process.platform == "darwin" && !template.enabled) {
			template = {
				label: LocalesManager.dictionary["menu.export"],
				enabled: false
			};
		}

		return template;
	}

	getGroupsTemplate() {
		let groups = ContentManager.getEntity("groups");
		let submenu = {};

		let orderedValues = groups.orderedValues;
		let cache = {};

		for (let group of orderedValues)
			cache[group.id] = group.notes.filter(noteID => ContentManager.selected.includes(noteID));

		for (let group of orderedValues) {
			let tick = null;

			if (cache[group.id].length == ContentManager.selected.length)
				tick = images.tickBlue;
			else if (cache[group.id].length)
				tick = images.tickGrey;
			else
				tick = images.tickEmpty;

			submenu[group.id] = {
				label: group.name,
				icon: tick,
				click: () => this.store.dispatch(libraryAction.editGroupRelations(group, cache))
			};
		}

		let template = {
			label: LocalesManager.dictionary["menu.groups"],
			enabled: orderedValues.length > 0 && ContentManager.selected.length > 0,
			submenu: submenu
		};

		// TODO: menu should be disabled in GROUPS context
		if (process.platform == "darwin" && !template.enabled) {
			template = {
				label: LocalesManager.dictionary["menu.groups"],
				enabled: false
			};
		}

		return template;
	}
}

export default MenuManager;
