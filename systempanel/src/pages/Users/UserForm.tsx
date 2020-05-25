import React, {Component} from 'react';
import { Button, Input, Select, Form } from 'antd';
import i18next from 'i18next';
import { FormProps } from 'antd/lib/form';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { User as UserType } from '../../../../src/lib/types/user';

interface UserFormProps extends FormProps {
	user: UserType,
	save: (User) => void,
}

interface UserFormState {
	initialLogin: string,
	type?: number
}

class UserForm extends Component<UserFormProps, UserFormState> {

	constructor(props) {
		super(props);
		this.state = {
			initialLogin: this.props.user.login,
			type: this.props.user?.type
		};
	}

	passwordValidator = (rule, value, callback) => {
		if (+this.props.form.getFieldValue('type') < 2 && !this.state.initialLogin && !value) {
			callback(i18next.t('USERS.PASSWORD_VALIDATOR_MESSAGE'));
		} else {
			callback();
		}
	};

	render() {
		this.props.form && console.log(this.props.form)
		return (
            <Form onFinish={this.props.save} className='login-form'
				initialValues={{type: `${this.props.user.type}`, login: this.props.user.login, 
				nickname: this.props.user.nickname, bio: this.props.user.bio, email: this.props.user.email,
				url: this.props.user.url}}>
				<Form.Item hasFeedback name="type" required={true}>
					<Select onChange={(value) => this.setState({type: parseInt(value.toString())})}>
						<Select.Option value='0'>{i18next.t('USERS.ADMIN')}</Select.Option>
						<Select.Option value='1'>{i18next.t('USERS.USER')}</Select.Option>
						<Select.Option value='2'>{i18next.t('USERS.GUEST')}</Select.Option>
					</Select>
				</Form.Item>
				<Form.Item hasFeedback name="login" required={true}>
					<Input
						prefix={<UserOutlined />}
						placeholder={i18next.t('USERS.LOGIN')}
					/>
				</Form.Item>
				{this.state.type === 2 ? null :
					<Form.Item hasFeedback name="password" rules={[{validator: this.passwordValidator}]}>
						<Input
							prefix={<LockOutlined />}
							type='password'
							placeholder={i18next.t('USERS.PASSWORD')}
						/>
					</Form.Item>
				}
				<Form.Item hasFeedback name="nickname" required={true}>
					<Input placeholder={i18next.t('USERS.NICKNAME')} />
				</Form.Item>
				<Form.Item hasFeedback required={true}>
					<Input.TextArea
						rows={3}
						placeholder={i18next.t('USERS.BIO')}
					/>
				</Form.Item>
				<Form.Item hasFeedback rules={[{type: 'email'}]}>
					<Input placeholder={i18next.t('USERS.EMAIL')} />
				</Form.Item>
				<Form.Item hasFeedback rules={[{type: 'url'}]}>
					<Input placeholder={i18next.t('USERS.URL')}	/>
				</Form.Item>
				<Form.Item>
					<Button type='primary' htmlType='submit' className='login-form-button'>{i18next.t('SUBMIT')}</Button>
				</Form.Item>
			</Form>
        );
	}
}

export default UserForm;
