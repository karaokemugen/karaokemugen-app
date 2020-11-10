import { Layout } from 'antd';
import React, { Component } from 'react';
import { RouteComponentProps, withRouter } from 'react-router-dom';

import { DBKara } from '../../../../../src/lib/types/database/kara';
import { addListener, removeListener } from '../../../utils/electron';
import { commandBackend } from '../../../utils/socket';
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
		await commandBackend('createKara', kara, true);
		addListener();
		this.props.history.push('/system/km/karas');
	};

	saveUpdate = async (kara) => {
		await commandBackend('editKara', kara, true);
		addListener();
		this.props.history.push('/system/km/karas');
	};

	loadKara = async () => {
		removeListener();
		if (this.props.match.params.kid) {
			const res = await commandBackend('getKara', {kid: this.props.match.params.kid}, true);
			this.setState({ kara: res, save: this.saveUpdate, loadKara: true });
		} else {
			this.setState({ save: this.saveNew, loadKara: true });
		}
	};

	handleCopy = async (kid, repo) => {
		await commandBackend('copyKaraToRepo', { repo, kid }, true);
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
