import { DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { Button, Layout, Modal, Select, Table, Tag, Tooltip } from 'antd';
import i18next from 'i18next';
import { useContext, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { DBTag } from '../../../../../src/lib/types/database/tag';
import GlobalContext from '../../../store/context';
import { commandBackend } from '../../../utils/socket';
import { getTagTypeName, tagTypes } from '../../../utils/tagTypes';
import { isModifiable } from '../../../utils/tools';
import Title from '../../components/Title';

function TagsDuplicate() {
	const context = useContext(GlobalContext);

	const [tags, setTags] = useState<DBTag[]>([]);
	const [tag, setTag] = useState<DBTag>();
	const [deleteModal, setDeleteModal] = useState(false);
	const [typesTag, setTypeTag] = useState(
		localStorage.getItem('typeTagDuplicate')
			? localStorage
					.getItem('typeTagDuplicate')
					.split(',')
					.map(value => parseInt(value))
			: []
	);

	const refresh = async () => {
		try {
			const res = await commandBackend(
				'getTags',
				{ duplicates: true, type: typesTag?.length > 0 ? typesTag : undefined },
				false,
				300000
			);
			setTags(res.content);
		} catch (error) {
			// already display
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

	const changeType = value => setTypeTag(value);

	useEffect(() => {
		localStorage.setItem('typeTagDuplicate', typesTag ? typesTag.toString() : '');
		refresh();
	}, [typesTag]);

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
				title={i18next.t('HEADERS.TAG_DUPLICATES.TITLE')}
				description={i18next.t('HEADERS.TAG_DUPLICATES.DESCRIPTION')}
			/>
			<Layout.Content>
				<div style={{ display: 'flex', marginBottom: '1em' }}>
					<label style={{ marginLeft: '2em', paddingRight: '1em' }}>{i18next.t('TAGS.TYPES')} :</label>
					<Select
						mode="multiple"
						allowClear={true}
						style={{ width: 300 }}
						onChange={changeType}
						defaultValue={typesTag}
					>
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
					dataSource={tags}
					columns={columns}
					rowKey="tid"
					scroll={{
						x: true,
					}}
					expandable={{
						showExpandColumn: false,
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

export default TagsDuplicate;
