import React, {Component} from 'react';
import {injectIntl, FormattedMessage} from 'react-intl';

class Search extends Component {
	constructor(props) {
		super(props);

		this.state = {
			value: ""
		}
	}

	triggerSearch(e) {
		e.preventDefault();
		e.stopPropagation();

		if (this.state.value)
			this.props.executeSearch(this.state.value);
	}

	onInputClick(e) {
		e.stopPropagation();
	}

	onInputKeyPress(e) {
		if (e.key === "Enter")
			this.triggerSearch(e);
		else
			this.setState({value: e.target.value});
	}

	render() {
		return (
			<form className="search-overlay flex-wrapper" onClick={this.props.hideSearch}>
				<input type="text" placeholder={this.props.intl.formatMessage({id: 'search.input.placeholder'})} ref={input => input ? input.focus() : null} onClick={::this.onInputClick} onChange={::this.onInputKeyPress} onKeyPress={::this.onInputKeyPress} />

				<div className="action-bar">
					<a onClick={::this.triggerSearch} className="btn btn search"><FormattedMessage id={ 'tooltip.search' }/></a>
				</div>
			</form>
		);
	}
}

export default injectIntl(Search)
