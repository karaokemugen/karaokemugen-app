import i18next from 'i18next';
import React, { Component } from 'react';

import { setAuthentifactionInformation } from '../../../store/actions/auth';
import { closeModal } from '../../../store/actions/modal';
import GlobalContext from '../../../store/context';
import { commandBackend } from '../../../utils/socket';

interface IProps {
	loginServ?: string;
	type: 'delete' | 'convert';
}

interface IState {
	modalLoginServ: string | undefined;
	password: string;
}

class OnlineProfileModal extends Component<IProps, IState> {
	static contextType = GlobalContext;
	context: React.ContextType<typeof GlobalContext>

	constructor(props: IProps) {
		super(props);
		this.state = {
			modalLoginServ: this.props.loginServ,
			password: ''
		};
	}

	onClick = async () => {
		let response;
		if (this.props.type === 'convert') {
			response = await commandBackend('convertMyLocalUserToOnline',
				{ instance: this.state.modalLoginServ, password: this.state.password });
		} else {
			response = await commandBackend('convertMyOnlineUserToLocal',
				{ password: this.state.password });
		}
		const user = this.context.globalState.auth.data;
		user.token = response.token;
		user.onlineToken = response.onlineToken;
		setAuthentifactionInformation(this.context.globalDispatch, user);
		closeModal(this.context.globalDispatch);
	};

	render() {
		return (
			<div className="modal modalPage">
				<div className="modal-dialog">
					<div className="modal-content">
						<div className="modal-header">
							<h4 className="modal-title">
								{this.props.type === 'convert' ?
									i18next.t('MODAL.PROFILE_MODAL.ONLINE_CONVERT')
									: i18next.t('MODAL.PROFILE_MODAL.ONLINE_DELETE')
								}
							</h4>
							<button className="closeModal"
								onClick={() => {
									closeModal(this.context.globalDispatch);
								}}>
								<i className="fas fa-times"></i>
							</button>
						</div>
						<div className="modal-body">
							{this.props.type === 'delete' ?
								<label className="warnDeleteOnlineAccount">
									{i18next.t('MODAL.PROFILE_MODAL.ONLINE_DELETE_WARN',
										{ instance: this.state.modalLoginServ })}
								</label> : null
							}
							{this.props.type === 'convert' ?
								<React.Fragment>
									<label>{i18next.t('INSTANCE_NAME')}</label>
									<input type="text" value={this.state.modalLoginServ}
										onChange={e => this.setState({ modalLoginServ: e.target.value })} />
								</React.Fragment> : null
							}
							<label>{i18next.t('PROFILE_PASSWORD_AGAIN')}</label>
							<input type="password" placeholder={i18next.t('PASSWORD')} className="form-control"
								onChange={e => this.setState({ password: e.target.value })} />
							<button className="btn btn-default confirm" onClick={this.onClick}>
								<i className="fas fa-check"></i>
							</button>
						</div >
					</div >
				</div >
			</div >
		);
	}
}

export default OnlineProfileModal;
