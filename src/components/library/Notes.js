import React, {Component} from 'react';
import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {FormattedMessage} from 'react-intl';
import ReactListOrigin from 'react-list';
const ReactList = ReactUtils.createParentTracker(ReactListOrigin);

import Tooltip from 'rc-tooltip';
import NewPageIcon from '../icons/library/NewPageIcon.svg';

import * as actions from '../../actions/library';
import {openWizard} from '../../actions/modals';

import Menu from './notes/Menu';
import Section from './notes/Section';

import * as WizardTypes from '../../constants/WizardTypes';
import * as WizardSteps from '../../constants/WizardSteps';

import CancelIcon from '../icons/CancelIcon.svg';

import utils from '../../../scripts/utils';

import ReactUtils from '../../globals/ReactUtils';

const arrow = {
	left: 37,
	up: 38,
	right: 39,
	down: 40
};

const SELECTOR_DEFAULT = {
	pin: null,
	left: 0,
	top: 0,
	width: 0,
	height: 0
};

const KB_SELECTOR_DEFAULT = {
	firstSectionIDX: 0,
	firstSectionItemIDX: 0,
	lastSectionIDX: 0,
	lastSectionItemIDX: 0
};

class Notes extends Component {
	constructor(props) {
		super(props);

		this.selector = SELECTOR_DEFAULT;
		this.kbSelector = KB_SELECTOR_DEFAULT;

		Object.defineProperty(this, "handleScroll", { value: utils.debounce(() => ((this.isLibraryEmpty() || !this.refs.list) ? null : this.refs.list.forceUpdate()), 500) });

		this.init();

		this.state = {
			contentOffsetTop: 0
		}
	}

	init() {
		this.handleKeyDown = ::this.handleKeyDown;
		this.handleKeyUp = ::this.handleKeyUp;

		this.moveSelect = ::this.moveSelect;
		this.endSelect = ::this.endSelect;

		window.addEventListener("keydown", this.handleKeyDown);
		window.addEventListener("keyup", this.handleKeyUp);

		document.addEventListener("mousemove", this.moveSelect);
		document.addEventListener("mouseup", this.endSelect);
	}

	isLibraryEmpty() {
		return !ContentManager.sections.length;
	}

	openTutorial(e) {
		e.preventDefault();

		if (DeviceManager.device)
			this.props.openWizard(WizardTypes.TUTORIAL);
		else
			this.props.openWizard(WizardTypes.SETUP_DEVICE, WizardSteps.SETUP_DEVICE);
	}

