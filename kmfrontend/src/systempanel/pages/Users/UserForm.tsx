import { LockOutlined,UserOutlined } from '@ant-design/icons';
import { Alert,Button, Checkbox, Form, Input, Select } from 'antd';
import { FormInstance } from 'antd/lib/form';
import i18next from 'i18next';
import React, { Component } from 'react';

import { User as UserType } from '../../../../../src/lib/types/user';

interface UserFormProps {
	user: UserType,
	save: (User) => void,
}

interface UserFormState {
	initialLogin: string,
	type?: number
}

class UserForm extends Component<UserFormProps, UserFormState> {
	formRef = React.createRef<FormInstance>();

	constructor(props) {
		super(props);
		this.state = {
			initialLogin: this.props.user.login,
			type: this.props.user?.type
		};
	}

	passwordValidator = (_, value) => {
		if (+this.formRef.current?.getFieldValue('type') < 2 && !this.state.initialLogin && !value) {
			return Promise.reject(i18next.t('USERS.PASSWORD_VALIDATOR_MESSAGE'));
		} else {
			return Promise.resolve();
		}
	};

	loginValidator = (_, value: string) => {
		if (!this.state.initialLogin && value.includes('@')) {
			return Promise.reject(i18next.t('USERS.CHAR_NOT_ALLOWED', { char: '@' }));
		} else {
			return Promise.resolve();
		}
	};

	render() {
		return (
			<Form ref={this.formRef} onFinish={this.props.save} layout='vertical'
				initialValues={{
					type: `${this.props.user.type}`, login: this.props.user.login,
					nickname: this.props.user.nickname, bio: this.props.user.bio, email: this.props.user.email,
					url: this.props.user.url, flag_tutorial_done: this.props.user.flag_tutorial_done
				}}>
				{this.props.user.login && this.props.user.login.includes('@') ?
					<Alert type="info" showIcon style={{ marginBottom: '10px' }}
						message={i18next.t('USERS.EDIT_ONLINE_ACCOUNT')}></Alert> : null
				}
				<Form.Item
					label={i18next.t('USERS.TYPE')}
					name="type"
					required={true}
				>
					<Select onChange={(value) => this.setState({ type: parseInt(value.toString()) })}>
						<Select.Option value='0'>{i18next.t('USERS.ADMIN')}</Select.Option>
						<Select.Option value='1'>{i18next.t('USERS.USER')}</Select.Option>
						<Select.Option value='2'>{i18next.t('USERS.GUEST')}</Select.Option>
					</Select>
				</Form.Item>
				<Form.Item
					label={i18next.t('USERS.REPLAY_TUTORIAL')}
					valuePropName="checked"
					name="flag_tutorial_done"
				>
					<Checkbox />
				</Form.Item>
				<Form.Item
					label={i18next.t('USERS.LOGIN')}
					name="login" required={true}
					rules={[{ validator: this.loginValidator }]}
				>
					<Input
						disabled={this.props.user.login && this.props.user.login.includes('@')}
						prefix={<UserOutlined />}
					/>
				</Form.Item>
				{this.state.type === 2 ? null :
					<Form.Item
						label={i18next.t('USERS.PASSWORD')}
						name="password"
						rules={[{ validator: this.passwordValidator }]}
					>
						<Input
							disabled={this.props.user.login && this.props.user.login.includes('@')}
							prefix={<LockOutlined />}
							type='password'
						/>
					</Form.Item>
				}
				<Form.Item
					label={i18next.t('USERS.NICKNAME')}
					name="nickname"
					required={true}
				>
					<Input disabled={this.props.user.login && this.props.user.login.includes('@')} />
				</Form.Item>
				<Form.Item
					label={i18next.t('USERS.BIO')}
					required={true}
					name="bio"
				>
					<Input.TextArea
						disabled={this.props.user.login && this.props.user.login.includes('@')}
						rows={2}
					/>
				</Form.Item>
				<Form.Item
					label={i18next.t('USERS.EMAIL')}
					rules={[{ type: 'email' }]}
					name="email"
				>
					<Input disabled={this.props.user.login && this.props.user.login.includes('@')} />
				</Form.Item>
				<Form.Item
					label={i18next.t('USERS.URL')}
					rules={[{ type: 'url' }]}
					name="url"
				>
					<Input disabled={this.props.user.login && this.props.user.login.includes('@')} />
				</Form.Item>
				<Form.Item>
					<Button type='primary' htmlType='submit'>{i18next.t('SUBMIT')}</Button>
				</Form.Item>
			</Form>
		);
	}
}

export default UserForm;
