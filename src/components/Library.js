import React, {Component} from 'react';
import ReactDOM from 'react-dom';

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import * as WizardTypes from '../constants/WizardTypes';

import * as actions from '../actions/library';
import {openWizard} from '../actions/modals';

import Structure from './library/Structure';
import Groups from './library/Groups';
import Notes from './library/Notes';
import Preview from './library/Preview';
import Search from './library/Search';
import SearchResultSet from './library/SearchResultSet';

import ExportAsTextModal from './modals/ExportAsTextModal';
import DownloadNotesProgress from './modals/DownloadNotesProgress';

import ToggleIcon from './icons/ToggleIcon.svg';
import Dot from './icons/Dot.svg';

const MAX_COLUMN_WIDTH = {
	LIBRARY: 230,
	GROUPS: 180
};
const MAX_MARGIN_WIDTH = 25;

class Library extends Component {
	constructor(props) {
		super(props);

		this.moveSplit = this.moveSplit.bind(this);
		this.endSplit = this.endSplit.bind(this);
		this.resize = this.resize.bind(this);

		this.state = {
			splitPos: null,
			ui: {
				gridWrapperWidth: 0,
				previewWidth: 0,
				previewLeft: 0,
				columns: 0
			}
		};
	}

	beginSplit(e) {
		this.setState({splitPos: e.clientX});
	}

	moveSplit(e) {
		if (!this.state.splitPos) return;

		let delta = e.clientX - this.state.splitPos;
		this.applyUI(delta);

		this.setState({splitPos: e.clientX});
	}

	toggleStructure() {
		let collapsedStructure = !this.props.collapsedStructure;

		global.updateState({collapsedStructure});
		DBManager.edit(DBManager.entities.SETTINGS, {collapsedStructure});
	}

	applyUI(delta, gridWidth) {
		let change = {};

		let gridWrapper = this.gridWrapper;
		// let content = ReactDOM.findDOMNode(this.refs.contentWrapper).lastElementChild;
		let preview = this.preview;

		let structureWidth = this.props.collapsedStructure ? 64 : 200;

		let gridWrapperWidth = gridWidth || gridWrapper.offsetWidth + delta;
		gridWrapperWidth = Math.max(gridWrapperWidth, gridWrapper.getMathStyle("min-width"));
		gridWrapperWidth = Math.min(gridWrapperWidth, gridWrapper.getMathStyle("max-width"));

		let previewWidth = 0;

		if (preview) {
			let previewMinWidth = preview.getMathStyle("min-width");
			previewWidth = window.innerWidth - structureWidth - gridWrapperWidth;

			if (previewWidth < previewMinWidth) {
				gridWrapperWidth -= previewMinWidth - previewWidth;
				previewWidth = previewMinWidth;
			}
		}
		else
			gridWrapperWidth = window.innerWidth - structureWidth;

		change.gridWrapperWidth = gridWrapperWidth;
		change.structureWidth = structureWidth;
		change.previewWidth = previewWidth;
		change.previewLeft = gridWrapperWidth;
		change.columns = Math.ceil(gridWrapperWidth / (MAX_COLUMN_WIDTH[this.props.context] || 230));

		if (!this.state.ui || !Object.equals(this.state.ui, change))
			this.setState({ui: change});

		return change;
	}

	endSplit(e) {
		if (!this.state.splitPos) return;

		this.setState({splitPos: null});

		global.updateState({gridWidth: this.state.ui.gridWrapperWidth});
		DBManager.edit(DBManager.entities.SETTINGS, {gridWidth: this.state.ui.gridWrapperWidth});
	}

	resize(e) {
		this.applyUI(0);
	}

	componentDidMount() {
		if (global.whatsNew) {
			global.whatsNew = false;
			this.props.openWizard(WizardTypes.WHATS_NEW);
		}
		else if (DeviceManager.device && !this.props.tutorial)
			this.props.openWizard(WizardTypes.TUTORIAL);

		document.addEventListener("pointermove", this.moveSplit);
		document.addEventListener("pointerup", this.endSplit);
		window.addEventListener("resize", this.resize);

		this.applyUI(0, this.props.gridWidth);
	}

	shouldComponentUpdate(nextProps, nextState) {
		if (this.props.gridWidth != nextProps.gridWidth) return false;
		return true;
	}

