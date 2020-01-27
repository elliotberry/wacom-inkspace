import React, {Component} from 'react';
import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {FormattedMessage} from 'react-intl';
import {Link, RouteHandler} from 'react-router';
import PropTypes from 'prop-types';
import Tooltip from 'rc-tooltip';
import className from 'classnames';

import * as actions from '../../../actions/library';
import {openDialog} from '../../../actions/modals';

import * as Modals from '../../../constants/Modals'

import EditIcon from '../../icons/library/EditIcon.svg';
import RotateIcon from '../../icons/library/RotateIcon.svg';
import CollaborationIcon from '../../icons/library/CollaborationIcon.svg';
import ExportIcon from '../../icons/library/ExportIcon.svg';
import AddTagIcon from '../../icons/library/tags-manager/AddIcon.svg';

import utils from '../../../../scripts/utils';

class Menu extends Component {
	static get contextTypes() {
		return {
			router: PropTypes.object.isRequired,
		};
	}

	constructor(props) {
		super(props);

		this.rotateNotes = utils.debounce(this.props.rotateNotes, 250);
	}

	openTagsManager() {
		if (!AuthenticationManager.hasAccess())
			AuthenticationManager.login();
		else
			this.props.openDialog(Modals.TAGS_MANAGER);
	}

	navigateToPage() {
		if (ContentManager.selected.length == 1)
			this.props.editNote();
	}

	rotate() {
		if (ContentManager.selected.length == 1) {
			this.props.rotateTransformAdd90deg();
			setTimeout(() => this.rotateNotes(ContentManager.selected), 10);
		}
	}

	render() {
		let found = ContentManager.getSelectedNotes().filter(note => note.tags.length > 0).length > 0;

		let iconClasses = className({
			'icon': true,
			'disabled': ContentManager.selected.length != 1 || this.props.rotateInProgress || this.props.context == "GROUPS"
		});

		let exportIconClasses = className({
			'icon': true,
			'disabled': ContentManager.selected.length == 0 || this.props.rotateInProgress || (this.props.context == "GROUPS" && !this.props.filterGroup)
		});

		let tagsManagerIconClasses = className({
			'icon': true,
			'disabled': !this.props.online || ContentManager.selected.length == 0 || this.props.rotateInProgress || (this.props.context == "GROUPS" && !this.props.filterGroup)
		});

		return (
			<ul>
				<li>
					<Tooltip placement={'bottom'} destroyTooltipOnHide={true} overlay={<div ><FormattedMessage id={ 'tooltip.tags.manager' }/></div>} align={{offset: [0, 10]}}>
						<a className={tagsManagerIconClasses} onClick={::this.openTagsManager}>
							<AddTagIcon />
						</a>
					</Tooltip>
				</li>
				<li>
					<Tooltip placement={'bottom'} destroyTooltipOnHide={true} overlay={<div ><FormattedMessage id={ 'tooltip.edit' }/></div>} align={{offset: [0, 10]}}>
						<a className={iconClasses} onClick={(e) => {e.preventDefault(); this.navigateToPage();}}>
							<EditIcon />
						</a>
					</Tooltip>
				</li>
				<li>
					<Tooltip placement={'bottom'} destroyTooltipOnHide={true} overlay={<div ><FormattedMessage id={ 'tooltip.rotate' }/></div>} align={{offset: [0, 10]}}>
						<a className={iconClasses} onClick={::this.rotate}><RotateIcon /></a>
					</Tooltip>
				</li>
				{/*<li>*/}
				{/*<Tooltip placement={'bottom'} destroyTooltipOnHide={true} overlay={<div ><FormattedMessage id={ 'tooltip.collaborate' }/></div>} align={{offset: [0, 10]}}>*/}
				{/*<a className={iconClasses}><CollaborationIcon /></a>*/}
				{/*</Tooltip>*/}
				{/*</li>*/}
				<li>
					<Tooltip placement={'bottom'} destroyTooltipOnHide={true} overlay={<div ><FormattedMessage id={ 'tooltip.export' }/></div>} align={{offset: [0, 10]}}>
						<a className={exportIconClasses} onClick={() => contextMenuManager.showExportMenu()}>
							<ExportIcon />
						</a>
					</Tooltip>
				</li>
			</ul>
		);
	}
}

function mapStateToProps(state) {
	return {
		online: state.AppReducer.online,

		context: state.LibraryReducer.context,
		filterGroup: state.LibraryReducer.filterGroup,
		lastModified: state.LibraryReducer.lastModified,
		rotateInProgress: state.LibraryReducer.rotateInProgress
	};
}

function mapDispatchToProps(dispatch) {
	return bindActionCreators({...actions, openDialog}, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(Menu);
