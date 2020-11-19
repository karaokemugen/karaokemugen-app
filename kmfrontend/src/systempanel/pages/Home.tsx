import {
	BlockOutlined,
	CloseCircleOutlined,
	DatabaseOutlined,
	DownloadOutlined,
	FolderOpenOutlined,
	HddOutlined,
	HistoryOutlined,
	PlusOutlined,
	ScheduleOutlined,
	SearchOutlined,
	SettingOutlined
} from '@ant-design/icons';
import { Button, Card, Col, Layout, Row } from 'antd';
import i18next from 'i18next';
import React, {Component} from 'react';
import {Link} from 'react-router-dom';

class Home extends Component<unknown, unknown> {
	render() {
		return (
			<>
				<Layout.Header>
					<div className='title'>{i18next.t('HEADERS.HOME.TITLE')}</div>
					<div className='description'>{i18next.t('HEADERS.HOME.DESCRIPTION')}</div>
				</Layout.Header>
				<Layout.Content>
					<Row gutter={[16,16]}>
						<Col span={12}>
							<Card title={i18next.t('MENU.SYSTEM')}>
								{i18next.t('HOME.SYSTEM_DESCRIPTION')}
								<div className="km-system-btn-group">
									<Link to="/system/km/options">
										<Button block type="primary"><SettingOutlined /> {i18next.t('HOME.SYSTEM.CONFIG')}</Button>
									</Link>
									<Link to="/system/km/repositories">
										<Button block type="primary"><FolderOpenOutlined /> {i18next.t('HOME.SYSTEM.REPOSITORIES')}</Button>
									</Link>
									<Link to="/system/km/sessions">
										<Button block><ScheduleOutlined /> {i18next.t('HOME.SYSTEM.SESSIONS')}</Button>
									</Link>
									<Link to="/system/km/log">
										<Button block><HddOutlined /> {i18next.t('HOME.SYSTEM.LOGS')}</Button>
									</Link>
									<Link to="/system/km/db">
										<Button block><DatabaseOutlined /> {i18next.t('HOME.SYSTEM.DATABASE')}</Button>
									</Link>
								</div>
							</Card>
						</Col>
						<Col span={12}>
							<Card title={i18next.t('MENU.KARAS')}>
								{i18next.t('HOME.KARAS_DESCRIPTION')}
								<div className="km-system-btn-group">
									<Link to="/system/km/karas/download">
										<Button block type="primary"><DownloadOutlined /> {i18next.t('HOME.KARAS.DOWNLOAD')}</Button>
									</Link>
									<Link to="/system/km/karas">
										<Button block type="primary"><SearchOutlined /> {i18next.t('HOME.KARAS.BROWSE')}</Button>
									</Link>
									<Link to="/system/km/karas/create">
										<Button block><PlusOutlined /> {i18next.t('HOME.KARAS.CREATE')}</Button>
									</Link>
									<Link to="/system/km/karas/blacklist">
										<Button block><CloseCircleOutlined /> {i18next.t('HOME.KARAS.BLACKLIST')}</Button>
									</Link>
									<Link to="/system/km/karas/history">
										<Button block><HistoryOutlined /> {i18next.t('HOME.KARAS.HISTORY')}</Button>
									</Link>
								</div>
							</Card>
						</Col>
						<Col span={12}>
							<Card title={i18next.t('MENU.TAGS')}>
								{i18next.t('HOME.TAGS_DESCRIPTION')}
								<div className="km-system-btn-group">
									<Link to="/system/km/tags/new">
										<Button block type="primary"><PlusOutlined /> {i18next.t('HOME.TAGS.CREATE')}</Button>
									</Link>
									<Link to="/system/km/tags">
										<Button block type="primary"><SearchOutlined /> {i18next.t('HOME.TAGS.BROWSE')}</Button>
									</Link>
									<Link to="/system/km/tags/duplicate">
										<Button block><BlockOutlined /> {i18next.t('HOME.TAGS.MERGE')}</Button>
									</Link>
								</div>
							</Card>
						</Col>
						<Col span={12}>
							<Card title={i18next.t('MENU.USERS')}>
								{i18next.t('HOME.USERS_DESCRIPTION')}
								<div className="km-system-btn-group">
									<Link to="/system/km/users/create">
										<Button block type="primary"><PlusOutlined /> {i18next.t('HOME.USERS.CREATE')}</Button>
									</Link>
									<Link to="/system/km/users">
										<Button block type="primary"><SearchOutlined /> {i18next.t('HOME.USERS.BROWSE')}</Button>
									</Link>
								</div>
							</Card>
						</Col>
					</Row>
				</Layout.Content>
			</>
		);
	}
}

export default Home;
