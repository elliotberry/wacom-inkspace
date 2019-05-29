import React, {Component} from 'react';

import {Line} from 'rc-progress';

class VideoProgressBar extends Component {
	constructor(props) {
		super(props);

		this.state = {
			percent: 0
		};
	}

	componentDidMount() {
		let update = () => {
			if (this.state.percent > 100)
				this.setState({percent: 0});
			else
				this.setState({percent: this.state.percent+1});

			this.timeoutID = setTimeout(update, 100);
		};

		update();
	}

	componentWillUnmount() {
		clearTimeout(this.timeoutID);
	}

	render() {
		if (!this.props.config.settings.video) return null;

		return (
			<div className="video-progress-bar">
				<Line percent={this.state.percent} strokeWidth="2" strokeColor="#00AEEF" />
			</div>
		)
	}
}

export default VideoProgressBar
