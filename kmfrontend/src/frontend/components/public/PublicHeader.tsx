import './PublicHeader.scss';

import i18next from 'i18next';
import { useContext, useEffect, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import ResizeObserver from 'resize-observer-polyfill';

import nanamiPNG from '../../../assets/nanami.png';
import nanamiWebP from '../../../assets/nanami.webp';
import { logout } from '../../../store/actions/auth';
import GlobalContext from '../../../store/context';
import ProfilePicture from '../../../utils/components/ProfilePicture';
import { useResizeListener } from '../../../utils/hooks';
import { commandBackend, getSocket } from '../../../utils/socket';
import { displayMessage, secondsTimeSpanToHMS } from '../../../utils/tools';

interface IProps {
	onResize: (top: string) => void;
	publicVisible: boolean;
	currentVisible: boolean;
}

function PublicHeader(props: IProps) {
	const navigate = useNavigate();
	const context = useContext(GlobalContext);
	let observer: ResizeObserver;
	const [dropDownMenu, setDropDownMenu] = useState(false);
	const [quotaType, setQuotaType] = useState<number>();
	const [quotaLeft, setQuotaLeft] = useState<number>();
	const ref = useRef<HTMLElement>();

	const toggleProfileModal = e => {
		e.preventDefault();
		setDropDownMenu(false);
		if (context.globalState.auth.data.onlineAvailable !== false) {
			navigate('/public/user');
		} else {
			displayMessage('warning', i18next.t('ERROR_CODES.USER_ONLINE_NOINTERNET'), 5000);
		}
	};

	const toggleUsersModal = e => {
		e.preventDefault();
		setDropDownMenu(false);
		navigate('/public/users');
	};

	const goToFavorites = e => {
		e.preventDefault();
		setDropDownMenu(false);
		navigate('/public/favorites');
	};

	const updateQuotaAvailable = (data: { username: string; quotaType: number; quotaLeft: number }) => {
		if (context.globalState.auth.data.username === data.username) {
			if (data.quotaLeft > 0 && quotaLeft === 0) {
				displayMessage('info', i18next.t('QUOTA_AVAILABLE'));
			}
			setQuotaType(data.quotaType);
			setQuotaLeft(data.quotaLeft);
		}
	};

	const resizeCheck = () => {
		if (ref?.current) {
			props.onResize(`${ref.current.scrollHeight}px`);
		}
	};

	useEffect(() => {
		getSocket().on('quotaAvailableUpdated', updateQuotaAvailable);
		// This will emit a quotaAvailableUpdated event
		commandBackend('refreshUserQuotas');
		props.onResize(`${ref.current.scrollHeight}px`);
		observer = new ResizeObserver(resizeCheck);
		observer.observe(document.getElementById('menu-supp-root'));
		return () => {
			getSocket().off('quotaAvailableUpdated', updateQuotaAvailable);
			observer.disconnect();
		};
	}, []);

	useResizeListener(resizeCheck);

	return (
		<header
			className="menu-container"
			style={{ ['--img' as any]: context.globalState.frontendContext.backgroundImg }}
			ref={ref}
		>
			<div className="menu">
				<a
					href="/public"
					className="nanamin-logo"
					onClick={e => {
						e.preventDefault();
						navigate('/public/');
					}}
				>
					<picture>
						<source srcSet={nanamiWebP} type="image/webp" />
						<source srcSet={nanamiPNG} type="image/png" />
						<img src={nanamiPNG} alt="Nanamin logo" />
					</picture>
				</a>
				<div className="menu-bar">
					{props.currentVisible ? (
						<Link className="green" to="/public/playlist/current">
							<i className="fas fa-fw fa-play-circle fa-2x" />
							{i18next.t('PUBLIC_HOMEPAGE.NEXT')}
						</Link>
					) : null}
					{props.publicVisible &&
					context.globalState.settings.data.state.currentPlaid !==
						context.globalState.settings.data.state.publicPlaid ? (
						<Link className="orange" to="/public/playlist/public">
							<i className="fas fa-fw fa-globe fa-2x" />
							{i18next.t('PUBLIC_HOMEPAGE.PUBLIC_SUGGESTIONS_SHORT')}
						</Link>
					) : null}
					{context?.globalState.settings.data.config?.Frontend?.Mode === 2 ? (
						<Link className="blue" to="/public/search">
							<i className="fas fa-fw fa-search fa-2x" />
							{i18next.t('PUBLIC_HOMEPAGE.SONG_SEARCH_SHORT')}
						</Link>
					) : null}
				</div>
				{quotaType > 0 ? (
					<div className={`quota-bar${quotaLeft <= 5 ? ' exhaust' : ''}`}>
						{quotaType === 1 ? i18next.t('QUOTA_KARA') : i18next.t('QUOTA_TIME')}
						&nbsp;:&nbsp;
						{quotaLeft === -1 ? '∞' : quotaType === 2 ? secondsTimeSpanToHMS(quotaLeft, 'ms') : quotaLeft}
					</div>
				) : null}
				<div className="profile-btn">
					<div className="dropdown-container">
						<div
							className={`closeHandler${dropDownMenu ? ' active' : ''}`}
							onClick={() => setDropDownMenu(false)}
						/>
						<a href="#" onClick={() => setDropDownMenu(!dropDownMenu)}>
							<ProfilePicture user={context.globalState.settings.data.user} />
						</a>
						<div className={`dropdown ${dropDownMenu ? 'active' : ''}`}>
							<div className="header">{context.globalState.settings.data.user.nickname}</div>
							{quotaType === 1 ? (
								<div className="info">
									{i18next.t('QUOTA_KARA')}
									&nbsp;:&nbsp;
									<span className="data">{quotaLeft === -1 ? '∞' : quotaLeft}</span>
								</div>
							) : null}
							{quotaType === 2 ? (
								<div className="info">
									<div className="title">{i18next.t('QUOTA_TIME')}&nbsp;:&nbsp;</div>
									<div className="data">
										{quotaLeft === -1 ? '∞' : secondsTimeSpanToHMS(quotaLeft, 'ms')}
									</div>
								</div>
							) : null}
							{context?.globalState.auth.data.role !== 'guest' ? (
								<>
									<div className="link">
										<a href="/public/favorites" onClick={goToFavorites}>
											<i className="fas fa-fw fa-star" /> {i18next.t('VIEW_FAVORITES')}
										</a>
									</div>
									<div className="link">
										<a href="/public/user" onClick={toggleProfileModal}>
											<i className="fas fa-fw fa-user" /> {i18next.t('PROFILE')}
										</a>
									</div>
								</>
							) : null}
							<div className="link">
								<a href="/public/users" onClick={toggleUsersModal}>
									<i className="fas fa-fw fa-users" /> {i18next.t('USERLIST')}
								</a>
							</div>
							{context?.globalState.auth.data.role === 'admin' ? (
								<div className="link">
									<a href="/welcome">
										<i className="fas fa-fw fa-home" /> {i18next.t('CHANGE_INTERFACE')}
									</a>
								</div>
							) : null}
							<div className="link">
								<a
									href="/login"
									onClick={e => {
										e.preventDefault();
										logout(context.globalDispatch);
									}}
								>
									<i className="fas fa-fw fa-sign-out-alt" /> {i18next.t('LOGOUT')}
								</a>
							</div>
						</div>
					</div>
				</div>
			</div>
			<div id="menu-supp-root" />
		</header>
	);
}

export default PublicHeader;
