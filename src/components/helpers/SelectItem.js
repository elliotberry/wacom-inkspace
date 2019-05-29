import React, {Component} from 'react';
import classNames from 'classnames';

import TickIcon from '../icons/TickIcon.svg'

class SelectItem extends Component {
	constructor(props) {
		super(props);

		let initialState = this.init();

		this.state = {
			config: initialState.config,
			items: initialState.items,
			selected: initialState.selected
		}
	}

	init() {
		let config = Object.clone(this.props.config.selectable);
		if (!config.item) config.item = {};
		config.item.name = config.item.name || "name";
		config.item.value = config.item.value || "value";

		let state = {config: config};

		if (typeof config.items == "string")
			state.items = this.props[config.items];
		else
			state.items = config.items;

		if (state.items) {
  			if (this.props[config.prop])
 				state.selected = this.props[config.prop];
 			else {
 				state.selected = state.items[0];
 				this.props.updateSelected(config.prop, state.items[0]);
 			}
		}

		return state;
	}

	select(item) {
		this.setState({selected: item});
		this.props.updateSelected(this.state.config.prop, item);
	}

	render() {
		if (!this.state.items) return null;

		let name = this.state.config.item.name;
		let value = this.state.config.item.value;

		return (
			<ul>
				{this.state.items.map(item => {
					let classSelected = classNames({
						'icon': true,
						'button': true,
						'm-right': true,
						'shown': this.state.selected[value] === item[value]
					});

					return (
						<li key={item[value]} onClick={this.select.bind(this, item)}>
							<span className="m-left">{item[name]}</span>
							<i className={classSelected}><TickIcon /></i>
						</li>
					)
				})}
			</ul>
		);
	}
}

export default SelectItem;
