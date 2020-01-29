import React, {Component} from 'react';
import {Layout} from 'antd';
import RepositoryForm from './RepositoriesForm';
import axios from 'axios';
import {connect} from 'react-redux';
import {push} from 'connected-react-router';
import {errorMessage, infoMessage, loading, warnMessage} from '../../actions/navigation';
import { Repository } from '../../../../src/lib/types/repo';

import {ReduxMappedProps} from '../../react-app-env';
import i18next from 'i18next';

interface RepositoriesEditProps extends ReduxMappedProps {
	push: (string) => any,
	match?: any
}

interface RepositoriesEditState {
	repository: Repository,
	save: any
}

const newrepository:Repository = {
	Name: undefined,
	Online: false,
	Path: {
		Karas: [],
		Lyrics: [],
		Medias: [],
		Tags: [],
		Series: []
	}
};

class RepositoriesEdit extends Component<RepositoriesEditProps, RepositoriesEditState> {

	state = {
		repository: null,
		save: () => {}
	};

	componentDidMount() {
		this.loadrepository();
	}

	saveNew = (repository) => {
		axios.post('/api/repos', repository)
			.then(() => {
				this.props.infoMessage(i18next.t('REPOSITORIES.REPOSITORY_CREATED'));
				this.props.push('/system/km/repositories');
			})
			.catch(err => {
				this.props.errorMessage(`${err.response.status}: ${err.response.statusText}. ${err.response.data}`);
			});
	};

	saveUpdate = (repository) => {
		axios.put(`/api/repos/${this.state.repository.Name}`, repository)
			.then(() => {
				this.props.infoMessage(i18next.t('REPOSITORIES.REPOSITORY_EDITED'));
				this.props.push('/system/km/repositories');
			})
			.catch(err => {
				this.props.errorMessage(`${err.response.status}: ${err.response.statusText}. ${err.response.data}`);
			});
	};

	loadrepository = () => {
		this.props.loading(true);
		if (this.props.match && this.props.match.params.name) {
			axios.get(`/api/repos/${this.props.match.params.name}`)
				.then(res => {
					this.setState({repository: res.data, save: this.saveUpdate});
					this.props.loading(false);
				})
				.catch(err => {
					this.props.errorMessage(`${err.response.status}: ${err.response.statusText}. ${err.response.data}`);
					this.props.loading(false);
				});
		} else {
			this.setState({repository: {...newrepository}, save: this.saveNew});
			this.props.loading(false);
		}
	};


	render() {
		return (
			<Layout.Content style={{padding: '25px 50px', textAlign: 'center'}}>
				{this.state.repository && (<RepositoryForm repository={this.state.repository} save={this.state.save} />)}
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
	warnMessage: (message) => dispatch(warnMessage(message)),
	push: (url) => dispatch(push(url))
});

export default connect(mapStateToProps, mapDispatchToProps)(RepositoriesEdit);