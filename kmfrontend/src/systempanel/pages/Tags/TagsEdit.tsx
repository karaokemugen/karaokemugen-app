import { Layout } from 'antd';
import i18next from 'i18next';
import React, { Component } from 'react';
import { RouteComponentProps, withRouter } from 'react-router-dom';

import { DBTag } from '../../../../../src/lib/types/database/tag';
import { commandBackend } from '../../../utils/socket';
import TagsForm from './TagsForm';

interface TagEditState {
	tag: DBTag,
	tags: DBTag[],
	save?: (tag: DBTag) => void,
	loadTag: boolean
}

class TagEdit extends Component<RouteComponentProps<{ tid: string }>, TagEditState> {

	state = {
		tag: undefined,
		tags: [],
		aliases: [],
		save: () => { },
		loadTag: false
	};

	componentDidMount() {
		this.loadTag();
	}

	saveNew = async (tag: DBTag) => {
		try {
			await commandBackend('addTag', tag, true, 300000);
			this.props.history.push('/system/tags');
		} catch (e) {
			// already display
		}
	};

	saveUpdate = async (tag: DBTag) => {
		try {
			await commandBackend('editTag', tag, true, 300000);
			this.props.history.push('/system/tags');
		} catch (e) {
			// already display
		}
	};

	handleTagMerge = async (tid1: string, tid2: string) => {
		await commandBackend('mergeTags', {tid1, tid2}, true, 300000);
		this.props.history.push('/system/tags/');
	}

	loadTag = async () => {
		try {
			if (this.props.match.params.tid) {
				let res = await commandBackend('getTag', {tid: this.props.match.params.tid}, true);
				const tagData = { ...res };
				tagData.tid = this.props.match.params.tid;
				res = await commandBackend('getTags');
				this.setState({ tags: res.content, tag: tagData, save: this.saveUpdate, loadTag: true });
			} else {
				this.setState({ save: this.saveNew, loadTag: true });
			}
		} catch (e) {
			this.setState({ save: this.saveNew, loadTag: true });
		}
	};

	handleCopy = async (tid, repo) => {
		await commandBackend('copyTagToRepo', { repo, tid }, true);
		this.props.history.push('/system/tags');
	}

	render() {
		return (
			<>
				<Layout.Header>
					<div className='title'>{i18next.t(this.props.match.params.tid ? 
						'HEADERS.TAG_EDIT.TITLE' :
						'HEADERS.TAG_NEW.TITLE'
					)}</div>
					<div className='description'>{i18next.t(this.props.match.params.tid ? 
						'HEADERS.TAG_EDIT.DESCRIPTION' : 
						'HEADERS.TAG_NEW.DESCRIPTION'
					)}</div>
				</Layout.Header>
				<Layout.Content>
					{this.state.loadTag && <TagsForm tag={this.state.tag} tags={this.state.tags} save={this.state.save}
						mergeAction={this.handleTagMerge} handleCopy={this.handleCopy} />}
				</Layout.Content>
			</>
		);
	}
}

export default withRouter(TagEdit);
