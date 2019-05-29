import React, {Component} from 'react';
import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';
import {withRouter} from 'react-router-dom';

class index extends Component {
	constructor(props) {
		super(props);
	}

	componentDidMount() {
		if (this.props.fte) {
			UIManager.editWindow({resizable: true, maximizable: true});

			if (NativeLinker.get("previousVersion") < 250)
				this.props.history.push("/terms");
			else
				this.props.history.push("/library");
		}
		else
			this.props.history.push("/fte");
	}

	render() {
		return null;
	}
}

function mapStateToProps(state) {
	return {
		fte: state.AppReducer.fte
	};
}

function mapDispatchToProps(dispatch) {
	return bindActionCreators({}, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(withRouter(index));
