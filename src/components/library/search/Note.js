import React, {Component} from 'react';
import {FormattedDate} from 'react-intl';

class Note extends Component {
	constructor(props) {
		super(props);
	}

	selectItem(e) {
		if (e.button != 0) return;

		this.props.selectNotes(this.props.id);

		e.preventDefault();
		e.stopPropagation();
	}

	onContextMenu(e) {
		e.stopPropagation();

		if (!this.props.selected)
			this.props.selectNotes(this.props.id);

		setTimeout(function () {
			contextMenuManager.showNoteMenu();
		}, 16)
	}

	render() {
		let note = ContentManager.getNote(this.props.id);
		let date = new Date(note.creationDate);
		let className = "item" + (this.props.selected ? " selected" : "");

		return (
			<div className={className} onMouseDown={::this.selectItem} onContextMenu={e => this.onContextMenu(e)}>
				<div className="thumb-container">
					<div className="thumb background-image" style={{backgroundImage: `url("${note.getThumbSrc()}")`}}></div>
				</div>
				<p dangerouslySetInnerHTML={{ __html: ContentManager.getDescription(note.id) }}></p>
				<div className="date"><FormattedDate value={date} year='numeric' month='short' day='numeric' /></div>
			</div>
		);
	}
}

export default Note;
