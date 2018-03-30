import React, {Component} from 'react';
import {Button, Checkbox, Form, Icon, Input, Select} from 'antd';
import PropTypes from 'prop-types';

class UserForm extends Component {

	componentDidMount() {
		this.setState({ adminChecked: (this.props.user.flag_admin === 1)});
	}

	state = {
		adminChecked: false
	};

	toggleAdmin = (e) => this.setState({adminChecked: e.target.checked});

	passwordValidator = (rule, value, callback) => {
		const form = this.props.form;
		const type = form.getFieldValue('type');
		const id = form.getFieldValue('id');
		if (type === '2' && value) {
			callback('A guest cannot have a password');
		} else if (type === '1' && !id && !value) {
			callback('A user must have a password');
		} else {
			callback();
		}
	};

	handleSubmit = (e) => {
		e.preventDefault();
		this.props.form.validateFields((err, values) => {
			if (!err) {
				this.props.save(values);
			}
		});
	};

	render() {
		const {getFieldDecorator} = this.props.form;

		return (
			<Form onSubmit={this.handleSubmit} className='login-form'>
				<Form.Item>
					{getFieldDecorator('id', {
						initialValue: this.props.user.id
					})(<Input type="hidden" />)}
				</Form.Item>
				<Form.Item hasFeedback>
					{getFieldDecorator('type', {
						rules: [{required: true}],
						initialValue: `${this.props.user.type}`
					})(<Select>
						<Select.Option value='1'>User</Select.Option>
						<Select.Option value='2'>Guest</Select.Option>
					</Select>)}
				</Form.Item>
				<Form.Item hasFeedback>
					{getFieldDecorator('login', {
						rules: [{required: true}],
						initialValue: this.props.user.login
					})(<Input
						prefix={<Icon type='user'/>}
						onPressEnter={this.handleSubmit}
						placeholder='Username'
					/>)}
				</Form.Item>
				<Form.Item hasFeedback>
					{getFieldDecorator('password', {
						rules: [{validator: this.passwordValidator}]
					})(<Input
						prefix={<Icon type='lock'/>}
						type='password'
						onPressEnter={this.handleSubmit}
						placeholder='Password'
					/>)}
				</Form.Item>
				<Form.Item hasFeedback>
					{getFieldDecorator('nickname', {
						initialValue: this.props.user.nickname
					})(<Input
						onPressEnter={this.handleSubmit}
						placeholder='Nickname'
					/>)}
				</Form.Item>
				<Form.Item hasFeedback>
					{getFieldDecorator('bio', {
						initialValue: this.props.user.bio
					})(<Input.TextArea
						rows={3}
						placeholder='Bio'
					/>)}
				</Form.Item>
				<Form.Item hasFeedback>
					{getFieldDecorator('email', {
						initialValue: this.props.user.email
					})(<Input
						onPressEnter={this.handleSubmit}
						placeholder='Email'
					/>)}
				</Form.Item>
				<Form.Item hasFeedback>
					{getFieldDecorator('url', {
						initialValue: this.props.user.url
					})(<Input
						onPressEnter={this.handleSubmit}
						placeholder='Website'
					/>)}
				</Form.Item>
				<Form.Item>
					{getFieldDecorator('flag_admin', {
						valuePropName: 'flag_admin',
						initialValue: (this.props.user.flag_admin === 1)
					})(
						<Checkbox
							checked={this.state.adminChecked}
							onChange={this.toggleAdmin}
						>
							Administrator
						</Checkbox>
					)}
				</Form.Item>
				<Form.Item>
					<Button type='primary' htmlType='submit' className='login-form-button'>
						Save
					</Button>
				</Form.Item>
			</Form>
		);
	}
}

UserForm.propTypes = {
	user: PropTypes.object.isRequired,
	save: PropTypes.func.isRequired
};

export default Form.create()(UserForm);