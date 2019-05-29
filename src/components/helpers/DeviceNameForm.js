import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';
import {injectIntl} from 'react-intl';

import React, { Component } from 'react';

class DeviceNameForm extends Component {
	constructor(props) {
		super(props);

		this.state = {
			value: "",
			error: ""
		};
	}

	update(e) {
		let limit = (DeviceManager.type == "VIPER")?23:26;

		let value = e.target.value.replace("  ", " ");
		if (value[0] == " ") value = value.trim();

		if (Buffer.from(value).length > limit)
			this.setState({error: this.props.intl.formatMessage({id: 'error.max.length'})});
		else
			this.setState({value: value, error: ""});
	}

	componentDidMount() {
		if (this.props.device)
			this.setState({value: this.props.device.name});

		this.refs["deviceName"].focus();
	}

	render() {
		let className = this.state.error ? "error" : "";

		return (
			<form className={className}>
				<div className="error">{this.state.error}</div>
				<input ref="deviceName" placeholder={this.props.intl.formatMessage({id: 'input.name.placeholder'})} value={this.state.value} onChange={::this.update} />
			</form>
		)
	};
}

function mapStateToProps(state) {
	return {
		device: state.AppReducer.device
	}
}

function mapDispatchToProps(dispatch) {
	return bindActionCreators({}, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps, undefined, {withRef: true})(injectIntl(DeviceNameForm, {withRef: true}));
