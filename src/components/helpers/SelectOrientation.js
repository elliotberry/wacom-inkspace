import React, {Component} from 'react';

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import TabletIcon from '../icons/fte/TabletIcon'
import TabletIconPaper from '../icons/fte/TabletIconPaper'

class SelectOrientation extends Component {
	constructor(props) {
		super(props);
	}

	updateOrientation(orientation) {
		DeviceManager.updateOrientation(orientation, true);
	}

	convertOrientation(orientation) {
		return orientation;
	}

	componentDidMount() {
		if (typeof this.props.orientation != "number") {
			let orientation = (DeviceManager.type == "VIPER")?3:0;
			this.updateOrientation(orientation);
		}
	}

	render() {
		if (DeviceManager.type == "VIPER") {
			return (
				<div className="orientationIcon">
					<div className="top"    onClick={this.updateOrientation.bind(this, 2)}><TabletIcon orientation="top"    selected={ this.props.orientation == 2 }/></div>
					<div className="right"  onClick={this.updateOrientation.bind(this, 3)}><TabletIcon orientation="right"  selected={ this.props.orientation == 3 }/></div>
					<div className="bottom" onClick={this.updateOrientation.bind(this, 0)}><TabletIcon orientation="bottom" selected={ this.props.orientation == 0 }/></div>
					<div className="left"   onClick={this.updateOrientation.bind(this, 1)}><TabletIcon orientation="left"   selected={ this.props.orientation == 1 }/></div>
				</div>
			)
		}
		else {
			return (
				<div className="orientationIcon">
					<div className="top"    onClick={this.updateOrientation.bind(this, 3)}><TabletIconPaper orientation="top"    selected={ this.props.orientation == 3 }/></div>
					<div className="right"  onClick={this.updateOrientation.bind(this, 0)}><TabletIconPaper orientation="right"  selected={ this.props.orientation == 0 }/></div>
					<div className="bottom" onClick={this.updateOrientation.bind(this, 1)}><TabletIconPaper orientation="bottom" selected={ this.props.orientation == 1 }/></div>
					<div className="left"   onClick={this.updateOrientation.bind(this, 2)}><TabletIconPaper orientation="left"   selected={ this.props.orientation == 2 }/></div>
				</div>
			)
		}
	}
}

function mapStateToProps(state) {
	return {
		orientation: state.AppReducer.orientation
	}
}

function mapDispatchToProps(dispatch) {
	return bindActionCreators({}, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(SelectOrientation);
