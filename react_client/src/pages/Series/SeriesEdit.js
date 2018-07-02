import React, {Component} from 'react';
import {Layout} from 'antd';
import SerieForm from './SeriesForm';
import axios from 'axios/index';
import {connect} from 'react-redux';
import {push} from 'react-router-redux';
import {errorMessage, infoMessage, loading} from '../../actions/navigation';

const newSerie = {
	name: null,
	aliases: [],
	i18n: {}	
};

class SerieEdit extends Component {

	state = {
		serie: null,
		save: () => {}
	};

	componentDidMount() {
		this.loadSerie();
	}

	saveNew = (serie) => {
		axios.post('/api/series', serie)
			.then(() => {
				this.props.infoMessage('Series successfully created');
				this.props.push('/series');
			})
			.catch(err => {
				this.props.errorMessage(`${err.response.status}: ${err.response.statusText}. ${err.response.data}`);
			});
	};

	saveUpdate = (serie) => {
		axios.put(`/api/series/${serie.serie_id}`, serie)
			.then(() => {
				this.props.infoMessage('Series successfully edited');
				this.props.push('/series');
			})
			.catch(err => {
				this.props.errorMessage(`${err.response.status}: ${err.response.statusText}. ${err.response.data}`);
			});
	};

	loadSerie = () => {
		this.props.loading(true);
		if (this.props.match && this.props.match.params.serie_id) {
			axios.get(`/api/series/${this.props.match.params.serie_id}`)
				.then(res => {
					const serieData = {...res};
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
	push: (url) => dispatch(push(url))
});

export default connect(mapStateToProps, mapDispatchToProps)(SerieEdit);