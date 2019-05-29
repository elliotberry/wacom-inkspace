import React, {Component} from 'react';
import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {FormattedMessage} from 'react-intl';
import classNames from 'classnames';

import Tooltip from 'rc-tooltip';

import HomeIcon from '../icons/HomeIcon.svg';
import SaveIcon from '../icons/edit/SaveIcon.svg';
import SplitNoteIcon from '../icons/edit/SplitNoteIcon.svg';
import PenIcon from '../icons/edit/PenIcon.svg';
import ErazerIcon from '../icons/edit/EraserIcon.svg';
import LayersIcon from '../icons/edit/LayersIcon.svg';

// import LassoIcon from '../icons/edit/LassoIcon.svg';
// import UndoIcon from '../icons/edit/UndoIcon.svg';
// import RedoIcon from '../icons/edit/RedoIcon.svg';

import * as actions from '../../actions/edit';

class Menu extends Component {
	constructor(props) {
		super(props);

		this.handleKeyDown = this.handleKeyDown.bind(this);
	}

	handleKeyDown(e) {
		switch (e.keyCode) {
			// e
			case 69: this.props.selectTool("eraser"); break;
			// p
			case 80: this.props.selectTool("pen"); break;
		}
	}

	componentDidMount() {
		this.props.selectTool("pen");

		if (this.props.lastModifiedDate && this.props.note.lastModifiedDate != this.props.lastModifiedDate)
			this.props.toggleSaveButton(true);

		window.addEventListener("keydown", this.handleKeyDown);
	}

	componentWillUnmount() {
		window.removeEventListener("keydown", this.handleKeyDown);
	}

	componentDidUpdate(prevProps, prevState) {
		if (prevProps.noteUpdated != this.props.noteUpdated)
			this.props.toggleSaveButton(true);
	}

	render() {
		const {layerPaneVisible, activeTool} = this.props;

		var penIconClass = classNames({active: activeTool === 'pen'});
		var eraserIconClass = classNames({active: activeTool === 'eraser'});
		var selectorIconClass = classNames({active: activeTool === 'selector'});
		var layerIconClass = classNames({active: layerPaneVisible});

		var backToLibraryClass = classNames({
			icon: true,
			disabled: this.props.noteProgress
		});

		var saveIconClass = classNames({
			icon: true,
			disabled: !this.props.saveEnabled
		});

		var splitIconClass = classNames({
			icon: true,
			disabled: this.props.note.strokes.length < 2 || this.props.noteProgress
		});

		return (
			<header>
				<div className='menu left pull-left'>
					<ul>
						<li>
							<Tooltip placement={'bottom'} destroyTooltipOnHide={true} overlay={<div><FormattedMessage id={ 'tooltip.backToLibrary' }/></div>} align={{offset: [0, 10]}}>
								<a className={backToLibraryClass} onClick={this.props.transferToLibrary}>
									<HomeIcon />
								</a>
							</Tooltip>
						</li>

						<li>
							<Tooltip placement={'bottom'} destroyTooltipOnHide={true} overlay={<div><FormattedMessage id={ 'tooltip.save' }/></div>} align={{offset: [0, 10]}}>
								<a className={saveIconClass} onClick={::this.props.saveNote}>
									<SaveIcon />
								</a>
							</Tooltip>
						</li>

						<li>
							<Tooltip placement={'bottom'} destroyTooltipOnHide={true} overlay={<div><FormattedMessage id={ 'tooltip.splitNote' }/></div>} align={{offset: [0, 10]}}>
								<a className={splitIconClass} onClick={this.props.initNoteSplit}><SplitNoteIcon /></a>
							</Tooltip>
						</li>
					</ul>
				</div>
				<div className='menu center'>
					<ul>
						<li className={penIconClass}>
							<Tooltip placement={'bottom'} destroyTooltipOnHide={true} overlay={<div><FormattedMessage id={ 'tooltip.pencil' }/></div>} align={{offset: [0, 10]}}>
								<a className='icon' onClick={this.props.selectTool.bind({}, 'pen')}><PenIcon /></a>
							</Tooltip>
						</li>
						<li className={eraserIconClass}>
							<Tooltip placement={'bottom'} destroyTooltipOnHide={true} overlay={<div><FormattedMessage id={ 'tooltip.eraser' }/></div>} align={{offset: [0, 10]}}>
								<a className='icon' onClick={this.props.selectTool.bind({}, 'eraser')}><ErazerIcon /></a>
							</Tooltip>
						</li>
						{/*
						<li className={selectorIconClass}>
							<Tooltip placement={'bottom'} destroyTooltipOnHide={true} overlay={<div>Lasso</div>} align={{offset: [0, 10]}}>
								<a className='icon' onClick={this.props.selectTool.bind({}, 'selector')}><LassoIcon /></a>
							</Tooltip>
						</li>
						<li>
							<Tooltip placement={'bottom'} destroyTooltipOnHide={true} overlay={<div>Undo</div>} align={{offset: [0, 10]}}>
								<a className='icon'><UndoIcon /></a>
							</Tooltip>
						</li>
						<li>
							<Tooltip placement={'bottom'} destroyTooltipOnHide={true} overlay={<div>Redo</div>} align={{offset: [0, 10]}}>
								<a className='icon'><RedoIcon /></a>
							</Tooltip>
						</li>
						 */}
					</ul>
				</div>
				<div className='menu right pull-right'>
					<ul>
						<li className={layerIconClass}>
							<Tooltip
								placement={'bottom'} destroyTooltipOnHide={true} overlay={<div><FormattedMessage id={ 'tooltip.show.hide.layers' } /></div>} align={{offset: [0, 10]}}>
								<a className='icon' onClick={this.props.toggleLayerPanel}><LayersIcon /></a>
							</Tooltip>
						</li>
					</ul>
				</div>
			</header>
		)
	}
}

function mapStateToProps(state) {
	return {
		note: state.EditReducer.note,
		noteProgress: state.EditReducer.noteProgress,
		noteUpdated: state.EditReducer.noteUpdated,
		saveEnabled: state.EditReducer.saveEnabled,
		layerPaneVisible: state.EditReducer.layerPaneVisible && state.EditReducer.splitMode != 'note',
		activeTool: state.EditReducer.activeTool
	}
}

function mapDispatchToProps(dispatch) {
	return bindActionCreators(actions, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(Menu);
