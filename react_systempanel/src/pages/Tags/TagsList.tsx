import React, {Component} from 'react';
import axios from 'axios';
import {connect} from 'react-redux';
import {Input, Divider, Modal, Tooltip, Tag, Icon, Button, Layout, Table} from 'antd';
import {Link} from 'react-router-dom';
import {loading, errorMessage, warnMessage, infoMessage} from '../../actions/navigation';
import {ReduxMappedProps} from '../../react-app-env';

export function getTagTypeName(type: number): string {
	return Object.keys(tagTypes).find(t => tagTypes[t] === type);
}

export const tagTypes = Object.freeze({
	singers: 2,
	songtypes: 3,
	creators: 4,
	langs: 5,
	authors: 6,
	misc: 7,
	songwriters: 8,
	groups: 9,
	families: 10,
	origins: 11,
	genres: 12,
	platforms: 13
});

interface TagsListProps extends ReduxMappedProps {}

interface TagsListState {
	tags: any[],
	tag: any,
	deleteModal: boolean,
}

class TagsList extends Component<TagsListProps, TagsListState> {

	filter: string;

	constructor(props) {
		super(props);
		this.filter = '';
		this.state = {
			tags: [],
			tag: {},
			deleteModal: false
		};
	}

	componentDidMount() {
		this.refresh();
	}

	refresh() {
		this.props.loading(true);
		axios.get('/api/system/tags',  { params: { filter: this.filter }})
			.then(res => {
				this.props.loading(false);
				this.setState({tags: res.data.content});
			})
			.catch(err => {
				this.props.loading(false);
				this.props.errorMessage(`${err.response.status}: ${err.response.statusText}. ${err.response.data}`);
			});
	}

	delete = (tagsId) => {
		axios.delete(`/api/system/tags/${tagsId}`)
			.then(() => {
				this.props.warnMessage('Tags deleted.');
				this.setState({deleteModal: false, tag: {}});
				this.refresh();
			})
			.catch(err => {
				this.props.errorMessage(`Error ${err.response.status} : ${err.response.statusText}. ${err.response.data}`);
				this.setState({deleteModal: false, tag: {}});
			});
	};


	render() {
		return (
			<Layout.Content style={{ padding: '25px 50px', textAlign: 'center' }}>
				<Layout>
					<Layout.Header>
						<Input.Search
							placeholder="Search filter"
							onChange={event => this.filter = event.target.value}
							enterButton="Search"
							onSearch={this.refresh.bind(this)}
						/>
					</Layout.Header>
					<Layout.Content><Table
						dataSource={this.state.tags}
						columns={this.columns}
						rowKey='tid'
					/>
					<Button type='primary' onClick={this.refresh.bind(this)}>Refresh</Button>
					<Modal
						title='Confirm tags deletion'
						visible={this.state.deleteModal}
						onOk={() => this.delete(this.state.tag.tid)}
						onCancel={() => this.setState({deleteModal: false, tag: {}})}
						okText='yes'
						cancelText='no'
					>
						<p>Delete tags <b>{this.state.tag.name}</b></p>
						<p>This will remove its tags.json file as well as in any .kara in your database!</p>
						<p>Are you sure?</p>
					</Modal>
					</Layout.Content>
				</Layout>
			</Layout.Content>
		);
	}

	columns = [{
		title: 'Original Name',
		dataIndex: 'name',
		key: 'name',
		render: name => name
	}, {
		title: 'Types',
		dataIndex: 'types',
		key: 'types',
		render: types => types.map(t => getTagTypeName(t)).join(', ')
	}, {
		title: 'International Names',
		dataIndex: 'i18n',
		key: 'i18n',
		render: i18n_names => {
			let names = [];
			Object.keys(i18n_names).forEach((lang) => {
				var name = i18n_names[lang];
				const isLongTag = name.length > 40;
				const i18n_name = `[${lang.toUpperCase()}] ${name}`;
				const tagElem = (
					<Tag key={lang}>
						{isLongTag ? `${i18n_name.slice(0, 20)}...` : i18n_name}
					</Tag>
				);
				names.push(isLongTag ? (<Tooltip title={name} key={lang}>{tagElem}</Tooltip>) : tagElem);
				return true;
			});
			return names;
		}
	}, {
		title: 'Action',
		key: 'action',
		render: (text, record) => (<span>
			<Link to={`/system/km/tags/${record.tid}`}><Icon type='edit'/></Link>
			<Divider type="vertical"/>
			<Button type='danger' icon='delete' onClick={
				() => this.setState({deleteModal: true, tag: record})
			}/>
		</span>)
	}];
}

const mapStateToProps = (state) => ({
	loadingActive: state.navigation.loading
});

const mapDispatchToProps = (dispatch) => ({
	loading: (active) => dispatch(loading(active)),
	infoMessage: (message) => dispatch(infoMessage(message)),
	errorMessage: (message) => dispatch(errorMessage(message)),
	warnMessage: (message) => dispatch(warnMessage(message))
});

export default connect(mapStateToProps, mapDispatchToProps)(TagsList);
