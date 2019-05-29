import React, {Component} from 'react';
import {FormattedMessage} from 'react-intl';
import {withRouter} from 'react-router-dom';
import classnames from 'classnames';

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';
import * as actions from '../../actions/modals';

import Button from '../generic/Button';
import Waiting from '../generic/Waiting';

import CancelIcon from '../icons/CancelIcon.svg'

import settings from '../settings/modals';

class Modal extends Component {
	constructor(props) {
		super(props);
	}

	configure(modal, modalSettings) {
		this.config = Object.clone(settings[modal]);
		this.config.type = modal;
		this.config.settings = modalSettings || {};

		if (this.config.settings.title) this.config.title = this.config.settings.title;
		if (this.config.settings.content) this.config.content = this.config.settings.content;
		if (!this.config.actionBar) this.config.actionBar = "pull-right";

		if (this.config.onopen) this.config.onopen = this.config.onopen.bind(this);
		if (this.config.onclose) this.config.onclose = this.config.onclose.bind(this);

		if (this.config.settings.onopen) this.config.onopen = this.config.settings.onopen.bind(this);
		if (this.config.settings.onclose) this.config.onclose = this.config.settings.onclose.bind(this);

		this.config.closeDialog = this.props.closeDialog.bind(this, this.config.onclose);

		(this.config.buttons || []).forEach(button => {
			if (this.config.settings.buttons) {
				if (button.id) {
					let buttonSettings = this.config.settings.buttons[button.id];

					if (buttonSettings)
						Object.keys(buttonSettings).forEach(prop => (button[prop] = buttonSettings[prop]));
				}
			}

			if (button.type == "CANCEL") {
				if (!button.text) button.text = "btn.cancel";
				button.className = "cancel";

				if (button.click)
					this.config.closeDialog = this.props[button.click].bind(this);

				if (button.onclose) {
					let onClose = button.onclose.bind(this);
					button.click = () => this.props.closeDialog(onClose);
				}
				else
					button.click = this.config.closeDialog;
			}
			else {
				if (typeof button.click == "function")
					button.click = button.click.bind(this);
				else
					button.click = this.props[button.click].bind(this, this.config.onclose);

				if (button.type == "CONFIRM")
					this.config.confirm = button.click;

				if (button.classNameSource && typeof button.classNameSource != "function") button.classNameSource = ::this.props[button.classNameSource];
			}
		});

		if (this.config.onopen)
			this.config.onopen();
	}

	componentDidUpdate(prevProps, prevState) {
		if (prevProps.modal != this.props.modal) {
			if (this.props.modal) {
				if (settings[this.props.modal].custom)
					delete this.config;
				else
					this.configure(this.props.modal, this.props.modalSettings);
			}
			else
				delete this.config;

			this.forceUpdate();
		}
	}

	render() {
		if (!this.config) return null;

		let wrapperClasses = ("dialog-wrapper flex-wrapper " + this.config.type + " " + (this.config.className || "")).trim();
		let wrapperClick = this.config.discardOverlayClcik?null:this.config.closeDialog;

		let modalClasses = {
			modal: this.config.image || this.config.extraContentType == "IMAGE",
			dialog: true
		};

		if (this.config.className)
			modalClasses[this.config.className] = true;

		modalClasses = classnames(modalClasses);

		const image = this.renderImage();

		return (
			<div className={wrapperClasses} onClick={wrapperClick}>
				<div className={modalClasses} onClick={event => event.stopPropagation()}>
					{(() => {
						if (!this.config.discardOverlayClcik) {
							return (
								<a className="icon button close" onClick={this.config.closeDialog}>
									<CancelIcon />
								</a>
							);
						}
					})()}
					<div className="dialog-content">
						{image?<div className="flex-wrapper">{image}</div>:null}
						{this.config.title?<h1><FormattedMessage id={this.config.title} /></h1>:""}
						{this.config.content?<p><FormattedMessage id={this.config.content} /></p>:""}
						{this.renderExtraContent()}

						{(() => {
							if (this.config.buttons) {
								return (
									<div className="action-bar">
										<div className={this.config.actionBar}>
											{this.config.buttons.map((button, i) => <Button key={this.config.type + i} {...button} />)}
										</div>
									</div>
								)
							}
							else if (this.config.waiting)
								return <Waiting {...this.config.waiting} />;
						})()}
					</div>
				</div>
			</div>
		);
	}

	renderImage() {
		if (!this.config.image && this.config.extraContentType != "IMAGE") return null;

		if (this.config.extraContentType == "IMAGE")
			return this.renderExtraContent(true);
		else {
			if (typeof this.config.image == "string")
				return <img src={this.config.image} />
			else {
				const Image = this.config.image;
				return <Image />;
			}
		}
	}

	renderExtraContent(image) {
		if (!this.config.extraContent || (this.config.extraContentType == "IMAGE" && !image)) return null;

		const ExtraContent = this.config.extraContent;
		return <ExtraContent ref="ExtraContent" config={this.config} {...this.props} />;
	}
}

function mapStateToProps(state) {
	return {
		modals: state.AppReducer.modals,
		modal: state.AppReducer.modal,
		modalSettings: state.AppReducer.modalSettings,
		profile: state.AppReducer.profile,
		usbConnected: state.AppReducer.usbConnected,
		sppConnected: state.AppReducer.sppConnected,
		selectedDeviceType: state.AppReducer.selectedDeviceType,
		selectedDevice: state.AppReducer.selectedDevice,
		devices: state.AppReducer.devices,
		iFrameSRC: state.AppReducer.iFrameSRC,

		tags: state.LibraryReducer.tags
	}
}

function mapDispatchToProps(dispatch) {
	return bindActionCreators(actions, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(withRouter(Modal));
