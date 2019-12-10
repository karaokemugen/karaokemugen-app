import React, {Component} from 'react';
import {Layout} from 'antd';
import SerieForm from './SeriesForm';
import axios from 'axios/index';
import {connect} from 'react-redux';
import {push} from 'connected-react-router';
import {errorMessage, infoMessage, loading, warnMessage} from '../../actions/navigation';

import {ReduxMappedProps} from '../../react-app-env';
import i18next from 'i18next';

interface SerieEditProps extends ReduxMappedProps {
	push: (string) => any,
	match?: any,
}

interface SerieEditState {
	serie: any,
	save: any,
}

const newSerie = {
	name: null,
	aliases: [],
	i18n: {}
};

class SerieEdit extends Component<SerieEditProps, SerieEditState> {

	state = {
		serie: null,
		save: () => {}
	};

	componentDidMount() {
		this.loadSerie();
	}

	saveNew = (serie) => {
		axios.post('/api/system/series', serie)
			.then(() => {
				this.props.infoMessage(i18next.t('SERIES.SERIE_CREATED'));
				this.props.push('/system/km/series');
			})
			.catch(err => {
				this.props.errorMessage(`${err.response.status}: ${err.response.statusText}. ${err.response.data}`);
			});
	};

	saveUpdate = (serie) => {
		axios.put(`/api/system/series/${serie.sid}`, serie)
			.then(() => {
				this.props.infoMessage(i18next.t('SERIES.SERIE_EDITED'));
				this.props.push('/system/km/series');
			})
			.catch(err => {
				this.props.errorMessage(`${err.response.status}: ${err.response.statusText}. ${err.response.data}`);
			});
	};

	loadSerie = () => {
		this.props.loading(true);
		if (this.props.match && this.props.match.params.sid) {
			axios.get(`/api/system/series/${this.props.match.params.sid}`)
				.then(res => {
					const serieData = {...res.data};
					serieData.sid = this.props.match.params.sid;
					this.setState({serie: serieData, save: this.saveUpdate});
					this.props.loading(false);
				})
				.catch(err => {
					this.props.errorMessage(`${err.response.status}: ${err.response.statusText}. ${err.response.data}`);
					this.props.loading(false);
				});
		} else {
			this.setState({serie: {...newSerie}, save: this.saveNew});
			this.props.loading(false);
		}
	};


	render() {
		return (
			<Layout.Content style={{padding: '25px 50px', textAlign: 'center'}}>
				{this.state.serie && (<SerieForm serie={this.state.serie} save={this.state.save} />)}
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

export default connect(mapStateToProps, mapDispatchToProps)(SerieEdit);