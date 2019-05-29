import React, {Component} from 'react';
import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {FormattedMessage} from 'react-intl';
import {withRouter} from 'react-router-dom';
import className from 'classnames'
import Tooltip from 'rc-tooltip';

import * as actions from '../../../actions/library';
import {openDialog, openSettings, openWizard} from '../../../actions/modals';

import * as Modals from '../../../constants/Modals'
import * as WizardTypes from '../../../constants/WizardTypes';
import * as WizardSteps from '../../../constants/WizardSteps';
import * as DeviceStatus from '../../../constants/DeviceStatus';

import ConnectedNotChargingIcon from '../../icons/library/device-status/DeviceNotChargingIcon';
import ConnectedChargingIcon from '../../icons/library/device-status/DeviceChargingIcon.svg';
import DisconnectedIcon from '../../icons/library/device-status/DeviceDisconnectedIcon.svg';
import NotPairedIcon from '../../icons/library/device-status/DeviceNotPairedIcon.svg';
import CloudDisconnectedIcon from '../../icons/library/cloud/CloudDisconnectedIcon.svg';
import CloudNotSyncedIcon from '../../icons/library/cloud/CloudNotSyncedIcon.svg';
import CloudSyncedIcon from '../../icons/library/cloud/CloudSyncedIcon.svg';
import CloudSyncingIcon from '../../icons/library/cloud/CloudSyncingIcon.svg';
import CloudSyncingArrowUp from '../../icons/library/cloud/CloudSyncingArrowUp.svg';
import CloudSyncingArrowDown from '../../icons/library/cloud/CloudSyncingArrowDown.svg';
import TagIcon from '../../icons/library/tags-manager/TagIcon.svg';
import SettingsIcon from '../../icons/library/SettingsIcon.svg';
import LiveModeIcon from '../../icons/library/LiveModeIcon.svg';
import SearchIcon from '../../icons/library/SearchIcon.svg';
import LoadingIcon from '../../icons/LoadingIcon';

class Menu extends Component {
	constructor(props) {
		super(props);
	}

	isLibraryEmpty() {
		return !ContentManager.sections.length;
	}

	triggerLiveMode() {
		DeviceManager.triggerLiveMode();
	}

	openSettings() {
		if (this.props.deviceStatus == DeviceStatus.NOT_PAIRED)
			this.props.openWizard(WizardTypes.SETUP_DEVICE, WizardSteps.SETUP_DEVICE);
		else
			this.props.openSettings(SettingsTab.DEVICE);
	}

	login() {
		if (!AuthenticationManager.hasAccess())
			AuthenticationManager.login();
		else
			this.props.openSettings(SettingsTab.CLOUD);
	}

	openTagsEditor() {
		if (AuthenticationManager.hasAccess())
			this.props.openDialog(Modals.TAGS_EDITOR);
		else
			AuthenticationManager.login();
	}

	showSearch() {
		if (AuthenticationManager.hasAccess())
			this.props.showSearch();
		else
			AuthenticationManager.login();
	}

	resolveDeviceSetting() {
		let status = {className: "", icon: null, tooltip: null};

		switch (this.props.deviceStatus) {
			case DeviceStatus.NOT_PAIRED:
				status.className = "not-paired";
				status.icon = <NotPairedIcon />;
				status.tooltip =  <div><FormattedMessage id={ 'device.status.notpaired' }/></div>;

				break;
			case DeviceStatus.DISCONNECTED:
				status.className = "disconnected";
				status.icon = <DisconnectedIcon />;
				status.tooltip =  <div><FormattedMessage id={ 'device.status.disconnected' }/></div>;

				break;
			case DeviceStatus.CONNECTED_NOT_CHARGING:
				let batteryCharge = this.props.batteryCharge || {charging: false, percent: 100};

				if (batteryCharge.charging) {
					status.className = "connected charging";
					status.icon = <ConnectedChargingIcon />;
					status.tooltip = <div><FormattedMessage id={'device.status.charging'} values={{percent: batteryCharge.percent == 0 ? 1 : batteryCharge.percent}} /></div>;
				}
				else {
					status.className = "connected notcharging";

					// status.icon = <ConnectedNotChargingIcon />;
					// status.css = `.icon.device-status.connected.notcharging rect {width: ${batteryCharge.percent / 100 * 14}px}`;

					status.icon = <ConnectedNotChargingIcon width={batteryCharge.percent / 100 * 14} />;
					status.tooltip = <div><span>{batteryCharge.percent == 0 ? 1 : batteryCharge.percent}%</span></div>;
				}

				break;
			case DeviceStatus.SEARCHING_LOADING:
				status.className = "searching-loading";
				status.icon = <LoadingIcon color="#ffffff" />;
				status.tooltip =  <div><FormattedMessage id={ 'device.status.loading' }/></div>;

				break;
		}

		return status;
	}

