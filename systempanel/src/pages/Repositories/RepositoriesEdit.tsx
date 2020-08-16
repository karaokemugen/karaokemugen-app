import { Layout } from 'antd';
import Modal from 'antd/lib/modal/Modal';
import Axios from 'axios';
import i18next from 'i18next';
import React, { Component } from 'react';
import { RouteComponentProps,withRouter } from 'react-router-dom';

import { Repository } from '../../../../src/lib/types/repo';
import { getAxiosInstance } from '../../axiosInterceptor';
import RepositoryForm from './RepositoriesForm';

interface RepositoriesEditState {
	repository: Repository;
	save: (repository: Repository) => void;
	report: string;
	selectedRepo: string;
}

const newrepository: Repository = {
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

class RepositoriesEdit extends Component<RouteComponentProps<{ name: string }>, RepositoriesEditState> {

	state = {
		repository: null,
		save: () => { },
		report: undefined,
		selectedRepo: undefined
	};

	componentDidMount() {
		this.loadrepository();
	}

	saveNew = async (repository) => {
		await getAxiosInstance().post('/repos', repository);
		this.props.history.push('/system/km/repositories');
	};

	saveUpdate = async (repository) => {
		await getAxiosInstance().put(`/repos/${this.state.repository.Name}`, repository);
		this.props.history.push('/system/km/repositories');
	};

	loadrepository = async () => {
		if (this.props.match.params.name) {
			const res = await Axios.get(`/repos/${this.props.match.params.name}`);
			this.setState({ repository: res.data, save: this.saveUpdate });
		} else {
			this.setState({ repository: { ...newrepository }, save: this.saveNew });
		}
	};


	consolidate = async (consolidatePath: string) => {
		if (consolidatePath) {
			await getAxiosInstance().post(`/repos/${this.props.match.params.name}/consolidate`, { path: consolidatePath });
			this.props.history.push('/system/km/repositories');
		}
	}

	compareLyrics = async (repo: string) => {
		if (repo) {
			const response = await Axios.get(`/repos/${this.props.match.params.name}/compareLyrics`, { data: { repo: repo } });
			this.setState({ report: response.data, selectedRepo: repo });
		}
	}

	copyLyrics = async (report: string) => {
		if (report) {
			await Axios.post(`/repos/${this.props.match.params.name}/compareLyrics`, { report: report });
		}
	}

	render() {
		return (
			<Layout.Content style={{ padding: '25px 50px', textAlign: 'center' }}>
				{this.state.repository && (<RepositoryForm repository={this.state.repository}
					save={this.state.save} consolidate={this.consolidate}
					compareLyrics={this.compareLyrics} copyLyrics={this.copyLyrics} />)}
				<Modal
					title={i18next.t('REPOSITORIES.WARNING')}
					visible={this.state.report}
					onOk={() => {
						this.copyLyrics(this.state.report);
						this.setState({ report: undefined });
					}}
					onCancel={() => this.setState({ report: undefined })}
					okText={i18next.t('YES')}
					cancelText={i18next.t('NO')}
				>
					<p>{i18next.t('REPOSITORIES.LYRICS_ARE_DIFFERENT', { first: this.props.match.params.name, second: this.state.selectedRepo })}</p>
					<p style={{ fontWeight: 'bold' }}>{this.state.report?.map(kara => kara.kara1.subfile.slice(0, -4))}</p>
					<p>{i18next.t('REPOSITORIES.CONFIRM_SURE', { first: this.props.match.params.name, second: this.state.selectedRepo })}</p>
				</Modal>
			</Layout.Content>

		);
	}
}

export default withRouter(RepositoriesEdit);