import React, {Component} from 'react';
import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {injectIntl, FormattedMessage} from 'react-intl';

import ReactList from 'react-list';
import classNames from 'classnames';

import Button from '../generic/Button';

import * as actions from '../../actions/modals';
import {filterByTag} from '../../actions/library';

import * as Modals from '../../constants/Modals';

import utils from '../../../scripts/utils';

import TagIcon from '../icons/library/tags-manager/TagIcon.svg';
import EditIcon from '../icons/library/tags-manager/EditIcon.svg';
import DeleteIcon from '../icons/library/tags-manager/DeleteIcon.svg';
import TickIcon from '../icons/library/tags-manager/TickIcon.svg';
import LoadingIcon from '../icons/LoadingIcon';

class TagsEditor extends Component {
	constructor(props) {
		super(props);

		this.cancel = ::this.cancel;

		let initialState = this.init();

		this.state = {
			notes: initialState.notes,
			usage: initialState.usage,
			edit: null,
			value: null,
			search: "",
			editor: initialState.editor,
			toggle: null
		};
	}

	init() {
		let notes = (this.props.context == "GROUPS" && this.props.filterGroup) ? ContentManager.getEntityNotes("groups", this.props.filterGroup) : ContentManager.getSelectedNotes();

		let state = {notes, editor: this.props.config.type == "TagsEditor"};
		state.usage = TagsEditor.getUsage(this.props.tags, state.editor);

		return state;
	}

	edit(tag) {
		this.setState({edit: tag, value: tag}, () => document.addEventListener("click", this.cancel));
	}

	update(e) {
		let name = e.target.name;
		let value = e.target.value;

		if (name == "value") {
			const MAX_LENGTH = 16;

			value = value.replace("  ", " ");
			if (value[0] == " ") value = value.trim();

			if (value.length > MAX_LENGTH)
				value = value.substring(0, MAX_LENGTH);
		}

		this.setState({[name]: value}, () => {
			if (name == "search")
				this.updateUsage(this.props.tags);
		});
	}

	confirm(e) {
		let confirm = false;

		if (e.type == "keydown") {
			if ([13, 27].includes(e.keyCode)) {
				if (e.keyCode == 13)
					confirm = !this.props.tags.includes(this.state.value) && !!this.state.value;
				else if (e.keyCode == 27)
					this.cancel({target: {name: "cancel"}});

				e.preventDefault();
				e.stopPropagation();
			}
		}
		else
			confirm = true;

		if (confirm) {
			this.props.tagsEditConfirm(this.state.edit, this.state.value.trim());
			this.setState({edit: null, value: null});
		}
	}

	cancel(e) {
		if (this.state.edit && e.target.name != "value")
			this.setState({edit: null, value: null}, () => document.removeEventListener("click", this.cancel));
	}

	confirmRemove(tag) {
		this.props.openDialog(Modals.CONFIRM, {title: "confirm.remove.tag.title", content: "confirm.remove.tag.description", type: "REMOVE_TAG", tag: tag});
	}

	filterNotes(tag) {
		if (!this.state.edit)
			this.props.filterByTag(tag);
	}

	toggle(tag) {
		if (this.state.toggle) return;

		this.setState({toggle: tag}, () => {
			this.props.tagsEditNotes(tag, this.state.notes, () => this.setState({toggle: null}));
		});
	}

	renderItem(index, key) {
		let tag = this.state.usage[index];

		if (this.state.edit == tag.name)
			return this.getEditRow(key, tag.name);
		else
			return this.getRow(key, tag.name, tag.count);
	}

	getRow(key, tag, count) {
		let classes = "row";
		let countData = this.state.editor ? <span>({count})</span> : null;
		let click = this.state.editor ? this.filterNotes.bind(this, tag) : this.toggle.bind(this, tag);

		if (!this.state.editor && this.props.filterTag == tag) {
			classes += " disabled";
			click = null;
		}

		return (
			<div key={key} className={classes} onClick={click}>
				<span className="icon button row-icon"><TagIcon /></span>
				<span>{tag}</span> <span className="tagged-notes-count">{countData}</span>
				{this.getActionBar(tag)}
			</div>
		);
	}

