import React, { Component } from 'react';
import axios from 'axios';
import { connect } from 'react-redux';
import { Modal, Button, Layout, Row, Col } from 'antd';

import { loading, infoMessage, errorMessage, warnMessage } from '../actions/navigation';
import { ReduxMappedProps } from '../react-app-env';
import i18next from 'i18next';

interface DatabaseProps extends ReduxMappedProps { }

interface DatabaseState {
	updateModal: boolean,
	renameModal: boolean
}

class Database extends Component<DatabaseProps, DatabaseState> {

	constructor(props) {
		super(props);
		this.state = {
			updateModal: false,
			renameModal: false
		};
	}

	dbregen = () => {
		axios.post('/api/db/generate')
			.then(res => {
				this.props.infoMessage(res.data);
			})
			.catch(err => {
				this.props.errorMessage(`${err.response.status}: ${err.response.statusText}. ${err.response.data}`);
			});
	};

	dbupdate() {
		axios.post('/api/downloads/updateMedias')
			.then(res => {
				this.props.infoMessage(res.data);
			})
			.catch(err => {
				this.props.errorMessage(`${err.response.status}: ${err.response.statusText}. ${err.response.data}`);
			});
	}

	dbdump() {
		this.props.loading(true);
		axios.get('/api/db')
			.then(res => {
				this.props.loading(false);
				this.props.infoMessage(res.data);
			})
			.catch(err => {
				this.props.loading(false);
				this.props.errorMessage(`${err.response.status}: ${err.response.statusText}. ${err.response.data}`);
			});
	}

	dbrestore() {
		this.props.loading(true);
		axios.post('/api/db')
			.then(res => {
				this.props.loading(false);
				this.props.infoMessage(res.data);
			})
			.catch(err => {
				this.props.loading(false);
				this.props.errorMessage(`${err.response.status}: ${err.response.statusText}. ${err.response.data}`);
			});
	}

	render() {
		return (
			<Layout.Content style={{ padding: '25px' }}>
				<Row type="flex" justify="space-between">
					<Col span={4}>
						<Button
							type='primary'
							onClick={this.dbregen}
							disabled={this.props.loadingActive}
						>
							{i18next.t('DATABASE.REGENERATE_DB')}
						</Button>
					</Col>
					<Col span={20} dangerouslySetInnerHTML={{__html: i18next.t('DATABASE.REGENERATE_DB_DESCRIPTION')}}>
					</Col>
				</Row>
				<Row type="flex" justify="space-between" style={{ marginTop: '10px' }}>
					<Col span={4}>
						<Button
							type='primary'
							onClick={
								() => this.setState({ updateModal: true })
							}
							disabled={this.props.loadingActive}
						>
							{i18next.t('DATABASE.UPDATE_MEDIA')}
						</Button>
					</Col>
					<Col span={20} dangerouslySetInnerHTML={{__html: i18next.t('DATABASE.UPDATE_MEDIA_DESCRIPTION')}}>
					</Col>
				</Row>
				<Row type="flex" justify="space-between" style={{ marginTop: '10px' }}>
					<Col span={4}>
						<Button
							type='primary'
							onClick={this.dbdump.bind(this)}
							disabled={this.props.loadingActive}
						>
							{i18next.t('DATABASE.DUMP_DATABASE')}
						</Button>
					</Col>
					<Col span={20} dangerouslySetInnerHTML={{__html: i18next.t('DATABASE.DUMP_DATABASE_DESCRIPTION')}}>
					</Col>
				</Row>

				<Row type="flex" justify="space-between" style={{ marginTop: '20px' }}>
					<Col span={4}>

						<Button
							type='primary'
							onClick={this.dbrestore.bind(this)}
							disabled={this.props.loadingActive}
						>
							{i18next.t('DATABASE.RESTORE_DATABASE')}
						</Button>
					</Col>
					<Col span={20} dangerouslySetInnerHTML={{__html: i18next.t('DATABASE.RESTORE_DATABASE_DESCRIPTION')}}>
					</Col>
				</Row>
				<Modal
					title={i18next.t('DATABASE.CONFIRM_UPDATE')}
					visible={this.state.updateModal}
					onOk={() => {
						this.dbupdate();
						this.setState({ updateModal: false });
					}}
					onCancel={() => this.setState({ updateModal: false })}
					okText={i18next.t('YES')}
					cancelText={i18next.t('NO')}
				>
					<p>{i18next.t('DATABASE.UPDATE_MESSAGE_WARNING')} <b>{i18next.t('DATABASE.UPDATE_MESSAGE_FILES')}</b>.</p>
					<p>{i18next.t('DATABASE.UPDATE_MESSAGE_DELETED')}</p>
					<p>{i18next.t('CONFIRM_SURE')}</p>
				</Modal>
			</Layout.Content>
		);
	}
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

export default connect(mapStateToProps, mapDispatchToProps)(Database);
