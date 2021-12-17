import './UsersModal.scss';

import i18next from 'i18next';
import { useContext, useEffect, useState } from 'react';

import { User } from '../../../../../src/lib/types/user';
import { closeModal } from '../../../store/actions/modal';
import GlobalContext from '../../../store/context';
import ProfilePicture from '../../../utils/components/ProfilePicture';
import { getCountryName } from '../../../utils/isoLanguages';
import { commandBackend } from '../../../utils/socket';

interface IProps {
	scope?: 'public' | 'admin';
	closeModal?: () => void;
}

function UsersModal(props: IProps) {
	const context = useContext(GlobalContext);
	const [users, setUsers] = useState<User[]>([]);
	const [userDetails, setUserDetails] = useState<User>();

	const getUserList = async () => {
		const response = await commandBackend('getUsers');
		setUsers(response.filter((a: User) => a.flag_logged_in));
	};

	const getUserDetails = async (user: User) => {
		if (userDetails?.login === user.login) {
			setUserDetails(undefined);
		} else if (user.type !== 2) {
			try {
				const response = await commandBackend('getUser', { username: user.login });
				setUserDetails(response);
			} catch (e) {
				// already display
			}
		}
	};

	const closeModalWithContext = () => {
		if (props.scope === 'public') {
			props.closeModal();
		} else {
			closeModal(context.globalDispatch);
		}
	};

	const keyObserverHandler = (e: KeyboardEvent) => {
		if (e.code === 'Escape') {
			closeModalWithContext();
		}
	};

	useEffect(() => {
		if (
			context?.globalState.auth.data.role === 'admin' ||
			context?.globalState.settings.data.config?.Frontend?.Mode !== 0
		) {
			getUserList();
		}
		document.addEventListener('keyup', keyObserverHandler);
		return () => {
			document.removeEventListener('keyup', keyObserverHandler);
		};
	}, []);

	const body = (
		<div className="modal-content">
			<div className={`modal-header${props.scope === 'public' ? ' public-modal' : ''}`}>
				{props.scope === 'public' ? (
					<button className="closeModal" type="button" onClick={closeModalWithContext}>
						<i className="fas fa-arrow-left" />
					</button>
				) : null}
				<h4 className="modal-title">{i18next.t('USERLIST')}</h4>
				{props.scope === 'admin' ? ( // aka. it's a modal, otherwise it's a page and close button is not needed
					<button className="closeModal" onClick={closeModalWithContext}>
						<i className="fas fa-fw fa-times" />
					</button>
				) : null}
			</div>
			<div id="nav-userlist" className="modal-body">
				<div className="userlist list-group">
					{users.map(user => {
						return (
							<li
								key={user.login}
								className={user.flag_logged_in ? 'list-group-item online' : 'list-group-item'}
							>
								<div className="userLine" onClick={() => getUserDetails(user)}>
									<ProfilePicture user={user} className="img-circle avatar" />
									<span className="nickname">{user.nickname}</span>
								</div>
								{userDetails?.login === user.login ? (
									<div className="userDetails">
										{userDetails?.url ? (
											<div>
												<i className="fas fa-fw fa-link" />
												<a href={userDetails.url} rel="noreferrer" target="_blank">
													{userDetails.url}
												</a>
											</div>
										) : null}
										{userDetails?.bio ? (
											<div>
												<i className="fas fa-fw fa-pen" />
												{userDetails.bio}
											</div>
										) : null}
										{userDetails?.location ? (
											<div>
												<i className="fas fa-fw fa-globe" />
												{getCountryName(userDetails.location)}
											</div>
										) : null}
										{userDetails?.social_networks.discord ? (
											<div>
												<i className="fab fa-fw fa-discord" />
												{userDetails.social_networks.discord}
											</div>
										) : null}
										{userDetails?.social_networks.twitter ? (
											<div>
												<i className="fab fa-fw fa-twitter" />
												<a
													href={`https://twitter.com/${userDetails.social_networks.twitter}`}
													rel="noreferrer"
													target="_blank"
												>
													{userDetails.social_networks.twitter}
												</a>
											</div>
										) : null}
										{userDetails?.social_networks.instagram ? (
											<div>
												<i className="fab fa-fw fa-instagram" />
												<a
													href={`https://instagram.com/${userDetails.social_networks.instagram}`}
													rel="noreferrer"
													target="_blank"
												>
													{userDetails.social_networks.instagram}
												</a>
											</div>
										) : null}
										{userDetails?.social_networks.twitch ? (
											<div>
												<i className="fab fa-fw fa-twitch" />
												<a
													href={`https://twitch.tv/${userDetails.social_networks.twitch}`}
													rel="noreferrer"
													target="_blank"
												>
													{userDetails.social_networks.twitch}
												</a>
											</div>
										) : null}
									</div>
								) : null}
							</li>
						);
					})}
				</div>
			</div>
		</div>
	);
	return props.scope === 'public' ? (
		body
	) : (
		<div className="modal modalPage">
			<div className="modal-dialog">{body}</div>
		</div>
	);
}

export default UsersModal;
