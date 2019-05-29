import React, {Component} from 'react';
import {FormattedMessage} from 'react-intl';

import LoadingIcon from '../icons/LoadingIcon';

class Waiting extends Component {
	constructor(props) {
		super(props);
	}

	render() {
		let Icon = this.props.icon || LoadingIcon;

		return (
			<div>
				<div className="waiting-loader">
					<Icon />
				</div>

				{(() => {
					if (this.props.text) {
						return (
							<div className="waiting-details">
								<FormattedMessage id={ this.props.text }/>
							</div>
						)
					}
				})()}
			</div>
		);
	}
}
export default Waiting;
