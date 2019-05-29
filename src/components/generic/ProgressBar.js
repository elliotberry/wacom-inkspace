import React, {Component} from 'react'
import classnames from 'classnames';

import Dot from '../icons/Dot.svg';

class ProgressBar extends Component {
	constructor(props) {
		super(props);
	}

	navigate(step) {
		if (this.props.click)
			this.props.click(step);
	}

	render() {
		if (this.props.length < 2) return null;

		return (
			<div className="navigation-dots">
				{this.renderList()}
			</div>
		);
	}

	renderList() {
		let items = [];

		for (let i = 1; i <= this.props.length; i++)
			items.push(this.renderDot(i));

		return (<ul>{items}</ul>);
	}

	renderDot(i) {
		let className = classnames({selected: this.props.step == i, pointer: !!this.props.click});

		return (
			<li key={this.props.type + "-step-" + i} className={className} onClick={this.navigate.bind(this, i)}>
				<Dot />
			</li>
		);
	}
}

export default ProgressBar
