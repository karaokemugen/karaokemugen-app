import React, {Component} from 'react';
import {Button, Form, Icon, Input, Select} from 'antd';
import i18next from 'i18next';

interface UserFormProps {
	user: any,
	form: any,
	save: any,
}

interface UserFormState {
	initialLogin: string,
}

class UserForm extends Component<UserFormProps, UserFormState> {

	constructor(props) {
		super(props);
		this.state = {
			initialLogin: this.props.user.login
		};
	}

	passwordValidator = (rule, value, callback) => {
		if (+this.props.form.getFieldValue('type') < 2 && !this.state.initialLogin && !value) {
			callback(i18next.t('USERS.PASSWORD_VALIDATOR_MESSAGE'));
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
				<Form.Item hasFeedback>
					{getFieldDecorator('type', {
						rules: [{required: true}],
						initialValue: `${this.props.user.type}`
					})(<Select>
						<Select.Option value='0'>{i18next.t('USERS.ADMIN')}</Select.Option>
						<Select.Option value='1'>{i18next.t('USERS.USER')}</Select.Option>
						<Select.Option value='2'>{i18next.t('USERS.GUEST')}</Select.Option>
					</Select>)}
				</Form.Item>
				<Form.Item hasFeedback>
					{getFieldDecorator('login', {
						rules: [{required: true}],
						initialValue: this.props.user.login
					})(<Input
						prefix={<Icon type='user'/>}
						onPressEnter={this.handleSubmit}
						placeholder={i18next.t('USERS.LOGIN')}
					/>)}
				</Form.Item>
				{+this.props.form.getFieldValue('type') === 2 ? null :
					<Form.Item hasFeedback>
						{getFieldDecorator('password', {
							rules: [{validator: this.passwordValidator}]
						})(<Input
							prefix={<Icon type='lock'/>}
							type='password'
							onPressEnter={this.handleSubmit}
							placeholder={i18next.t('USERS.PASSWORD')}
						/>)}
					</Form.Item>
				}
				<Form.Item hasFeedback>
					{getFieldDecorator('nickname', {
						rules: [{required: true}],
						initialValue: this.props.user.nickname
					})(<Input
						onPressEnter={this.handleSubmit}
						placeholder={i18next.t('USERS.NICKNAME')}
					/>)}
				</Form.Item>
				<Form.Item hasFeedback>
					{getFieldDecorator('bio', {
						initialValue: this.props.user.bio
					})(<Input.TextArea
						rows={3}
						placeholder={i18next.t('USERS.BIO')}
					/>)}
				</Form.Item>
				<Form.Item hasFeedback>
					{getFieldDecorator('email', {
						rules: [{type: 'email'}],
						initialValue: this.props.user.email
					})(<Input
						onPressEnter={this.handleSubmit}
						placeholder={i18next.t('USERS.EMAIL')}
					/>)}
				</Form.Item>
				<Form.Item hasFeedback>
					{getFieldDecorator('url', {
						rules: [{type: 'url'}],
						initialValue: this.props.user.url
					})(<Input
						onPressEnter={this.handleSubmit}
						placeholder={i18next.t('USERS.URL')}
					/>)}
				</Form.Item>
				<Form.Item>
					<Button type='primary' htmlType='submit' className='login-form-button'>{i18next.t('SUBMIT')}</Button>
				</Form.Item>
			</Form>
		);
	}
}

const cmp: any = Form.create()(UserForm);
export default cmp;