	render() {
		let authorized = AuthenticationManager.hasAccess();
		let searchInsufficentPermissions = AuthenticationManager.profile && AuthenticationManager.profile.access && !AuthenticationManager.profile.access.rights.includes("SEARCH-TEXT");

		let liveModeIconClass = className({
			'icon': true,
			'disabled': !this.props.device
		});

		let tagsEditorIconClass = className({
			'icon': true,
			'disabled': !this.props.online || this.props.context == "GROUPS"
		});

		let searchIconClass = className({
			'icon': true,
			'disabled': this.isLibraryEmpty() || searchInsufficentPermissions || this.props.context == "GROUPS"
		});

		let syncing = authorized && this.props.online && this.props.cloudSyncing;

		let cloudIconClass = className({
			'icon': true,
			'syncing': syncing,
			'disabled': !this.props.online && !AuthenticationManager.hasAccess()
		});

		let cloudIcon = <CloudNotSyncedIcon />;
		if (authorized) cloudIcon = this.props.cloudSyncing?<CloudSyncingIcon />:<CloudSyncedIcon />;
		if (!this.props.online) cloudIcon = <CloudDisconnectedIcon />;

		let deviceStatusConfig = this.resolveDeviceSetting();

		let deviceSettingsIconClass = className({
			'icon': true,
			'button': true,
			[deviceStatusConfig.className]: true,
			'device-status': true
		});

		return (
			<ul>
				<li>
					{/*<style>{deviceStatusConfig.css}</style>*/}

					<Tooltip placement={'bottom'} destroyTooltipOnHide={true} overlay={deviceStatusConfig.tooltip} align={{offset: [0, 10]}}>
						<a className={deviceSettingsIconClass} onClick={::this.openSettings}>
							{deviceStatusConfig.icon}
						</a>
					</Tooltip>
				</li>
				<li>
					<Tooltip placement={'bottom'} destroyTooltipOnHide={true} overlay={<div ><FormattedMessage id={ 'tooltip.liveMode' } /></div>} align={{offset: [0, 10]}}>
						<a className={liveModeIconClass} onClick={::this.triggerLiveMode}>
							<LiveModeIcon />
						</a>
					</Tooltip>
				</li>
				<li>
					<Tooltip placement={'bottom'} destroyTooltipOnHide={true} overlay={<div ><FormattedMessage id={ 'tooltip.tags.editor' } /></div>} align={{offset: [0, 10]}}>
						<a className={tagsEditorIconClass} onClick={::this.openTagsEditor}>
							<TagIcon />
						</a>
					</Tooltip>
				</li>
				<li>
					<Tooltip placement={'bottom'} destroyTooltipOnHide={true} overlay={<div ><FormattedMessage id={ 'tooltip.search' } /></div>} align={{offset: [0, 10]}}>
				        <a className={searchIconClass} onClick={::this.showSearch}>
            				<SearchIcon />
        				</a>
				    </Tooltip>
				</li>
				<li>
					<Tooltip placement={'bottom'} destroyTooltipOnHide={true} overlay={<div ><FormattedMessage id={ 'tooltip.cloud' } /></div>} align={{offset: [0, 10]}}>
						<a className={cloudIconClass} onClick={::this.login}>
							{cloudIcon}
							{syncing ? <CloudSyncingArrowUp /> : null}
							{syncing ? <CloudSyncingArrowDown /> : null}
						</a>
					</Tooltip>
				</li>
				<li>
					<Tooltip placement={'bottom'} destroyTooltipOnHide={true} overlay={<div ><FormattedMessage id={ 'tooltip.settings' } /></div>} align={{offset: [0, 10]}}>
						<a className='icon' onClick={() => this.props.openSettings(SettingsTab.DEVICE)}>
							<SettingsIcon />
						</a>
					</Tooltip>
				</li>
			</ul>
		);
	}
}

function mapStateToProps(state) {
	return {
		online: state.AppReducer.online,
		profile: state.AppReducer.profile,
		device: state.AppReducer.device,

		context: state.LibraryReducer.context,
		lastModified: state.LibraryReducer.lastModified,
		deviceStatus: state.LibraryReducer.deviceStatus,
		batteryCharge: state.LibraryReducer.batteryCharge,
		cloudSyncing: state.LibraryReducer.cloudSyncing
	};
}

function mapDispatchToProps(dispatch) {
	return bindActionCreators({...actions, openDialog, openSettings, openWizard}, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(withRouter(Menu));
