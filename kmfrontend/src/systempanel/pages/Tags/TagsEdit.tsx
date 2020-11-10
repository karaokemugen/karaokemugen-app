import { Layout } from 'antd';
import React, { Component } from 'react';
import { RouteComponentProps, withRouter } from 'react-router-dom';

import { DBTag } from '../../../../../src/lib/types/database/tag';
import { commandBackend } from '../../../utils/socket';
import TagsForm from './TagsForm';

interface TagEditState {
	tag: DBTag,
	tags: Array<DBTag>,
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
		await commandBackend('addTag', tag, true);
		this.props.history.push('/system/km/tags');
	};

	saveUpdate = async (tag: DBTag) => {
		await commandBackend('editTag', tag, true);
		this.props.history.push('/system/km/tags');
	};

	handleTagMerge = async (tid1: string, tid2: string) => {
		await commandBackend('mergeTags', {tid1, tid2}, true);
		this.props.history.push('/system/km/tags/');
	}

	loadTag = async () => {
		if (this.props.match.params.tid) {
			let res = await commandBackend('getTag', {tid: this.props.match.params.tid}, true);
			const tagData = { ...res };
			tagData.tid = this.props.match.params.tid;
			res = await commandBackend('getTags');
			this.setState({ tags: res.content, tag: tagData, save: this.saveUpdate, loadTag: true });
		} else {
			this.setState({ save: this.saveNew, loadTag: true });
		}
	};

	handleCopy = async (tid, repo) => {
		await commandBackend('copyTagToRepo', { repo, tid }, true);
		this.props.history.push('/system/km/tags');
	}

	render() {
		return (
			<Layout.Content style={{ padding: '25px 50px', textAlign: 'center' }}>
				{this.state.loadTag && <TagsForm tag={this.state.tag} tags={this.state.tags} save={this.state.save}
					mergeAction={this.handleTagMerge} handleCopy={this.handleCopy} />}
			</Layout.Content>
		);
	}
}

export default withRouter(TagEdit);
