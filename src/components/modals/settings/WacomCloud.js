import React, {Component} from 'react';
import {FormattedMessage} from 'react-intl';

import LanguageMenu from '../../generic/LanguageMenu'

import utils from '../../../../scripts/utils';

class WacomCloud extends Component {
	constructor(props) {
		super(props);
	}

	login() {
		this.props.closeDialog();
		AuthenticationManager.login();
	}

	openAccount() {
		this.props.closeDialog();
		AuthenticationManager.openAccount();
	}

	render() {
		let {profile, authorized} = this.props;

		return (
			<div className="cloud-container">
				{(() => {
					if (profile && profile.uuid) {
						return (
							<ul>
								{/*
								<li>
									<span className="cloud-left">
										<FormattedMessage id={ 'settings.inkspace.used.storage' }/>
									</span>
									<span className="cloud-right">
										{utils.convert.formatBytes(profile.contentUsage, 1) + " from " + utils.convert.formatBytes(profile.contentQuota, 1)}
									</span>
									<span className="cloud-progress">
										<progress max={profile.contentQuota} value={profile.contentUsage}></progress>
									</span>
								</li>
								*/}
								<li>
									<span className="cloud-left">
										<FormattedMessage id={ 'settings.inkspace.username' }/>
									</span>
									<span className="cloud-right">
										{profile.firstName + " " + profile.lastName}
									</span>
								</li>
								<li className="has-select-list">
									<span className="cloud-left"><FormattedMessage id={ 'exportAsText.language' }/></span>
									<LanguageMenu name="default-note-language" export={true} updateDefault={true} classNames="lang-select cloud-right" />
								</li>
								{/*
								<li>
									<span className="cloud-left ink-blue">
										<FormattedMessage id={ 'settings.inkspace.upgrade.plan' }/>
									</span>
								</li>
								*/}
							</ul>
						);
					}
				})()}

				{(() => {
					if (authorized) {
						if (this.props.online) {
							return (
								<ul>
									<li>
										<a className="cloud-left ink-blue hide" onClick={::this.openAccount}>
											<FormattedMessage id={ 'settings.inkspace.account' }/>
										</a>
									</li>
									<li>
										<a className="cloud-left ink-blue hide" onClick={this.props.signOut}>
											<FormattedMessage id={ 'settings.inkspace.logout' }/>
										</a>
									</li>
								</ul>
							);
						}
						else
							return null;
					}
					else {
						return (
							<ul>
								<li>
									<span className="cloud-left">
										<FormattedMessage id={'settings.inkspace.notlogged'}/>
									</span>
								</li>
								{(() => {
									if (this.props.online) {
										return (
											<li>
												<a className="cloud-left ink-blue" onClick={this.login.bind(this)}>
													<FormattedMessage id="settings.inkspace.login"/>
												</a>
											</li>
										);
									}
									else
										return null;
								})()}
							</ul>
						)
					}
				})()}
			</div>
		)
	}
}

export default WacomCloud;
