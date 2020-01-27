import {updateIntl} from 'react-intl-redux';
// import {push, replace} from 'react-router-redux'

import MenuManager from './MenuManager';

import * as Modals from '../constants/Modals';

import * as appAction from '../actions/app';
import * as editAction from '../actions/edit';
import * as libraryAction from '../actions/library';
import * as modalsAction from '../actions/modals';

class ContextMenuManager extends MenuManager {
	constructor(store) {
		super(store);

		this.init();
	}

	init() {
		this.groupMenu = this.buildMenu([
			{
				label: LocalesManager.dictionary["menu.rename"],
				click: () => {
					let libraryState = this.store.getState().LibraryReducer;
					this.store.dispatch(modalsAction.openDialog(Modals.ENTITY, {type: "groups", label: "entity.group.name", value: ContentManager.getEntity("groups").get(libraryState.filterGroup)}));
				}
			}, {
				label: LocalesManager.dictionary["menu.remove"],
				click: () => this.store.dispatch(modalsAction.openDialog(Modals.REMOVE_GROUP))
			}
		]);

		this.languagesMenu = this.buildMenu(LocalesManager.displayLocales.map(locale => ({value: locale, label: LocalesManager.getLangName(locale), click: () => this.setLanguage(locale)})));
		this.exportLanguagesMenu = this.buildMenu(LocalesManager.noteLocales.map(locale => ({value: locale, label: LocalesManager.getLangName(locale), click: () => this.setExportLanguage(locale)})));

		this.lassoContextMenu = this.buildMenu([
			{label: LocalesManager.dictionary["contextmenu.copy"]},
			{label: LocalesManager.dictionary["contextmenu.lasso.duplicate.page"]},
			{label: LocalesManager.dictionary["contextmenu.cut"]},
			{label: LocalesManager.dictionary["menu.delete"]}
		]);
	}

	setLanguage(locale) {
		let language = LocalesManager.getLangName(locale);

		LocalesManager.update(locale);

		this.store.dispatch(updateIntl({locale: LocalesManager.locale, messages: LocalesManager.dictionary}));
		this.store.dispatch(appAction.setLanguage(language));

		UAManager.settings("Set App Language", language);

		this.init();
		mainMenuManager.refresh();
	}

	setExportLanguage(noteLocale) {
		const libraryState = this.store.getState().LibraryReducer;

		if (this.exportUpdateDefault) {
			LocalesManager.updateExportLocale(noteLocale);
			this.store.dispatch(libraryAction.setExportLanguage(noteLocale));
		}
		else {
			UAManager.settings("Set Note Language", LocalesManager.getLangName(noteLocale));
			this.store.dispatch(libraryAction.exportAsText(noteLocale));
		}
	}

	showLayerMenu(targetLayer) {
		let editState = this.store.getState().EditReducer;

		this.targetLayer = targetLayer;

		let template = {
			copy: {
				label: LocalesManager.dictionary["menu.copy.layer"],
				enabled: !!editState.note.layers[targetLayer].strokes.length,
				click: () => {
					this.store.dispatch(editAction.layerCopy(this.targetLayer));
					this.store.dispatch(appAction.addNotification('notification.edit.layerCopy'));
				}
			},
			paste: {
				label: LocalesManager.dictionary["menu.paste.layer"],
				enabled: !!(editState.clipboard && !editState.pasting),
				click: () => {
					this.store.dispatch(editAction.layerPaste(this.targetLayer));
					this.store.dispatch(appAction.addNotification('notification.edit.layerPaste'));
				}
			},
			delete: {
				label: LocalesManager.dictionary["menu.delete.layer"],
				enabled: editState.note.layers.length > 1,
				click: () => {
					this.store.dispatch(editAction.layerDelete(this.targetLayer));
					this.store.dispatch(appAction.addNotification('notification.edit.layerDelete'));
				}
			},
			merge: {
				label: LocalesManager.dictionary["menu.merge.previous"],
				enabled: targetLayer > 0,
				click: () => {
					this.store.dispatch(editAction.layerMergePrevious(this.targetLayer));
				}
			},
			split: {
				label: LocalesManager.dictionary["menu.split.layer"],
				enabled: editState.note.layers[targetLayer].strokes.length > 1,
				click: () => {
					this.store.dispatch(editAction.initLayerSplit(this.targetLayer));
				}
			}
		};

		let menu = this.buildMenu(Object.values(template));

		menu.popup();
	}

	showNoteMenu() {
		let appState = this.store.getState().AppReducer;
		let libraryState = this.store.getState().LibraryReducer;

		let template = {
			edit: {
				label: LocalesManager.dictionary["menu.edit"],
				enabled: ContentManager.selected.length === 1,
				click: () => this.store.dispatch(libraryAction.editNote())
			},
			rotate: {
				label: LocalesManager.dictionary["menu.rotate"],
				enabled: ContentManager.selected.length === 1,
				click: () => {
					this.store.dispatch(libraryAction.rotateTransformAdd90deg());
					setTimeout(() => this.store.dispatch(libraryAction.rotateNotes(ContentManager.selected)), 25);
				}
			},
			combine: {
				label: LocalesManager.dictionary["menu.combine"],
				enabled: ContentManager.selected.length > 1,
				click: () => {
					if (ContentManager.selected.length > 1)
						this.store.dispatch(libraryAction.combineNotes(ContentManager.selected));
				}
			},
			tag: {
				label: LocalesManager.dictionary["tooltip.tags.manager"],
				enabled: appState.online && ContentManager.selected.length > 0 && !libraryState.rotateInProgress,
				click: () => {
					if (AuthenticationManager.hasAccess())
						this.store.dispatch(modalsAction.openDialog(Modals.TAGS_MANAGER));
					else
						AuthenticationManager.login();
				}
			},
			groups: this.getGroupsTemplate(),
			export: this.getExportTemplate(),
			// "separator1": {type: "separator"'},
			// "startCollaboration": {
			// 	label: LocalesManager.dictionary["menu.start.collaboration"]
			// },
			separator: {type: "separator"},
			delete: {
				label: LocalesManager.dictionary["menu.delete"],
				click: () => {
					if (ContentManager.selected.length > 0)
						this.store.dispatch(modalsAction.openDialog(Modals.CONFIRM, {title: "confirm.remove.note.title", content: "confirm.remove.note.description", type: "REMOVE_NOTE", noteIDs: ContentManager.selected}));
				}
			}
		};

		let menu = this.buildMenu(Object.values(template));

		menu.popup();
	}

	showGroupMenu() {
		this.groupMenu.popup();
	}

	showExportMenu() {
		let template = this.getExportTemplate();
		let menu = this.buildMenu(Object.values(template.submenu));

		menu.popup();
	}

	showLanguagesMenu() {
		this.languagesMenu.popup();
	}

	showExportLanguagesMenu(updateDefault) {
		this.exportUpdateDefault = !!updateDefault;
		this.exportLanguagesMenu.popup();
	}

	showLassoContextMenu() {
		this.lassoContextMenu.popup();
	}
}

export default ContextMenuManager;
