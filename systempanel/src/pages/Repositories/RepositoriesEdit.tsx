import React, {Component} from 'react';
import {Layout} from 'antd';
import RepositoryForm from './RepositoriesForm';
import { Repository } from '../../../../src/lib/types/repo';

import { withRouter, RouteComponentProps } from 'react-router-dom';
import Axios from 'axios';
import { getAxiosInstance } from '../../axiosInterceptor';

interface RepositoriesEditState {
	repository: Repository,
	save: (repository:Repository) => void
}

const newrepository:Repository = {
	Name: undefined,
	Online: false,
	Enabled: true,
	Path: {
		Karas: [],
		Lyrics: [],
		Medias: [],
		Tags: [],
		Series: []
	}
};

class RepositoriesEdit extends Component<RouteComponentProps<{name:string}>, RepositoriesEditState> {

	state = {
		repository: null,
		save: () => {}
	};

	componentDidMount() {
		this.loadrepository();
	}

	saveNew = async (repository) => {
		await getAxiosInstance().post('/repos', repository);
		this.props.history.push('/system/km/repositories');
	};

	saveUpdate = async (repository) => {
		await getAxiosInstance().put(`/repos/${this.state.repository.Name}`, repository)
		this.props.history.push('/system/km/repositories');
	};

	loadrepository = async () => {
		if (this.props.match.params.name) {
			let res = await Axios.get(`/repos/${this.props.match.params.name}`);
			this.setState({repository: res.data, save: this.saveUpdate});
		} else {
			this.setState({repository: {...newrepository}, save: this.saveNew});
		}
	};

	
	consolidate = async (consolidatePath: string) => {
		if (consolidatePath) {
			await getAxiosInstance().post(`/repos/${this.props.match.params.name}/consolidate`, {path: consolidatePath})
			this.props.history.push('/system/km/repositories');
		}
	}

	render() {
		return (
			<Layout.Content style={{padding: '25px 50px', textAlign: 'center'}}>
				{this.state.repository && (<RepositoryForm repository={this.state.repository}
				 save={this.state.save} consolidate={this.consolidate} />)}
			</Layout.Content>
		);
	}
}

export default withRouter(RepositoriesEdit);