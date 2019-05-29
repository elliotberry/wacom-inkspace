import React, {Component} from 'react';
import {FormattedMessage, FormattedDate} from 'react-intl';
import {Link} from 'react-router';
import {withRouter} from 'react-router-dom';

import * as Modals from '../../../constants/Modals';
import * as WizardTypes from '../../../constants/WizardTypes';
import * as WizardSteps from '../../../constants/WizardSteps';
import * as DeviceStatus from '../../../constants/DeviceStatus';

class WacomDevice extends Component {
	constructor(props) {
		super(props);
	}

	setName(e) {
		e.preventDefault();

		if (DeviceManager.downloading) {
			this.props.addNotification("notification.no.device.actions.while.note.transfer");
			return;
		}

		this.props.closeDialog();
		this.props.openDialog(Modals.SET_NAME);
	}

	selectOrientation(e) {
		e.preventDefault();

		if (DeviceManager.downloading) {
			this.props.addNotification("notification.no.device.actions.while.note.transfer");
			return;
		}

		this.props.closeDialog();
		this.props.openDialog(Modals.SELECT_ORIENTATION);
	}

	triggerLiveMode() {
		this.props.closeDialog();
		DeviceManager.triggerLiveMode();
	}

	setupDevice(e) {
		e.preventDefault();

		if (DeviceManager.downloading) {
			this.props.addNotification("notification.no.device.pairing.while.note.transfer");
			return;
		}

		this.props.closeDialog();
		this.props.openWizard(WizardTypes.SETUP_DEVICE, WizardSteps.SETUP_DEVICE);
	}

	render() {
		return (
			<div className="smartpad-container">
				{this.renederDeviceInfo()}

				<div className="device-orientation">
					{(() => DeviceManager.isOpen(true) ? this.renederDeviceActions() : null)()}
					<a onClick={this.setupDevice.bind(this)}><FormattedMessage id={ 'settings.device.pair.device' }/></a>
				</div>
			</div>
		)
	}

	renederDeviceInfo() {
		if (this.props.device) {
			return (
				<ul>
					<li>
						<span className="spad-left"><FormattedMessage id={ 'settings.device.name' }/></span>
						<span className="spad-right">{this.props.device.name}</span>
					</li>
					<li>
						<span className="spad-left"><FormattedMessage id={ 'settings.device.last.synced' }/></span>
						<span className="spad-right"><FormattedDate value={this.props.lastSync} year='numeric' month='long' day='numeric' hour='numeric' minute='numeric' /></span>
					</li>
					<li>
						<span className="spad-left"><FormattedMessage id={ 'settings.device.battery.last.sync' }/></span>
						<span className="spad-right">{this.props.batteryCharge ? this.props.batteryCharge.percent + "%" : null} </span>
					</li>
					<li>
						<span className="spad-left"><FormattedMessage id={ 'settings.device.firmware.version' }/></span>
						<span className="spad-right">{this.props.device.firmwareVersion.version.join(" / ")}</span>
					</li>
				</ul>
			);
		}
		else {
			return (
				<ul>
					<li>
						<FormattedMessage id={ 'settings.device.not.connected' } />
					</li>
				</ul>
			);
		}
	}

	renederDeviceActions() {
		return (
			<div>
				{/*<a onClick={::this.setName}><FormattedMessage id={ 'settings.device.change.name' }/></a>*/}
				<a onClick={::this.selectOrientation}><FormattedMessage id={ 'settings.device.change.orientation' }/></a>
				<a onClick={::this.triggerLiveMode}><FormattedMessage id={ 'tooltip.liveMode' }/></a>
			</div>
		);
	}
}

export default withRouter(WacomDevice);