	handleKeyDown(e) {
		if (this.props.searchWindowVisible || DeviceManager.context == DeviceManager.Context.SETUP || this.props.modal || ContentManager.sections.length == 0) return;

		let ctrl = (process.platform == "darwin") ? e.metaKey : e.ctrlKey;
		if (ctrl) this.ctrl = true;

		// ctrl + A
		if (ctrl && e.keyCode == 65) {
			this.props.selectNotes([].concat(...ContentManager.sections));
			e.preventDefault();
		}

		if (Object.values(arrow).includes(e.keyCode)) {
			let orderedNotes;

			let nextSection;
			let nextNote;

			let kbSelector = this.kbSelector;

			if (kbSelector == KB_SELECTOR_DEFAULT) {
				let beginSection = ContentManager.sections.filter(section => section.includes(ContentManager.selected.first)).first;
				let endSection = ContentManager.sections.filter(section => section.includes(ContentManager.selected.last)).first;

				kbSelector = {
					firstSectionIDX: ContentManager.sections.indexOf(beginSection),
					firstSectionItemIDX: beginSection.indexOf(beginSection.filter(item => ContentManager.selected.includes(item)).first),
					lastSectionIDX: ContentManager.sections.indexOf(endSection),
					lastSectionItemIDX: endSection.indexOf(endSection.filter(item => ContentManager.selected.includes(item)).last)
				};
			}

			switch (e.keyCode) {
				case arrow.up:
				case arrow.down:
					let nextSectionIDX = kbSelector.lastSectionIDX + (e.keyCode == arrow.up ? -1 : 1);
					nextSection = ContentManager.sections[nextSectionIDX];

					if (nextSection)
						nextNote = nextSection.first;

					break;
				case arrow.left:
				case arrow.right:
					nextSection = ContentManager.sections[kbSelector.lastSectionIDX];

					let nextSectionItemIDX = kbSelector.lastSectionItemIDX + (e.keyCode == arrow.left ? -1 : 1);
					nextNote = nextSection[nextSectionItemIDX];

					if (!nextNote) {
						if (e.keyCode == arrow.left) {
							nextSection = ContentManager.sections[kbSelector.lastSectionIDX - 1];
							if (nextSection) nextNote = nextSection.last;
						}
						else {
							nextSection = ContentManager.sections[kbSelector.lastSectionIDX + 1];
							if (nextSection) nextNote = nextSection.first;
						}
					}

					break;
			}

			if (nextNote) {
				let noteIDs = [];

				let nextSectionIDX = ContentManager.sections.indexOf(nextSection);
				let nextSectionItemIDX = ContentManager.sections[nextSectionIDX].indexOf(nextNote);

				if (ctrl) {
					let firstSectionIDX;
					let lastSectionIDX;
					let firstSectionItemIDX;
					let lastSectionItemIDX;

					firstSectionIDX = Math.min(kbSelector.firstSectionIDX, nextSectionIDX)
					lastSectionIDX = Math.max(kbSelector.firstSectionIDX, nextSectionIDX)

					if (kbSelector.firstSectionIDX < nextSectionIDX) {
						firstSectionItemIDX = kbSelector.firstSectionItemIDX;
						lastSectionItemIDX = nextSectionItemIDX;
					}
					else if (kbSelector.firstSectionIDX > nextSectionIDX) {
						firstSectionItemIDX = nextSectionItemIDX;
						lastSectionItemIDX = kbSelector.firstSectionItemIDX;
					}
					else {
						firstSectionItemIDX = Math.min(kbSelector.firstSectionItemIDX, nextSectionItemIDX);
						lastSectionItemIDX = Math.max(kbSelector.firstSectionItemIDX, nextSectionItemIDX);
					}

					let orderedNotes = [].concat(...ContentManager.sections);
					let firstNote = ContentManager.sections[firstSectionIDX][firstSectionItemIDX];
					let lastNote = ContentManager.sections[lastSectionIDX][lastSectionItemIDX];

					for (let i = orderedNotes.indexOf(firstNote); i <= orderedNotes.indexOf(lastNote); i++)
						noteIDs.push(orderedNotes[i]);

					kbSelector.lastSectionIDX = nextSectionIDX;
					kbSelector.lastSectionItemIDX = nextSectionItemIDX;
				}
				else {
					kbSelector = {firstSectionIDX: nextSectionIDX, firstSectionItemIDX: nextSectionItemIDX, lastSectionIDX: nextSectionIDX, lastSectionItemIDX: nextSectionItemIDX};
					noteIDs.push(nextNote);
				}

				this.kbSelector = kbSelector;

				this.props.selectNotes(noteIDs);
				this.keepNoteVisible(nextNote, e.keyCode == arrow.down || e.keyCode == arrow.right);
			}
		}

		// esc
		if (event.keyCode == 27 && ContentManager.selected.length > 1) {
			this.props.selectNotes(ContentManager.selected.first);
			this.keepNoteVisible(ContentManager.selected.first, false);
		}

		if (Object.values(arrow).includes(e.keyCode)) {
			e.preventDefault();
			e.stopPropagation();
		}
	}

	keepNoteVisible(noteID, bottom) {
		let node = Array.from(document.querySelectorAll(".grid .item")).filter(item => (item.id == noteID)).first;

		if (!Module.RectTools.intersect(node.getBoundingClientRect(), this.refs.content.getBoundingClientRect())) {
			if (bottom)
				this.refs.content.scrollTop = node.offsetTop - this.refs.content.offsetHeight + node.offsetHeight + node.getMathStyle("margin-bottom");
			else
				this.refs.content.scrollTop = node.offsetTop;
		}
	}

