import React, {Component} from 'react';
import axios from 'axios';
import {connect} from 'react-redux';
import {Input, Divider, Modal, Tooltip, Tag, Icon, Button, Layout, Table, Select} from 'antd';
import {Link} from 'react-router-dom';
import {loading, errorMessage, warnMessage, infoMessage} from '../../actions/navigation';
import {ReduxMappedProps} from '../../react-app-env';
import i18next from 'i18next';
import { getTagTypeName, tagTypes } from '../../utils/tagTypes';


interface TagsListProps extends ReduxMappedProps {}

interface TagsListState {
	tags: any[],
	tag: any,
	deleteModal: boolean,
	type: number | undefined
}

class TagsList extends Component<TagsListProps, TagsListState> {

	filter: string;

	constructor(props) {
		super(props);
		this.filter = '';
		this.state = {
			tags: [],
			tag: {},
			deleteModal: false,
			type: window.location.search.indexOf('type=') !== -1 ? parseInt(window.location.search.split('=')[1]) : undefined
		};
	}

	componentDidMount() {
		this.refresh();
	}

	refresh() {
		this.props.loading(true);
		axios.get('/api/tags',  { params: { filter: this.filter, type: this.state.type }})
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
		axios.delete(`/api/tags/${tagsId}`)
			.then(() => {
				this.props.warnMessage(i18next.t('TAGS.TAG_DELETED'));
				this.setState({deleteModal: false, tag: {}});
				this.refresh();
			})
			.catch(err => {
				this.props.errorMessage(`${i18next.t('ERROR')} ${err.response.status} : ${err.response.statusText}. ${err.response.data}`);
				this.setState({deleteModal: false, tag: {}});
			});
	};

	changeType = async (value) => {
		await this.setState({type: value});
		this.refresh();
	}


	render() {
		return (
			<Layout.Content style={{ padding: '25px 50px', textAlign: 'center' }}>
				<Layout>
					<Layout.Header style={{display: 'flex'}}>
						<Input.Search
							placeholder={i18next.t('SEARCH_FILTER')}
							onChange={event => this.filter = event.target.value}
							enterButton={i18next.t('SEARCH')}
							onSearch={this.refresh.bind(this)}
						/>
						<label style={{marginLeft : '40px', paddingRight : '15px'}}>{i18next.t('TAGS.TYPES')} :</label>
						<Select allowClear={true} style={{ width: 300 }} onChange={this.changeType} defaultValue={this.state.type}>
							{Object.entries(tagTypes).map(([key, value]) => {
								return <Select.Option key={value} value={value}>{i18next.t(`TAG_TYPES.${key}`)}</Select.Option>
							})
							}
						</Select>
					</Layout.Header>
					<Layout.Content><Table
						dataSource={this.state.tags}
						columns={this.columns}
						rowKey='tid'
					/>
					<Modal
						title={i18next.t('TAGS.TAG_DELETED_CONFIRM')}
						visible={this.state.deleteModal}
						onOk={() => this.delete(this.state.tag.tid)}
						onCancel={() => this.setState({deleteModal: false, tag: {}})}
						okText={i18next.t('YES')}
						cancelText={i18next.t('NO')}
					>
						<p>{i18next.t('TAGS.DELETE_TAG_CONFIRM')} <b>{this.state.tag.name}</b></p>
						<p>{i18next.t('TAGS.DELETE_TAG_MESSAGE')}</p>
						<p>{i18next.t('CONFIRM_SURE')}</p>
					</Modal>
					</Layout.Content>
				</Layout>
			</Layout.Content>
		);
	}

	columns = [{
		title: i18next.t('TAGS.NAME'),
		dataIndex: 'name',
		render: name => name
	}, {
		title: i18next.t('TAGS.TYPES'),
		dataIndex: 'types',
		render: types => types.map(t => i18next.t(`TAG_TYPES.${getTagTypeName(t)}`)).join(', ')
	}, {
		title: i18next.t('TAGS.I18N'),
		dataIndex: 'i18n',
		render: i18n_names => {
			let names = [];
			Object.keys(i18n_names).forEach((lang) => {
				var name = i18n_names[lang];
				const isLongTag = name.length > 40;
				const i18n_name = `[${lang.toUpperCase()}] ${name}`;
				const tagElem = (
					<Tag key={lang} style={{margin: '2px'}}>
						{isLongTag ? `${i18n_name.slice(0, 20)}...` : i18n_name}
					</Tag>
				);
				names.push(isLongTag ? (<Tooltip title={name} key={lang}>{tagElem}</Tooltip>) : tagElem);
			});
			return names;
		}
	}, {
		title: i18next.t('TAGS.REPOSITORY'),
		dataIndex: 'repository',
		key: 'repository'
	}, {
		title: i18next.t('ACTION'),
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
