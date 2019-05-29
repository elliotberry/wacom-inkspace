import React, {Component,} from 'react'
import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {FormattedMessage} from 'react-intl';
import ReactList from 'react-list'

import Note from './search/Note'

import * as actions from '../../actions/library';

import CancelIcon from '../icons/CancelIcon.svg'

class SearchResultSet extends Component {
	constructor(props) {
		super(props);
	}

	render() {
		let resultSet = ContentManager.sections.first;

		return (
			<div className="container">
				<header>
					<p><FormattedMessage id={ 'searh.notes.found.containing' } values={{ResultSetLength: resultSet.length}} /> {this.props.searchTerm}</p>
					<a className="icon button" onClick={::this.props.closeSearchResultSet}><CancelIcon /></a>
				</header>

				<div className="content">
					<ReactList itemRenderer={::this.renderItem} length={resultSet.length} initialIndex={0} pageSize={1} />
				</div>
			</div>
		);
	}

	renderItem(index, key) {;
		let noteID = ContentManager.sections.first[index];
		return <Note key={key} id={noteID} selected={ContentManager.isSelected(noteID)} selectNotes={this.props.selectNotes} />;
	}
}

function mapStateToProps(state) {
	return {
		searchTerm: state.LibraryReducer.searchTerm,

		// refresh after rotate
		rotatedNotes: state.LibraryReducer.rotatedNotes,

		// refresh
		lastModified: state.LibraryReducer.lastModified
	};
}

function mapDispatchToProps(dispatch) {
	return bindActionCreators(actions, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(SearchResultSet);
