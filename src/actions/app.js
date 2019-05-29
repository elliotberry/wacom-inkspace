import {openDialog, closeDialog} from './modals';

import * as Modals from '../constants/Modals';
import * as ActionTypes from '../constants/ActionTypes';

function addNotification(message, props) {
	if (typeof message == "string") {
		message = {
			key: "em" + Math.random(),
			message: message,
			props: props || {},
			translatable: true
		};
	}
	else
		message.props = {};

	return (dispatch, getState) => {
		dispatch({type: ActionTypes.ADD_NOTIFICATION, body: message});
	}
}

function removeNotification(notification) {
	return (dispatch, getState) => {
		dispatch({type: ActionTypes.REMOVE_NOTIFICATION, body: notification});
	}
}

function updateDownloadProgress(total) {
	return (dispatch, getState) => {
		let {downloadProgress} = getState().AppReducer;
		let nextState = Object.assign({}, downloadProgress);

		if (total)
			nextState.total = total;
		else {
			nextState.downloaded++;

			if (nextState.downloaded == nextState.total)
				setTimeout(() => dispatch({type: ActionTypes.UPDATE_DOWNLOAD_PROGRESS, body: {downloaded: 0, total: 0}}), 500);
		}

		dispatch({type: ActionTypes.UPDATE_DOWNLOAD_PROGRESS, body: nextState});
	}
}

function cancelDownloadProgress() {
	return (dispatch, getState) => {
		dispatch({type: ActionTypes.UPDATE_DOWNLOAD_PROGRESS, body: {downloaded: 0, total: 0}});
	}
}

function completeAppUpdate() {
	return (dispatch, getState) => {
		DBManager.edit(DBManager.entities.SETTINGS, {update: false});
		UAManager.install();
	}
}

function setDevice(device) {
	return (dispatch, getState) => {
		dispatch({type: ActionTypes.SET_DEVICE, body: device});
	}
}

function setProfile(profile) {
	return (dispatch, getState) => {
		dispatch({type: ActionTypes.SET_PROFILE, body: profile});
	}
}

function setLanguage(language) {
	return (dispatch, getState) => {
		dispatch({type: ActionTypes.SET_LANGUAGE, body: language});
	}
}

function signOut() {
	return (dispatch, getState) => {
		let {cloudSyncing} = getState().LibraryReducer;

		dispatch(closeDialog());
		dispatch(openDialog(Modals.CONFIRM, {title: "logout.title", content: (cloudSyncing ? "logout.syncing.confirm.description" : "logout.confirm.description"), type: "LOG_OUT", buttons: {confirm: {text: "btn.OK"}}}));
	}
}

export {
	addNotification,
	removeNotification,
	updateDownloadProgress,
	cancelDownloadProgress,
	completeAppUpdate,
	setDevice,
	setProfile,
	setLanguage,
	signOut
}
