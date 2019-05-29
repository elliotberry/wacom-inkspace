import React, {Component} from 'react';
import {FormattedMessage} from 'react-intl';
import Tooltip from 'rc-tooltip';
import classNames from 'classnames';

import LoadingIcon from '../icons/LoadingIcon';
import LayerOptionsIcon from '../icons/edit/LayerOptionsIcon.svg';

export default class LayerPaneItem extends Component {
	constructor(props) {
		super(props);
	}

	showLayerMenu(inSplitMode) {
		if (inSplitMode) return null;

		this.props.onSelect();
		contextMenuManager.showLayerMenu(this.props.indexKey);
	}

	render() {
		let inSplitMode = this.props.splitMode == 'layer';
		let disabled = inSplitMode && !this.props.isCurrent;

		let layerClasses = classNames({
			"layer": true,
			"selected": this.props.isCurrent,
			"disabled": disabled
		})

		let layerMenuClasses = classNames({
			"layer-menu": true,
			"hidden": disabled || inSplitMode
		});

		return (
			<div className={layerClasses}>
				<div className={layerMenuClasses}>
					<Tooltip placement={'bottom'} destroyTooltipOnHide={true} overlay={<div ><FormattedMessage id={ 'tooltip.layer.options' }/></div>} align={{offset: [0, 10]}}>
						<a className="icon" onClick={this.showLayerMenu.bind(this, inSplitMode)}>
							<LayerOptionsIcon />
						</a>
					</Tooltip>
				</div>

				<div className="layer-img" onClick={this.props.onSelect} onContextMenu={this.showLayerMenu.bind(this, inSplitMode)}>
					{this.props.imageSRC ? <img src={this.props.imageSRC} /> : <LoadingIcon />}
				</div>

				<div className="layer-label" onClick={this.props.onSelect}>
					<FormattedMessage id={ 'layerpane.thumb.layer.title' } values={{index: this.props.indexKey + 1}} />
				</div>
			</div>
		)
	}
}
