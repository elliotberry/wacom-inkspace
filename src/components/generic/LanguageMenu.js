import React, {Component} from 'react';

import ArrowDown from '../icons/ArrowDown.svg';

export default class LanguageMenu extends Component {
	constructor(props) {
		super(props);
	}

	showLanguagesMenu() {
		if (this.props.export)
			contextMenuManager.showExportLanguagesMenu(this.props.updateDefault);
		else
			contextMenuManager.showLanguagesMenu();
	}

	render() {
		let language;

		if (this.props.export)
			language = LocalesManager.getLangName(LocalesManager.defaultNoteLocale);
		else
			language = LocalesManager.getLangName();

		return (
			<span className={this.props.classNames} onClick={::this.showLanguagesMenu}>
				<a name={this.props.name} className="select-lang">{language} <ArrowDown /></a>
			</span>
		);
	}
}
