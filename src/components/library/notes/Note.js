import React, {Component} from 'react';
import {FormattedDate} from 'react-intl';

import LoadingIcon from '../../icons/LoadingIcon';

import images from '../../../images';

import ReactUtils from '../../../globals/ReactUtils';

class Note extends Component {
	constructor(props) {
		super(props);

		this.state = {
			selected: false,
			shouldScroll: false,
			preloader: false,
			filterGroup: this.props.filterGroup,
			rotatedNotes: this.props.rotatedNotes
		};

		let dragIcon = new Image();
		dragIcon.src = images.multipleDrag;

		this.state.dragIcon = dragIcon;
	}

	selectItem(e) {
		if (e.button != 0) return;

		let ctrl = (process.platform == "darwin") ? e.metaKey : e.ctrlKey;

		if (ctrl) {
			let selectedIDs = ContentManager.selected.slice();

			if (this.state.selected) {
				if (selectedIDs.length > 1)
					selectedIDs.remove(this.props.id);
			}
			else
				selectedIDs.push(this.props.id);

			if (ContentManager.selected.length != selectedIDs.length)
				this.props.selectNotes(selectedIDs);
		}
		else
			this.props.selectNotes(this.props.id);
	}

	dragStart(e) {
		let ctrl = (process.platform == "darwin") ? e.metaKey : e.ctrlKey;

		if (ctrl || (ContentManager.selected.length == 1 && ContentManager.selected.first != e.target.id)) {
			e.preventDefault();
			e.stopPropagation();

			return;
		}

		e.dataTransfer.setData("notes", ContentManager.selected);

		if (ContentManager.selected.length > 1)
			e.dataTransfer.setDragImage(this.state.dragIcon, 86, 86);
	}

	onContextMenu(e) {
		e.stopPropagation();

		if (!this.state.selected)
			this.props.selectNotes(this.props.id);

		setTimeout(() => contextMenuManager.showNoteMenu(), 16);
	}

	componentDidMount() {
		if (ContentManager.isSelected(this.props.id)) {
			let update = {selected: true}

			if (ContentManager.selected.first == this.props.id)
				update.shouldScroll = true;

			this.setState(update);
		}
	}

	static getDerivedStateFromProps(props, state) {
		let update = {};

		if (state.selected != ContentManager.isSelected(props.id))
			update.selected = !state.selected;

		update.rotatedNotes = props.rotatedNotes;

		if (props.rotatedNotes.includes(props.id))
			update.preloader = true;
		else if (state.rotatedNotes.includes(props.id))
			update.preloader = false;

		return update;
	}

	render() {
		let note = ContentManager.getNote(this.props.id);
		let date = new Date(note.creationDate);
		let className = "item" + (this.state.selected ? " selected" : "");

		let loader;
		let image;

		let onDoubleClick = this.props.editNote;
		let onContextMenu = ::this.onContextMenu;

		if (this.state.preloader || this.props.editedNotes.includes(this.props.id)) {
			loader = <LoadingIcon />;
			onDoubleClick = null;
			onContextMenu = null;
		}
		else {
			if (this.props.visible)
				image = {backgroundImage: `url("${note.getThumbSrc()}")`};
			/*else {
				if (this.props.parent) {
					let sectionIDX = this.props.parent.props.index;
					let range = this.props.parent.parent.getVisibleRange();

					if (sectionIDX >= range.first-2 && sectionIDX <= range.last+2)
						loader = <LoadingIcon />;
				}
			}*/
		}

		return (
			<div ref={note.id} id={note.id} className={className} draggable="true" onDragStart={::this.dragStart} onClick={::this.selectItem} onDoubleClick={onDoubleClick} onContextMenu={onContextMenu}>
				<div className="thumb background-image" style={image}>{loader}</div>
				<div className="thumb-title">
					<FormattedDate value={date} year='numeric' month='short' day='numeric'/>
				</div>
			</div>
		);
	}

	componentDidUpdate(prevProps, prevState) {
		if (this.state.shouldScroll) {
			let node = this.refs[this.props.id];
			let content = this.props.getContentRef();

			// content.scrollTop = node.offsetTop - content.offsetHeight / 2 + node.offsetHeight / 2;
			setTimeout(() => content.scrollTop = node.offsetTop - content.offsetHeight / 2 + node.offsetHeight / 2, 1);

			this.setState({shouldScroll: false});
		}
		else if (this.props.filterGroup != prevProps.filterGroup && ContentManager.selected.first == this.props.id)
			this.setState({shouldScroll: true});
	}
}

export default ReactUtils.createParentTracker(Note);
