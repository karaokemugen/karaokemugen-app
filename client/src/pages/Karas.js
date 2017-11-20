import React, {Component} from 'react';
import axios from 'axios';

import {Container, Grid, Header, Segment, Button} from 'semantic-ui-react';
import {connect} from 'react-redux';

import {loading, infoMessage, errorMessage} from '../actions/navigation';

class Karas extends Component {

	karagen() {
		this.props.loading(true);
		axios.post('/api/kara/generate-all')
			.then(res => {
				this.props.loading(false);
				this.props.infoMessage(res.data);
			})
			.catch(err => {
				this.props.loading(false);
				this.props.errorMessage(`${err.response.status}: ${err.response.statusText}. ${err.response.data}`);
			});
	}

	render() {
		return (
			<Segment
				inverted
				vertical
				style={{ margin: '1em 0em 1em', padding: '1em 0em 1em' }}
			>
				<Container textAlign='center'>
					<Grid columns={1} stackable style={{ padding: '1em' }}>
						<Grid.Column textAlign='left'>
							<Header
								as='h3'
								content='Fichiers kara'
								inverted
							/>
						</Grid.Column>
					</Grid>
					<Grid columns={1} stackable style={{ padding: '1em' }}>
						<Grid.Column textAlign='center'>
							<Button primary onClick={this.karagen.bind(this)} active={!this.props.loadingActive}>Générer les fichiers karas</Button>
						</Grid.Column>
					</Grid>
				</Container>
			</Segment>
		);
	}
}

const mapStateToProps = (state) => ({
	loadingActive: state.navigation.loading
});

const mapDispatchToProps = (dispatch) => ({
	loading: (active) => dispatch(loading(active)),
	infoMessage: (message) => dispatch(infoMessage(message)),
	errorMessage: (message) => dispatch(errorMessage(message))
});

export default connect(mapStateToProps, mapDispatchToProps)(Karas);