	handleKeyUp(e) {
		if (e.keyCode == 17 || e.keyCode == 91 || e.keyCode == 93) {
			this.ctrl = false;

			this.selector = SELECTOR_DEFAULT
			this.kbSelector = KB_SELECTOR_DEFAULT
		}
	}

	beginSelect(e) {
		if (this.ctrl) {
			let pin = {x: e.clientX - document.querySelector(".notes").offsetLeft, y: e.clientY + this.refs.content.scrollTop};

			this.selector = {...this.selector, pin: pin, left: pin.x, top: pin.y};
			this.threshold = Date.now();
		}

		this.selectorMoved = false;
	}

	moveSelect(e) {
		if (!this.selector.pin) return;

		// if less than 150 ms it could be just click
		if (Date.now() - this.threshold < 150) return;

		this.selectorMoved = true;

		let left = this.selector.pin.x;
		let top = this.selector.pin.y;
		let width = e.clientX - this.selector.pin.x - document.querySelector(".notes").offsetLeft;
		let height = e.clientY - this.selector.pin.y + this.refs.content.scrollTop;

		if (e.clientY > window.innerHeight * 0.85)
			this.refs.content.scrollTop += 20;
		else if (e.clientY < window.innerHeight * 0.25)
			this.refs.content.scrollTop -= 20;

		if (width < 0) {
			width = Math.abs(width);
			left = this.selector.pin.x - width;
		}

		if (height < 0) {
			height = Math.abs(height);
			top = this.selector.pin.y - height;
		}

		if (top + height > this.refs.content.scrollHeight)
			height = this.refs.content.scrollHeight - top;

		this.selectItems();

		this.selector = {...this.selector, left, top, width, height};
		this.props.refreshLibrary();
	}

	selectItems() {
		let selectedNodes = [];
		let items = Array.from(document.querySelectorAll(".grid .item"));
		let selectorFrame = document.querySelector(".selector").getBoundingClientRect();

		items.forEach(item => {
			if (Module.RectTools.intersect(item.getBoundingClientRect(), selectorFrame))
				selectedNodes.push(item);
		});

		if (selectedNodes.length > 0)
			this.props.selectNotes(selectedNodes.map(item => item.id));
	}

	endSelect(e) {
		this.selector = SELECTOR_DEFAULT;

		if (this.selectorMoved)
			this.props.refreshLibrary();
	}

	componentDidMount() {
		this.setState({contentOffsetTop: this.refs.content.getBoundingClientRect().top});

		this.refs.content.addEventListener("scroll", this.handleScroll);
	}

	componentDidUpdate(prevProps, prevState) {
		if (prevProps.filterGroup != this.props.filterGroup && this.refs.list) {
			if (this.refs.content.firstElementChild)
				this.refs.content.scrollTop = this.refs.content.firstElementChild.offsetHeight;
		}
	}

	componentWillUnmount() {
		this.refs.content.removeEventListener("scroll", this.handleScroll);

		window.removeEventListener("keydown", this.handleKeyDown);
		window.removeEventListener("keyup", this.handleKeyUp);

		document.removeEventListener("mousemove", this.moveSelect);
		document.removeEventListener("mouseup", this.endSelect);
	}

	render() {
		return (
			<div className={"container" + (this.props.filterTag ? " filter" : "")}>
				{this.renderHeader()}
				{this.renderFilter()}
				{this.renderGrid()}
			</div>
		);
	}

	renderHeader() {
		return (
			<header>
				{this.renderMenu()}
			</header>
		);
	}

	renderMenu() {
		return (
			<div>
				<div className="menu pull-left">
					<ul>
						<li>
							<Tooltip placement={'bottom'} destroyTooltipOnHide={true} overlay={<div ><FormattedMessage id={ 'tooltip.createNote' } /></div>} align={{offset: [0, 10]}}>
								<a className="icon" onClick={::this.props.createNote}>
									<NewPageIcon />
								</a>
							</Tooltip>
						</li>
					</ul>
				</div>
				<div className="menu pull-right">
					<Menu />
				</div>
			</div>
		);
	}

