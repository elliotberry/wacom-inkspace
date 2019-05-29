import React, {Component} from 'react';
import {FormattedMessage} from 'react-intl';

class Button extends Component {
	constructor(props) {
		super(props);

		this.state = {
			clicked: false,
			click: null
		}
	}

	editClick(click) {
		if (this.props.autoDisable)
			this.setState({click: (e) => this.setState({clicked: true}, click)});
		else
			this.setState({click: click});
	}

	componentDidMount() {
		this.editClick(this.props.click);
	}

	componentDidUpdate(prevProps, prevState) {
		if (this.props.click != prevProps.click)
			this.editClick(this.props.click);
	}

	render() {
		let classes = ["btn"];

		if (this.props.className)
			classes = classes.concat(this.props.className.split(/\s+/g));

		if (this.state.clicked)
			classes.push("disabled");

		if (this.props.classNameSource) {
			let condClasses = this.props.classNameSource(this.props.name);
			if (condClasses && typeof condClasses == "string") condClasses = [condClasses];
			if (condClasses) classes = classes.concat(condClasses);
		}

		return (
			<a onClick={this.state.click} className={classes.join(" ")}>
				<FormattedMessage id={ this.props.text }/>
			</a>
		);
	}
}

export default Button