	componentDidUpdate(prevProps) {
		if (
			!Object.equals(this.props.profile, prevProps.profile) ||
			this.props.lastModified != prevProps.lastModified
		) {
			global.mainMenuManager.assignMenu("library")
		}

		if (this.props.context != prevProps.context) {
			if (this.props.context == "GROUPS")
				this.applyUI(0);
			else if (this.props.context == "LIBRARY")
				this.applyUI(0, this.props.gridWidth);
		}

		if (this.props.collapsedStructure != prevProps.collapsedStructure)
			this.applyUI(0)
	}

	componentWillUnmount() {
		document.removeEventListener("pointermove", this.moveSplit);
		document.removeEventListener("pointerup", this.endSplit);
		window.removeEventListener("resize", this.resize);
	}

	render() {
		return (
			<div className={"library " + this.props.context}>
				{this.renderGridCSS()}
				{this.renderStructure()}
				{this.renderGroups()}
				{this.renderNotes()}
				{this.renderPreview()}

				<ExportAsTextModal />
				<DownloadNotesProgress downloaded={this.props.downloadProgress.downloaded} total={this.props.downloadProgress.total} />

				{(() => this.props.searchWindowVisible ? <Search executeSearch={this.props.executeSearch} hideSearch={this.props.hideSearch} /> : null)()}
			</div>
		);
	}

	renderGridCSS() {
		if (!["LIBRARY", "GROUPS"].includes(this.props.context)) return null;

		let width = this.state.ui.gridWrapperWidth;
		let columns = this.state.ui.columns;

		let margins = columns - 1;

		let columnWidth = (width - (margins * MAX_MARGIN_WIDTH)) / columns;
		let columnPercent = columnWidth * 100 / width;
		let marginPercent = (100 - columns * columnPercent) / margins;
		let fontPercent = columnPercent * 8 / 100;

		return (
			<style type="text/css">
				{`.grid {font-size: ${width}px;}`}
				{`.grid .item {width: ${columnPercent}%; padding-top: ${columnPercent}%; margin-right: ${marginPercent}%;}`}
				{`.grid .item:nth-child(${columns}n) {margin-right: 0;}`}
				{`.grid .item .thumb-title {font-size: ${fontPercent}%;}`}
			</style>
		);
	}

	renderStructure() {
		let styles = {width: this.state.ui.structureWidth + "px"};

		return (
			<div className={"structure" + (this.props.collapsedStructure?" collapsed":"")} style={styles}>
				<Structure />
				<div className="collapser"><ToggleIcon onClick={::this.toggleStructure} /></div>
			</div>
		);
	}

	renderNotes() {
		if (this.props.context == "GROUPS") return null;

		let styles = {width: this.state.ui.gridWrapperWidth + "px", left: this.state.ui.structureWidth + "px"};

		return (
			<div className="notes" style={styles} ref={node => this.gridWrapper = node} >
				{(() => (this.props.context == "SEARCH") ? <SearchResultSet ref="contentWrapper" /> : <Notes ref="contentWrapper" />)()}
				<div className="splitter" onPointerDown={::this.beginSplit}><Dot /></div>

			</div>
		);
	}

	renderPreview() {
		if (this.props.context == "GROUPS") return null;

		let styles = {width: this.state.ui.previewWidth + "px", left: (this.state.ui.structureWidth + this.state.ui.gridWrapperWidth) + "px"};

		return (
			<div className="preview" style={styles} ref={node => this.preview = node}>
				<Preview />
			</div>
		);
	}

	renderGroups() {
		if (this.props.context != "GROUPS") return null;

		let styles = {width: this.state.ui.gridWrapperWidth + "px", left: this.state.ui.structureWidth + "px"};

		return (
			<div className="groups" style={styles} ref={node => this.gridWrapper = node}>
				<Groups ref="contentWrapper" />
			</div>
		);
	}
}

function mapStateToProps(state) {
	return {
		profile: state.AppReducer.profile,
		tutorial: state.AppReducer.tutorial,
		downloadProgress: state.AppReducer.downloadProgress,

		context: state.LibraryReducer.context,
		collapsedStructure: state.LibraryReducer.collapsedStructure,
		gridWidth: state.LibraryReducer.gridWidth,
		lastModified: state.LibraryReducer.lastModified,
		searchWindowVisible: state.LibraryReducer.searchWindowVisible
	};
}

function mapDispatchToProps(dispatch) {
	return bindActionCreators({...actions, openWizard}, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(Library);
