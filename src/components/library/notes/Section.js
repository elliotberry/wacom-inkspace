import React, {Component} from 'react';
import {FormattedDate} from 'react-intl';

import Note from './Note';

import ReactUtils from '../../../globals/ReactUtils';

class Section extends Component {
	constructor(props) {
		super(props);
	}

	render() {
		let date = new Date(ContentManager.getNote(this.props.content.first).creationDate);
		let range = this.props.parent ? this.props.parent.getVisibleRange() : null;
		let visible = range ? this.props.index >= range.first && this.props.index <= range.last : true;

		return (
			<section>
				<h2><FormattedDate value={date} year='numeric' month='long'/></h2>

				<div className="grid">
					{this.props.content.map(noteID => (
						<Note
							key={noteID}

							id={noteID}
							visible={visible}
							lastModified={this.props.lastModified}
							filterGroup={this.props.filterGroup}
							rotatedNotes={this.props.rotatedNotes}

							getContentRef={this.props.getContentRef}
							selectNotes={this.props.selectNotes}
						/>
					))}
				</div>
			</section>
		);
	}
}

export default ReactUtils.createParentTracker(Section);
