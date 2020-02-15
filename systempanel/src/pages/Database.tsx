import React, {Component} from 'react';
import axios from 'axios';
import {connect} from 'react-redux';
import {Progress, Modal, Button, Layout} from 'antd';
import openSocket from 'socket.io-client';

import {loading, infoMessage, errorMessage, warnMessage} from '../actions/navigation';
import {ReduxMappedProps} from '../react-app-env';
import i18next from 'i18next';

interface DatabaseProps extends ReduxMappedProps {}

interface DatabaseState {
	updateModal: boolean,
	renameModal: boolean,
	generationProgress: {
		text: string,
		value: number,
		total: number,
		percentage: number,
	},
	downloadProgress: {
		text: string,
		value: number,
		total: number,
		percentage: number,
	},
	downloadBatchProgress: {
		text: string,
		value: number,
		total: number,
		percentage: number,
	}
}

class Database extends Component<DatabaseProps, DatabaseState> {

	constructor(props) {
		super(props);
		this.state = {
			updateModal: false,
			renameModal: false,
			generationProgress: {
				text: undefined,
				value: 0,
				total: 100,
				percentage: 0, // Added percentage for reference, rather than computing again with Math.floor
			},
			downloadProgress: {
				text: undefined,
				value: 0,
				total: 100,
				percentage: 0
			},
			downloadBatchProgress: {
				text: undefined,
				value: 0,
				total: 100,
				percentage: 0
			}
		};
	}

	componentDidMount() {
		let url = window.location.port === '3000' ? `${window.location.protocol}//${window.location.hostname}:1337` : window.location.origin;
		const socket = openSocket(url);
		socket.on('generationProgress', (data) => {
			if (!data.text) data.text = this.state.generationProgress.text;
			const percentage = Math.floor((data.value / data.total) * 100);
			if (data.text !== this.state.generationProgress.text || percentage !== this.state.generationProgress.percentage) {
				this.setState({
					generationProgress: {
						text: data.text,
						value: data.value,
						total: data.total,
						percentage
					}
				});
			}
		});
		socket.on('downloadProgress', (data) => {
			if (!data.text) data.text = this.state.downloadProgress.text;
			const percentage = Math.floor((data.value / data.total) * 100);
			if (data.text !== this.state.downloadProgress.text || percentage !== this.state.downloadProgress.percentage) {
				this.setState({
					downloadProgress: {
						text: data.text,
						value: data.value,
						total: data.total,
						percentage
					}
				});
			}
		});
		socket.on('downloadBatchProgress', (data) => {
			if (!data.text) data.text = this.state.downloadBatchProgress.text;
			const percentage = Math.floor((data.value / data.total) * 100);
			if (data.text !== this.state.downloadBatchProgress.text || percentage !== this.state.downloadBatchProgress.percentage) {
				this.setState({
					downloadBatchProgress: {
						text: data.text,
						value: data.value,
						total: data.total,
						percentage
					}
				});
			}
		});
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
			<Layout.Content style={{ padding: '25px 50px', textAlign: 'center' }}>
				<div>
					<Button style={{ margin: '10px' }}
						type='primary'
						onClick={this.dbregen}
						disabled={this.props.loadingActive}
					>
						{i18next.t('DATABASE.REGENERATE_DB')}
					</Button>
				</div>
				<div>
					<Button style={{ margin: '10px' }}
						type='primary'
						onClick={
							() => this.setState({updateModal: true})
						}
						disabled={this.props.loadingActive}
					>
						{i18next.t('DATABASE.UPDATE_MEDIA')}
					</Button>
				</div>
				<div style={{ marginTop: '10px' }}>
					<Button style={{ margin: '10px' }}
						type='primary'
						onClick={this.dbdump.bind(this)}
						disabled={this.props.loadingActive}
					>
						{i18next.t('DATABASE.DUMP_DATABASE')}
					</Button>
					<Button style={{ margin: '10px' }}
						type='primary'
						onClick={this.dbrestore.bind(this)}
						disabled={this.props.loadingActive}
					>
						{i18next.t('DATABASE.RESTORE_DATASE')}
					</Button>
				</div>
				<Modal
					title={i18next.t('DATABASE.CONFIRM_UPDATE')}
					visible={this.state.updateModal}
					onOk={() => {
						this.dbupdate();
						this.setState({updateModal: false});
					}}
					onCancel={() => this.setState({updateModal: false})}
					okText={i18next.t('YES')}
					cancelText={i18next.t('NO')}
				>
					<p>{i18next.t('DATABASE.UPDATE_MESSAGE_WARNING')} <b>{i18next.t('DATABASE.UPDATE_MESSAGE_FILES')}</b>.</p>
					<p>{i18next.t('DATABASE.UPDATE_MESSAGE_DELETED')}</p>
					<p>{i18next.t('CONFIRM_SURE')}</p>
				</Modal>
				<h1 style={{ marginTop: '30px' }}>{i18next.t('DATABASE.PROGRESS')}</h1>

				<h3>{i18next.t('DATABASE.GENERATION')}</h3>
				{this.state.generationProgress.text}<br/>
				<Progress percent={this.state.generationProgress.percentage} />
				<h3>{i18next.t('DATABASE.BASE_UPDATE')}</h3>
				{this.state.downloadProgress.text}<br/>
				<Progress percent={this.state.downloadProgress.percentage} />
				{this.state.downloadBatchProgress.text}<br/>
				<Progress percent={this.state.downloadBatchProgress.percentage} />
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
