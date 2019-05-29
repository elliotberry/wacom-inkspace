import {push} from 'react-router-redux'

import MenuManager from './MenuManager';

import * as Modals from '../constants/Modals';

import * as appAction from '../actions/app';
import * as libraryAction from '../actions/library';
import * as editActions from '../actions/edit';
import * as modalsAction from '../actions/modals';

class MainMenuManager extends MenuManager {
	constructor(store) {
		super(store);
	}

	assignMenu(page, props) {
		this.page = page;
		this.props = props || {};

		var authorized = AuthenticationManager.hasAccess();
		var menuTemplates = this.getMenuTemplates(authorized);
		var menu;

		switch (page) {
			case "fte":
				menu = this.getInitialMenu(menuTemplates);
				break;
			case "library":
				menu = this.getLibraryMenu(menuTemplates);
				break;
			case "creation":
				menu = this.getEditMenu(menuTemplates);
				break;
			case "live":
				menu = this.getLiveMenu(menuTemplates);
				break;
			default:
				throw new Error(`Menu page ${page} not found. Failed to init menu.`);
		}

		Menu.setApplicationMenu(menu);
		NativeLinker.send("auto-updater-update-menu");
	}

	hideMenu() {
		Menu.setApplicationMenu(new Menu());
	}

	refresh(props) {
		this.assignMenu(this.page, props || this.props);
	}

	getInitialMenu(templates) {
		let menu = new Menu();
		let fteTemplate = process.platform == "darwin" ? templates.fte : templates.fteFile;

		templates.help.submenu.tutorial.visible = false;

		this.build(fteTemplate, templates.help);

		menu.append(new MenuItem(fteTemplate));
		if (global.debug) menu.append(new MenuItem(templates.debug));
		menu.append(new MenuItem(templates.help));

		return menu;
	}

	getLibraryMenu(templates) {
		let appState = this.store.getState().AppReducer;
		let libraryState = this.store.getState().LibraryReducer;

		let menu = new Menu();
		let state = this.store.getState();

		/*
		 This is the place to update the menus(templates)
		 It HAS to happen before invoking replaceSubMenus.
		 example:     templates.app.submenu.preferences.submenu.smartpad.enabled = false;
		 */

		this.build(templates.app, templates.file, templates.groupsFile, templates.window, templates.tools, templates.help);

		if (process.platform == "darwin") {
			menu.append(new MenuItem(templates.app));

			if (libraryState.context == "GROUPS")
				menu.append(new MenuItem(templates.groupsFile));
			else
				menu.append(new MenuItem(templates.file));

			menu.append(new MenuItem(templates.window));
		}
		else {
			if (libraryState.context == "GROUPS")
				menu.append(new MenuItem(templates.groupsFile));
			else
				menu.append(new MenuItem(templates.file));

			menu.append(new MenuItem(templates.window));
			menu.append(new MenuItem(templates.tools));
		}

		if (global.debug) menu.append(new MenuItem(templates.debug));
		menu.append(new MenuItem(templates.help));

		return menu;
	}

	getEditMenu(templates) {
		let editState = this.store.getState().EditReducer;
		let menu = new Menu();

		this.build(templates.app, templates.fileEdit, templates.edit, templates.layer, templates.window, templates.tools, templates.help);

		if (process.platform == "darwin") {
			menu.append(new MenuItem(templates.app));
			menu.append(new MenuItem(templates.fileEdit));

			if (!editState.noteProgress) {
				menu.append(new MenuItem(templates.edit));
				menu.append(new MenuItem(templates.layer));
			}

			menu.append(new MenuItem(templates.window));
		}
		else {
			menu.append(new MenuItem(templates.fileEdit));

			if (!editState.noteProgress) {
				menu.append(new MenuItem(templates.edit));
				menu.append(new MenuItem(templates.layer));
			}

			menu.append(new MenuItem(templates.window));
			menu.append(new MenuItem(templates.tools));
		}

		if (global.debug) menu.append(new MenuItem(templates.debug));
		menu.append(new MenuItem(templates.help))

		return menu;
	}

	getLiveMenu(templates) {
		var menu = new Menu();

		this.build(templates.app, templates.fileLive, templates.window, templates.tools, templates.help);

		if (process.platform == "darwin") {
			menu.append(new MenuItem(templates.app));
			menu.append(new MenuItem(templates.fileLive));
			menu.append(new MenuItem(templates.window));
		}
		else {
			menu.append(new MenuItem(templates.fileLive));
			menu.append(new MenuItem(templates.window));
			menu.append(new MenuItem(templates.tools));
		}

		if (global.debug) menu.append(new MenuItem(templates.debug));
		menu.append(new MenuItem(templates.help))

		return menu;
	}