	getEditRow(key, tag) {
		let classes = "icon button";
		if (this.props.tags.includes(this.state.value) || !this.state.value) classes += " disabled";

		return (
			<div key={key} className="row edit" onClick={event => {event.stopPropagation()}}>
				<span className="icon button row-icon"><TagIcon /></span>

				<input ref={input => input ? input.focus() : null} name="value" value={this.state.value} onChange={::this.update} onKeyDown={event => this.confirm(event)} />

				<div className="row-action-bar visible">
					<a onClick={event => this.confirm(event)} className={classes}><TickIcon /></a>
				</div>
			</div>
		);
	}

	getActionBar(tag) {
		if (this.state.editor) {
			return (
				<div className="row-action-bar">
					<a className="icon" onClick={event => {event.stopPropagation(); this.edit(tag);}}><EditIcon /></a>
					<a className="icon" onClick={event => {event.stopPropagation(); this.confirmRemove(tag);}}><DeleteIcon /></a>
				</div>
			);
		}
		else {
			let tagNotes = this.state.notes.filter(note => note.tags.includes(tag));
			let classes = "icon button";
			let icon;

			if (this.state.toggle && this.state.toggle == tag)
				icon = <LoadingIcon />;
			else if (tagNotes.length) {
				icon = <TickIcon />;

				if (this.state.notes.length > tagNotes.length)
					classes += " partial";
				else
					classes += " checked";

			}
			else
				classes += " notfound";

			return (
				<div className="row-action-bar visible">
					<span className={classes}>{icon}</span>
				</div>
			);
		}
	}

	static getUsage(tags, editor, search) {
		let usage = tags.map(tag => ({
			name: tag,
			count: editor ? Object.values(ContentManager.notes).filter(note => note.tags.includes(tag)).length : 0
		})).sort(utils.comparator(
			{sortBy: "count", sortOrder: "desc"},
			{sortBy: "name", sortOrder: "asc", ignoreCase: true}
		));

		if (search)
			usage = usage.filter(tag => tag.name.toLowerCase().startsWith(search.toLowerCase()));

		return usage;
	}

	updateUsage(tags) {
		this.setState({usage: TagsEditor.getUsage(tags, this.state.editor, this.state.search)});
	}

	componentDidUpdate(prevProps, prevState) {
		if (this.props.tags != prevProps.tags)
			this.updateUsage(this.props.tags);
	}

	componentWillUnmount() {
		document.removeEventListener("click", this.cancel);
	}

	render() {
		if (this.props.tags.length == 0)
			return this.renderEmptyTagsManager();
		else
			return this.renderTagsManager();
	}

	renderEmptyTagsManager() {
		return (
			<div className="flex-wrapper center">
				<div>
					<h2><FormattedMessage id={'empty.tags.title'}/></h2>
					<p><FormattedMessage id={'empty.tags.description'}/></p>
					{(() => this.state.editor ? null : this.getEmptyActionBar())()}
				</div>
			</div>
		);
	}

	getEmptyActionBar() {
		return (
			<div className="action-bar">
				<div className="center">
					<Button text="btn.new.tag" click={::this.props.openTagAdd} />
				</div>
			</div>
		);
	}

	renderTagsManager() {
		return (
			<div className="tags-manager">
				<form className="tags-search">
					<input type="text" name="search" value={this.state.search} placeholder={this.props.intl.formatMessage({id: 'search.tags.placeholder'})} onChange={::this.update} onClick={this.cancel} />
				</form>
				<div className="tags-list">
					<ReactList itemRenderer={::this.renderItem} length={this.state.usage.length} />
				</div>
			</div>
		);
	}
}

function mapStateToProps(state) {
	return {
		context: state.LibraryReducer.context,
		tags: state.LibraryReducer.tags,
		filterTag: state.LibraryReducer.filterTag,
		filterGroup: state.LibraryReducer.filterGroup,
		lastModified: state.LibraryReducer.lastModified
	}
}

function mapDispatchToProps(dispatch) {
	return bindActionCreators({...actions, filterByTag}, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps, undefined, {withRef: true})(injectIntl(TagsEditor, {withRef: true}));
