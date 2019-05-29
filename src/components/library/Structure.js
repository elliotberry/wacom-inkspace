import React, {Component} from 'react';
import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {FormattedMessage} from 'react-intl';

import classnames from 'classnames';

import * as actions from '../../actions/library';
import {openDialog} from '../../actions/modals';

import * as Modals from '../../constants/Modals';

import LibraryIcon from '../icons/library/structure/LibraryIcon.svg';
import GroupsIcon from '../icons/library/structure/GroupsIcon.svg';
import NewGroupIcon from '../icons/library/structure/NewGroupIcon.svg';

class Structure extends Component {
	constructor(props) {
		super(props);

		Object.defineProperty(this, "group", {
			get: () => this.props.filterGroup ? ContentManager.getEntity("groups").get(this.props.filterGroup) : null
		});

		this.state = {
			shouldScroll: false
		};
	}

	open(context, group) {
		if (this.props.context == "SEARCH")
			this.props.closeSearchResultSet();

		this.props.updateContext(context);
		this.props.filterByGroup(group);
	}

	createGroup() {
		this.props.openDialog(Modals.ENTITY, {type: "groups"});
	}

	openContextMenu(e, name) {
		e.stopPropagation();

		this.open("LIBRARY", name);
		contextMenuManager.showGroupMenu();
	}

	allowDrop(e) {
		e.preventDefault();
	}

	drop(e, group) {
		e.preventDefault();

		this.props.editGroupRelations(group);
	}

	componentDidMount() {
		if (this.props.context == "LIBRARY" && this.props.filterGroup)
			this.setState({shouldScroll: true});
	}

	componentDidUpdate(prevProps, prevState) {
		if (this.state.shouldScroll) {
			let node = this.refs[this.props.filterGroup];
			this.refs["content"].scrollTop = node.offsetTop;

			this.setState({shouldScroll: false});
		}
	}

	render() {
		let groups = ContentManager.getEntity("groups").orderedValues;

		let libraryIconClasses = classnames({
			icon: true,
			"library-icon": true,
			selected: this.props.context == "LIBRARY" && !this.group
		});

		let groupsIconClasses = classnames({
			icon: true,
			"groups-icon": true,
			selected: this.props.context == "GROUPS" || this.group
		});

		let newGroupIconClasses = classnames({
			icon: true,
			"new-group-icon": true,
			disabled: this.props.cloudDownloading
		});

		return (
			<div className="content">
				<a className={libraryIconClasses} onClick={this.open.bind(this, "LIBRARY", null)} >
					<LibraryIcon />
					<FormattedMessage id={ 'menu.library' }/>
				</a>
				<div className="groups-line">
					<a className={groupsIconClasses} onClick={this.open.bind(this, "GROUPS", this.group)} >
						<GroupsIcon />
						<FormattedMessage id={ 'menu.groups' }/>
					</a>
					<a className={newGroupIconClasses} onClick={::this.createGroup} >
						<NewGroupIcon />
					</a>
				</div>
				<div ref="content" className="groups-container">
					{(() => groups.map((group, i) => this.renderGroup(group, i)))()}
				</div>
			</div>
		);
	}

	renderGroup(group, i) {
		let groupIconClasses = classnames({
			icon: true,
			selected: this.group && this.group.id == group.id
		});

		return <a key={group.id} ref={group.id} className={groupIconClasses} onClick={this.open.bind(this, "LIBRARY", group)} onDrop={e => this.drop(e, group)} onDragOver={::this.allowDrop} onContextMenu={event => this.openContextMenu(event, group)}><div className="dot"></div>{group.name}</a>
	}
}

function mapStateToProps(state) {
	return {
		context: state.LibraryReducer.context,
		filterGroup: state.LibraryReducer.filterGroup,
		groupsModified: state.LibraryReducer.groupsModified,
		cloudDownloading: state.LibraryReducer.cloudDownloading
	};
}

function mapDispatchToProps(dispatch) {
	return bindActionCreators({...actions, openDialog}, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(Structure);
