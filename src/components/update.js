import React, {Component} from 'react';
import {FormattedMessage} from 'react-intl';

import {Circle} from 'rc-progress';

class update extends Component {
	constructor(props) {
		super(props);

		this.state = {
			rotation: 0,
			restart: false
		}
	}

	rotate() {
		this.setState({rotation: this.state.rotation + 10});
	}

	render() {
		return (
			<div className="edit flex-wrapper">
				{(() => NativeLinker.get("updateInstalled") || this.state.restart ? this.renderInstalled() : this.renderLoader())()}
			</div>
		);
	}

	renderInstalled() {
		setTimeout(() => NativeLinker.send("auto-updater-restart-to-update"), 2000);

		return (
			<div className="details"><FormattedMessage id={'system.menu.restart.to.update'}/></div>
		);
	}

	renderLoader() {
		let style = {transform: `rotate(${this.state.rotation}deg)`};

		setTimeout(::this.rotate, 30);

		return (
			<div className="loading">
				<div className="progress-bar">
					<Circle percent="25" strokeWidth="2" strokeColor="#00AEEF" style={style} />
				</div>
				<div className="details"><FormattedMessage id={'update.progress'}/></div>
			</div>
		);
	}
}

export default update;
