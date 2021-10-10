import './AdminMessageModal.scss';

import i18next from 'i18next';
import { useContext, useEffect, useState } from 'react';

import { closeModal } from '../../../store/actions/modal';
import GlobalContext from '../../../store/context';
import { commandBackend } from '../../../utils/socket';

function AdminMessageModal() {
	const context = useContext(GlobalContext);
	const [duration, setDuration] = useState(5000);
	const [message, setMessage] = useState('');
	const [destination, setDestination] = useState<'screen' | 'users' | 'all'>('screen');

	const onClick = () => {
		if (message.length === 0) {
			return;
		}
		const defaultDuration = 5000; // 5 seconds
		const msgData = {
			message: message,
			destination: destination,
			duration: !duration || isNaN(duration) ? defaultDuration : duration,
		};
		commandBackend('displayPlayerMessage', msgData);
		closeModal(context.globalDispatch);
	};

	const keyObserverHandler = (e: KeyboardEvent) => {
		if (e.code === 'Enter') {
			onClick();
		}
		if (e.code === 'Escape') {
			closeModal(context.globalDispatch);
		}
	};

	useEffect(() => {
		document.addEventListener('keyup', keyObserverHandler);
		return () => {
			document.removeEventListener('keyup', keyObserverHandler);
		};
	}, []);

	return (
		<div className="modal modalPage">
			<div className="modal-dialog">
				<div className="modal-content">
					<ul className="modal-header">
						<h4 className="modal-title">{i18next.t('ADMIN_MESSAGE.ESSENTIAL_MESSAGE')}</h4>
						<button
							className="closeModal"
							onClick={() => {
								closeModal(context.globalDispatch);
							}}
						>
							<i className="fas fa-times" />
						</button>
					</ul>
					<div className="modal-body admin-message">
						<div className="dest-duration">
							<select
								name="destination"
								onChange={(e) => setDestination(e.target.value as 'screen' | 'users' | 'all')}
							>
								<option value="screen">{i18next.t('ADMIN_MESSAGE.CL_SCREEN')}</option>
								<option value="users">{i18next.t('ADMIN_MESSAGE.CL_USERS')}</option>
								<option value="all">{i18next.t('ADMIN_MESSAGE.CL_ALL')}</option>
							</select>
							<input
								type="number"
								data-exclude="true"
								min="0"
								className="duration"
								placeholder={i18next.t('ADMIN_MESSAGE.DURATION')}
								onChange={(e) => setDuration(Number(e.target.value) * 1000)}
							/>
						</div>
						<input
							type="text"
							className="message"
							placeholder={i18next.t('ADMIN_MESSAGE.MESSAGE')}
							onChange={(e) => setMessage(e.target.value)}
						/>
						<button className="btn btn-default confirm" onClick={onClick}>
							{message.length === 0 ? (
								<i className="fas fa-fw fa-exclamation-triangle" />
							) : (
								<i className="fas fa-check" />
							)}
							&nbsp;
							{message.length === 0
								? i18next.t('ADMIN_MESSAGE.EMPTY')
								: i18next.t('ADMIN_MESSAGE.CONFIRM')}
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}

export default AdminMessageModal;
