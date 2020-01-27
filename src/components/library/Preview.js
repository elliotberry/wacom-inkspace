import React, {Component} from 'react';
import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {FormattedMessage, FormattedDate} from 'react-intl';
import Tooltip from 'rc-tooltip';

import * as actions from '../../actions/library';

import Menu from './preview/Menu';

import LoadingIcon from '../icons/LoadingIcon';
import CombineIcon from '../icons/library/CombineIcon.svg';

class Preview extends Component {
	constructor(props) {
		super(props);
	}

	onContextMenu(e) {
		e.preventDefault();

		if (ContentManager.selected.length > 0)
			contextMenuManager.showNoteMenu();
	}

	render() {
		let rotating = this.props.rotatedNotes.length && ContentManager.isSelected(this.props.rotatedNotes.first);
		let editing = this.props.editedNotes.length && ContentManager.isSelected(this.props.editedNotes.first);

		let loaderStyle = (this.props.combining || rotating || editing) ? null : {display: "none"};
		let subDetailsStyle = this.props.combining ? {display: "none"} : null;

		let wrapperClasses = "flex-wrapper";
		let leftMenuClasses = "menu pull-left";
		let rightMenuClasses = "menu pull-right";

		let details;

		if (ContentManager.selected.length == 0)
			wrapperClasses += " empty";
		else if (ContentManager.selected.length > 1) {
			wrapperClasses += " multiple";

			if (this.props.combining)
				details = <FormattedMessage id={ 'preview.items.combining' } />;
			else
				details = <FormattedMessage id={ 'preview.items.selected' } values={{count: ContentManager.selected.length}} />;
		}
		else
			wrapperClasses += " single";

		if (rotating || editing) {
			leftMenuClasses += " disabled";
			rightMenuClasses += " disabled";

			if (rotating)
				details = <FormattedMessage id={ 'preview.rotate.in.progress' } />;
			else if (editing)
				details = <FormattedMessage id={ 'preview.edit.in.progress' } />;
		}

		return (
			<div className="container">
				<header>
					<div className={leftMenuClasses}>
						<ul>
						{(() => {
							if (ContentManager.selected.length == 1) {
								return (
									<li className="date">
										<FormattedDate value={ContentManager.getNote(ContentManager.selected.first).creationDate} year='numeric' month='short' day='numeric'/>
									</li>
								);
							}
							else if (ContentManager.selected.length > 1) {
								return (
									<li>
										<Tooltip placement={'bottom'} destroyTooltipOnHide={true} overlay={<div ><FormattedMessage id={ 'menu.combine' }/></div>} align={{offset: [0, 10]}}>
											<a className="icon" onClick={() => this.props.combineNotes(ContentManager.selected)}><CombineIcon /> </a>
										</Tooltip>
									</li>
								);
							}
						})()}
						</ul>
					</div>

					<div className={rightMenuClasses}>
						<Menu />
					</div>
				</header>
				<div className="content">
					<div className={wrapperClasses}>
						{(() => {
							if (ContentManager.selected.length == 0) {
								return (
									<div className="preview-box">
										<h2><FormattedMessage id={ 'preview.no.preview.available' }/></h2>
									</div>
								);
							}
							// else if (ContentManager.selected.length > 1 || editing) {
							else if (details) {
								return (
									<div className="preview-box">
										<div className="background-image preview-image">
											<LoadingIcon style={loaderStyle} />
										</div>
										<div className="details">{details}</div>
										<div className="subdetails" style={subDetailsStyle}><FormattedMessage id={ 'preview.no.preview.available' }/></div>
									</div>
								);
							}
							// ContentManager.selected.length == 1
							else
								return <div className="background-image" style={{backgroundImage: `url("${ContentManager.getNote(ContentManager.selected.first).getPreviewSrc()}")`}} onDoubleClick={this.props.editNote} onContextMenu={::this.onContextMenu}></div>
						})()}
					</div>
				</div>
			</div>
		);
	}
}

function mapStateToProps(state) {
	return {
		combining: state.LibraryReducer.combining,
		rotatedNotes: state.LibraryReducer.rotatedNotes,
		editedNotes: state.EditReducer.editedNotes,
		lastModified: state.LibraryReducer.lastModified
	};
}

function mapDispatchToProps(dispatch) {
	return bindActionCreators(actions, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(Preview);
