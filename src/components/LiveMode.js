import React, {Component} from 'react';
import {FormattedMessage} from 'react-intl';
import {withRouter} from 'react-router-dom';
import {connect} from 'react-redux';
import {bindActionCreators} from 'redux';

import Tooltip from 'rc-tooltip';

import * as actions from '../actions/live';

import LiveNote from './edit/LiveNote';

import HomeIcon from './icons/HomeIcon.svg';

class LiveMode extends Component {
	constructor(props) {
		super(props);
	}

	componentDidMount() {
		PowerManager.blockSleep()

		this.props.addNotification('notification.livemode.info');
		this.props.newNote();

		DeviceManager.liveDeviceClosed = () => {
			this.props.addNotification('notification.livemode.disconnected');
			this.redirectToLibrary();
		}
	}

	componentWillUnmount() {
		PowerManager.unblockSleep();

		this.props.saveNote(() => {
			if (AppManager.closing)
				AppManager.confirmSaveNote();
		});

		this.props.finalizeLiveMode();
		delete DeviceManager.liveDeviceClosed;
	}

	redirectToLibrary() {
		this.props.history.push("/library");
	}

	render() {
		if (!this.props.note) return null;

		return (
			<div className="edit container">
				<header>
					<div className='menu left pull-left'>
						<ul>
							<li>
								<Tooltip placement={'bottom'} destroyTooltipOnHide={true} overlay={<div ><FormattedMessage id={'tooltip.backToLibrary'} /></div>} align={{offset: [0, 10]}}>
									<a className="icon" onClick={::this.redirectToLibrary}>
										<HomeIcon />
									</a>
								</Tooltip>
							</li>
						</ul>
					</div>
				</header>

				<LiveNote />
			</div>
		);
	}
}

function mapStateToProps(state) {
	return {
		note: state.LiveReducer.note
	}
}

function mapDispatchToProps(dispatch) {
	return bindActionCreators(actions, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(withRouter(LiveMode));
