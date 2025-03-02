import {
	BlockOutlined,
	DatabaseOutlined,
	DownloadOutlined,
	FolderOpenOutlined,
	HddOutlined,
	HistoryOutlined,
	PlayCircleOutlined,
	PlusOutlined,
	ScheduleOutlined,
	SearchOutlined,
	SettingOutlined,
} from '@ant-design/icons';
import { Button, Card, Col, Layout, Row } from 'antd';
import i18next from 'i18next';
import { useContext } from 'react';
import { Link } from 'react-router-dom';

import { useEffect } from 'react';
import GlobalContext from '../../store/context';
import Title from '../components/Title';

import { getSocket } from '../../utils/socket';
import { displayMessage } from '../../utils/tools';

function Home() {
	const context = useContext(GlobalContext);

	const operatorNotificationInfo = (data: { code: string; data: string }) =>
		displayMessage('info', i18next.t(data.code, data.data));
	const operatorNotificationError = (data: { code: string; data: string }) =>
		displayMessage('error', i18next.t(data.code, data.data));
	const operatorNotificationWarning = (data: { code: string; data: string }) => {
		displayMessage('warning', i18next.t(data.code, data.data));
		console.debug({ data });
	};
	const operatorNotificationSuccess = (data: { code: string; data: string }) =>
		displayMessage('success', i18next.t(data.code, data.data));

	useEffect(() => {
		getSocket().on('operatorNotificationInfo', operatorNotificationInfo);
		getSocket().on('operatorNotificationError', operatorNotificationError);
		getSocket().on('operatorNotificationWarning', operatorNotificationWarning);
		getSocket().on('operatorNotificationSuccess', operatorNotificationSuccess);
		return () => {
			getSocket().off('operatorNotificationInfo', operatorNotificationInfo);
			getSocket().off('operatorNotificationError', operatorNotificationError);
			getSocket().off('operatorNotificationWarning', operatorNotificationWarning);
			getSocket().off('operatorNotificationSuccess', operatorNotificationSuccess);
		};
	}, []);

	return (
		<>
			<Title title={i18next.t('HEADERS.HOME.TITLE')} description={i18next.t('HEADERS.HOME.DESCRIPTION')} />
			<Layout.Content>
				<Row gutter={[16, 16]}>
					<Col span={12}>
						<Card title={i18next.t('MENU.SYSTEM')}>
							{i18next.t('HOME.SYSTEM_DESCRIPTION')}
							<div className="km-system-btn-group">
								<Link to="/system/options">
									<Button block type="primary">
										<SettingOutlined /> {i18next.t('HOME.SYSTEM.CONFIG')}
									</Button>
								</Link>
								<Link to="/system/repositories">
									<Button block type="primary">
										<FolderOpenOutlined /> {i18next.t('HOME.SYSTEM.REPOSITORIES')}
									</Button>
								</Link>
								<Link to="/system/sessions">
									<Button block>
										<ScheduleOutlined /> {i18next.t('HOME.SYSTEM.SESSIONS')}
									</Button>
								</Link>
								<Link to="/system/log">
									<Button block>
										<HddOutlined /> {i18next.t('HOME.SYSTEM.LOGS')}
									</Button>
								</Link>
								<Link to="/system/db">
									<Button block>
										<DatabaseOutlined /> {i18next.t('HOME.SYSTEM.DATABASE')}
									</Button>
								</Link>
							</div>
						</Card>
					</Col>
					<Col span={12}>
						<Card title={i18next.t('MENU.KARAS')}>
							{i18next.t('HOME.KARAS_DESCRIPTION')}
							<div className="km-system-btn-group">
								<Link to="/system/karas/download">
									<Button block type="primary">
										<DownloadOutlined /> {i18next.t('HOME.KARAS.DOWNLOAD')}
									</Button>
								</Link>
								<Link to="/system/karas">
									<Button block type="primary">
										<SearchOutlined /> {i18next.t('HOME.KARAS.BROWSE')}
									</Button>
								</Link>
								<Link to="/system/karas/create">
									<Button block>
										<PlusOutlined /> {i18next.t('HOME.KARAS.CREATE')}
									</Button>
								</Link>
								<Link to="/system/karas/history">
									<Button block>
										<HistoryOutlined /> {i18next.t('HOME.KARAS.HISTORY')}
									</Button>
								</Link>
								<Link to="/system/karas/viewcounts">
									<Button block>
										<PlayCircleOutlined /> {i18next.t('HOME.KARAS.MOST_PLAYED')}
									</Button>
								</Link>
							</div>
						</Card>
					</Col>
					<Col span={12}>
						<Card title={i18next.t('MENU.TAGS')}>
							{i18next.t('HOME.TAGS_DESCRIPTION')}
							<div className="km-system-btn-group">
								<Link to="/system/tags/create">
									<Button block type="primary">
										<PlusOutlined /> {i18next.t('HOME.TAGS.CREATE')}
									</Button>
								</Link>
								<Link to="/system/tags">
									<Button block type="primary">
										<SearchOutlined /> {i18next.t('HOME.TAGS.BROWSE')}
									</Button>
								</Link>
								<Link to="/system/tags/duplicate">
									<Button block>
										<BlockOutlined /> {i18next.t('HOME.TAGS.MERGE')}
									</Button>
								</Link>
							</div>
						</Card>
					</Col>
					<Col span={12}>
						<Card title={i18next.t('MENU.USERS')}>
							{i18next.t('HOME.USERS_DESCRIPTION')}
							<div className="km-system-btn-group">
								<Link to="/system/users/create">
									<Button block type="primary">
										<PlusOutlined /> {i18next.t('HOME.USERS.CREATE')}
									</Button>
								</Link>
								<Link to="/system/users">
									<Button block type="primary">
										<SearchOutlined /> {i18next.t('HOME.USERS.BROWSE')}
									</Button>
								</Link>
							</div>
						</Card>
					</Col>
				</Row>
				<p style={{ marginTop: '1em' }}>
					v{context?.globalState.settings?.data.version.number} -{' '}
					{context?.globalState.settings?.data.version.name} (
					{context?.globalState.settings?.data.version.sha})
				</p>
			</Layout.Content>
		</>
	);
}

export default Home;
