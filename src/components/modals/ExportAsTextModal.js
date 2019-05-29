import React, {Component} from 'react';
import {FormattedMessage} from 'react-intl';

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';
import * as actions from '../../actions/library'

import ArrowDown from '../icons/ArrowDown.svg';

class ExportAsText extends Component {
	render() {
		if (!this.props.modal || this.props.modal != "ExportAsText") return null;

		let languageName = LocalesManager.getLangName(this.props.exportLocale);

		return (
			<div className={"dialog-wrapper flex-wrapper " + this.props.modal} onClick={::this.props.closeExportAsTextModal}>
				<div className="dialog modal export-as-text-modal" onClick={event => event.stopPropagation()}>
					<div className="dialog-content">
						<h1>
							<FormattedMessage id="exportAsText.title" />
						</h1>
						<div className="export-text-content">
							<xmp>{this.props.recognizedText}</xmp>
						</div>
						<div className="export-text-language">
							<ul>
								<li>
									<span className="export-text-left"><FormattedMessage id="exportAsText.language" /></span>
									<span className="export-text-right">
										<a onClick={e => contextMenuManager.showExportLanguagesMenu()}>{languageName}<ArrowDown /></a>
									</span>
								</li>
							</ul>
						</div>
						<div className="export-text-buttons">
							<div className="export-btn-cont">
								<a className="export-text-success btn" onClick={::this.props.saveRecognizedText}><FormattedMessage id="exportAsText.saveAs" /></a>
								<a className="export-text-cancel" onClick={::this.props.closeExportAsTextModal}><FormattedMessage id="btn.cancel" /></a>
							</div>
						</div>
					</div>
				</div>
			</div>
		)
	}
}

function mapStateToProps(state) {
	return {
		modal: state.AppReducer.modal,

		exportLocale: state.LibraryReducer.exportLocale,
		recognizedText: state.LibraryReducer.recognizedText
	}
}

function mapDispatchToProps(dispatch) {
	return bindActionCreators(actions, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(ExportAsText);
