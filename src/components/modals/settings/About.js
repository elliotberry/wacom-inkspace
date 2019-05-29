import React, {Component} from 'react';
import {FormattedMessage} from 'react-intl';

import Logo from '../../images/logo.svg';

let pkg = require('../../../../package.json');

class About extends Component {
	constructor(props) {
		super(props);
	}

	render() {
		return (
			<div className="about-container">
				<div className="inkspace-about-logo">
					<Logo />
				</div>
				<h1><FormattedMessage id={ 'settings.about.title' } /></h1>
				<p><FormattedMessage id={ 'settings.about.desc' } values={{currentYear: (new Date()).getFullYear()}} /></p>
				<p>{"Version: " + pkg.version}</p>
			</div>
		)
	}
}
export default About;
