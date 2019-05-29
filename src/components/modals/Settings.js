import React, {Component} from 'react';
import {Tab, Tabs, TabList, TabPanel} from 'react-tabs';
import {FormattedMessage} from 'react-intl';

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {addNotification, signOut} from '../../actions/app';
import * as actions from '../../actions/modals';

import WacomDevice from './settings/WacomDevice';
import WacomCloud from './settings/WacomCloud';
import Support from './settings/Support';
import About from './settings/About';

class Settings extends Component {
	constructor(props) {
		super(props);
	}

	render() {
		if (!this.props.modal || this.props.modal != "Settings") return null;

		let disabled = (DeviceManager.context != DeviceManager.Context.LIBRARY);

		return (
			<div className={"dialog-wrapper flex-wrapper " + this.props.modal} onClick={() => this.props.closeDialog()}>
				<div className="dialog modal" onClick={event => event.stopPropagation()}>
					<div className="dialog-content">
						<Tabs selectedIndex={this.props.settingsTabIndex} onSelect={this.props.selectSettingsTab}>
							<TabList>
								<Tab disabled={disabled} disabledClassName="disabled"><FormattedMessage id="settings.tab.device" /></Tab>
								<Tab disabled={disabled} disabledClassName="disabled"><FormattedMessage id="settings.tab.inkspace" /></Tab>
								<Tab disabled={disabled} disabledClassName="disabled"><FormattedMessage id="settings.tab.support" /></Tab>
								<Tab><FormattedMessage id={ 'settings.tab.about' }/></Tab>
							</TabList>
							<TabPanel>
								<WacomDevice
									device={this.props.device}
									deviceStatus={this.props.deviceStatus}
									batteryCharge={this.props.batteryCharge}
									lastSync={this.props.lastSync}

									addNotification={this.props.addNotification}
									openDialog={this.props.openDialog}
									closeDialog={this.props.closeDialog}
									openWizard={this.props.openWizard}
								/>
							</TabPanel>
							<TabPanel>
								<WacomCloud
									online={this.props.online}
									language={this.props.language}
									exportLocale={this.props.exportLocale}
									profile={this.props.profile}
									authorized={AuthenticationManager.hasAccess()}

									addNotification={this.props.addNotification}
									closeDialog={this.props.closeDialog}
									signOut={this.props.signOut}
								/>
							</TabPanel>
							<TabPanel>
								<Support device={this.props.device} closeDialog={this.props.closeDialog} openWizard={this.props.openWizard} />
							</TabPanel>
							<TabPanel>
								<About />
							</TabPanel>
						</Tabs>
					</div>
				</div>
			</div>
		)
	}
}

function mapStateToProps(state) {
	return {
		modal: state.AppReducer.modal,

		online: state.AppReducer.online,
		device: state.AppReducer.device,
		profile: state.AppReducer.profile,
		language: state.AppReducer.language,
		settingsTabIndex: state.AppReducer.settingsTabIndex,

		deviceStatus: state.LibraryReducer.deviceStatus,
		batteryCharge: state.LibraryReducer.batteryCharge,
		lastSync: state.LibraryReducer.lastSync,
		exportLocale: state.LibraryReducer.exportLocale,
	}
}

function mapDispatchToProps(dispatch) {
	return bindActionCreators({...actions, addNotification, signOut}, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(Settings);
