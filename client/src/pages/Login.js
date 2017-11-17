import React, {Component} from 'react';
import {Button, Form, Grid, Header, Message, Segment} from 'semantic-ui-react';
import { connect } from 'react-redux';
import {login as loginAction} from '../actions/auth';

class Login extends Component {

	constructor(props) {
		super(props);
		this.state = {
			username: '',
			password: '',
			error: ''
		};
	}

	login(e) {
		const { dispatch } = this.props;
		e.preventDefault();
		loginAction(this.state.username, this.state.password)(dispatch);
	}

	render() {
		return (
			<div className='login-form'>
				<style>{`
				  body > div,
				  body > div > div,
				  body > div > div > div.login-form {
					height: 100%;
				  }
				`}</style>
				<Grid
					textAlign='center'
					style={{ height: '100%' }}
					verticalAlign='middle'
				>
					<Grid.Column style={{ maxWidth: 450 }}>
						<Header as='h2' color='teal' textAlign='center'>Connexion</Header>
						<Form size='large'>
							<Segment stacked>
								<Form.Input
									fluid
									icon='user'
									iconPosition='left'
									placeholder='Username'
									onChange={(e, data) => this.setState({username: data.value})}
								/>
								<Form.Input
									fluid
									icon='lock'
									iconPosition='left'
									placeholder='Password'
									type='password'
									onChange={(e, data) => this.setState({password: data.value})}
								/>

								<Button
									color='teal'
									fluid size='large'
									onClick={this.login.bind(this)}
								>Login</Button>
							</Segment>
						</Form>
						{ this.props.error && <Message error>{this.props.error}</Message> }
						{ this.props.authenticated && <Message info>Identification réussie</Message> }
					</Grid.Column>
				</Grid>
			</div>
		);
	}
}

const mapStateToProps = (state) => ({
	error: state.auth.error,
	authenticated: state.auth.authenticated
});

export default connect(mapStateToProps)(Login);
