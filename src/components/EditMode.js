import React, {Component} from 'react';
import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {FormattedMessage} from 'react-intl';

import {Circle} from 'rc-progress';

import LayerPane from './edit/LayerPane';
import Menu from './edit/Menu'
import Scrub from './edit/Scrub';
import EditNote from './edit/EditNote';

import * as actions from '../actions/edit';

import ReactUtils from '../globals/ReactUtils';

class EditMode extends Component {
	constructor(props) {
		super(props);

		this.props.initEditMode();

		this.state = {
			rotation: 0,
			percent: -1,
			progress: true
		}
	}

	rotate() {
		this.setState({rotation: this.state.rotation + 10});
	}

	componentDidUpdate(prevProps) {
		if (
			this.props.hasClipboard != prevProps.hasClipboard
			|| this.props.currentLayer != prevProps.currentLayer
			|| this.props.noteUpdated != prevProps.noteUpdated
			|| this.props.noteProgress != prevProps.noteProgress
			|| this.props.saveEnabled != prevProps.saveEnabled
			|| this.props.splitMode != prevProps.splitMode
			|| !Object.equals(this.props.profile, prevProps.profile)
		) {
			global.mainMenuManager.refresh()
		}
	}

	componentWillUnmount() {
		this.props.finalizeEditMode();
	}

	render() {
		const {note} = this.props;

		let classes = "edit";
		if (this.state.progress) classes += " flex-wrapper";

		return (
			<div className={classes}>
				{(() => this.state.progress ? this.renderLoader() : null)()}
				{(() => (note && note.hasLayers) ? this.renderContainer() : null)()}
			</div>
		);
	}

	renderLoader() {
		let style = (this.state.percent == -1) ? {transform: `rotate(${this.state.rotation}deg)`} : null;
		let percent = (this.state.percent == -1) ? 25 : this.state.percent;
		let percentStyle = (this.state.percent == -1) ? {visibility: "hidden"} : null;

		if (this.state.percent == -1)
			setTimeout(::this.rotate, 30);

		return (
			<div className="loading">
				<div className="progress-bar">
					<Circle percent={percent} strokeWidth="2" strokeColor="#00AEEF" style={style} />
				</div>
				<div className="details"><FormattedMessage id={'edit.loading.content'}/></div>
				<div className="subdetails" style={percentStyle}>{Math.ceil(this.state.percent)}%</div>
			</div>
		);
	}

	renderContainer() {
		let style = this.state.progress ? {display: "none"} : null;

		return (
			<div className="container" style={style}>
				<div>
					{(() => this.props.splitScrubVisible ? <Scrub /> : <Menu />)()}
					<EditNote />
				</div>

				<LayerPane />
			</div>
		);
	}
}

function mapStateToProps(state) {
	return {
		profile: state.AppReducer.profile,

		hasClipboard: !!state.EditReducer.clipboard,
		splitScrubVisible: !!state.EditReducer.splitMode,

		note: state.EditReducer.note,
		noteUpdated: state.EditReducer.noteUpdated,
		noteProgress: state.EditReducer.noteProgress,
		saveEnabled: state.EditReducer.saveEnabled,
		layersChanged: state.EditReducer.layersChanged,
		currentLayer: state.EditReducer.currentLayer,
		splitMode: state.EditReducer.splitMode
	}
}

function mapDispatchToProps(dispatch) {
	return bindActionCreators(actions, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(ReactUtils.createParentTracker(EditMode));
