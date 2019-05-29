import React, {Component} from 'react';
import {FormattedMessage} from 'react-intl';

import LoadingIcon from '../icons/LoadingIcon';

class DownloadNotesProgress extends Component {
	constructor(props) {
		super(props);

		this.state = {
			hidden: true
		};
	}

	componentDidUpdate(prevProps, prevState) {
		if (prevProps.total == 0) {
			if (this.props.total > 0)
				this.setState({hidden: false});
		}
		else if (!this.state.hidden) {
			if (this.props.downloaded == this.props.total || this.props.total == 0)
				this.setState({hidden: true});
		}
	}

	render() {
		let downloading = Math.min(this.props.downloaded + 1, this.props.total);

		return (
			<div className="progress-indicator-container">
				<div className={"progress-indicator" + (this.state.hidden ? "" : " visible")}>
					<div className="progress-inner">
						<div className="progress-icon">
							<LoadingIcon color="#ffffff" />
						</div>
						<div className="progress-message">
							<FormattedMessage id={ 'notification.note.transfer' } values={{count: downloading, amount: this.props.total}} />
							{(() => (DeviceManager.transportProtocol == SmartPadNS.TransportProtocol.USB) ? <span><FormattedMessage id={ 'notification.do.not.unplug.device' } /></span>  : null)()}
						</div>
					</div>
				</div>
			</div>
		)
	}
}

export default DownloadNotesProgress;
