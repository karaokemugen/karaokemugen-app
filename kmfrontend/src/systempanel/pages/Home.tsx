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
import { Component } from 'react';
import { Link } from 'react-router-dom';

import GlobalContext from '../../store/context';
import { displayMessage } from '../../utils/tools';

class Home extends Component<unknown, unknown> {
	static contextType = GlobalContext;
	context: React.ContextType<typeof GlobalContext>;

	clickCount = 0;

	incrClick = () => {
		this.clickCount++;
		if (this.clickCount === 5) {
			displayMessage('info', i18next.t('HOME.EGG_1'));
		}
		if (this.clickCount === 20) {
			displayMessage('warning', i18next.t('HOME.EGG_2'));
		}
		if (this.clickCount === 40) {
			displayMessage('error', i18next.t('HOME.EGG_3'));
		}
		if (this.clickCount === 60) {
			window.location.assign('https://live.karaokes.moe/?video=5a8f26ed-e387-4169-ad8a-4ce8c31b65d9');
		}
	};

	render() {
		return (
			<>
				<Layout.Header>
					<div className="title">{i18next.t('HEADERS.HOME.TITLE')}</div>
					<div className="description">{i18next.t('HEADERS.HOME.DESCRIPTION')}</div>
				</Layout.Header>
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
									<Link to="/system/tags/new">
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
					<p style={{ marginTop: '1em' }} onClick={this.incrClick}>
						v{this.context?.globalState.settings?.data.version.number} -{' '}
						{this.context?.globalState.settings?.data.version.name} (
						{this.context?.globalState.settings?.data.version.sha})
					</p>
				</Layout.Content>
			</>
		);
	}
}

export default Home;
