import React, {Component} from 'react';

class CanvasContainer extends Component {
	constructor(props) {
		super(props);
	}

	componentDidMount() {
		this.layout = document.getElementById("canvas-container").firstElementChild;

		this.refs["canvasTarget"].appendChild(this.layout);
	}

	componentWillUnmount() {
		WILL.clear();
		document.getElementById("canvas-container").appendChild(this.layout);
	}

	render() {
		return (
			<div style={{height: "100%"}} ref="canvasTarget"></div>
		);
	}
}

export default CanvasContainer;
