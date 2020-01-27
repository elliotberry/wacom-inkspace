import React, {Component} from 'react';
import {FormattedMessage} from 'react-intl';
import classnames from 'classnames';

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import * as appActions from '../../actions/app'
import * as fteActions from '../../actions/fte'
import * as modalActions from '../../actions/modals'

import Button from '../generic/Button';
import Waiting from '../generic/Waiting';
import ProgressBar from '../generic/ProgressBar';

import * as WizardTypes from '../../constants/WizardTypes';
import * as WizardSteps from '../../constants/WizardSteps';
import * as Modals from '../../constants/Modals';

import CancelIcon from '../icons/CancelIcon.svg';

import settings from '../settings/wizards';

class Wizard extends Component {
	constructor(props) {
		super(props);

		this.state = {
			step: 1,
			deviceManagerContext: undefined
		};
	}

	handleStepChange(step) {
		this.setState({step});
	}

	handleNext(callback) {
		this.handleStepChange(this.state.step + 1);
		if (typeof callback == "function") callback();
	}

	handleDone(callback) {
		this.closeModal();
		if (typeof callback == "function") callback();
	}

	closeModal() {
		if (this.config.type == WizardTypes.TUTORIAL) {
			global.updateState({tutorial: true});
			DBManager.edit((DBManager.entities.SETTINGS), {tutorial: true});

			this.props.addNotification("notification.tutorial.availableInMenuBar");
			mainMenuManager.refresh();
		}

		this.props.closeWizard();
	}

	getPrefix(src) {
		let prefix = this.config.prefix;

		if (this.config.kind)
			prefix += (src?"/":".") + this.config.kind;

		return prefix;
	}

	getStepName(step) {
		switch (step) {
			case 1: return "one";
			case 2: return "two";
			case 3: return "three";
			case 4: return "four";
			case 5: return "five";
			case 6: return "six";
			default: throw new Error(`name of ${step} is not implemented yet`);
		}
	}

	configure(type, step) {
		if (!step) {
			this.config = Object.clone(settings[type]);
			this.config.type = type;

			if (this.config.type == WizardTypes.TUTORIAL) {
				let kind = (DeviceManager.type || "VIPER").split("_")[0].toLowerCase();

				this.config.kind = kind;
				this.config.steps = this.config[kind];
			}

			let dictionary = this.config.dictionary ? this.config.dictionary[LocalesManager.lang] : null;

			this.config.steps.forEach((config, i) => {
				let step = i + 1;

				let lastStep = (step == this.config.steps.length);
				let name = this.getStepName(step);

				if (dictionary) {
					config.getTitle = () => dictionary.steps[i].title || this.config.dictionary["en"].steps[i].title;
					config.getContent = () => dictionary.steps[i].content || this.config.dictionary["en"].steps[i].content;
				}
				else {
					config.getTitle = () => <FormattedMessage id={`${this.getPrefix()}.step.${name}.title`} />;
					config.getContent = () => <FormattedMessage id={`${this.getPrefix()}.step.${name}.desc`} />;
				}

				if (!config.buttons && !config.waiting)
					config.buttons = [{text: lastStep ? "btn.done" : "btn.next"}];

				if (config.buttons) {
					config.buttons.forEach(button => {
						button.click = lastStep ? this.handleDone.bind(this, button.callback) : this.handleNext.bind(this, button.callback);
					});
				}
			});

			this.config.getTitle = () => this.config.steps[this.state.step - 1].getTitle();
			this.config.getContent = () => this.config.steps[this.state.step - 1].getContent();

			Object.defineProperty(this.config, "image", {get: () => this.config.steps[this.state.step - 1].image});
			Object.defineProperty(this.config, "buttons", {get: () => this.config.steps[this.state.step - 1].buttons});
			// Object.defineProperty(this.config, "progress", {get: () => this.config.steps[this.state.step - 1].progress});
			Object.defineProperty(this.config, "waiting", {get: () => this.config.steps[this.state.step - 1].waiting});
		}
		else {
			this.config = Object.clone(settings[step]);
			this.config.type = type;
			this.config.className = "center";

			if (this.config.type == WizardTypes.SETUP_DEVICE) {
				this.config.discardOverlayClick = true;
				this.config.discardXButton = true;
			}

			this.config.progress = "update.progress"

			if (this.config.buttons) {
				this.config.buttons.forEach((button, i) => {
					if (typeof button.click == "function")
						button.click = button.click.bind(this);
					else {
						if (button.click == "redirect") {
							if (button.location == "Login") {
								button.text = "btn.done";
								button.click = this.handleDone.bind(this);
							}
							else
								button.click = this.props[button.click].bind(this, button.location);
						}
						else if (button.click == "openDialog") {
							if (button.dialog == Modals.SETUP_LATER) {
								button.text = "btn.cancel";
								button.click = this.handleDone.bind(this, DeviceManager.clearDeviceConnectedCheck.bind(DeviceManager));
							}
							else
								button.click = () => this.props.openDialog(button.dialog);
						}
						else
							button.click = this.props[button.click].bind(this);
					}

					if (button.classNameSource) button.classNameSource = ::this.props[button.classNameSource];
				});
			}

			this.config.getTitle = () => <FormattedMessage id={this.config.title} />;
			this.config.getContent = () => <FormattedMessage id={this.config.content} />;
		}
	}

