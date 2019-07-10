import React, {Component} from 'react';
import axios from 'axios';
import {connect} from 'react-redux';
import {Layout, Button} from 'antd';

import {errorMessage, infoMessage, loading, warnMessage} from '../actions/navigation';
import {ReduxMappedProps} from '../react-app-env';

interface KarasProps extends ReduxMappedProps {}

interface KarasState {}

class Karas extends Component<KarasProps, KarasState> {

	karagen() {
		this.props.loading(true);
		axios.post('/api/kara/generate-all')
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
				<Button type='primary' onClick={this.karagen.bind(this)} disabled={this.props.loadingActive}>Generate Kara files</Button>
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

export default connect(mapStateToProps, mapDispatchToProps)(Karas);