import { DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { Button, Divider, Layout, Modal, Table, Tag, Tooltip } from 'antd';
import i18next from 'i18next';
import { Component } from 'react';
import { Link } from 'react-router-dom';

import { DBTag } from '../../../../../src/lib/types/database/tag';
import GlobalContext from '../../../store/context';
import { commandBackend } from '../../../utils/socket';
import { getTagTypeName } from '../../../utils/tagTypes';
import { is_touch_device, isModifiable } from '../../../utils/tools';

interface TagsListState {
	tags: DBTag[];
	tag?: DBTag;
	deleteModal: boolean;
}

class TagsDuplicate extends Component<unknown, TagsListState> {
	static contextType = GlobalContext;
	context: React.ContextType<typeof GlobalContext>;
	filter: string;

	constructor(props) {
		super(props);
		this.filter = '';
		this.state = {
			tags: [],
			deleteModal: false,
		};
	}

	componentDidMount() {
		this.refresh();
	}

	refresh = async () => {
		try {
			const res = await commandBackend('getTags', { duplicates: true }, false, 300000);
			this.setState({ tags: res.content });
		} catch (error) {
			// already display
		}
	};

	delete = async tid => {
		try {
			this.setState({ deleteModal: false, tag: undefined });
			await commandBackend('deleteTag', { tids: [tid] }, true);
			this.refresh();
		} catch (err) {
			this.setState({ deleteModal: false, tag: undefined });
		}
	};

	render() {
		return (
			<>
				<Layout.Header>
					<div className="title">{i18next.t('HEADERS.TAG_DUPLICATES.TITLE')}</div>
					<div className="description">{i18next.t('HEADERS.TAG_DUPLICATES.DESCRIPTION')}</div>
				</Layout.Header>
				<Layout.Content>
					<Table dataSource={this.state.tags} columns={this.columns} rowKey="tid" />
					<Modal
						title={i18next.t('TAGS.TAG_DELETED_CONFIRM')}
						visible={this.state.deleteModal}
						onOk={() => this.delete(this.state.tag.tid)}
						onCancel={() => this.setState({ deleteModal: false, tag: undefined })}
						okText={i18next.t('YES')}
						cancelText={i18next.t('NO')}
					>
						<p>
							{i18next.t('TAGS.DELETE_TAG_CONFIRM')} <b>{this.state.tag?.name}</b>
						</p>
						<p>{i18next.t('TAGS.DELETE_TAG_MESSAGE')}</p>
						<p>{i18next.t('CONFIRM_SURE')}</p>
					</Modal>
				</Layout.Content>
			</>
		);
	}

	columns = [
		{
			title: i18next.t('TAGS.NAME'),
			dataIndex: 'name',
			render: name => name,
		},
		{
			title: i18next.t('TAGS.TYPES'),
			dataIndex: 'types',
			render: types => types.map(t => i18next.t(`TAG_TYPES.${getTagTypeName(t)}_other`)).join(', '),
		},
		{
			title: i18next.t('TAGS.I18N'),
			dataIndex: 'i18n',
			render: i18n_names => {
				const names = [];
				for (const lang in i18n_names) {
					const name = i18n_names[lang];
					const isLongTag = name.length > 40;
					const i18n_name = `[${lang.toUpperCase()}] ${name}`;
					const tagElem = (
						<Tag key={lang} style={{ margin: '2px' }}>
							{isLongTag ? `${i18n_name.slice(0, 20)}...` : i18n_name}
						</Tag>
					);
					names.push(
						isLongTag ? (
							<Tooltip title={name} key={lang}>
								{tagElem}
							</Tooltip>
						) : (
							tagElem
						)
					);
				}
				return names;
			},
		},
		{
			title: i18next.t('TAGS.REPOSITORY'),
			dataIndex: 'repository',
			key: 'repository',
		},
		{
			title: i18next.t('ACTION'),
			render: (_text, record) =>
				isModifiable(this.context, record.repository) ? (
					<span>
						<Link to={`/system/tags/${record.tid}`}>
							<Button type="primary" icon={<EditOutlined />} />
						</Link>
						{!is_touch_device() ? <Divider type="vertical" /> : null}
						<Button
							type="primary"
							danger
							icon={<DeleteOutlined />}
							onClick={() => this.setState({ deleteModal: true, tag: record })}
						/>
					</span>
				) : null,
		},
	];
}

export default TagsDuplicate;