	componentDidUpdate(prevProps, prevState) {
		if (prevProps.wizardType != this.props.wizardType && !this.props.wizardType) {
			if (!this.props.wizardType) {
				delete this.config;

				if (this.state.deviceManagerContext) {
					DeviceManager.configure(this.state.deviceManagerContext);
					this.setState({deviceManagerContext: undefined});

					if (!this.props.tutorial && DeviceManager.context == DeviceManager.Context.LIBRARY && DeviceManager.device)
						this.props.openWizard(WizardTypes.TUTORIAL);
				}
				else
					this.forceUpdate();

				return;
			}
		}

		if (this.props.wizardStep) {
			if (prevProps.wizardStep != this.props.wizardStep) {
				if (!this.props.wizardType) {
					// FTE have only steps
					// console.warn("missing wizard type");
					return;
				}

				this.configure(this.props.wizardType, this.props.wizardStep);

				if (prevProps.wizardType != this.props.wizardType) {
					this.setState({deviceManagerContext: DeviceManager.context});
					DeviceManager.configure(DeviceManager.Context.SETUP);
				}
				else
					this.forceUpdate();
			}
		}
		else {
			if (prevProps.wizardType != this.props.wizardType) {
				this.configure(this.props.wizardType);
				this.setState({step: 1});
			}
		}
	}

	render() {
		if (!this.config) return null;

		const Image = this.config.image;
		const ExtraContent = this.config.extraContent;

		let modalClasses = {
			modal: true,
			dialog: true
		};

		if (this.config.className)
			modalClasses[this.config.className] = true;

		modalClasses = classnames(modalClasses);

		let style = {};

		if (this.config.type == WizardTypes.WHATS_NEW && LocalesManager.lang == "ru")
			style = {width: "650px", height: "650px"};

		let wrapperClasses = "dialog-wrapper flex-wrapper " + this.config.type;
		if (this.props.wizardStep) wrapperClasses += " " + this.props.wizardStep;

		let wrapperClick = this.config.discardOverlayClick ? null : this.closeModal.bind(this);

		return (
			<div className={wrapperClasses} onClick={wrapperClick}>
				<div className={modalClasses} style={style} onClick={event => event.stopPropagation()}>
					{(() => {
						if (!this.config.discardXButton) {
							return (
								<a className="icon button close" onClick={::this.closeModal}>
									<CancelIcon />
								</a>
							);
						}
					})()}

					<div className="dialog-content">
						<div className="flex-wrapper">
							{Image ? (Image.src ? <img src={Image.src} alt="" /> : <Image />) : (<ExtraContent ref="ExtraContent" config={this.config} {...this.props} />)}
						</div>

						<h1>{this.config.getTitle()}</h1>
						<p>{this.config.getContent()}</p>

						<div className="action-bar">
							{(() => {
								if (this.config.buttons)
									return this.config.buttons.map((button, i) => <Button key={this.config.type + i} {...button} />);
								else if (this.config.waiting)
									return <Waiting {...this.config.waiting} />;
							})()}
						</div>
					</div>

					{(() => {
						if (this.config.steps) {
							return (
								<ProgressBar
									type={this.config.type}
									length={this.config.steps.length}
									step={this.state.step}
									click={this.config.discardDotsClick ? null : ::this.handleStepChange}
								/>
							);
						}
					})()}
				</div>
			</div>
		)
	}
}

function mapStateToProps(state) {
	return {
		wizardType: state.AppReducer.wizardType,
		wizardStep: state.AppReducer.wizardStep,

		tutorial: state.AppReducer.tutorial,
		usbConnected: state.AppReducer.usbConnected,
		devices: state.AppReducer.devices,

		migrationCompleted: state.LibraryReducer.migrationCompleted
	}
}

function mapDispatchToProps(dispatch) {
	return bindActionCreators({...appActions, ...fteActions, ...modalActions}, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(Wizard);
