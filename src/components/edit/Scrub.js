import React, {Component} from 'react';
import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {FormattedMessage} from 'react-intl';

import Slider from 'rc-slider';
import Tooltip from 'rc-tooltip';

import CancelIcon from '../icons/CancelIcon.svg';
import TickIcon from '../icons/TickIcon.svg';
import LoadingIcon from '../icons/LoadingIcon';

import * as actions from '../../actions/edit';

import utils from '../../../scripts/utils';

const SliderWithTooltip = Slider.createSliderWithTooltip(Slider);

class Scrub extends Component {
	constructor(props) {
		super(props);

		Object.defineProperty(this, "updateSplitIndex", {value: utils.debounce(index => this.props.setSplitIndex(index), 100)});

		this.state = {
			splitIndex: 0
		};
	}

	handleAfterChange(value) {
		this.setState({splitIndex: value});
	}

	componentDidMount() {
		this.setState({splitIndex: this.props.splitIndexMax});
	}

	render() {
		let iconClasses = "icon button scrub-icon";
		let cancelIconClasses = iconClasses + " left";
		let applyIconClasses = iconClasses + " right";

		if (this.props.applyingSplitNote) cancelIconClasses += " disabled";
		if (this.state.splitIndex == 0 || this.state.splitIndex == this.props.splitIndexMax) applyIconClasses += " disabled";

		return (
			<header>
				<div className="flex-wrapper">
					<Tooltip placement={'bottom'} destroyTooltipOnHide={true} overlay={<div><FormattedMessage id={ 'btn.cancel' }/></div>}>
						<a onClick={this.props.cancelSplit} className={cancelIconClasses}><CancelIcon /></a>
					</Tooltip>

					<SliderWithTooltip min={0} max={this.props.splitIndexMax} disabled={this.props.applyingSplitNote} defaultValue={this.props.splitIndexMax} onChange={this.updateSplitIndex} onAfterChange={::this.handleAfterChange} />

					<Tooltip placement={'bottom'} destroyTooltipOnHide={true} overlay={<div><FormattedMessage id={ 'system.menu.split' }/></div>}>
						{(() => this.props.applyingSplitNote ? <div className="icon scrub-icon right"><LoadingIcon /></div> : <a onClick={this.props.applySplit} className={applyIconClasses}><TickIcon /></a>)()}
					</Tooltip>
				</div>
			</header>
		);
	}
}

function mapStateToProps(state) {
	return {
		splitIndexMax: state.EditReducer.splitIndexMax,
		applyingSplitNote: state.EditReducer.applyingSplitNote
	}
}

function mapDispatchToProps(dispatch) {
	return bindActionCreators(actions, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(Scrub);
