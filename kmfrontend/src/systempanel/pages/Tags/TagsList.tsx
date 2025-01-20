import { DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { Button, Input, Layout, Modal, Select, Table, Tag, Tooltip } from 'antd';
import i18next from 'i18next';
import { useContext, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { DBTag } from '../../../../../src/lib/types/database/tag';
import GlobalContext from '../../../store/context';
import { commandBackend } from '../../../utils/socket';
import { getTagTypeName, tagTypes } from '../../../utils/tagTypes';
import { isModifiable } from '../../../utils/tools';
import Title from '../../components/Title';

function TagsList() {
	const context = useContext(GlobalContext);
	const [searchParams, setSearchParams] = useSearchParams();

	const [filter, setFilter] = useState(localStorage.getItem('tagFilter') || '');
	const [currentPage, setCurrentPage] = useState(parseInt(localStorage.getItem('tagsPage')) || 1);
	const [currentPageSize, setCurrentPageSize] = useState(parseInt(localStorage.getItem('tagsPageSize')) || 10);
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
			const res = await commandBackend('getTags', { filter, type: typeTag ? [typeTag] : undefined });
			setTags(res.content);
		} catch (_) {
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
		} catch (_) {
			resetDelete();
		}
	};

	const changeFilter = event => {
		setFilter(event.target.value);
		localStorage.setItem('tagFilter', event.target.value);
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

	const handleTableChange = pagination => {
		setCurrentPage(pagination.current);
		setCurrentPageSize(pagination.pageSize);
		localStorage.setItem('tagsPage', pagination.current);
		localStorage.setItem('tagsPageSize', pagination.pageSize);
	};

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
					<div style={{ display: 'flex' }}>
						<Link to={`/system/tags/${record.tid}`}>
							<Button type="primary" style={{ marginRight: '0.75em' }} icon={<EditOutlined />} />
						</Link>
						<Button
							type="primary"
							danger
							icon={<DeleteOutlined />}
							onClick={() => {
								setDeleteModal(true);
								setTag(record);
							}}
						/>
					</div>
				) : null,
		},
	];

	return (
		<>
			<Title
				title={i18next.t('HEADERS.TAG_LIST.TITLE')}
				description={i18next.t('HEADERS.TAG_LIST.DESCRIPTION')}
			/>
			<Layout.Content>
				<div style={{ display: 'flex', marginBottom: '1em' }}>
					<Input.Search
						value={filter}
						placeholder={i18next.t('SEARCH_FILTER')}
						onChange={changeFilter}
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
				<Table
					onChange={handleTableChange}
					dataSource={tags}
					columns={columns}
					rowKey="tid"
					scroll={{
						x: true,
					}}
					expandable={{
						showExpandColumn: false,
					}}
					pagination={{
						position: ['topRight', 'bottomRight'],
						current: currentPage || 1,
						defaultPageSize: currentPageSize,
						pageSize: currentPageSize,
						showQuickJumper: true,
					}}
				/>
				<Modal
					title={i18next.t('TAGS.TAG_DELETED_CONFIRM')}
					open={deleteModal}
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
