import React, { Component } from 'react';
import {injectIntl} from 'react-intl';

const VALIDATORS = {
	groups: {
		MAX_LENGTH: 16
	},
	tags: {
		MAX_LENGTH: 16,
		UNIQUE: true
	}
}

class EntityForm extends Component {
	constructor(props) {
		super(props);

		let initialState = this.init();

		this.state = {
			mode: initialState.mode,
			validators: VALIDATORS[this.props.config.settings.type],
			error: null,
			value: initialState.value
		};
	}

	init() {
		let state = {mode: "ADD", value: ""};
		let value = this.props.config.settings.value;

		if (this.props.config.settings.value) {
			state.mode = "EDIT";

			if (typeof value == "string")
				state.value = value;
			else
				state.value = value.name;
		}

		return state;
	}

	update(e) {
		let maxLength = this.state.validators["MAX_LENGTH"];

		let value = e.target.value.replace("  ", " ");
		if (value[0] == " ") value = value.trim();

		if (e.target.value.length > maxLength)
			this.setState({error: "error.max.length"});
		else
			this.setState({value: value, error: ""});
	}

	confirm(e) {
		if ([13, 27].includes(e.keyCode)) {
			if (e.keyCode == 13)
				this.props.config.confirm();
			else if (e.keyCode == 27)
				this.props.config.closeDialog();

			e.preventDefault();
			e.stopPropagation();
		}
	}

	componentDidMount() {
		this.refs.input.focus();
	}

	render() {
		let id = this.props.config.settings.type + "Input";
		let label = this.props.config.settings.label ? this.props.intl.formatMessage({id: this.props.config.settings.label}) : null;
		let className = this.state.error ? "error" : "";

		return (
			<form className={className}>
				<div className="error">{this.state.error ? this.props.intl.formatMessage({id: this.state.error}) : ""}</div>
				{(() => label ? <label htmlFor={id}>{label}</label> : null)()}
				<input id={id} ref="input" placeholder={this.props.intl.formatMessage({id: 'input.name.placeholder'})} value={this.state.value} onKeyDown={::this.confirm} onChange={::this.update} />
			</form>
		)
	};
}

export default injectIntl(EntityForm, {withRef: true});
