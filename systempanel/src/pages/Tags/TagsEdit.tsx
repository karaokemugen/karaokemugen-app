import React, {Component} from 'react';
import {Layout} from 'antd';
import TagsForm from './TagsForm';
import axios from 'axios/index';
import {connect} from 'react-redux';
import {push} from 'connected-react-router';
import {errorMessage, infoMessage, loading, warnMessage} from '../../actions/navigation';

import {ReduxMappedProps} from '../../react-app-env';
import i18next from 'i18next';

interface TagEditProps extends ReduxMappedProps {
	push: (url: string) => void;
	match?: any,
}

interface TagEditState {
	tag: any,
	tags: any,
	save: any,
}

const newTag = {
	name: null,
	i18n: {}
};

class TagEdit extends Component<TagEditProps, TagEditState> {

	state = {
		tag: null,
		tags: [],
		aliases: [],
		save: () => {}
	};

	componentDidMount() {
		this.loadTag();
	}

	saveNew = (tag) => {
		axios.post('/api/tags', tag)
			.then(() => {
				this.props.infoMessage(i18next.t('TAGS.TAG_CREATED'));
				this.props.push('/system/km/tags');
			})
			.catch(err => {
				this.props.errorMessage(`${err.response.status}: ${err.response.statusText}. ${err.response.data}`);
			});
	};

	saveUpdate = (tag) => {
		axios.put(`/api/tags/${tag.tid}`, tag)
			.then(() => {
				this.props.infoMessage(i18next.t('TAGS.TAG_EDITED'));
				this.props.push('/system/km/tags');
			})
			.catch(err => {
				this.props.errorMessage(`${err.response.status}: ${err.response.statusText}. ${err.response.data}`);
			});
	};

	handleTagMerge = (tid1,tid2) => {
		axios.post('/api/tags/merge/'+tid1+'/'+tid2)
			.then((data) => {
				this.props.infoMessage(i18next.t('TAGS.TAGS_MERGED'));
				this.props.push('/system/km/tags/');
			})
			.catch(err => {
				this.props.errorMessage(`${err.response.status}: ${err.response.statusText}. ${err.response.data}`);
			});
	}

	loadTag = () => {
		this.props.loading(true);
		if (this.props.match && this.props.match.params.tid) {
			axios.get(`/api/tags/${this.props.match.params.tid}`)
				.then(res => {
					const tagData = {...res.data};
					tagData.tid = this.props.match.params.tid;
					this.setState({tag: tagData, save: this.saveUpdate});

					axios.get('/api/tags')
						.then(res => {
							this.props.loading(false);
							this.setState({tags: res.data.content});
						})
						.catch(err => {
							this.props.loading(false);
							this.props.errorMessage(`${err.response.status}: ${err.response.statusText}. ${err.response.data}`);
						});
				})
				.catch(err => {
					this.props.errorMessage(`${err.response.status}: ${err.response.statusText}. ${err.response.data}`);
					this.props.loading(false);
				});
		} else {
			this.setState({tag: {...newTag}, save: this.saveNew});
			this.props.loading(false);
		}
	};


	render() {
		return (
			<Layout.Content style={{padding: '25px 50px', textAlign: 'center'}}>
				{this.state.tag && (<TagsForm tag={this.state.tag} tags={this.state.tags} save={this.state.save} mergeAction={this.handleTagMerge.bind(this)} />)}
			</Layout.Content>
		);
	}
}

const mapStateToProps = (state) => ({
	loadingActive: state.navigation.loading
});

const mapDispatchToProps = (dispatch) => ({
	loading: (active) => dispatch(loading(active)),
	infoMessage: (message) => dispatch(infoMessage(message)),
	errorMessage: (message) => dispatch(errorMessage(message)),
	warnMessage: (message) => dispatch(warnMessage(message)),
	push: (url) => dispatch(push(url))
});

export default connect(mapStateToProps, mapDispatchToProps)(TagEdit);