import React, {Component} from 'react';
import {Button, Container, Grid, Header, Message, Segment, Table} from 'semantic-ui-react';


export default class Config extends Component {

	constructor(props) {
		super(props);
		this.state = {
			config: {},
			error: ''
		};
	}

	componentDidMount() {
		this.refresh();
	}

	refresh() {
		fetch('/api/config')
			.then(res => res.json())
			.then(json => this.setState({config: json, error: ''}))
			.catch(err => this.setState({error: 'Impossible de récupérer la configuration. ' + err}));
	}

	render() {
		const configRows = Object.keys(this.state.config).map(k =>
			<Table.Row>
				<Table.Cell>{k}</Table.Cell>
				<Table.Cell>{this.state.config[k]}</Table.Cell>
			</Table.Row>
		);

		return (
			<Segment
				inverted
				vertical
				style={{ margin: '1em 0em 1em', padding: '1em 0em 1em' }}
			>
				<Container textAlign='center'>
					<Message error hidden={!this.state.error}>
						{this.state.error}
					</Message>
					<Grid columns={2} stackable style={{ padding: '1em'}}>
						<Grid.Column textAlign='left'>
							<Header
								as='h3'
								content='Propriétés de configuration'
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
									<Table.HeaderCell>Propriété</Table.HeaderCell>
									<Table.HeaderCell>Valeur</Table.HeaderCell>
								</Table.Row>
							</Table.Header>

							<Table.Body>
								{configRows}
							</Table.Body>
						</Table>
					</Container>
				</Container>
			</Segment>
		);
	}
}