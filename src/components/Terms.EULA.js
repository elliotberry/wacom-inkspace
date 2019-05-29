import React, { Component } from 'react';
import {Tab, Tabs, TabList, TabPanel} from 'react-tabs';
import {FormattedMessage} from 'react-intl';

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import Button from './generic/Button'
import LanguageMenu from './generic/LanguageMenu';

import * as WizardSteps from '../constants/WizardSteps'

import * as actions from '../actions/fte'

const pkg = require("../../package.json");
const pkgVersion = pkg.version.split("-")[0];

class Terms extends Component {
	constructor(props) {
		super(props);

		this.state = {
			PrivacyNotice: false,
			LicenseAgreement: false
		};
	}

	accept() {
		if (this.props.fte) {
			DBManager.edit(DBManager.entities.SETTINGS, {version: pkgVersion});
			global.redirect("/library");
		}
		else {
			this.props.redirect(WizardSteps.SETUP_DEVICE);
			global.redirect("/fte");
		}
	}

	decline() {
		this.props.redirect(WizardSteps.WELCOME);
		global.redirect("/fte");
	}

	update(e) {
		this.setState({[e.currentTarget.id]: e.currentTarget.checked});
	}

	componentDidMount() {
		let previousVersion = NativeLinker.get("previousVersion");

		if (this.props.fte && previousVersion < 250)
			DBManager.edit(DBManager.entities.SETTINGS, {version: previousVersion+""});
	}

	render() {
		const TermsOfUse = require("html-loader!../l10n/terms/" + LocalesManager.lang + ".html");
		const EULA = require("html-loader!../l10n/terms/ja.html");

		let nextClassName = (this.state["PrivacyNotice"] && this.state["LicenseAgreement"])? "" : "disabled";

		return (
			<div className="fte container terms">
				<Tabs>
					<TabList>
						<Tab><span>Privacy Notice</span></Tab>
						<Tab><span>EULA</span></Tab>
					</TabList>
					<TabPanel>
						<div className="terms-content" dangerouslySetInnerHTML={{ __html: eval(TermsOfUse) }}></div>
					</TabPanel>
					<TabPanel>
						<div className="terms-content" dangerouslySetInnerHTML={{ __html: eval(EULA) }}></div>
					</TabPanel>
				</Tabs>

				<div className="terms-bar">
					<div className="lang-container">
						<div className="privacy-agree-row">
							<input id="PrivacyNotice" ref="PrivacyNotice" type="checkbox" checked={this.state["PrivacyNotice"]} onChange={::this.update} />
							<label htmlFor="PrivacyNotice">I agree with Privacy Notice</label>
						</div>
						<div className="license-agree-row">
							<input id="LicenseAgreement" ref="LicenseAgreement" type="checkbox" checked={this.state["LicenseAgreement"]} onChange={::this.update} />
							<label htmlFor="LicenseAgreement">I agree with License Agreement</label>
							<LanguageMenu name="display-language" />
						</div>
					</div>

					<div className="action-bar">
						<Button className={nextClassName} text="btn.next" click={::this.accept} />
					</div>
				</div>
			</div>
		);
	}
}

function mapStateToProps(state) {
	return {
		fte: state.AppReducer.fte
	};
}

function mapDispatchToProps(dispatch) {
	return bindActionCreators(actions, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(Terms);
