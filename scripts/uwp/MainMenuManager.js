import * as Modals from '../../src/constants/Modals';

import * as libraryAction from '../../src/actions/library';
import * as editActions from '../../src/actions/edit';
import * as modalsAction from '../../src/actions/modals';

class MainMenuManager {
	constructor(store) {
		document.onkeydown = function(e) {
			let cancel = false;

			switch (e.keyCode) {
				// Delete
				case 46:
					let enabled = !!ContentManager.selected.length;

					if (enabled && DeviceManager.context == DeviceManager.Context.LIBRARY) {
						cancel = true;

						store.dispatch(modalsAction.openDialog(Modals.CONFIRM, {title: "confirm.remove.note.title", content: "confirm.remove.note.description", type: "REMOVE_NOTE", noteIDs: ContentManager.selected}));
					}

					break;

				// Ctrl+O
				case 79:
					if (e.ctrlKey && DeviceManager.context == DeviceManager.Context.LIBRARY) {
						let enabled = ContentManager.selected.length == 1;

						if (enabled) {
							cancel = true;

							store.dispatch(modalsAction.closeDialog());
							store.dispatch(libraryAction.editNote())
						}
					}

					break;

				// Ctrl+S
				case 83:
					if (e.ctrlKey && DeviceManager.context == DeviceManager.Context.CREATION) {
						let editState = store.getState().EditReducer;
						let enabled = !!(editState.note && editState.note.strokes.length > 0 && editState.saveEnabled);

						if (enabled) {
							cancel = true;
							store.dispatch(editActions.saveNote());
						}
					}

					break;
			}

			if (cancel) {
				e.preventDefault();
				e.stopPropagation();
			}
		};
	}

	assignMenu(name) {}
	refresh() {}
}

export default MainMenuManager
