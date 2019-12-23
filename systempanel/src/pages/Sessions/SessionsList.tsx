import React, {Component} from 'react';
import axios from 'axios';
import {connect} from 'react-redux';
import {Icon, Button, Layout, Table, Divider, Checkbox} from 'antd';
import {Link} from 'react-router-dom';
import {loading, errorMessage, warnMessage, infoMessage} from '../../actions/navigation';
import {ReduxMappedProps} from '../../react-app-env';
import i18next from 'i18next';
import { Session } from '../../../../src/types/session';

interface SessionListState {
	sessions: Array<Session>,
	session?: Session
}

class SessionList extends Component<ReduxMappedProps, SessionListState> {

	constructor(props) {
		super(props);
		this.state = {
			sessions: []
		};

	}

	componentDidMount() {
		this.props.loading(true);
		this.refresh();
	}

	refresh() {
		axios.get('/api/sessions')
			.then(res => {
				this.props.loading(false);
				this.setState({sessions: res.data});
			})
			.catch(err => {
				this.props.loading(false);
				this.props.errorMessage(`${err.response.status}: ${err.response.statusText}. ${err.response.data}`);
			});
	}

	deleteSession(session) {
		axios.delete('/api/sessions/' + session.seid);
		this.refresh();
	}

	exportSession(session) {
		axios.get(`/api/sessions/${session.seid}/export`)
		.then(res => {
			this.props.infoMessage(i18next.t('SESSIONS.SESSION_EXPORTED'));
		})
		.catch(err => {
			this.props.errorMessage(`${err.response.status}: ${err.response.statusText}. ${err.response.data}`);
		});
	}

	majPrivate = (sessionParam:Session) => {
		let session = sessionParam;
		session.private = !sessionParam.private;
		axios.put(`/api/sessions/${session.seid}`, session)
			.then(() => {
				this.props.infoMessage(i18next.t('SESSIONS.SESSION_EDITED'));
				this.refresh();
			})
			.catch(err => {
				this.props.errorMessage(`${err.response.status}: ${err.response.statusText}. ${err.response.data}`);
			});
	};

	render() {
		return (
			<Layout.Content style={{ padding: '25px 50px', textAlign: 'center' }}>
				<Layout>
					<Layout.Header>
					<span><Link to={`/system/km/sessions/new`}>{i18next.t('SESSIONS.NEW_SESSION')}<Icon type="plus" /></Link></span>
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
			return <Button type="default" icon='file-excel' onClick={this.exportSession.bind(this,record)}></Button>;
		}
	}, {
		title: i18next.t('ACTION'),
		key: 'action',
		render: (text, record) => (
			<span>
				<Link to={`/system/km/sessions/${record.seid}`}><Icon type='edit'/></Link>
				{record.active ? "" :
					<React.Fragment>
						<Divider type="vertical"/>
						<Button type="danger" icon='delete' onClick={this.deleteSession.bind(this,record)}></Button>
					</React.Fragment>
				}
			</span>
		)
	}];
}

const mapStateToProps = (state) => ({
	loadingActive: state.navigation.loading
});

const mapDispatchToProps = (dispatch) => ({
	loading: (active) => dispatch(loading(active)),
	infoMessage: (message) => dispatch(infoMessage(message)),
	errorMessage: (message) => dispatch(errorMessage(message)),
	warnMessage: (message) => dispatch(warnMessage(message))
});


export default connect(mapStateToProps, mapDispatchToProps)(SessionList);
