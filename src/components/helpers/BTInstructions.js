import React, {Component} from 'react';
import {FormattedMessage} from 'react-intl';

const project = require("../../../project.config.js");

class BTInstructions extends Component {
	constructor(props) {
		super(props);
	}

	render() {
		let leSplit = (DeviceManager.type == "VIPER") ? ". " : "";

		return (
			<div className="bt-instructions">
				<a href="javascript:void(0)" onClick={UIManager.openExternal.bind(UIManager, project.btInstructionsUrl[DeviceManager.type])}><FormattedMessage id={"need.help"} /></a>

				<ol>
					<li><FormattedMessage id={"btInstructions.open.settings"} /></li>
					<li><FormattedMessage id={"btInstructions.press.button"} /></li>
					<li>
						<FormattedMessage id={"btInstructions.pair"} />{leSplit}
						{(() => {
							if (DeviceManager.type == "VIPER") {
								return (
									<FormattedMessage id={"btInstructions.le.warning"} />
								);
							}
						})()}
					</li>
					<li>
						{(() => {
							if (DeviceManager.type == "VIPER") {
								return (
									<FormattedMessage id={"btInstructions.come.back.with.next"} />
								);
							}
							else {
								return (
									<FormattedMessage id={"btInstructions.come.back"} />
								);
							}
						})()}
					</li>
				</ol>
			</div>
		);
	}
}

export default BTInstructions;
