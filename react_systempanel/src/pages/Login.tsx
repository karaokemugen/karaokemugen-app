import { Button, Form, Icon, Input, Layout, message } from 'antd';
import { FormComponentProps } from 'antd/lib/form';
import { push } from 'connected-react-router';
import React, { Component, FormEvent, ReactNode } from 'react';
import { connect } from 'react-redux';
import { isAlreadyLogged, login } from '../actions/auth';
import styles from '../App.module.css';
import logo from '../assets/Logo-fond-transp.png';

interface LoginForm {
  username: string;
  password: string;
}

interface LoginProps extends FormComponentProps<LoginForm> {
  login: (username, password) => Promise<void>;
  isAlreadyLogged: () => Promise<void>;
  push: (url: string) => void;
  authError: string;
}

interface LoginState {
  shouldRenderLoginForm: boolean; // Make sure to display the form only if you don't have already credential (F5 issue)
}

class Login extends Component<LoginProps, LoginState> {

  constructor(props) {
    super(props);
    this.state = {
      shouldRenderLoginForm: false
    };
  }

  componentDidMount() {
    this.props.isAlreadyLogged()
      .then(() => this.props.push('/system/km'))
      .catch(() => this.setState({shouldRenderLoginForm: true}));
  }

  handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    this.props.form.validateFields((error, values) => {
      if (!error) {
        this.props.login(values.username, values.password)
          .then(() => this.props.push('/system/km'))
          .catch(() => {
            message.error(this.props.authError)
          });
      }
    })
  }

	render() {
    const { getFieldDecorator } = this.props.form;

    const loginFormDecorator = (field: string, message: string, reactNode: ReactNode) => getFieldDecorator(field, {
      rules: [{ required: true, message: message }],
    })(reactNode);

    const UsernameFormItem = (
      <Form.Item>
        {loginFormDecorator('username', 'Please input your username!',
          <Input
            prefix={<Icon type='user' className={styles.loginIconColor} />}
            placeholder='Username'
          />,
        )}
      </Form.Item>
    );

    const PasswordFormItem = (
      <Form.Item>
        {loginFormDecorator('password', 'Please input your password!',
          <Input
            prefix={<Icon type='lock' className={styles.loginIconColor} />}
            type='password'
            placeholder='Password'
          />,
        )}
      </Form.Item>
    );

    const SubmitButtonFormItem = (
      <Form.Item>
        <Button type='primary' htmlType='submit' className={styles.loginFormButton}>
          Log in
        </Button>
      </Form.Item>
    );

    const LoginForm = (
      <Layout className={styles.loginLayout}>
        <div className={styles.loginImageContainer}>
          <img src={logo} className={styles.loginImage} alt='logo'></img>
        </div>
        <div className={styles.loginForm}>
          <p>If you have an online account, remember to enter your full username (example: user@kara.moe) in the Username field</p>
          <Form onSubmit={this.handleSubmit}>
            {UsernameFormItem}
            {PasswordFormItem}
            {SubmitButtonFormItem}
          </Form>
        </div>
      </Layout>
    )

    return (
      this.state.shouldRenderLoginForm && LoginForm
    );
  }
}

const mapStateToProps = (state) => ({
  authError: state.auth.error
});

const mapDispatchToProps = (dispatch) => ({
  login: (username: string, password: string) => login(username, password, dispatch),
  isAlreadyLogged: () => isAlreadyLogged(dispatch),
  push: (url: string) => dispatch(push(url))
});

export default connect(mapStateToProps, mapDispatchToProps)(Form.create()(Login));
