import React, {Component} from 'react';
import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {FormattedMessage} from 'react-intl';
import ScrollArea from 'react-scrollbar';
import Tooltip from 'rc-tooltip';
import classNames from 'classnames';

import LayerPaneItem from './LayerPaneItem';

// import LoadingIcon from '../icons/LoadingIcon';
import PasteIcon from '../icons/edit/PasteIcon.svg';
import AddLayer from '../icons/edit/AddLayerIcon.svg';

import * as actions from '../../actions/edit';

class LayerPane extends Component {
	constructor(props) {
		super(props);

		let {note} = this.props;

		this.state = {
			thumbWidth: note.isLandscape() ? 135 : 100
		};
	}

	componentDidMount() {
		// this.props.generatePreviews();
	}

	pasteLayer() {
		if (this.props.hasClipboard)
			this.props.layerPaste(this.props.currentLayer);
	}

	render() {
		let scrollAreaContentWidth = this.props.previews.length * this.state.thumbWidth + 60 - 20; // 2 x 30 padding, 20 last marginRight
		let thumbWrapperWidth = (scrollAreaContentWidth > window.innerWidth) ? window.innerWidth : scrollAreaContentWidth;

		var wrapperClasses = classNames({
			'layer-pane': true,
			'loading-progress': this.props.noteProgress,
			'landscape': this.props.note.isLandscape(),
			'hidden': !this.props.layerPaneVisible || this.props.splitMode == 'note'
		});

		var pasteIconClasses = classNames({
			'icon': true,
			'disabled': !this.props.hasClipboard || !!this.props.splitMode || this.props.pasting
		});

		return (
			<div className={wrapperClasses} onChange={this.onChange}>
				<div className="header flex-wrapper">
					<div className="menu-wrapper">
						<div className='menu pull-right'>
							<ul>
								<li>
									<Tooltip placement={'bottom'} destroyTooltipOnHide={true} overlay={<div ><FormattedMessage id={ 'menu.paste.layer' }/></div>}>
										<a className={pasteIconClasses} onClick={::this.pasteLayer}><PasteIcon /></a>
									</Tooltip>
								</li>
								{/*<li>
									<Tooltip placement={'bottom'} destroyTooltipOnHide={true} overlay={<div ><FormattedMessage id={ 'btn.add' }/></div>}>
										<a className="icon" onClick={this.props.layerAdd}><AddLayer /></a>
									</Tooltip>
								</li>*/}
							</ul>
						</div>
					</div>

					{this.props.hasClipboard ? <FormattedMessage id={ 'layerpane.layer.in.clipboard' } values={{count: '1'}} />  : ''}
				</div>
				<ScrollArea style={{width: thumbWrapperWidth}} contentStyle={{width: scrollAreaContentWidth}} swapWheelAxes={true} stopScrollPropagation={true}>
					<div className="thumb-container">
						{this.props.previews.map((preview, index) => this.renderItem(index))}
					</div>
				</ScrollArea>
			</div>
		)
	}

	renderItem(index) {
		let isCurrent = this.props.currentLayer == index;

		return <LayerPaneItem
			key={"Preivew" + index}
			imageSRC={this.props.previews[index]}
			indexKey={index}
			landscape={this.props.note.isLandscape()}
			isCurrent={isCurrent}
			splitMode={this.props.splitMode}
			onSelect={() => this.props.selectLayer(index)}
		/>;
	}
}

function mapStateToProps(state) {
	return {
		noteProgress: state.EditReducer.noteProgress,
		hasClipboard: !!state.EditReducer.clipboard,
		layerPaneVisible: state.EditReducer.layerPaneVisible,
		splitMode: state.EditReducer.splitMode,
		note: state.EditReducer.note,
		pasting: state.EditReducer.pasting,
		previews: state.EditReducer.previews,
		currentLayer: state.EditReducer.currentLayer
	}
}

function mapDispatchToProps(dispatch) {
	return bindActionCreators(actions, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(LayerPane);
