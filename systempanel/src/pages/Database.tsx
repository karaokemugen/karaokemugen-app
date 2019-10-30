import React, {Component} from 'react';
import axios from 'axios';
import {connect} from 'react-redux';
import {Progress, Modal, Button, Layout} from 'antd';
import openSocket from 'socket.io-client';

import {loading, infoMessage, errorMessage, warnMessage} from '../actions/navigation';
import {ReduxMappedProps} from '../react-app-env';

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
		const socket = openSocket('http://localhost:1337');
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
		this.props.loading(true);
		axios.post('/api/system/db/regenerate')
			.then(res => {
				this.props.loading(false);
				this.props.infoMessage(res.data);
			})
			.catch(err => {
				this.props.loading(false);
				this.props.errorMessage(`${err.response.status}: ${err.response.statusText}. ${err.response.data}`);
			});
	};

	dbupdate() {
		this.props.loading(true);
		axios.post('/api/system/karas/update')
			.then(res => {
				this.props.loading(false);
				this.props.infoMessage(res.data);
			})
			.catch(err => {
				this.props.loading(false);
				this.props.errorMessage(`${err.response.status}: ${err.response.statusText}. ${err.response.data}`);
			});
	}

	dbdump() {
		this.props.loading(true);
		axios.post('/api/system/db/dump')
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
		axios.post('/api/system/db/restore')
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
					<Button
						type='primary'
						onClick={this.dbregen}
						disabled={this.props.loadingActive}
					>
						Regenerate your database (wow wow)
					</Button>
				</div>
				<div>
					<Button
						type='primary'
						onClick={
							() => this.setState({updateModal: true})
						}
						disabled={this.props.loadingActive}
					>
						Update your media files from your configured instance (Karaoke base git users only)
					</Button>
				</div>
				<div>
					<Button
						type='primary'
						onClick={this.dbdump.bind(this)}
						disabled={this.props.loadingActive}
					>
						Dump database to karaokemugen.sql file
					</Button>
				</div>
				<div>
					<Button
						type='primary'
						onClick={this.dbrestore.bind(this)}
						disabled={this.props.loadingActive}
					>
						Restore database from karaokemugen.sql file
					</Button>
				</div>
				<Modal
					title='Confirm update'
					visible={this.state.updateModal}
					onOk={() => {
						this.dbupdate();
						this.setState({updateModal: false});
					}}
					onCancel={() => this.setState({updateModal: false})}
					okText='Yes, do it!'
					cancelText='No'
				>
					<p>WARNING: Updating will delete <b>any file not in the official Karaoke Mugen repository</b>.</p>
					<p>If you created karaokes but did not upload them, they will be deleted.</p>
					<p>Are you sure?</p>
				</Modal>
				<h1>Progress</h1>
				<h2>Generation</h2>
				{this.state.generationProgress.text}<br/>
				<Progress percent={this.state.generationProgress.percentage} />
				<h2>Base update</h2>
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
