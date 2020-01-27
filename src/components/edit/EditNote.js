import React, {Component} from 'react';
import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {Line} from 'rc-progress';

import * as actions from '../../actions/edit';

import ReactUtils from '../../globals/ReactUtils';

import DeviceModel from '../../../scripts/DeviceModel';
import DrawingTool from '../../../scripts/DrawingTool';
import utils from '../../../scripts/utils';

import CanvasContainer from './CanvasContainer';

class EditNote extends Component {
	constructor(props) {
		super(props);

		Object.defineProperty(this, "refreshLayerPreview", { value: utils.debounce(() => this.props.updatePreview(this.props.currentLayer), 100) });

		Object.defineProperty(this, "addStrokeToCurrentLayer", {
			value: (stroke) => {
				this.props.addStrokeToCurrentLayer(stroke);
				this.refreshLayerPreview();
			}
		});

		Object.defineProperty(this, "removeStrokesFromCurrentLayer", {
			value: (strokes) => {
				this.props.removeStrokesFromCurrentLayer(strokes);
				this.refreshLayerPreview();
			}
		});

		this.state = {
			deviceModel: new DeviceModel(this.props.note.size, this.props.note.orientation),
			progress: false,
			percent: 0
		};
	}

	onContextMenu(e) {
		// e.preventDefault();
		// contextMenuManager.showLassoContextMenu();
	}

	componentDidMount() {
		WILL.init(this.state.deviceModel, {
			addStroke: this.addStrokeToCurrentLayer,
			removeStrokes: this.removeStrokesFromCurrentLayer,
			updatePreview: this.props.updatePreview,
			startProgress: () => {
				this.setState({progress: true, percent: 0});
				global.updateState({noteProgress: true});

				if (this.props.parent.state.progress)
					this.props.parent.setState({percent: 0});
			},
			updateProgress: percent => {
				this.setState({percent});

				if (this.props.parent.state.progress)
					this.props.parent.setState({percent});
			},
			completeProgress: () => {
				if (!this.state.progress) {
					if (this.props.parent.state.progress)
						this.props.parent.setState({progress: false}, () => WILL.context2D.fitToScreen());

					return;
				}

				this.setState({percent: 100});

				if (this.props.parent.state.progress)
					this.props.parent.setState({percent: 100});

				setTimeout(() => {
					this.setState({progress: false});
					global.updateState({noteProgress: false, pasting: false});

					if (this.props.parent.state.progress)
						this.props.parent.setState({progress: false}, () => WILL.context2D.fitToScreen());
				}, 200);
			}
		});

		if (this.props.activeTool)
			WILL.setTool(WILL.tools[this.props.activeTool]);

		WILL.setCurrentLayer(this.props.currentLayer);

		this.setState({progress: this.props.noteProgress}, () => {
			WILL.enableStrokeInput();
			WILL.enableZoomAndPan();

			WILL.setLayers(this.props.note.layers);

			this.props.generatePreviewsPane();
		});
	}

	updateTool(tool) {
		if (tool) {
			WILL.enableStrokeInput();
			WILL.setTool(WILL.tools[tool]);
		}
		else
			WILL.disableStrokeInput();
	}

	componentDidUpdate(prevProps, prevState) {
		if (prevProps.activeTool != this.props.activeTool)
			this.updateTool(this.props.activeTool)

		if (prevProps.currentLayer != this.props.currentLayer)
			WILL.setCurrentLayer(this.props.currentLayer);

		if (prevProps.layersChanged != this.props.layersChanged)
			WILL.setLayers(this.props.note.layers);

		if (prevProps.splitMode != this.props.splitMode)
			WILL.setSplitMode(this.props.splitMode, this.props.splitCanceled);

		if (prevProps.splitIndex != this.props.splitIndex)
			WILL.setSplitIndex(this.props.splitIndex);
	}

	componentWillUnmount() {
		WILL.finalize();
	}

	render() {
		// <canvas ref="canvas" onContextMenu={::this.onContextMenu} />

		return (
			<div className="content">
				{(() => (this.state.progress ? this.renderProgressBar() : null))()}

				<CanvasContainer />
			</div>
		)
	}

	renderProgressBar() {
		let surfaceSize = this.state.deviceModel.getSurfaceSize(WILL.context2D.transformScaleFactor);
		let surfaceStyle = {
			width: surfaceSize.width,
			height: surfaceSize.height
		};

		return (
			<div className="progress-bar-protector flex-wrapper">
				<div className="progress-bar-surface flex-wrapper" style={surfaceStyle}>
					<div className="edit-progress-bar">
						<Line percent={this.state.percent} strokeWidth="2" strokeColor="#00AEEF" />
					</div>
				</div>
			</div>
		);
	}
}

function mapStateToProps(state) {
	return {
		activeTool: state.EditReducer.activeTool,

		splitMode: state.EditReducer.splitMode,
		splitCanceled: state.EditReducer.splitCanceled,
		splitIndex: state.EditReducer.splitIndex,

		note: state.EditReducer.note,
		noteProgress: state.EditReducer.noteProgress,
		layersChanged: state.EditReducer.layersChanged,
		currentLayer: state.EditReducer.currentLayer
	}
}

function mapDispatchToProps(dispatch) {
	return bindActionCreators(actions, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(ReactUtils.createParentTracker(EditNote));
