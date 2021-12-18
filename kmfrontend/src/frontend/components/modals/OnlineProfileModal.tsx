import './OnlineProfileModal.scss';

import i18next from 'i18next';
import { useContext, useState } from 'react';

import { setAuthentifactionInformation } from '../../../store/actions/auth';
import { closeModal } from '../../../store/actions/modal';
import GlobalContext from '../../../store/context';
import { commandBackend } from '../../../utils/socket';

interface IProps {
	loginServ?: string;
	type: 'delete' | 'convert';
}

function OnlineProfileModal(props: IProps) {
	const context = useContext(GlobalContext);
	const [loginServ, setLoginServ] = useState(props.loginServ);
	const [password, setPassword] = useState('');

	const onClick = async () => {
		let response;
		if (props.type === 'convert') {
			response = await commandBackend('convertMyLocalUserToOnline', {
				instance: loginServ,
				password: password,
			});
		} else {
			response = await commandBackend('convertMyOnlineUserToLocal', { password: password });
		}
		const user = context.globalState.auth.data;
		user.token = response.message.data.token;
		user.onlineToken = response.message.data.onlineToken;
		setAuthentifactionInformation(context.globalDispatch, user);
		closeModal(context.globalDispatch);
	};

	return (
		<div className="modal modalPage">
			<div className="modal-dialog">
				<div className="modal-content">
					<div className="modal-header">
						<h4 className="modal-title">
							{props.type === 'convert'
								? i18next.t('MODAL.PROFILE_MODAL.ONLINE_CONVERT')
								: i18next.t('MODAL.PROFILE_MODAL.ONLINE_DELETE')}
						</h4>
						<button
							className="closeModal"
							onClick={() => {
								closeModal(context.globalDispatch);
							}}
						>
							<i className="fas fa-times" />
						</button>
					</div>
					<div className="modal-body">
						<div className="modal-content">
							{props.type === 'delete' ? (
								<p className="warnDeleteOnlineAccount">
									{i18next.t('MODAL.PROFILE_MODAL.ONLINE_DELETE_WARN', {
										instance: loginServ,
									})}
								</p>
							) : null}
							{props.type === 'convert' ? (
								<>
									<label>{i18next.t('INSTANCE_NAME')}</label>
									<input type="text" value={loginServ} onChange={e => setLoginServ(e.target.value)} />
								</>
							) : null}
							<label>{i18next.t('PROFILE_PASSWORD_AGAIN')}</label>
							<input
								type="password"
								placeholder={i18next.t('PASSWORD')}
								onChange={e => setPassword(e.target.value)}
							/>
						</div>
						<button className="btn btn-default confirm" onClick={onClick}>
							<i className="fas fa-check" />
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}

export default OnlineProfileModal;
