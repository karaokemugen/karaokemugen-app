import React, {Component} from 'react';
import { Input, Divider, Modal, Tooltip, Tag, Button, Layout, Table, Select } from 'antd';
import {Link} from 'react-router-dom';
import i18next from 'i18next';
import { getTagTypeName, tagTypes } from '../../utils/tagTypes';
import { DeleteOutlined, EditOutlined } from '@ant-design/icons';
import Axios from 'axios';
import { DBTag } from '../../../../src/lib/types/database/tag';
import { getAxiosInstance } from '../../axiosInterceptor';

interface TagsListState {
	tags: DBTag[],
	tag?: DBTag,
	deleteModal: boolean,
	type?: number
}

class TagsList extends Component<{}, TagsListState> {

	filter: string;

	constructor(props) {
		super(props);
		this.filter = '';
		this.state = {
			tags: [],
			deleteModal: false,
			type: window.location.search.indexOf('type=') !== -1 ? parseInt(window.location.search.split('=')[1]) : undefined
		};
	}

	componentDidMount() {
		this.refresh();
	}

	refresh = async () => {
		let res = await Axios.get('/tags',  { params: { filter: this.filter, type: this.state.type }});
		this.setState({tags: res.data.content});
	}

	delete = async (tagsId) => {
		try {
			await getAxiosInstance().delete(`/tags/${tagsId}`)
			this.setState({deleteModal: false, tag: undefined});
			this.refresh();
		} catch(err) {
			this.setState({deleteModal: false, tag: undefined});
		}
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
							onSearch={this.refresh}
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
						onCancel={() => this.setState({deleteModal: false, tag: undefined})}
						okText={i18next.t('YES')}
						cancelText={i18next.t('NO')}
					>
						<p>{i18next.t('TAGS.DELETE_TAG_CONFIRM')} <b>{this.state.tag?.name}</b></p>
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
			<Link to={`/system/km/tags/${record.tid}`}><EditOutlined /></Link>
			<Divider type="vertical"/>
			<Button type="primary" danger icon={<DeleteOutlined />} onClick={
				() => this.setState({deleteModal: true, tag: record})
			}/>
		</span>)
	}];
}

export default TagsList;