	renderFilter() {
		if (this.props.filterTag) {
			return (
				<div className="tags-filter">
					<div className="tag-filter">
						<span>{this.props.filterTag}</span>
						<a onClick={event => this.props.filterByTag()} className="icon button"><CancelIcon /></a>
					</div>
				</div>
			);
		}

		return null;
	}

	renderEmptyLibrary() {
		return (
			<div className="flex-wrapper">
				<div className="empty">
					<h1><FormattedMessage id={ 'empty.library.text' } /></h1>
					<a className="btn create-note" onClick={::this.openTutorial}>
						<FormattedMessage id={ 'btn.create.note' } />
					</a>
				</div>
			</div>
		);
	}

	renderEmptyGroup() {
		return (
			<div className="flex-wrapper">
				<div className="empty">
					<h1><FormattedMessage id={ 'empty.group.text' } /></h1>
					<div className="details"><FormattedMessage id={ 'empty.group.details' } /></div>
					<div className="subdetails">- <FormattedMessage id={ 'empty.group.subdetails.drag.drop' } /></div>
					<div className="subdetails">- <FormattedMessage id={ 'empty.group.subdetails.context.menu' } /></div>
				</div>
			</div>
		);
	}

	renderEmptyFilter() {
		return (
			<div className="flex-wrapper">
				<div className="empty empty-filter">
					<h1><FormattedMessage id={ 'library.empty.tags.filter.title' } /></h1>
					<p><FormattedMessage id={ 'library.empty.tags.filter.description' } /></p>
				</div>
			</div>
		);
	}

	renderGrid() {
		let style = {position: "absolute"};

		if (!this.selector.pin)
			style.display = "none";
		else {
			style.left = this.selector.left + "px";
			style.top = (this.selector.top - this.state.contentOffsetTop) + "px";
			style.width = this.selector.width + "px";
			style.height = this.selector.height + "px";
		}

		return (
			<div ref="content" className="content" onMouseDown={::this.beginSelect}>
				{(() => {
					if (this.isLibraryEmpty()) {
						if (this.props.filterTag)
							return this.renderEmptyFilter()
						else
							return this.props.filterGroup ? this.renderEmptyGroup() : this.renderEmptyLibrary();
					}
					else
						return this.renderSections();
				})()}

				<div className="selector" style={style}></div>
			</div>
		);
	}

	renderSections() {
		let selectedSection = ContentManager.sections.filter(section => section.includes(ContentManager.selected.first)).first;
		let initialIndex = ContentManager.sections.indexOf(selectedSection);
		let pageSize = (initialIndex > 10) ? initialIndex+1 : 10;

		return <ReactList ref="list" itemRenderer={::this.renderSection} pageSize={pageSize} initialIndex={initialIndex} length={ContentManager.sections.length} scrollParentGetter={global.getScrollParent} />;
	}

	renderSection(index, key) {
		return <Section
			key={key}
			index={index}

			lastModified={this.props.lastModified}
			content={ContentManager.sections[index]}
			filterGroup={this.props.filterGroup}
			editedNotes={this.props.editedNotes}
			rotatedNotes={this.props.rotatedNotes}
			editNote={this.props.editNote}

			getContentRef={() => this.refs.content}
			selectNotes={(ids) => {
				this.kbSelector = KB_SELECTOR_DEFAULT;
				this.props.selectNotes(ids);
			}}
		/>;
	}
}

function mapStateToProps(state) {
	return {
		modal: state.AppReducer.modal,

		editedNotes: state.EditReducer.editedNotes,

		// search
		searchWindowVisible: state.LibraryReducer.searchWindowVisible,
		filterTag: state.LibraryReducer.filterTag,
		filterGroup: state.LibraryReducer.filterGroup,
		rotatedNotes: state.LibraryReducer.rotatedNotes,

		lastModified: state.LibraryReducer.lastModified
	};
}

function mapDispatchToProps(dispatch) {
	return bindActionCreators({...actions, openWizard}, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(Notes);
