import {addNotification} from './app';

import {Note} from '../../scripts/Note';

import * as ActionTypes from '../constants/ActionTypes'

function newNote() {
	const deviceModel = DeviceManager.getDeviceModel();

	let note = new Note({
		size: deviceModel.size,
		transform: deviceModel.transform,
		locale: LocalesManager.defaultNoteLocale
	});

	note.addLayer();

	return (dispatch, getState) => {
		dispatch({type: ActionTypes.LIVE_MODE_NEW_NOTE, body: note});
	}
}

function addLayer() {
	return (dispatch, getState) => {
		let {note} = getState().LiveReducer;

		if (note.layers.length > 0 && !note.layers[note.layers.length - 1].isEmpty()) {
			note.addLayer();

			dispatch({type: ActionTypes.LIVE_MODE_ADD_LAYER});
			dispatch(addNotification('notification.livemode.newLayer'));
		}
	};
}

function addStroke(stroke) {
	return (dispatch, getState) => {
		let {note} = getState().LiveReducer;
		note.layers[note.layers.length - 1].strokes.push(stroke);
	}
}

function saveNote(callback) {
	return (dispatch, getState) => {
		let {note} = getState().LiveReducer;

		note.layers = note.layers.filter(layer => layer.strokes.length > 0);

		dispatch(newNote());

		if (note && note.layers.length) {
			UAManager.edit("Edit Content", "Save Canvas");

			DBManager.editNotes([note])
				.then(callback)
				.catch(e => {
					console.error(e);
					callback();
				});
		}
		else {
			if (callback) callback();
		}
	}
}

function finalizeLiveMode() {
	return (dispatch, getState) => {
		dispatch({type: ActionTypes.LIVE_MODE_FINALIZE});
	}
}

export {
	addNotification,
	newNote,
	addLayer,
	addStroke,
	saveNote,
	finalizeLiveMode
}
