import { DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { Button, Divider, Input, Layout, Modal, Select, Table, Tag, Tooltip } from 'antd';
import i18next from 'i18next';
import { useContext, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { DBTag } from '../../../../../src/lib/types/database/tag';
import GlobalContext from '../../../store/context';
import { commandBackend } from '../../../utils/socket';
import { getTagTypeName, tagTypes } from '../../../utils/tagTypes';
import { is_touch_device, isModifiable } from '../../../utils/tools';

function TagsList() {
	const context = useContext(GlobalContext);
	const [searchParams, setSearchParams] = useSearchParams();

	const [filter, setFilter] = useState('');
	const [tags, setTags] = useState<DBTag[]>([]);
	const [tag, setTag] = useState<DBTag>();
	const [deleteModal, setDeleteModal] = useState(false);
	const [typeTag, setTypeTag] = useState(
		searchParams.get('type')
			? parseInt(searchParams.get('type'))
			: localStorage.getItem('typeTagList')
			? parseInt(localStorage.getItem('typeTagList'))
			: undefined
	);

	const refresh = async () => {
		try {
			const res = await commandBackend('getTags', { filter, type: typeTag });
			setTags(res.content);
		} catch (e) {
			//already display
		}
	};

	const resetDelete = () => {
		setDeleteModal(false);
		setTag(undefined);
	};

	const deleteTag = async tid => {
		try {
			resetDelete();
			await commandBackend('deleteTag', { tids: [tid] }, true);
			refresh();
		} catch (err) {
			resetDelete();
		}
	};

	const changeType = value => setTypeTag(value);

	useEffect(() => {
		setSearchParams(typeTag ? { type: typeTag.toString() } : {});
		localStorage.setItem('typeTagList', typeTag ? typeTag.toString() : '');
		refresh();
	}, [typeTag]);

	useEffect(() => {
		refresh();
	}, []);

	const columns = [
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
				isModifiable(context, record.repository) ? (
					<span>
						<Link to={`/system/tags/${record.tid}`}>
							<Button type="primary" icon={<EditOutlined />} />
						</Link>
						{!is_touch_device() ? <Divider type="vertical" /> : null}
						<Button
							type="primary"
							danger
							icon={<DeleteOutlined />}
							onClick={() => {
								setDeleteModal(true);
								setTag(record);
							}}
						/>
					</span>
				) : null,
		},
	];

	return (
		<>
			<Layout.Header>
				<div className="title">{i18next.t('HEADERS.TAG_LIST.TITLE')}</div>
				<div className="description">{i18next.t('HEADERS.TAG_LIST.DESCRIPTION')}</div>
			</Layout.Header>
			<Layout.Content>
				<div style={{ display: 'flex', marginBottom: '1em' }}>
					<Input.Search
						placeholder={i18next.t('SEARCH_FILTER')}
						onChange={event => setFilter(event.target.value)}
						enterButton={i18next.t('SEARCH')}
						onSearch={refresh}
					/>
					<label style={{ marginLeft: '2em', paddingRight: '1em' }}>{i18next.t('TAGS.TYPES')} :</label>
					<Select allowClear={true} style={{ width: 300 }} onChange={changeType} defaultValue={typeTag}>
						{Object.entries(tagTypes).map(([key, value]) => {
							return (
								<Select.Option key={value.type} value={value.type}>
									{i18next.t(`TAG_TYPES.${key}_other`)}
								</Select.Option>
							);
						})}
					</Select>
				</div>
				<Table dataSource={tags} columns={columns} rowKey="tid" />
				<Modal
					title={i18next.t('TAGS.TAG_DELETED_CONFIRM')}
					visible={deleteModal}
					onOk={() => deleteTag(tag.tid)}
					onCancel={resetDelete}
					okText={i18next.t('YES')}
					cancelText={i18next.t('NO')}
				>
					<p>
						{i18next.t('TAGS.DELETE_TAG_CONFIRM')} <b>{tag?.name}</b>
					</p>
					<p>{i18next.t('TAGS.DELETE_TAG_MESSAGE')}</p>
					<p>{i18next.t('CONFIRM_SURE')}</p>
				</Modal>
			</Layout.Content>
		</>
	);
}

export default TagsList;
