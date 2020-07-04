import { LockOutlined,UserOutlined } from '@ant-design/icons';
import { Button, Form,Input, Layout, message } from 'antd';
import i18next from 'i18next';
import React, { Component } from 'react';
import { RouteComponentProps,withRouter } from 'react-router-dom';

import styles from '../App.module.css';
import logo from '../assets/Logo-fond-transp.png';
import { login } from '../store/actions/auth';
import GlobalContext from '../store/context';

class Login extends Component<RouteComponentProps, unknown> {
	static contextType = GlobalContext
	context: React.ContextType<typeof GlobalContext>

	componentDidMount() {
		if (this.context.globalState.auth.isAuthenticated) {
			this.props.history.push('/system/km');
		}
	}

	handleSubmit = async (values) => {
		try {
			await login(values.username, values.password, this.context.globalDispatch);
			this.props.history.push('/system/km');
		} catch (err) {
			message.error(this.context.globalState.auth.error);
		}
	}

	render() {

		const UsernameFormItem = (
			<Form.Item name="username" rules={[{ required: true, message: i18next.t('USERS.LOGIN_ERROR') }]}>
				<Input
					prefix={<UserOutlined className={styles.loginIconColor} />}
					placeholder={i18next.t('USERS.LOGIN')}
				/>
			</Form.Item>
		);

		const PasswordFormItem = (
			<Form.Item name="password" rules={[{ required: true, message: i18next.t('USERS.PASSWORD_ERROR') }]}>
				<Input
					prefix={<LockOutlined className={styles.loginIconColor} />}
					type='password'
					placeholder={i18next.t('USERS.PASSWORD')}
				/>
			</Form.Item>
		);

		const SubmitButtonFormItem = (
			<Form.Item>
				<Button type='primary' htmlType='submit' className={styles.loginFormButton}>
					{i18next.t('USERS.LOG_IN')}
				</Button>
			</Form.Item>
		);

		const LoginForm = (
			<Layout className={styles.loginLayout}>
				<div className={styles.loginImageContainer}>
					<img src={logo} className={styles.loginImage} alt='logo'></img>
				</div>
				<div className={styles.loginForm}>
					<p>{i18next.t('USERS.LOGIN_MESSAGE')}</p>
					<Form onFinish={this.handleSubmit}>
						{UsernameFormItem}
						{PasswordFormItem}
						{SubmitButtonFormItem}
					</Form>
				</div>
			</Layout>
		);

		return (LoginForm);
	}
}

export default withRouter(Login);
