import React, {Component} from 'react';
import axios from 'axios';
import {connect} from 'react-redux';
import {Progress, Modal, Button, Layout} from 'antd';
import openSocket from 'socket.io-client';

import {loading, infoMessage, errorMessage} from '../actions/navigation';

class Database extends Component {

	constructor(props) {
		super(props);
		this.state = {
			updateModal: false,
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
			updateProgress: {
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
			if (percentage !== this.state.generationProgress.percentage) {
				this.setState({
					generationProgress: {
						text: `Task : ${data.text}`,
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
			if (percentage !== this.state.downloadProgress.percentage) {
				this.setState({
					downloadProgress: {
						text: `${data.text}`,
						value: data.value,
						total: data.total,
						percentage
					}
				});
			}
		});
		socket.on('updateProgress', (data) => {
			if (!data.text) data.text = this.state.updateProgress.text;
			const percentage = Math.floor((data.value / data.total) * 100);
			if (percentage !== this.state.updateProgress.percentage) {
				this.setState({
					updateProgress: {
						text: `${data.text}`,
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
		axios.post('/api/db/regenerate')
			.then(res => {
				this.props.loading(false);
				this.props.infoMessage(res.data);
			})
			.catch(err => {
				this.props.loading(false);
				this.props.errorMessage(`${err.response.status}: ${err.response.statusText}. ${err.response.data}`);
			});
	}

	dbupdate() {
		this.props.loading(true);
		axios.post('/api/karas/update')
			.then(res => {
				this.props.loading(false);
				this.props.infoMessage(res.data);
			})
			.catch(err => {
				this.props.loading(false);
				this.props.errorMessage(`${err.response.status}: ${err.response.statusText}. ${err.response.data}`);
			});
	}

	dbresetviewcounts() {
		this.props.loading(true);
		axios.post('/api/db/resetviewcounts')
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
						active={!this.props.loadingActive}
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
						//onClick={this.dbupdate.bind(this)}
						active={!this.props.loadingActive}
					>
						Update your karaoke base files from Shelter
					</Button>
				</div>
				<div>
					<Button
						type='primary'
						onClick={this.dbresetviewcounts.bind(this)}
						active={!this.props.loadingActive}
					>
						Reset song viewcounts
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
					okText='yes, do it!'
					cancelText='no'
				>
					<p>WARNING: Updating will delete <b>any file not in the official Karaoke Mugen repository</b>.</p>
					<p>If you created karaokes but did not upload them, they will be deleted.</p>
					<p>You can check progress in the Karaoke Mugen console window</p>
					<p>Are you sure?</p>
				</Modal>
				{ this.state.generationProgress.text && (
					<h1>Progress</h1>
				)}
				{this.state.generationProgress.text}<br/>
				<Progress percent={this.state.generationProgress.percentage} />
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
	errorMessage: (message) => dispatch(errorMessage(message))
});

export default connect(mapStateToProps, mapDispatchToProps)(Database);
