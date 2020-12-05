import { Layout } from 'antd';
import Modal from 'antd/lib/modal/Modal';
import i18next from 'i18next';
import React, { Component } from 'react';
import { RouteComponentProps,withRouter } from 'react-router-dom';

import { Repository } from '../../../../../src/lib/types/repo';
import { commandBackend } from '../../../utils/socket';
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
		Tags: []
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
		await commandBackend('addRepo', repository, true);
		this.props.history.push('/system/km/repositories');
	};

	saveUpdate = async (repository) => {
		await commandBackend('editRepo', repository, true);
		this.props.history.push('/system/km/repositories');
	};

	loadrepository = async () => {
		if (this.props.match.params.name) {
			const res = await commandBackend('getRepo', {name: this.props.match.params.name});
			this.setState({ repository: res, save: this.saveUpdate });
		} else {
			this.setState({ repository: { ...newrepository }, save: this.saveNew });
		}
	};


	consolidate = async (consolidatePath: string) => {
		if (consolidatePath) {
			await commandBackend('consolidateRepo', { path: consolidatePath, name: this.props.match.params.name }, true, 300000);
			this.props.history.push('/system/km/repositories');
		}
	}

	compareLyrics = async (repo: string) => {
		if (repo) {
			const response = await commandBackend('compareLyricsBetweenRepos',
				{ repo: repo, name: this.props.match.params.name}
			);
			this.setState({ report: response, selectedRepo: repo });
		}
	}

	copyLyrics = async (report: string) => {
		if (report) {
			await commandBackend('copyLyricsBetweenRepos', { report: report });
		}
	}

	render() {
		return (
			<>
				<Layout.Header>
					<div className='title'>{i18next.t(this.props.match.params.name ?
						'HEADERS.REPOSITORIES_EDIT.TITLE' :
						'HEADERS.REPOSITORIES_NEW.TITLE'
					)}</div>
					<div className='description'>{i18next.t(this.props.match.params.name ?
						'HEADERS.REPOSITORIES_EDIT.DESCRIPTION' :
						'HEADERS.REPOSITORIES_NEW.DESCRIPTION'
					)}</div>
				</Layout.Header>
				<Layout.Content>
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
			</>

		);
	}
}

export default withRouter(RepositoriesEdit);
