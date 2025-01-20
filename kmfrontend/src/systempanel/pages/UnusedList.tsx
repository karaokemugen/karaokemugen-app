import { DeleteOutlined } from '@ant-design/icons';
import { Button, Col, Layout, Radio, Row, Select, Table } from 'antd';
import i18next from 'i18next';
import { useEffect, useState } from 'react';

import { commandBackend } from '../../utils/socket';
import { getTagTypeName, tagTypes } from '../../utils/tagTypes';
import Title from '../components/Title';

function UnusedList() {
	const [unused, setUnused] = useState([]);
	const [repositories, setRepositories] = useState<string[]>([]);
	const [repository, setRepository] = useState<string>();
	const [type, setType] = useState<'tags' | 'medias'>();
	const [tagType, setTagType] = useState<number>();

	useEffect(() => {
		refresh();
	}, []);

	useEffect(() => {
		if (type === 'medias') {
			getMedias();
		} else if (type === 'tags') {
			getTags();
		}
	}, [type]);

	const refresh = async () => {
		const res = await commandBackend('getRepos');
		if (res.length > 0) {
			setRepository(res[0].Name);
			setRepositories(res.map(value => value.Name));
		}
	};

	const getTags = async () => {
		const res = await commandBackend('getUnusedTags', { name: repository }, undefined, 60000);
		setUnused(
			res
				? res.map(value => {
						return { name: value.name, types: value.types, file: value.tagfile, tid: value.tid };
					})
				: []
		);
	};

	const getMedias = async () => {
		const res = await commandBackend('getUnusedMedias', { name: repository }, undefined, 600000);
		setUnused(
			res
				? res.map(value => {
						return { file: value };
					})
				: []
		);
	};

	const deleteMedia = async (file: string) => {
		try {
			await commandBackend('deleteMediaFile', { file: file, repo: repository });
			setUnused(unused.filter(item => item.file !== file));
		} catch (_) {
			// already display
		}
	};

	const deleteTag = async tid => {
		try {
			await commandBackend('deleteTag', { tids: [tid] });
			setUnused(unused.filter(item => item.tid !== tid));
		} catch (_) {
			// already display
		}
	};

	const columns = [
		{
			title: i18next.t('UNUSED_FILES.NAME'),
			dataIndex: 'name',
			key: 'name',
		},
		{
			title: i18next.t('UNUSED_FILES.TYPE'),
			dataIndex: 'types',
			key: 'types',
			render: types => types && types.map(t => i18next.t(`TAG_TYPES.${getTagTypeName(t)}_other`)).join(', '),
		},
		{
			title: i18next.t('UNUSED_FILES.FILE'),
			dataIndex: 'file',
			key: 'file',
			sorter: (a, b) => a.file.localeCompare(b.file),
			defaultSortOrder: 'ascend' as const,
		},
		{
			title: i18next.t('ACTION'),
			render: (_, record) => (
				<Button
					type="primary"
					danger
					icon={<DeleteOutlined />}
					onClick={() => (type === 'medias' ? deleteMedia(record.file) : deleteTag(record.tid))}
				/>
			),
		},
	];

	return (
		<>
			<Title
				title={i18next.t('HEADERS.UNUSED_FILES.TITLE')}
				description={i18next.t('HEADERS.UNUSED_FILES.DESCRIPTION')}
			/>
			<Layout.Content>
				<Row style={{ marginBottom: '1em', marginLeft: '0.5em' }}>
					{repositories && repository ? (
						<Col style={{ paddingRight: '5em' }}>
							<label style={{ paddingRight: '15px' }}>{i18next.t('UNUSED_FILES.REPOSITORY')}</label>
							<Select style={{ width: 150 }} defaultValue={repository}>
								{repositories.map(repo => {
									return (
										<Select.Option key={repo} value={repo}>
											{repo}
										</Select.Option>
									);
								})}
							</Select>
						</Col>
					) : null}
					<Col style={{ paddingTop: '5px' }}>
						<label style={{ paddingRight: '1em' }}>{i18next.t('MENU.UNUSED_FILES')}</label>
						<Radio checked={type === 'tags'} onChange={async () => setType('tags')}>
							{i18next.t('UNUSED_FILES.TAGS')}
						</Radio>
						<Radio checked={type === 'medias'} onChange={async () => setType('medias')}>
							{i18next.t('UNUSED_FILES.MEDIAS')}
						</Radio>
					</Col>
					{type === 'tags' ? (
						<Col>
							<label style={{ marginLeft: '2em', paddingRight: '1em' }}>
								{i18next.t('TAGS.TYPES')} :
							</label>
							<Select
								allowClear={true}
								style={{ width: 300 }}
								onChange={setTagType}
								defaultValue={tagType}
							>
								{Object.entries(tagTypes).map(([key, value]) => {
									return (
										<Select.Option key={value.type} value={value.type}>
											{i18next.t(`TAG_TYPES.${key}_other`)}
										</Select.Option>
									);
								})}
							</Select>
						</Col>
					) : null}
				</Row>
				<Table
					dataSource={unused.filter(e => !tagType || e.types?.includes(tagType))}
					columns={columns}
					rowKey="file"
				/>
			</Layout.Content>
		</>
	);
}

export default UnusedList;
