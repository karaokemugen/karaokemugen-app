import React, {Component} from 'react';
import axios from 'axios';
import {Container, Grid, Header, Segment, Button} from 'semantic-ui-react';
import {connect} from 'react-redux';

import {loading, infoMessage, errorMessage} from '../actions/navigation';

class Database extends Component {

	dbregen() {
		this.props.loading(true);
		axios.post('/api/dbregen')
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
					<Grid columns={1} stackable style={{ padding: '1em', height: '100%'}}>
						<Grid.Column textAlign='left'>
							<Header
								as='h3'
								content='Base de données'
								inverted
							/>
						</Grid.Column>
					</Grid>
				</Container>
				<Container>
					<Grid columns={1} stackable style={{ padding: '1em', height: '100%'}}>
						<Grid.Column textAlign='center'>
							<Button primary onClick={this.dbregen.bind(this)} active={!this.props.loadingActive}>Régénérer la base de données</Button>
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


export default connect(mapStateToProps, mapDispatchToProps)(Database);