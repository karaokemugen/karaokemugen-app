import { DeleteOutlined, PlusOutlined, UploadOutlined } from '@ant-design/icons';
import { Alert, Button, Image, Layout, Modal, Select, Table, Upload } from 'antd';
import i18next from 'i18next';
import { basename } from 'path-browserify';
import { useEffect, useState } from 'react';

import { commandBackend } from '../../utils/socket';

export type BackgroundType = 'pause' | 'stop' | 'poll';

export interface ElementBackgroundList {
	file: string;
	type: BackgroundType;
}
export interface BackgroundList {
	pictures: ElementBackgroundList[];
	music: ElementBackgroundList[];
}

export default function Background() {
	const [bgList, setBgList] = useState<BackgroundList>();
	const [addModal, setAddModal] = useState(false);
	const [file, setFile] = useState();
	const [type, setType] = useState<BackgroundType>('pause');

	const acceptFilesFormat = '.jpg, .jpeg, .png, .mp3';

	const formatBgList = (bgList: { pictures: string[]; music: string[] }, type: string) => {
		const result = { pictures: [], music: [] };
		result.pictures = bgList?.pictures.map(pic => {
			return { file: pic, type };
		});
		result.music = bgList?.music.map(pic => {
			return { file: pic, type };
		});
		return result;
	};

	const getBgByType = async (type: string) => {
		const res = await commandBackend('getBackgroundFiles', { type });
		return formatBgList(res, type);
	};

	const getBgList = async () => {
		const bgList: BackgroundList = { pictures: [], music: [] };
		const [pause, stop, poll] = await Promise.all([getBgByType('pause'), getBgByType('stop'), getBgByType('poll')]);
		bgList.pictures = [].concat(pause.pictures, stop.pictures, poll.pictures);
		bgList.music = [].concat(pause.music, stop.music, poll.music);
		setBgList(bgList);
	};

	const deleteBg = (record: ElementBackgroundList) => {
		commandBackend('removeBackground', record);
		getBgList();
	};

	const addBg = async () => {
		const formData = new FormData();
		formData.append('file', file);
		const response = await fetch('/api/importFile', {
			method: 'POST',
			body: formData,
			headers: {
				authorization: localStorage.getItem('kmToken'),
				onlineAuthorization: localStorage.getItem('kmOnlineToken'),
			},
		});
		await commandBackend('addBackground', { type, file: await response.json() });
		setFile(undefined);
		closeModal();
		getBgList();
	};

	const openModal = () => setAddModal(true);

	const closeModal = () => {
		setFile(undefined);
		setAddModal(false);
	};

	const chooseFile = file => {
		setFile(file);
		return false;
	};

	useEffect(() => {
		getBgList();
	}, []);

	const columns = [
		{
			title: i18next.t('BACKGROUNDS_MGMT.FILE'),
			dataIndex: 'file',
			key: 'file',
		},
		{
			title: i18next.t('BACKGROUNDS_MGMT.PREVIEW'),
			render: (_text, record) => {
				return (
					<Image
						width={200}
						src={`/backgrounds/${record.type}/${basename(record.file.replace(/\\/g, '/'))}`}
					/>
				);
			},
		},
		{
			title: i18next.t('BACKGROUNDS_MGMT.CATEGORY'),
			dataIndex: 'type',
			render: text => i18next.t(`BACKGROUNDS_MGMT.TYPE.${text}`),
		},
		{
			title: i18next.t('ACTION'),
			render: (text_, record) => (
				<Button type="primary" danger icon={<DeleteOutlined />} onClick={() => deleteBg(record)} />
			),
		},
	];

	return (
		<>
			<Layout.Header>
				<div className="title">{i18next.t('HEADERS.BACKGROUNDS.TITLE')}</div>
				<div className="description">{i18next.t('HEADERS.BACKGROUNDS.DESCRIPTION')}</div>
			</Layout.Header>
			<Layout.Content>
				<p>{i18next.t('BACKGROUNDS_MGMT.EXPL')}</p>
				<Alert
					type="info"
					showIcon
					message={
						<ul>
							{i18next.t<string[]>('BACKGROUNDS_MGMT.INFO', { returnObjects: true })?.map((info, i) => (
								<li key={i}>{info}</li>
							))}
						</ul>
					}
				/>
				<Button style={{ margin: '0.75em' }} type="primary" onClick={openModal}>
					{i18next.t('BACKGROUNDS_MGMT.NEW')}
					<PlusOutlined />
				</Button>
				<Table dataSource={bgList?.pictures} columns={columns} rowKey="file" />
				<Modal
					title={i18next.t('BACKGROUNDS_MGMT.NEW')}
					visible={addModal}
					onOk={addBg}
					okText={i18next.t('BACKGROUNDS_MGMT.SAVE')}
					onCancel={closeModal}
				>
					<Upload accept={acceptFilesFormat} beforeUpload={chooseFile} fileList={file ? [file] : []}>
						<Button icon={<UploadOutlined />}>{i18next.t('BACKGROUNDS_MGMT.CHOOSE_FILE')}</Button>
					</Upload>
					<div style={{ marginTop: '1em' }}>
						<label>{i18next.t('BACKGROUNDS_MGMT.CATEGORY')}</label>
						<Select
							defaultValue="pause"
							style={{ marginLeft: '1em' }}
							onChange={(value: BackgroundType) => setType(value)}
						>
							<Select.Option key="pause" value="pause">
								{i18next.t('BACKGROUNDS_MGMT.TYPE.PAUSE')}
							</Select.Option>
							<Select.Option key="stop" value="stop">
								{i18next.t('BACKGROUNDS_MGMT.TYPE.STOP')}
							</Select.Option>
							<Select.Option key="poll" value="poll">
								{i18next.t('BACKGROUNDS_MGMT.TYPE.POLL')}
							</Select.Option>
						</Select>
					</div>
				</Modal>
			</Layout.Content>
		</>
	);
}
