import React, {Component} from 'react';

import ErrorImage from './images/error.svg';

class error extends Component {
	constructor(props) {
		super(props);
	}

	render() {
		return (
			<div className="flex-wrapper">
				<div className="error-wrapper">
					<ErrorImage />

					<div className="error-message">
						<div>Insufficent hardware resources found</div>
						<div>Most probably video driver is not installed</div>
					</div>
				</div>
			</div>
		);
	}
}

export default error;
