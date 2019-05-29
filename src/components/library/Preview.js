import React, {Component} from 'react';
import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';
import {withRouter} from 'react-router-dom';

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
		let loaderStyle = this.props.combining ? null : {display: "none"};
		let subDetailsStyle = this.props.combining ? {display: "none"} : null;

		let className = "flex-wrapper";
		let details;

		if (ContentManager.selected.length == 0)
			className += " empty";
		else if (ContentManager.selected.length > 1) {
			className += " multiple";

			if (this.props.combining)
				details = <FormattedMessage id={ 'preview.items.combining' } />;
			else
				details = <FormattedMessage id={ 'preview.items.selected' } values={{count: ContentManager.selected.length}} />;
		}
		else
			className += " single";

		return (
			<div className="container">
				<header>
					<div className="menu pull-left">
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

					<div className="menu pull-right">
						<Menu />
					</div>
				</header>
				<div className="content">
					<div className={className}>
						{(() => {
							if (ContentManager.selected.length == 0) {
								return (
									<div className="preview-box">
										<h2><FormattedMessage id={ 'preview.no.preview.available' }/></h2>
									</div>
								);
							}
							else if (ContentManager.selected.length == 1) {
								if (this.props.rotatedNotes.length)
									return <LoadingIcon />
								else
									return <div className="background-image" style={{backgroundImage: `url("${ContentManager.getNote(ContentManager.selected.first).getPreviewSrc()}")`}} onDoubleClick={() => this.props.history.push('/creation')} onContextMenu={::this.onContextMenu}></div>
							}
							else {
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
		lastModified: state.LibraryReducer.lastModified
	};
}

function mapDispatchToProps(dispatch) {
	return bindActionCreators(actions, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(withRouter(Preview));
