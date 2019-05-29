import React, {Component} from 'react';
import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {FormattedMessage} from 'react-intl';

import * as actions from '../../actions/library';
import {openDialog} from '../../actions/modals';

import * as Modals from '../../constants/Modals';

import NotesMenu from './notes/Menu';
import PreviewMenu from './preview/Menu';

import Group from '../icons/Group.svg';

class Groups extends Component {
	constructor(props) {
		super(props);

		Object.defineProperty(this, "group", {
			get: () => this.props.filterGroup ? ContentManager.getEntity("groups").get(this.props.filterGroup) : null
		});

		let state = this.init();

		this.state = {
			groups: ContentManager.getEntity("groups").textValues.sort(),
			shouldScroll: state.shouldScroll
		};
	}

	init() {
		let shouldScroll = false;

		if (!this.props.filterGroup) {
			let group = ContentManager.getEntity("groups").get(this.props.lastSelectedGroup) || ContentManager.getEntity("groups").orderedValues.first;

			shouldScroll = !!group;
			this.selectItem(group);
		}

		return {shouldScroll};
	}

	selectItem(group) {
		this.props.filterByGroup(group);
	}

	open(group) {
		this.props.updateContext("LIBRARY");
		this.props.filterByGroup(group);
	}

	createGroup() {
		this.props.openDialog(Modals.ENTITY, {type: "groups"});
	}

	openContextMenu(e, group) {
		e.stopPropagation();

		this.selectItem(group);
		contextMenuManager.showGroupMenu();
	}

	componentDidMount() {
		if (this.props.filterGroup)
			this.setState({shouldScroll: true});
	}

	componentDidUpdate(prevProps, prevState) {
		if (this.state.shouldScroll) {
			let node = this.refs[this.props.filterGroup];
			this.refs["content"].scrollTop = node.offsetTop;

			this.setState({shouldScroll: false});
		}

		if (!this.props.filterGroup) {
			let groups = ContentManager.getEntity("groups").orderedValues;

			if (groups.length > 0)
				this.selectItem(ContentManager.getEntity("groups").get(this.props.lastSelectedGroup) || groups.first);
		}
	}

	render() {
		let groups = ContentManager.getEntity("groups").orderedValues;

		return (
			<div className="container">
				<header>
					<div className="menu pull-left">
						<NotesMenu />
					</div>
					<div className="menu pull-right">
						<PreviewMenu />
					</div>
				</header>
				<div ref="content" className="content">
					{(() => groups.length ? this.renderGroups(groups) : this.renderEmptyGroups())()}
				</div>
			</div>
		);
	}

	renderEmptyGroups() {
		let classes = "btn create-note";
		if (this.props.cloudDownloading) classes += " disabled";

		return (
			<div className="flex-wrapper">
				<div className="empty">
					<h1><FormattedMessage id={ 'empty.groups.text' } /></h1>
					<a className={classes} onClick={::this.createGroup}>
						<FormattedMessage id={ 'btn.create.group' } />
					</a>
				</div>
			</div>
		);
	}

	renderGroups(groups) {
		return (
			<div className="grid">
				{(() => groups.map((group, i) => this.renderGroup(group, i)))()}
			</div>
		);
	}

	renderGroup(group, i) {
		let note = ContentManager.getLatestNote(group.notes);
		let image = {};

		// let note = ContentManager.getNote(this.state.id);
		let className = "item" + ((this.group && this.group.id == group.id) ? " selected" : "");

		if (note)
			image = {backgroundImage: `url("${note.getThumbSrc()}")`};

		return (
			<div ref={group.id} key={"folder" + i} className={className} onClick={this.selectItem.bind(this, group)} onDoubleClick={this.open.bind(this, group)} onContextMenu={event => this.openContextMenu(event, group)}>
				<div className="thumb background-image" style={image}></div>
				<div className="thumb-title">
					{group.name}
				</div>
				<Group className="stack" />
			</div>
		);
	}
}

function mapStateToProps(state) {
	return {
		filterGroup: state.LibraryReducer.filterGroup,
		lastSelectedGroup: state.LibraryReducer.lastSelectedGroup,
		lastModified: state.LibraryReducer.lastModified,
		groupsModified: state.LibraryReducer.groupsModified,
		cloudDownloading: state.LibraryReducer.cloudDownloading
	};
}

function mapDispatchToProps(dispatch) {
	return bindActionCreators({...actions, openDialog}, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(Groups);
