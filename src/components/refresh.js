import React, {Component} from 'react';
import {withRouter} from 'react-router-dom';

// TODO: to be removed
class refresh extends Component {
	constructor(props) {
		super(props);
	}

	componentDidMount() {
		if (DeviceManager.context == DeviceManager.Context.SETUP)
			this.props.history.push("/terms");
		else
			this.props.history.push("/library");
	}

	render() {
		return null;
	}
}

export default withRouter(refresh);
