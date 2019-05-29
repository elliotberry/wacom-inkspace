import React, {Component} from 'react';
import {connect} from 'react-redux';
import {bindActionCreators} from 'redux';

import * as actions from '../../actions/live';

import DeviceModel from '../../../scripts/DeviceModel'
import DrawingTool from '../../../scripts/DrawingTool'

import CanvasContainer from './CanvasContainer';

class LiveNote extends Component {
	constructor(props) {
		super(props);
	}

	componentDidMount() {
		let {note} = this.props;

		WILL.init(new DeviceModel(note.size, note.orientation), {
			liveMode: true,
			addStroke: this.props.addStroke
		});

		let lastPoint;

		DeviceManager.liveNewPage = () => {
			if (lastPoint) {
				WILL.endStroke(lastPoint);
				lastPoint = undefined;
			}

			this.props.saveNote();
		}

		DeviceManager.liveNewLayer = () => {
			if (lastPoint) {
				WILL.endStroke(lastPoint);
				lastPoint = undefined;
			}

			this.props.addLayer();
		};

		DeviceManager.liveStrokeStart = (timestamp, penType, penID) => {
			let tool = WILL.tools.getPen(DeviceManager.type, penType);
			tool.activatePathBuilder(DrawingTool.PathBuilderType.PRESSURE);

			WILL.setTool(tool);
		};

		DeviceManager.livePointReceived = (phase, point, path) => {
			if (!WILL.tool) {
				if (phase == 0) console.warn("Points received, tool not found");
				return;
			}

			switch (phase) {
				case 0:
					lastPoint = point;
					WILL.beginStroke(point);
					break;
				case 1:
					lastPoint = point;
					WILL.moveStroke(point);
					break;
				case 2:
					if (path) WILL.path = path;

					lastPoint = undefined;
					WILL.endStroke(point);
					break;
			}
		}

		WILL.clear();

		WILL.setCurrentLayer(0);
		WILL.setLayers(note.layers);
	}

	componentDidUpdate(prevProps, prevState) {
		if (prevProps.layerAdded != this.props.layerAdded) {
			WILL.setCurrentLayer(this.props.note.layers.length - 1);
			WILL.setLayers(this.props.note.layers);
		}

		if (prevProps.note != this.props.note) {
			WILL.setCurrentLayer(0);
			WILL.setLayers(this.props.note.layers);
		}
	}

	componentWillUnmount() {
		WILL.finalize();

		delete DeviceManager.livePointReceived;
		delete DeviceManager.liveStrokeStart;
		delete DeviceManager.liveNewLayer;
		delete DeviceManager.liveNewPage;
	}

	render() {
		return (
			<div className="content">
				<CanvasContainer />
			</div>
		)
	}
}

function mapStateToProps(state) {
	return {
		note: state.LiveReducer.note,
		layerAdded: state.LiveReducer.layerAdded
	}
}

function mapDispatchToProps(dispatch) {
	return bindActionCreators(actions, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(LiveNote);
