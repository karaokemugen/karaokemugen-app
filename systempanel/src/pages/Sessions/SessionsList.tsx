import React, {Component} from 'react';
import { Button, Layout, Table, Divider, Checkbox } from 'antd';
import {Link} from 'react-router-dom';
import i18next from 'i18next';
import { Session } from '../../../../src/types/session';
import { PlusOutlined, DeleteOutlined, FileExcelOutlined, EditOutlined } from '@ant-design/icons';
import Axios from 'axios';

interface SessionListState {
	sessions: Array<Session>,
	session?: Session
}

class SessionList extends Component<{}, SessionListState> {

	constructor(props) {
		super(props);
		this.state = {
			sessions: []
		};
	}

	componentDidMount() {
		this.refresh();
	}

	refresh = async () => {
		let res = await Axios.get('/sessions');
		this.setState({sessions: res.data});
	}

	deleteSession = async (session) => {
		await Axios.delete(`/sessions/${session.seid}`);
		this.refresh();
	}

	exportSession = async (session) => {
		await Axios.get(`/sessions/${session.seid}/export`)
	}

	majPrivate = async (sessionParam:Session) => {
		let session = sessionParam;
		session.private = !sessionParam.private;
		await Axios.put(`/sessions/${session.seid}`, session)
		this.refresh();
	};

	render() {
		return (
            <Layout.Content style={{ padding: '25px 50px', textAlign: 'center' }}>
				<Layout>
					<Layout.Header>
					<span><Link to={`/system/km/sessions/new`}>{i18next.t('SESSIONS.NEW_SESSION')}<PlusOutlined /></Link></span>
					</Layout.Header>
					<Layout.Content>
						<Table
							dataSource={this.state.sessions}
							columns={this.columns}
							rowKey='seid'
						/>
					</Layout.Content>
				</Layout>
			</Layout.Content>
        );
	}

	columns = [{
		title: i18next.t('SESSIONS.NAME'),
		dataIndex: 'name',
		key: 'name'
	}, {
		title: i18next.t('SESSIONS.STARTED_AT'),
		dataIndex: 'started_at',
		key: 'started_at'
	}, {
		title: i18next.t('SESSIONS.KARA_PLAYED'),
		dataIndex: 'played',
		key: 'played'
	}, {
		title: i18next.t('SESSIONS.KARA_REQUESTED'),
		dataIndex: 'requested',
		key: 'requested'
	}, {
		title: i18next.t('SESSIONS.ACTIVE'),
		dataIndex: 'active',
		key: 'active',
		render: (text, record) => (<span>
			{record.active ?
				i18next.t('YES') : null
			}
		</span>)
	}, {
	title: i18next.t('SESSIONS.PRIVATE'),
	dataIndex: 'private',
	key: 'private',
	render: (text, record) => (<Checkbox checked={record.private} onClick={() => this.majPrivate(record)} />)
	}, {
		title: i18next.t('SESSIONS.SESSION_EXPORTED_BUTTON'),
		key: 'export',
		render: (text, record) => {
			return <Button type="default" icon={<FileExcelOutlined />} onClick={() => this.exportSession(record)}></Button>;
		}
	}, {
		title: i18next.t('ACTION'),
		key: 'action',
		render: (text, record) => (
			<span>
				<Link to={`/system/km/sessions/${record.seid}`}><EditOutlined /></Link>
				{record.active ? "" :
					<React.Fragment>
						<Divider type="vertical"/>
						<Button type="primary" danger icon={<DeleteOutlined />} 
							onClick={() => this.deleteSession(record)}></Button>
					</React.Fragment>
				}
			</span>
		)
	}];
}

export default SessionList;
