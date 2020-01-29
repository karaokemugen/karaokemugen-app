import React, {Component} from 'react';
import {Layout} from 'antd';
import KaraForm from './KaraForm';
import axios from 'axios/index';
import {connect} from 'react-redux';
import {push} from 'connected-react-router';
import {errorMessage, infoMessage, loading, warnMessage} from '../../actions/navigation';
import {ReduxMappedProps} from '../../react-app-env';
import i18next from 'i18next';

interface KaraEditProps extends ReduxMappedProps {
	push: (string) => any,
	match?: any,
}

interface KaraEditState {
	kara: any,
	save: any,
}

const newKara = {
	kid: null,
	songorder: null,
	songtypes: null,
	serie: null,
	title: null,
	langs: null,
	singers: null,
	songwriters: null,
	year: null,
	creators: null,
	authors: null,
	misc: null,
	groups: null,
	created_at: null,
	families: null,
	platforms: null,
	genres: null,
	origins: null
};

class KaraEdit extends Component<KaraEditProps, KaraEditState> {

	state = {
		kara: null,
		save: () => {}
	};

	componentDidMount() {
		this.loadKara();
	}

	saveNew = (kara) => {
		axios.post('/api/karas', kara)
			.then(() => {
				this.props.infoMessage(i18next.t('KARA.KARA_CREATED'));
				this.props.push('/system/km/karas');
			})
			.catch(err => {
				this.props.errorMessage(`${err.response.status}: ${err.response.statusText}. ${err.response.data}`);
			});
	};

	saveUpdate = (kara) => {
		axios.put(`/api/karas/${kara.kid}`, kara)
			.then(() => {
				this.props.infoMessage(i18next.t('KARA.KARA_EDITED'));
				this.props.push('/system/km/karas');
			})
			.catch(err => {
				this.props.errorMessage(`${err.response.status}: ${err.response.statusText}. ${err.response.data}`);
			});
	};

	loadKara = () => {
		this.props.loading(true);
		if (this.props.match && this.props.match.params.kid) {
			axios.get(`/api/karas/${this.props.match.params.kid}`)
				.then(res => {
					var kara = res.data;
					this.setState({kara: kara, save: this.saveUpdate});
					this.props.loading(false);
				})
				.catch(err => {
					this.props.errorMessage(`${err.response.status}: ${err.response.statusText}. ${err.response.data}`);
					this.props.loading(false);
				});
		} else {
			this.setState({kara: {...newKara}, save: this.saveNew});
			this.props.loading(false);
		}
	};

	handleCopy = (kid,repo) => {
		axios.post(`/api/karas/${kid}/copyToRepo`, {repo:repo})
			.then((data) => {
				this.props.infoMessage(i18next.t('KARA.KARA_EDITED'));
				this.props.push('/system/km/karas');
			})
			.catch(err => {
				this.props.errorMessage(`${err.response.status}: ${err.response.statusText}. ${err.response.data}`);
			});
	}

	render() {
		return (
			<Layout.Content style={{padding: '25px 50px', textAlign: 'center'}}>
				{this.state.kara && (<KaraForm kara={this.state.kara} save={this.state.save} handleCopy={this.handleCopy}/>)}
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

export default connect(mapStateToProps, mapDispatchToProps)(KaraEdit);
