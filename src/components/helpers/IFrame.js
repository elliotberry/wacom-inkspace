import React, {Component} from 'react';

class IFrame extends Component {
	constructor(props) {
		super(props);
	}

	render() {
		return <iframe style={{width: "800px", height: "650px", borderWidth: 0}} src={this.props.iFrameSRC}></iframe>;
	}
}

export default IFrame
