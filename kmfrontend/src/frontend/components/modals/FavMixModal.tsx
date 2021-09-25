import './FavMixModal.scss';

import i18next from 'i18next';
import React, { MouseEvent, useContext,useState } from 'react';

import { User } from '../../../../../src/lib/types/user';
import { closeModal } from '../../../store/actions/modal';
import GlobalContext from '../../../store/context';
import { setPlaylistInfo } from '../../../utils/kara';
import { commandBackend } from '../../../utils/socket';

interface IProps {
	userList: User[];
	side: 'left' | 'right'
}

function FavMixModal(props: IProps) {
	const context = useContext(GlobalContext);
	const [duration, setDuration] = useState(0);
	const [userList, setUserList] = useState(props.userList);

	const onClick = async () => {
		if (duration === 0 || userList.filter(value => value.flag_online).length === 0) return;
		const userlistStr = userList.filter(value => value.flag_online).map(value => value.login);
		const data = { duration: duration !== 0 ? duration : 200, users: userlistStr };
		const res = await commandBackend('createAutomix', data);
		setPlaylistInfo(props.side, context, res.plaid);
		closeModalWithContext();
	};

	const closeModalWithContext = () => closeModal(context.globalDispatch);

	const onClickOutsideModal = (e: MouseEvent) => {
		const el = document.getElementsByClassName('modal-dialog')[0];
		if (!el.contains((e.target as Node))) {
			closeModalWithContext();
		}
	};

	return (
		<div className="modal modalPage" onClick={onClickOutsideModal}>
			<div className="modal-dialog">
				<div className="modal-content">
					<ul className="modal-header">
						<h4 className="modal-title">{i18next.t('AUTOMIX_MODAL.TITLE')}</h4>
						<button className="closeModal"
							onClick={closeModalWithContext}>
							<i className="fas fa-times" />
						</button>
					</ul>
					<div className="modal-body">
						<p className="autoMixExplanation">{i18next.t('AUTOMIX_MODAL.DESCRIPTION')}</p>
						<div className="autoMixUserlist">
							{userList.map(k =>
								<div key={k.nickname} className="checkbox">
									<label>
										<input type="checkbox" defaultChecked={k.flag_online}
											onChange={e => {
												k.flag_online = e.target.checked;
												setUserList(userList);
											}} />
										{k.nickname}
									</label>
								</div>
							)}
						</div>
						<input type="number" min="0" name="duration" onChange={e => setDuration(Number(e.target.value))}
							placeholder={i18next.t('AUTOMIX_MODAL.DURATION')} />
						<button className="btn btn-default confirm" onClick={onClick}>
							{duration === 0 || userList.filter(value => value.flag_online).length === 0 ? <>
								<i className="fas fa-fw fa-exclamation-triangle" /> {i18next.t('AUTOMIX_MODAL.EMPTY')}
							</> : <>
								<i className="fas fa-fw fa-check" /> {i18next.t('AUTOMIX_MODAL.MIX')}
							</>}
						</button>
					</div >
				</div >
			</div >
		</div >
	);
}

export default FavMixModal;
