import React, {Component} from 'react';
import {FormattedMessage} from 'react-intl';

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import * as actions from '../actions/fte';
import {openDialog} from '../actions/modals';

import Button from './generic/Button';
import Waiting from './generic/Waiting';

import settings from './settings/wizards';

class FTE extends Component {
	constructor(props) {
		super(props);

		this.init(this.props.step);
	}

	init(step) {
		this.config = Object.clone(settings[step]);
		this.config.type = step;

		if (this.config.buttons) {
			this.config.buttons.forEach((button, i) => {
				if (typeof button.click == "function")
					button.click = button.click.bind(this);
				else {
					if (button.click == "redirect")
						button.click = this.props[button.click].bind(this, button.location);
					else if (button.click == "openDialog")
						button.click = () => this.props.openDialog(button.dialog);
					else
						button.click = this.props[button.click].bind(this);
				}

				if (button.classNameSource)
					button.classNameSource = ::this.props[button.classNameSource];
			});
		}

		UAManager.screen("FTE", step);
	}

	componentDidUpdate(prevProps, prevState) {
		if (prevProps.step != this.props.step) {
			this.init(this.props.step);
			this.forceUpdate();
		}
	}

	componentWillUnmount() {
		this.props.exit();
	}

// static getDerivedStateFromProps(props, state) {console.log("getDerivedStateFromProps"); return null;}
// 			UNSAFE_componentWillMount() {console.log("componentWillMount")}
// render() {console.log("render")}
// componentDidMount() {console.log("componentDidMount")}

// 			UNSAFE_componentWillReceiveProps(nextProps) {console.log("componentWillReceiveProps")}
// shouldComponentUpdate(nextProps, nextState) {console.log("shouldComponentUpdate"); return true;}
// 			UNSAFE_componentWillUpdate(nextProps, nextState) {console.log("componentWillUpdate")}
// render() {console.log("render")}
// getSnapshotBeforeUpdate(prevProps, prevState) {console.log("getSnapshotBeforeUpdate"); return null;}
// componentDidUpdate(prevProps, prevState, snapshot) {console.log("componentDidUpdate")}

// componentWillUnmount() {console.log("componentWillUnmount")}

	render() {
		const Image = this.config.image;
		// const Image = require(this.config.image);
		// const Image = require("../components/images/logo.svg");
		const ExtraContent = this.config.extraContent;

		return (
			<div className={"fte container " + this.config.type.toLowerCase()}>
				<div className="left-pane">
					<div className="flex-wrapper">
						{Image ? <Image /> : <ExtraContent ref="ExtraContent" config={this.config} {...this.props} />}
					</div>
				</div>
				<div className="right-pane">
					<div className="flex-wrapper">
						<div className="fte-content">
							{this.config.title?<h1><FormattedMessage id={this.config.title} /></h1>:""}
							{this.config.content?<p><FormattedMessage id={this.config.content} /></p>:""}

							{(Image && ExtraContent) ? <ExtraContent ref="ExtraContent" config={this.config} {...this.props} /> : null}

							{(() => {
								if (this.config.buttons) {
									return (
										<div className="action-bar">
											{this.config.buttons.map((button, i) => <Button key={this.config.type + i} {...button} />)}
										</div>
									)
								}
								else if (this.config.waiting)
									return <Waiting {...this.config.waiting} />;
							})()}
						</div>
					</div>
				</div>
			</div>
		);
	}
}

function mapStateToProps(state) {
	return {
		step: state.AppReducer.wizardStep || "Welcome"
	}
}

function mapDispatchToProps(dispatch) {
	return bindActionCreators({...actions, openDialog}, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(FTE);