	getMenuTemplates(authorized) {
		let appState = this.store.getState().AppReducer;
		let editState = this.store.getState().EditReducer;
		let libraryState = this.store.getState().LibraryReducer;

		let saveEnabled = !!(editState.note && editState.note.strokes.length > 0 && editState.saveEnabled);

		return {
			fte: {
				label: LocalesManager.dictionary["system.menu.app.name"],
				submenu: {
					about: this.getAboutTemplate(),
					separator: {
						type: "separator"
					},
					quit: {
						label: LocalesManager.dictionary["system.menu.quit"],
						accelerator: "Cmd+Q",
						role: "quit"
					}
				}
			},
			fteFile: {
				label: LocalesManager.dictionary["system.menu.file"],
				submenu: {
					quit: {
						label: LocalesManager.dictionary["system.menu.quit"],
						accelerator: "Alt+F4",
						role: "quit"
					}
				}
			},
			app: {
				label: LocalesManager.dictionary["system.menu.app.name"],
				submenu: {
					about: this.getAboutTemplate(),
					// preferences: this.getPreferencesTemplate(),
					// upgradePlan: {
					//   label: LocalesManager.dictionary["settings.inkspace.upgrade.plan"]
					// },
					separator1: {
						type: "separator"
					},
					signOut: this.getSignOutTemplate(authorized),
					separator2: {
						type: "separator"
					},
					quit: {
						label: LocalesManager.dictionary["system.menu.quit"],
						accelerator: "Cmd+Q",
						role: "quit"
					}
				}
			},
			groupsFile: {
				label: LocalesManager.dictionary["system.menu.file"],
				submenu: {
					tag: new MenuItem({
						label: LocalesManager.dictionary["tooltip.tags.manager"],
						enabled: appState.online && ContentManager.selected.length > 0 && !libraryState.rotateInProgress,
						click: () => {
							if (AuthenticationManager.hasAccess())
								this.store.dispatch(modalsAction.openDialog(Modals.TAGS_MANAGER));
							else
								AuthenticationManager.login();
						}
					}),
					export: this.getExportTemplate(),
					separator1: {
						type: "separator"
					},
					delete: {
						label: LocalesManager.dictionary["menu.delete"],
						enabled: !!libraryState.filterGroup,
						accelerator: "Delete",
						click: () => this.store.dispatch(modalsAction.openDialog(Modals.REMOVE_GROUP))
					},
					separatorExit: {
						type: "separator",
						remove: process.platform == "darwin"
					},
					quit: {
						label: LocalesManager.dictionary["system.menu.quit"],
						accelerator: "Alt+F4",
						role: "quit",
						remove: process.platform == "darwin"
					}
				}
			},
			file: {
				label: LocalesManager.dictionary["system.menu.file"],
				submenu: {
					edit: {
						label: LocalesManager.dictionary["menu.edit"],
						enabled: ContentManager.selected.length === 1,
						accelerator: "CmdOrCtrl+O",
						click: () => {
							// SETTINGS if open
							this.store.dispatch(modalsAction.closeDialog());
							this.store.dispatch(push("/creation"));
						}
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
						click: () => this.store.dispatch(libraryAction.combineNotes(ContentManager.selected))
					},
					tag: new MenuItem({
						label: LocalesManager.dictionary["tooltip.tags.manager"],
						enabled: appState.online && ContentManager.selected.length > 0 && !libraryState.rotateInProgress,
						click: () => {
							if (AuthenticationManager.hasAccess())
								this.store.dispatch(modalsAction.openDialog(Modals.TAGS_MANAGER));
							else
								AuthenticationManager.login();
						}
					}),
					groups: this.getGroupsTemplate(),
					export: this.getExportTemplate(),
					separator1: {
						type: "separator"
					},
					// startCollaboration: {
					//   label: LocalesManager.dictionary["menu.start.collaboration"],
					//   enabled: profileSubscription === subscriptionTypes.SUBSCRIPTION_PLUS || profileSubscription === subscriptionTypes.SUBSCRIPTION_BASIC
					// },
					// separator2: {
					//   type: "separator"
					// },
					delete: {
						label: LocalesManager.dictionary["menu.delete"],
						enabled: !!ContentManager.selected.length,
						accelerator: "Delete",
						click: () => {
							if (ContentManager.selected.length > 0)
								this.store.dispatch(modalsAction.openDialog(Modals.CONFIRM, {title: "confirm.remove.note.title", content: "confirm.remove.note.description", type: "REMOVE_NOTE", noteIDs: ContentManager.selected}));
						}
					},
					separatorExit: {
						type: "separator",
						remove: process.platform == "darwin"
					},
					quit: {
						label: LocalesManager.dictionary["system.menu.quit"],
						accelerator: "Alt+F4",
						role: "quit",
						remove: process.platform == "darwin"
					}
				}
			},
			fileEdit: {
				label: LocalesManager.dictionary["system.menu.file"],
				submenu: {
					save: {
						label: LocalesManager.dictionary["system.menu.save"],
						enabled: !!saveEnabled,
						accelerator: "CmdOrCtrl+S",
						click: () => this.store.dispatch(editActions.saveNote())
					},
					close: {
						label: LocalesManager.dictionary["system.menu.close"],
						click: () => this.store.dispatch(editActions.transferToLibrary())
					},
					separatorExit: {
						type: "separator",
						remove: process.platform == "darwin"
					},
					quit: {
						label: LocalesManager.dictionary["system.menu.quit"],
						accelerator: "Alt+F4",
						role: "quit",
						remove: process.platform == "darwin"
					}
				}
			},
			fileLive: {
				label: LocalesManager.dictionary["system.menu.file"],
				submenu: {
					close: {
						label: LocalesManager.dictionary["system.menu.close"],
						click: () => this.store.dispatch(editActions.closeNote())
					},
					separatorExit: {
						type: "separator",
						remove: process.platform == "darwin"
					},
					quit: {
						label: LocalesManager.dictionary["system.menu.quit"],
						accelerator: "Alt+F4",
						role: "quit",
						remove: process.platform == "darwin"
					}
				}
			},
			window: {
				label: process.platform == "darwin" ? LocalesManager.dictionary["system.menu.window"] : LocalesManager.dictionary["system.menu.view"],
				submenu: {
					minimize: {
						label: LocalesManager.dictionary["system.menu.minimize"],
						role: "minimize"
					},
					maximize: {
						label: process.platform == "darwin" ? LocalesManager.dictionary["system.menu.zoom"] : LocalesManager.dictionary["system.menu.maximize"],
						click: () => UIManager.maximize()
					}
				}
			},
			edit: {
				label: LocalesManager.dictionary["menu.edit"],
				submenu: {
					splitNote: {
						label: LocalesManager.dictionary["system.menu.split"],
						enabled: !editState.splitMode,
						click: () => this.store.dispatch(editActions.initNoteSplit())
					}
					// undo: {
					//   label: LocalesManager.dictionary["system.menu.undo"],
					//   accelerator: "CmdOrCtrl+Z"
					// },
					// redo: {
					//   label: LocalesManager.dictionary["system.menu.redo"],
					//   accelerator: "Shift+CmdOrCtrl+Z"
					// }
				}
			},
			layer: {
				label: LocalesManager.dictionary["system.menu.layer"],
				submenu: {
					copy: {
						label: LocalesManager.dictionary["menu.copy.layer"],
						click: () => {
							this.store.dispatch(editActions.layerCopy(editState.currentLayer))
							this.store.dispatch(appAction.addNotification('notification.edit.layerCopy'))
						}
					},
					paste: {
						label: LocalesManager.dictionary["menu.paste.layer"],
						enabled: !!editState.clipboard,
						click: () => {
							this.store.dispatch(editActions.layerPaste(editState.currentLayer))
							this.store.dispatch(appAction.addNotification('notification.edit.layerPaste'))
						}
					},
					delete: {
						label: LocalesManager.dictionary["menu.delete.layer"],
						enabled: !!editState.note && editState.note.layers.length >= 2,
						click: () => {
							this.store.dispatch(editActions.layerDelete(editState.currentLayer))
							this.store.dispatch(appAction.addNotification('notification.edit.layerDelete'))
						}
					},
					previous: {
						label: LocalesManager.dictionary["menu.merge.previous"],
						enabled: editState.currentLayer > 0,
						click: () => this.store.dispatch(editActions.layerMergePrevious(editState.currentLayer))
					},
					split: {
						label: LocalesManager.dictionary["menu.split.layer"],
						enabled: !editState.splitMode,
						click: () => this.store.dispatch(editActions.initLayerSplit(editState.currentLayer))
					}
				}
			},
			tools: {
				label: LocalesManager.dictionary["system.menu.tools"],
				submenu: {
					signOut: this.getSignOutTemplate(authorized)
					// separator: {
					// 	type: "separator"
					// },
					// preferences: this.getPreferencesTemplate()
				}
			},
			debug: {
				label: "DEVEL",
				submenu: [
					{label: "Reload", accelerator: "CmdOrCtrl+R", click: AppManager.forceReload.bind(AppManager)},
					{label: "Force Reload", accelerator: "CmdOrCtrl+Shift+R", click: AppManager.forceReload.bind(AppManager)},
					{type: "separator"},
					{label: "Undo", role: "undo"},
					{label: "Redo", role: "redo"},
					{type: "separator"},
					{label: "Cut", role: "cut"},
					{label: "Copy", role: "copy"},
					{label: "Paste", role: "paste"},
					{label: "Select All", role: "selectall"},
					{type: "separator"},
					{label: "Toggle Dev Tools", role: "toggledevtools"}
				]
			},
			help: {
				label: LocalesManager.dictionary["system.menu.help"],
				submenu: {
					help: {
						label: LocalesManager.dictionary["system.menu.inkspace.help"],
						click: () => {
							if (!DeviceManager.type || DeviceManager.type == "VIPER")
								UIManager.openExternal("http://www.wacom.com/start/intuos-pro-paper");
							else
								UIManager.openExternal("http://www.wacom.com/start/sketchpad-pro");
						}
					},
					otherApps: {
						label: LocalesManager.dictionary["system.menu.other.apps"],
						click: () => UIManager.openExternal("http://www.wacom.com/en-us/products/apps-services/bamboo-paper")
					},
					accessories: {
						label: LocalesManager.dictionary["system.menu.accessories"],
						click: () => UIManager.openExternal("http://www.wacom.com/en-de/products/pen-tablets/intuos-pro-medium")
					},
					checkForUpdate: {
						key: "checkForUpdate",
						label: LocalesManager.dictionary["system.menu.check.for.updates"],
						click: () => {
							NativeLinker.send("auto-updater-check-for-update")
						}
					},
					checkingForUpdate: {
						key: "checkingForUpdate",
						label: LocalesManager.dictionary["system.menu.checking.for.update"]
					},
					restartToUpdate: {
						key: "restartToUpdate",
						label: LocalesManager.dictionary["system.menu.restart.to.update"],
						click: () => {
							NativeLinker.send("auto-updater-restart-to-update")
						}
					},
					tutorial: {
						label: LocalesManager.dictionary["system.menu.tutorial"],
						enabled: !!DeviceManager.device,
						click: () => {
							this.store.dispatch({type: "MODAL_HIDE"});
							this.store.dispatch({type: "LIBRARY_SEARCH_HIDE"});
							this.store.dispatch({type: "WIZARD_SHOW", body: "Tutorial"});
						}
					},
					separatorAbout: {
						type: "separator",
						remove: process.platform == "darwin"
					},
					about: this.getAboutTemplate(true)
				}
			}
		};
	}

	getSignOutTemplate(authorized) {
		return {
			label: LocalesManager.dictionary["system.menu.sign.out"],
			enabled: authorized && navigator.onLine,
			click: () => this.store.dispatch(appAction.signOut())
		};
	}
	/*
	getPreferencesTemplate() {
		return {
			label: LocalesManager.dictionary["system.menu.preferences"],
			submenu: {
				smartpad: {
					label: LocalesManager.dictionary["system.menu.wacom.device"],
					click: () => this.store.dispatch(modalsAction.openSettings(SettingsTab.DEVICE))
				},
				cloud: {
					label: LocalesManager.dictionary["system.menu.wacomcloud"],
					click: () => this.store.dispatch(modalsAction.openSettings(SettingsTab.CLOUD))
				}
			}
		};
	}
	*/
	getAboutTemplate(help) {
		let remove = false;

		if (process.platform == "darwin")
			remove = !!help;

		let about = {
			label: LocalesManager.dictionary["system.menu.about"],
			remove: remove
		};

		if (process.platform == "darwin")
			about.role = "about";
		else
			about.click = () => this.store.dispatch(modalsAction.openSettings(SettingsTab.ABOUT));

		return about;
	}
}

export default MainMenuManager;
