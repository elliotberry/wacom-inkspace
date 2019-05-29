import React, {Component} from 'react';
import {FormattedMessage} from 'react-intl';

import SignUpTick from '../icons/SignUpTick.svg';

import images from '../../images';
/*

*/
class WacomIDBenefits extends Component {
	constructor(props) {
		super(props);
	}

	render() {
		return (
			<div className="wacom-id-benefits">
				<img src={images.signUpLogo} alt="" />
				<div className="title"><FormattedMessage id={'plus.title'}/></div>

				<div className="features">
					<table cellSpacing="0" cellPadding="0">
					<tbody>
					<tr>
						<th><SignUpTick /></th>
						<td><FormattedMessage id={'plus.storage.title'}/></td>
					</tr>
					<tr>
						<th></th>
						<td><FormattedMessage id={'plus.storage.description'}/></td>
					</tr>
					<tr>
						<th><SignUpTick /></th>
						<td><FormattedMessage id={'plus.sync.title'}/></td>
					</tr>
					<tr>
						<th></th>
						<td><FormattedMessage id={'plus.sync.description'}/></td>
					</tr>
					<tr>
						<th><SignUpTick /></th>
						<td><FormattedMessage id={'plus.text.title'}/></td>
					</tr>
					<tr>
						<th></th>
						<td><FormattedMessage id={'plus.text.description'}/></td>
					</tr>
					<tr>
						<th><SignUpTick /></th>
						<td><FormattedMessage id={'plus.video.title'}/></td>
					</tr>
					<tr>
						<th></th>
						<td><FormattedMessage id={'plus.video.description'}/></td>
					</tr>
					<tr>
						<th><SignUpTick /></th>
						<td><FormattedMessage id={'plus.export.title'}/></td>
					</tr>
					<tr>
						<th></th>
						<td><FormattedMessage id={'plus.export.description'}/></td>
					</tr>
					<tr>
						<th><SignUpTick /></th>
						<td><FormattedMessage id={'plus.tag.title'}/></td>
					</tr>
					<tr>
						<th></th>
						<td><FormattedMessage id={'plus.tag.description'}/></td>
					</tr>
					<tr>
						<th><SignUpTick /></th>
						<td><FormattedMessage id={'plus.web.title'}/></td>
					</tr>
					<tr>
						<th></th>
						<td><FormattedMessage id={'plus.web.description'}/></td>
					</tr>
					<tr>
						<th><SignUpTick /></th>
						<td><FormattedMessage id={'plus.tags.title'}/></td>
					</tr>
					<tr>
						<th></th>
						<td><FormattedMessage id={'plus.tags.description'}/></td>
					</tr>
					<tr>
						<th><SignUpTick /></th>
						<td><FormattedMessage id={'plus.collaboration.title'}/></td>
					</tr>
					<tr>
						<th></th>
						<td><FormattedMessage id={'plus.collaboration.description'}/></td>
					</tr>
					</tbody>
					</table>
				</div>
			</div>
		);
	}
}

export default WacomIDBenefits;
