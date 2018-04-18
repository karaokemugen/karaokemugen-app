import React, {Component} from 'react';
import {Button, Form, Icon, Input} from 'antd';
import {connect} from 'react-redux';
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

	handleSubmit = (e) => {
		e.preventDefault();
		this.props.form.validateFields((err, values) => {
			if (!err) {
				this.props.login(values.username, values.password);
			}
		});
	};

	render() {
		const { getFieldDecorator } = this.props.form;
		return (
			<div style={{
				position: 'absolute',
				top: '50%',
				left: '50%',
				margin: '-160px 0 0 -160px',
				width: '320px',
				height: '240px',
				padding: '36px',
				boxShadow: '0 0 100px rgba(0,0,0,.08)'
			}}>
				<Form onSubmit={this.handleSubmit} className='login-form'>
					<Form.Item hasFeedback>
						{getFieldDecorator('username', {
							rules: [{ required: true}],
						})(<Input
							prefix={<Icon type='user'/>}
							onPressEnter={this.handleSubmit}
							placeholder='Username'
						/>)}
					</Form.Item>
					<Form.Item hasFeedback>
						{getFieldDecorator('password', {
							rules: [{required: true}],
						})(<Input
							prefix={<Icon type='lock'/>}
							type='password'
							onPressEnter={this.handleSubmit}
							placeholder='Password'
						/>)}
					</Form.Item>
					<Form.Item>
						<Button type='primary' htmlType='submit' className='login-form-button'>
							Log In
						</Button>
					</Form.Item>
				</Form>
			</div>
		);
	}
}

const mapStateToProps = (state) => ({
	error: state.auth.error,
	authenticated: state.auth.authenticated
});

const mapDispatchToProps = (dispatch) => ({
	login: (username, password) => {
		loginAction(username, password)(dispatch);
	}
});

export default connect(mapStateToProps, mapDispatchToProps)(Form.create()(Login));
