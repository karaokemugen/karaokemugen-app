import { Layout } from 'antd';
import React, { Component } from 'react';
import { RouteComponentProps, withRouter } from 'react-router-dom';

import { DBKara } from '../../../../src/lib/types/database/kara';
import { getAxiosInstance } from '../../axiosInterceptor';
import { addListener, removeListener } from '../../utils/electron';
import KaraForm from './KaraForm';

interface KaraEditState {
	kara: DBKara,
	save: any,
	loadKara: boolean
}
class KaraEdit extends Component<RouteComponentProps<{ kid: string }>, KaraEditState> {

	state = {
		kara: undefined,
		save: () => { },
		loadKara: false
	};

	componentDidMount() {
		this.loadKara();
	}

	saveNew = async (kara) => {
		await getAxiosInstance().post('/karas', kara);
		addListener();
		this.props.history.push('/system/km/karas');
	};

	saveUpdate = async (kara) => {
		await getAxiosInstance().put(`/karas/${kara.kid}`, kara);
		addListener();
		this.props.history.push('/system/km/karas');
	};

	loadKara = async () => {
		removeListener();
		if (this.props.match.params.kid) {
			const res = await getAxiosInstance().get(`/karas/${this.props.match.params.kid}`);
			this.setState({ kara: res.data, save: this.saveUpdate, loadKara: true });
		} else {
			this.setState({ save: this.saveNew, loadKara: true });
		}
	};

	handleCopy = async (kid, repo) => {
		await getAxiosInstance().post(`/karas/${kid}/copyToRepo`, { repo: repo });
		this.props.history.push('/system/km/karas');
	}

	render() {
		return (
			<Layout.Content style={{ padding: '25px 50px', textAlign: 'center' }}>
				{this.state.loadKara && <KaraForm kara={this.state.kara} save={this.state.save} handleCopy={this.handleCopy} />}
			</Layout.Content>
		);
	}
}

export default withRouter(KaraEdit);
