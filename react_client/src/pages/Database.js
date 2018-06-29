import React, {Component} from 'react';
import axios from 'axios';
import {connect} from 'react-redux';
import {Modal, Button, Layout} from 'antd';

import {loading, infoMessage, errorMessage} from '../actions/navigation';

class Database extends Component {

	constructor(props) {
		super(props);
		this.state = {
			updateModal: false,			
		};
	}


	dbregen() {
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
						onClick={this.dbregen.bind(this)}
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
					onOk={() => this.dbupdate.bind(this)}
					onCancel={() => this.setState({updateModal: false})}
					okText='yes'
					cancelText='no'
				>
					<p>WARNING: Updating will delete <b>any file not in the official Karaoke Mugen repository</b>.</p>
					<p>If you created karaokes but did not upload them, they will be deleted.</p>
					<p>Are you sure?</p>
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
	errorMessage: (message) => dispatch(errorMessage(message))
});

export default connect(mapStateToProps, mapDispatchToProps)(Database);
