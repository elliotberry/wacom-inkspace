import React, {Component} from 'react';
import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import LayerPane from './edit/LayerPane';
import Menu from './edit/Menu'
import Scrub from './edit/Scrub';
import EditNote from './edit/EditNote';

import * as actions from '../actions/edit';

class EditMode extends Component {
	constructor(props) {
		super(props);

		this.props.initEditMode();
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
		if (!note || !note.hasLayers()) return null;

		return (
			<div className="edit">
				<div className="container">
					{(() => this.props.splitScrubVisible ? <Scrub /> : <Menu />)()}
					<EditNote />
				</div>

				<LayerPane />
			</div>
		);
	};
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

export default connect(mapStateToProps, mapDispatchToProps)(EditMode);
