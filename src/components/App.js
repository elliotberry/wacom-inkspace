import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import React, {Component} from 'react';
import {withRouter, Route} from 'react-router-dom';
import {NotificationStack} from 'react-notification';

import index from './index';
import refresh from './refresh';
import update from './update';
import error from './error';
import FTE from './FTE';
import Terms from './Terms';
import Library from './Library';
import Edit from './EditMode';
import Live from './LiveMode';

import * as generic from '../actions/generic';
import * as actions from '../actions/app';
import {triggerSaveNote} from '../actions/edit';
import {openDialog, closeDialog, openWizard, moveWizardTo} from '../actions/modals';
import {setDeviceStatus, setBatteryCharge, setLastSync, filterByTag, filterByGroup, refreshLibrary, refreshGroups} from '../actions/library';

import * as ActionTypes from '../constants/ActionTypes';

import Wizard from './modals/Wizard';
import Modal from './modals/Modal';
import SettingsModal from './modals/Settings';

const {Note, Entity} = require("../../scripts/Note");
const messanger = require("../../scripts/WILL.Messanger");

let appPage = null;

class App extends Component {
	constructor(props) {
		super(props);
	}

	checkWebGLSupported() {
		let canvas = document.createElement("canvas");
		return !!(canvas.getContext("webgl") || canvas.getContext("experimental-webgl"));
	}

	componentDidMount() {
		if (global.updateState) return;

		global.redirect = nextLocation => {
			if (location.hash.substring(1) != nextLocation)
				this.props.history.push(nextLocation);
		}

		if (!this.checkWebGLSupported()) {
			global.redirect("/error");
			return;
		}

		if (NativeLinker.get("updateFound")) {
			global.redirect("/update");
			return;
		}

		global.updateState = this.props.updateState;
		global.getState = this.props.getState;

		this.onEnter();

		addEventListener("online", (e) => {
			this.props.updateState({online: true});
			mainMenuManager.refresh();
		});

		addEventListener("offline", (e) => {
			this.props.updateState({online: false});
			mainMenuManager.refresh();
		});

		AppManager.triggerSaveNote = this.props.triggerSaveNote;

		AuthenticationManager.linkUI({
			setProfile: this.props.setProfile,
			openDialog: this.props.openDialog,
			moveWizardTo: this.props.moveWizardTo
		});

		DeviceManager.linkUI({
			setDevice: this.props.setDevice,
			setDeviceStatus: this.props.setDeviceStatus,
			setBatteryCharge: this.props.setBatteryCharge,
			setLastSync: this.props.setLastSync,
			openDialog: this.props.openDialog,
			closeDialog: this.props.closeDialog,
			openWizard: this.props.openWizard,
			moveWizardTo: this.props.moveWizardTo,
			addNotification: this.props.addNotification,
			updateDownloadProgress: this.props.updateDownloadProgress,
			cancelDownloadProgress: this.props.cancelDownloadProgress
		});

		DeviceManager.open("DEFAULT");

		NativeLinker.linkBrowserWindow();
		NativeLinker.linkStoreUpdate(message => {
			if (
				([ActionTypes.TAGS_UPDATE, "UPDATE_NOTES"].includes(message.action) || (message.action == ActionTypes.CLOUD_SYNCING && !message.body))
				&& AuthenticationManager.profile && !AuthenticationManager.profile.linkedWithCloud
			) {
				DBManager.edit(DBManager.entities.PROFILE, {linkedWithCloud: true}).then(() => {
					AuthenticationManager.profile.linkedWithCloud = true;
					this.props.setProfile({...AuthenticationManager.profile});
				});
			}

			if (message.action == ActionTypes.CLOUD_SYNCING)
				AuthenticationManager.syncing = message.body;
			else if (message.action == ActionTypes.LIBRARY_CLEAN) {
				let onUpdate = ContentManager.onUpdate;

				ContentManager.onUpdate = () => {
					this.props.filterByTag(null);
					this.props.filterByGroup(null);
				}

				ContentManager.init();
				ContentManager.onUpdate = onUpdate;

				this.props.refreshGroups();
			}

			if (message.action == "UPDATE_NOTES") {
				// if (global.debug) console.reducer(message.action, Object.assign({}, ...message.body.map(item => ({[item.id]: item}))));
				ContentManager.edit(message.body.map(data => Note.fromJSON(undefined, data)));
			}
			else if (message.action == "DELETE_NOTES")
				ContentManager.remove(Array.from(message.body));
			else if (message.action == "ENTITY_UPDATE") {
				let entity = Entity.fromJSON(message.body);

				if (entity.type == "groups") {
					if (this.props.filterGroup && !entity.get(this.props.filterGroup)) {
						let onUpdate = ContentManager.onUpdate;

						ContentManager.onUpdate = () => this.props.filterByGroup(null);
						ContentManager.setEntity(entity);
						ContentManager.onUpdate = onUpdate;
					}
					else {
						ContentManager.setEntity(entity);
						this.props.refreshGroups();
					}
				}
				else
					ContentManager.setEntity(entity);
			}
			else if (message.action == "CLOUD_FIRST_SYNC_COMPLETED")
				ContentManager.cleanEntityRelations();
			else
				this.props.dispatch(ActionTypes[message.action], message.body);
		});

		ContentManager.onUpdate = this.props.refreshLibrary;
		this.props.refreshLibrary();

		WILL.messanger = messanger;

		WILL.initInkEngine();
		WILL.addNotification = this.props.addNotification;
		WILL.removeNotification = this.props.removeNotification;

		messanger.init();

		if (this.props.update)
			this.props.completeAppUpdate();
	}

	componentDidUpdate(prevProps, prevState) {
		this.onEnter();
	}

	onEnter() {
		let page = this.props.history.location.pathname.substring(1);
		if (page == "refresh" || page == "error" || page == "update" || (appPage && appPage == page)) return;
		if (page == "terms") page = "fte";

		appPage = page;

		let context = page.toUpperCase();
		if (context == "FTE") context = "SETUP";

		DeviceManager.configure(DeviceManager.Context[context]);

		mainMenuManager.assignMenu(page);
		UIManager.setVisualZoomLevelLimits(1, 1);

		UAManager.page(page);
	}

	render() {
		return (
			<div className="app">
				<Route exact path="/" component={index} />
				<Route path="/refresh" component={refresh} />
				<Route path="/update" component={update} />
				<Route path="/error" component={error} />
				<Route path="/fte" component={FTE} />
				<Route path="/terms" component={Terms} />
				<Route path="/library" component={Library} />
				<Route path="/creation" component={Edit} />
				<Route path="/live" component={Live} />

				<Wizard />
				<Modal />

				<SettingsModal />

				<NotificationStack notifications={this.props.notifications.toArray()} onDismiss={this.props.removeNotification} />
			</div>
		);
	}
}

function mapStateToProps(state) {
	return {
		update: state.AppReducer.update,
		profile: state.AppReducer.profile,
		language: state.AppReducer.language,
		notifications: state.NotificationsReducer.notifications,

		filterGroup: state.LibraryReducer.filterGroup,
		cloudSyncing: state.LibraryReducer.cloudSyncing
	};
}

function mapDispatchToProps(dispatch) {
	return bindActionCreators({
		...generic,
		...actions,
		triggerSaveNote,
		setDeviceStatus, setBatteryCharge, setLastSync, filterByTag, filterByGroup, refreshLibrary, refreshGroups,
		openDialog, closeDialog, openWizard, moveWizardTo
	}, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(withRouter(App));
