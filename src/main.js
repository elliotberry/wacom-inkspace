import {createStore, applyMiddleware, compose} from 'redux';
import thunk from 'redux-thunk';

import React from 'react';
import {render} from 'react-dom';
import {Provider} from 'react-intl-redux';
import {Router} from 'react-router-dom'
import {Route} from 'react-router'
import {routerMiddleware, push} from 'react-router-redux';
import createHistory from 'history/createHashHistory';

import App from './components/App';

import * as ActionTypes from './constants/ActionTypes';
import * as DeviceStatus from './constants/DeviceStatus';
import * as action from './actions/generic';
import {rootReducer} from './reducers';

import './styles/app.css';

import AppManager from './globals/AppManager';
import DeviceManager from './globals/DeviceManager';
import AuthenticationManager from './globals/AuthenticationManager';
import LocalesManager from './globals/LocalesManager';
import UAManager from './globals/UAManager';
// import MainMenuManager from './globals/MainMenuManager';
import ContextMenuManager from './globals/ContextMenuManager';
import ContentManager from './globals/ContentManager';
import HWRClient from './globals/HWRClient';

import WILL from '../scripts/WILL';
import WILLContext2D from '../scripts/WILL.context2D';

import whatsNew from './components/settings/wizards/whatsNew/settings';

global.AuthenticationManager = AuthenticationManager;
global.LocalesManager = LocalesManager;
global.DeviceManager = DeviceManager;
global.AppManager = AppManager;
global.UAManager = UAManager;
global.HWRClient = HWRClient;
global.ContentManager = ContentManager;

global.WILL = WILL;
global.WILL.context2D = WILLContext2D;

global.SettingsTab = {
	DEVICE: 0,
	CLOUD: 1,
	SUPPORT: 2,
	ABOUT: 3
};

function configureStore(history, preloadedState) {
	const actionCreators = {...action, push};

	// Build the middleware for intercepting and dispatching navigation actions
	const middleware = routerMiddleware(history);

	const composeEnhancers = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ ? window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__({actionCreators}) : compose;
	const enhancer = composeEnhancers(applyMiddleware(thunk, middleware));

	const store = createStore(rootReducer, preloadedState, enhancer);

	// if (module.hot) {
	// 	module.hot.accept('../reducers', () =>
	// 		store.replaceReducer(require('../reducers')) // eslint-disable-line global-require
	// 	);
	// }

	return store;
}

function renderApp() {
	let initialState = {online: navigator.onLine, deviceStatus: DeviceStatus.NOT_PAIRED};
	let settings = {};

	DBManager.get(DBManager.entities.SETTINGS).then(app_settings => {
		settings = app_settings;

		initialState.fte = !!settings.fte;
		initialState.update = !!settings.update;
		initialState.tutorial = !!settings.tutorial;
		initialState.collapsedStructure = !!settings.collapsedStructure;
		initialState.gridWidth = settings.gridWidth;
		initialState.lastLogin = settings.lastLogin;

		UAManager.init(settings.appID, settings.appUserID);

		return DBManager.getTags();
	}).then(tags => {
		initialState.tags = tags;
		return AuthenticationManager.init();
	}).then(profile => {
		initialState.profile = profile;
		return DeviceManager.init(settings.appID);
	}).then(device => {
		if (device) {
			if (device.protocol) initialState.device = device;
			initialState.orientation = device.orientation;
		}

		LocalesManager.init(settings);
		UAManager.update();

		initialState.exportLocale = LocalesManager.defaultNoteLocale;

// 	let brokenNotes = "".split(", ");
// 	console.log("========= brokenNotes", brokenNotes.length);
// 	return DBManager.deleteNotes(brokenNotes);
// }).then(() => {

		return ContentManager.open();
	}).then(() => {
		const history = createHistory();

		const store = configureStore(history, {
			intl: {locale: LocalesManager.locale, messages: LocalesManager.dictionary}
		});

		let actions = action.genUpdateStateActions(store.getState(), initialState);
		actions.forEach(store.dispatch);

		// DataMigration
		if (!settings.migrationCompleted) {
			if (AuthenticationManager.profile.fte)
				store.dispatch({type: ActionTypes.UPDATE_STATE_APP, body: {fte: true, tutorial: true}});

			// if (AuthenticationManager.profile.fte || settings.fte)
			// 	global.whatsNew = true;

			NativeLinker.linkDataMigration(() => {
				AuthenticationManager.refreshAccessToken(() => AuthenticationManager.syncWithCloud());
				store.dispatch({type: ActionTypes.MIGRATION_COMPLETED});
			});
		}
		else
			AuthenticationManager.refreshAccessToken(() => AuthenticationManager.syncWithCloud());

		if (NativeLinker.get("previousVersion") < parseInt(whatsNew.version.replace(/\./g, "")))
			global.whatsNew = true;

		global.mainMenuManager = new MainMenuManager(store);
		global.contextMenuManager = new ContextMenuManager(store);

		render(
			<Provider store={store}>
				<Router history={history}>
					<Route component={App} />
				</Router>
			</Provider>,
			document.getElementById("root")
		);
	}).catch(console.warn);
}

export default renderApp;
