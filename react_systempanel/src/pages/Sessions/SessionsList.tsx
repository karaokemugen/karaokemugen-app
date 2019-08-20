import React, {Component} from 'react';
import axios from 'axios';
import {connect} from 'react-redux';
import {Icon, Layout, Table} from 'antd';
import {Link} from 'react-router-dom';
import {loading, errorMessage, warnMessage, infoMessage} from '../../actions/navigation';
import {ReduxMappedProps} from '../../react-app-env';

interface SessionListProps extends ReduxMappedProps {
}

interface SessionListState {
	sessions: any[],
	session: any
}

class SessionList extends Component<SessionListProps, SessionListState> {

	constructor(props) {
		super(props);
		this.state = {
			sessions: [],
			session: ""
		};

	}

	componentDidMount() {
		this.props.loading(true);
		this.refresh();
	}

	refresh() {
		axios.get('/api/system/sessions')
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
		axios.delete('/api/system/sessions/' + session.seid);
	}

	render() {
		return (
			<Layout.Content style={{ padding: '25px 50px', textAlign: 'center' }}>
				<Layout>
					<Layout.Header>
					<span style={{ backgroundColor: 'white', padding: "5px" }}><Link to={`/system/km/sessions/new`}>New session : <Icon type="plus" /></Link></span>
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
		title: 'Name(s)',
		dataIndex: 'name',
		key: 'name'
	}, {
		title: 'Started at',
		dataIndex: 'started_at',
		key: 'started_at'
	}, {
		title: 'Songs played',
		dataIndex: 'played',
		key: 'played'
	}, {
		title: 'Songs requested',
		dataIndex: 'requested',
		key: 'requested'
	}, {
		title: 'Active',
		dataIndex: 'active',
		key: 'active',
		render: (text, record) => (<span>
			{record.active ?
				"Active" : null
			}
		</span>)
	}, {
		title: 'Action',
		key: 'action',
		render: (text, record) => (<span>
			<Link to={`/system/km/sessions/${record.seid}`}><Icon type='edit'/></Link>
		</span>)
	}, {
		title: 'Delete',
		key: 'delete',
		render: (text, record) => {
			return (record.active ? "" :
				 (<button type="button" onClick={this.deleteSession.bind(this,record)}><Icon type='close-circle' theme="twoTone" twoToneColor="#d8493e"/></button>));
		}
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
