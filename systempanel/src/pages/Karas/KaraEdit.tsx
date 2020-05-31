import React, {Component} from 'react';
import {Layout} from 'antd';
import KaraForm from './KaraForm';
import { withRouter, RouteComponentProps } from 'react-router-dom';
import Axios from 'axios';
import { DBKara } from '../../../../src/lib/types/database/kara';
import { getAxiosInstance } from '../../axiosInterceptor';

interface KaraEditState {
	kara: DBKara,
	save: any,
	loadKara: boolean
}
class KaraEdit extends Component<RouteComponentProps<{kid:string}>, KaraEditState> {

	state = {
		kara: undefined,
		save: () => {},
		loadKara: false
	};

	componentDidMount() {
		this.loadKara();
	}

	saveNew = async (kara) => {
		await getAxiosInstance().post('/karas', kara)
		this.props.history.push('/system/km/karas');
	};

	saveUpdate = async (kara) => {
			await getAxiosInstance().put(`/karas/${kara.kid}`, kara)
			this.props.history.push('/system/km/karas');
	};

	loadKara = async () => {
		if (this.props.match.params.kid) {
			let res = await getAxiosInstance().get(`/karas/${this.props.match.params.kid}`)
			this.setState({kara: res.data, save: this.saveUpdate, loadKara: true});
		} else {
			this.setState({save: this.saveNew, loadKara: true});
		}
	};

	handleCopy = async (kid,repo) => {
		await getAxiosInstance().post(`/karas/${kid}/copyToRepo`, {repo:repo})
		this.props.history.push('/system/km/karas');
	}

	render() {
		return (
			<Layout.Content style={{padding: '25px 50px', textAlign: 'center'}}>
				{this.state.loadKara && <KaraForm kara={this.state.kara} save={this.state.save} handleCopy={this.handleCopy}/>}
			</Layout.Content>
		);
	}
}

export default withRouter(KaraEdit);
