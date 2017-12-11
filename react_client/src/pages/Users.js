import React, {Component} from 'react';
import axios from 'axios';

import {Container, Grid, Header, Segment, Button, Table} from 'semantic-ui-react';
import {connect} from 'react-redux';

import {loading, errorMessage} from '../actions/navigation';

class Users extends Component {

	constructor(props) {
		super(props);
		this.state = {
			users: []
		};
	}

	componentDidMount() {
		this.refresh();
	}

	refresh() {
		this.props.loading(true);
		axios.get('/api/users')
			.then(res => {
				this.props.loading(false);
				this.setState({users: res.data});
			})
			.catch(err => {
				this.props.loading(false);
				this.props.errorMessage(`${err.response.status}: ${err.response.statusText}. ${err.response.data}`);
			});
	}

	render() {
		const userRows = this.state.users.map(u =>
			<Table.Row>
				<Table.Cell>{u.user_id}</Table.Cell>
				<Table.Cell>{u.type}</Table.Cell>
				<Table.Cell>{u.avatar_file}</Table.Cell>
				<Table.Cell>{u.login}</Table.Cell>
				<Table.Cell>{u.nickname}</Table.Cell>
				<Table.Cell>{u.last_login}</Table.Cell>
				<Table.Cell>{u.flag_online}</Table.Cell>
				<Table.Cell>{u.flag_admin}</Table.Cell>
			</Table.Row>
		);

		return (
			<Segment
				inverted
				vertical
				style={{ margin: '1em 0em 1em', padding: '1em 0em 1em' }}
			>
				<Container textAlign='center'>
					<Grid columns={2} stackable style={{ padding: '1em'}}>
						<Grid.Column textAlign='left'>
							<Header
								as='h3'
								content='Liste des utilisateurs'
								inverted
							/>
						</Grid.Column>
						<Grid.Column textAlign='right'>
							<Button primary onClick={this.refresh.bind(this)}>Rafraîchir</Button>
						</Grid.Column>
					</Grid>
					<Container>
						<Table celled>
							<Table.Header>
								<Table.Row>
									<Table.HeaderCell>ID</Table.HeaderCell>
									<Table.HeaderCell>Type</Table.HeaderCell>
									<Table.HeaderCell>Avatar</Table.HeaderCell>
									<Table.HeaderCell>Login</Table.HeaderCell>
									<Table.HeaderCell>Pseudo</Table.HeaderCell>
									<Table.HeaderCell>Dernière connexion</Table.HeaderCell>
									<Table.HeaderCell>En ligne</Table.HeaderCell>
									<Table.HeaderCell>Administrateur</Table.HeaderCell>
								</Table.Row>
							</Table.Header>

							<Table.Body>
								{userRows}
							</Table.Body>
						</Table>
					</Container>
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
	errorMessage: (message) => dispatch(errorMessage(message))
});

export default connect(mapStateToProps, mapDispatchToProps)(Users);