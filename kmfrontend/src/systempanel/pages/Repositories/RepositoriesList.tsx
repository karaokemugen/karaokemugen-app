import {
	ArrowDownOutlined,
	ArrowUpOutlined,
	DeleteOutlined,
	EditOutlined,
	PlusOutlined,
	QuestionCircleOutlined,
} from '@ant-design/icons';
import { Button, Checkbox, Col, Divider, Layout, Row, Table, Tooltip } from 'antd';
import { ColumnsType } from 'antd/es/table';
import i18next from 'i18next';
import { Component } from 'react';
import { Link } from 'react-router-dom';

import { Repository } from '../../../../../src/lib/types/repo';
import { commandBackend } from '../../../utils/socket';
import { displayMessage } from '../../../utils/tools';
import Title from '../../components/Title';
import CollectionsActivation from './CollectionsActivation';

interface RepositoryListState {
	repositories: Repository[];
	repository?: Repository;
}

let timer: NodeJS.Timeout;
class RepositoryList extends Component<unknown, RepositoryListState> {
	state = {
		repositories: [],
	};

	componentDidMount() {
		this.refresh();
	}

	refresh = async () => {
		const res = await commandBackend('getRepos');
		this.setState({ repositories: res });
	};

	deleteRepository = async (repository: Repository) => {
		try {
			await commandBackend('deleteRepo', { name: repository.Name }, true);
		} catch (_) {
			// already display
		}
		this.refresh();
	};

	move = async (index: number, change: number) => {
		const repositories = this.state.repositories;
		const firstRepos = repositories[index];
		const secondRepos = repositories[index + change];
		repositories[index + change] = firstRepos;
		repositories[index] = secondRepos;
		try {
			await commandBackend('updateSettings', {
				setting: { System: { Repositories: repositories } },
			});
			this.refresh();
			if (timer) clearTimeout(timer);
			timer = setTimeout(() => {
				commandBackend('generateDatabase', undefined, true, 300000).catch(() => {});
			}, 5000);
		} catch (_) {
			// already display
		}
	};

	updateRepos = async () => {
		commandBackend('updateAllRepos')
			.then(() => displayMessage('info', i18next.t('DATABASE.UPDATING_REPOS')))
			.catch(() => {});
	};

	render() {
		return (
			<>
				<Title
					title={i18next.t('HEADERS.REPOSITORIES.TITLE')}
					description={
						i18next.t('HEADERS.REPOSITORIES.DESCRIPTION_COLLECTION') +
						i18next.t('HEADERS.REPOSITORIES.DESCRIPTION')
					}
				/>
				<Layout.Content>
					<CollectionsActivation />
					<Link to={'/system/repositories/create'}>
						<Button style={{ margin: '0.75em' }} type="primary">
							{i18next.t('REPOSITORIES.NEW_REPOSITORY')}
							<PlusOutlined />
						</Button>
					</Link>
					<Row justify="space-between" style={{ margin: '0.75em', flexWrap: 'nowrap' }}>
						<Col flex="15em">
							<Button type="primary" onClick={this.updateRepos}>
								{i18next.t('DATABASE.UPDATE_REPOS')}
							</Button>
						</Col>
						<Col flex="auto" style={{ marginTop: '0.25em', marginLeft: '0.5em' }}>
							{i18next.t('DATABASE.UPDATE_REPOS_DESCRIPTION')}
						</Col>
					</Row>
					<Table
						dataSource={this.state.repositories}
						columns={this.columns}
						rowKey="Name"
						style={{ tableLayout: 'fixed' }}
						scroll={{
							x: true,
						}}
						expandable={{
							showExpandColumn: false,
						}}
					/>
				</Layout.Content>
			</>
		);
	}

	columns: ColumnsType<Repository> = [
		{
			title: i18next.t('REPOSITORIES.ENABLED'),
			dataIndex: 'Enabled',
			key: 'enabled',
			render: (_text, record) => <Checkbox disabled={true} checked={record.Enabled} />,
		},
		{
			title: i18next.t('REPOSITORIES.NAME'),
			dataIndex: 'Name',
			key: 'name',
		},
		{
			title: i18next.t('REPOSITORIES.BASE_DIR'),
			dataIndex: 'BaseDir',
			key: 'basedir',
		},
		{
			title: i18next.t('REPOSITORIES.PATH_MEDIAS'),
			dataIndex: 'Path.Medias',
			key: 'path_medias',
			hidden: true,
			render: (_text, record: Repository) =>
				record.Path.Medias.map(item => {
					return (
						<div className="pathFolders" key={item}>
							{item}
						</div>
					);
				}),
		},
		{
			title: i18next.t('REPOSITORIES.ONLINE'),
			dataIndex: 'Online',
			key: 'online',
			render: (_text, record) => <Checkbox disabled={true} checked={record.Online} />,
		},
		{
			title: i18next.t('REPOSITORIES.UPDATE'),
			dataIndex: 'Update',
			key: 'update',
			render: (_text, record) => record.Online && <Checkbox disabled={true} checked={record.Update} />,
		},
		{
			title: i18next.t('REPOSITORIES.AUTO_MEDIA_DOWNLOADS'),
			dataIndex: 'AutoMediaDownloads',
			key: 'autoMediaDownloads',
			hidden: true,
			render: (_text, record) => {
				if (record.AutoMediaDownloads === 'all') {
					return i18next.t('REPOSITORIES.AUTO_MEDIA_DOWNLOADS_ALL');
				} else if (record.AutoMediaDownloads === 'updateOnly') {
					return i18next.t('REPOSITORIES.AUTO_MEDIA_DOWNLOADS_UPDATE_ONLY');
				} else if (record.AutoMediaDownloads === 'none') {
					return i18next.t('REPOSITORIES.AUTO_MEDIA_DOWNLOADS_NONE');
				}
			},
		},
		{
			title: i18next.t('REPOSITORIES.MAINTAINER_MODE'),
			dataIndex: 'MaintainerMode',
			key: 'maintainerMode',

			render: (_text, record) => record.Online && <Checkbox disabled={true} checked={record.MaintainerMode} />,
		},
		{
			title: (
				<span>
					{i18next.t('REPOSITORIES.MOVE')}&nbsp;
					<Tooltip title={i18next.t('REPOSITORIES.MOVE_TOOLTIP')}>
						<QuestionCircleOutlined />
					</Tooltip>
				</span>
			),
			key: 'move',
			render: (_, __, index) => {
				return (
					<>
						{index > 0 ? (
							<Button
								type="default"
								icon={<ArrowUpOutlined />}
								onClick={() => this.move(index, -1)}
							></Button>
						) : null}
						{index < this.state.repositories.length - 1 ? (
							<Button
								type="default"
								icon={<ArrowDownOutlined />}
								onClick={() => this.move(index, +1)}
							></Button>
						) : null}
					</>
				);
			},
		},
		{
			title: i18next.t('ACTION'),
			key: 'action',
			render: (_, record: Repository) => (
				<span>
					<Link to={`/system/repositories/${record.Name}`}>
						<Button type="primary" icon={<EditOutlined />} />
					</Link>
					{this.state.repositories.length > 1 ? (
						<>
							<Divider type="vertical" />
							<Button
								type="primary"
								danger
								icon={<DeleteOutlined />}
								onClick={() => this.deleteRepository(record)}
							></Button>
						</>
					) : null}
				</span>
			),
		},
	];
}

export default RepositoryList;
