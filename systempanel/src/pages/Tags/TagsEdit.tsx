import React, {Component} from 'react';
import {Layout} from 'antd';
import TagsForm from './TagsForm';
import { withRouter, RouteComponentProps } from 'react-router-dom';
import Axios from 'axios';
import { DBTag } from '../../../../src/lib/types/database/tag';
import { getAxiosInstance } from '../../axiosInterceptor';

interface TagEditState {
	tag: DBTag,
	tags: Array<DBTag>,
	save?: (tag:DBTag) => void,
	loadTag: boolean
}

class TagEdit extends Component<RouteComponentProps<{tid:string}>, TagEditState> {

	state = {
		tag: undefined,
		tags: [],
		aliases: [],
		save: () => {},
		loadTag: false
	};

	componentDidMount() {
		this.loadTag();
	}

	saveNew = async (tag:DBTag) => {
		await getAxiosInstance().post('/tags', tag);
		this.props.history.push('/system/km/tags');
	};

	saveUpdate = async (tag:DBTag) => {
		await getAxiosInstance().put(`/tags/${tag.tid}`, tag)
		this.props.history.push('/system/km/tags');
	};

	handleTagMerge = async (tid1:string, tid2:string) => {
		await getAxiosInstance().post(`/tags/merge/${tid1}/${tid2}`);
		this.props.history.push('/system/km/tags/');
	}

	loadTag = async () => {
		if (this.props.match.params.tid) {
				let res = await getAxiosInstance().get(`/tags/${this.props.match.params.tid}`);
				const tagData = {...res.data};
				tagData.tid = this.props.match.params.tid;
				res = await Axios.get('/tags');
				this.setState({tags: res.data.content, tag: tagData, save: this.saveUpdate, loadTag: true});
		} else {
			this.setState({save: this.saveNew, loadTag: true});
		}
	};

	render() {
		return (
			<Layout.Content style={{padding: '25px 50px', textAlign: 'center'}}>
				{this.state.loadTag && <TagsForm tag={this.state.tag} tags={this.state.tags} save={this.state.save} mergeAction={this.handleTagMerge} />}
			</Layout.Content>
		);
	}
}

export default withRouter(TagEdit);