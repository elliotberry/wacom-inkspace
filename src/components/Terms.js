import React, { Component } from 'react';
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

	componentDidMount() {
		let previousVersion = NativeLinker.get("previousVersion");

		if (this.props.fte && previousVersion < 250)
			DBManager.edit(DBManager.entities.SETTINGS, {version: previousVersion+""});
	}

	render() {
		const TermsOfUse = require("html-loader!../l10n/terms/" + LocalesManager.lang + ".html");

		return (
			<div className="fte container terms">
				<div className="terms-content" dangerouslySetInnerHTML={{ __html: eval(TermsOfUse) }}></div>
				<div className="terms-bar">
					<LanguageMenu name="display-language" classNames="lang-container" />

					<div className="action-bar">
						<Button text="terms.accept" click={::this.accept} />
						{(() => this.props.fte ? null : <Button className="cancel" text="terms.decline" click={::this.decline} />)()}
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
