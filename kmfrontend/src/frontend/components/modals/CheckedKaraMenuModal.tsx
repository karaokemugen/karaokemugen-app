import './KaraMenuModal.scss';

import i18next from 'i18next';
import { useContext, useEffect, useState } from 'react';

import GlobalContext from '../../../store/context';
import { getOppositePlaylistInfo, getPlaylistInfo } from '../../../utils/kara';
import { commandBackend } from '../../../utils/socket';
import { displayMessage, is_touch_device, isNonStandardPlaylist, nonStandardPlaylists } from '../../../utils/tools';
import { KaraElement } from '../../types/kara';

interface IProps {
	checkedKaras: KaraElement[];
	side: 'left' | 'right';
	topKaraMenu: number;
	leftKaraMenu: number;
	closeKaraMenu: () => void;
	transferKara: (event: any, pos?: number) => void;
}

function CheckedKaraMenuModal(props: IProps) {
	const context = useContext(GlobalContext);
	const [effectFavorite, setEffectFavorite] = useState(false);
	const [effectBlacklist, setEffectBlacklist] = useState(false);
	const [effectWhitelist, setEffectWhitelist] = useState(false);
	const [effectFree, setEffectFree] = useState(false);
	const [effectVisibility, setEffectVisibility] = useState(false);

	const freeKara = async () => {
		if (props.checkedKaras.length === 0) {
			displayMessage('warning', i18next.t('SELECT_KARAS_REQUIRED'));
			return;
		}
		try {
			await commandBackend('editPLC', {
				plc_ids: props.checkedKaras.map(a => a.plcid),
				flag_free: true,
			});
			setEffectFree(true);
			setTimeout(props.closeKaraMenu, 350);
		} catch (e) {
			//already display
		}
	};

	const changeVisibilityKaraOn = () => {
		try {
			commandBackend('editPLC', {
				plc_ids: props.checkedKaras.map(a => a.plcid),
				flag_visible: true,
			});
			setEffectVisibility(true);
			setTimeout(props.closeKaraMenu, 350);
		} catch (e) {
			//already display
		}
	};

	const changeVisibilityKaraOff = () => {
		try {
			commandBackend('editPLC', {
				plc_ids: props.checkedKaras.map(a => a.plcid),
				flag_visible: false,
			});
			setEffectVisibility(true);
			setTimeout(props.closeKaraMenu, 350);
		} catch (e) {
			//already display
		}
	};

	const makeFavorite = () => {
		try {
			commandBackend('addFavorites', {
				kids: props.checkedKaras.map(a => a.kid),
			});
			setEffectFavorite(true);
			setTimeout(props.closeKaraMenu, 350);
		} catch (e) {
			//already display
		}
	};

	const addToBlacklist = () => {
		const playlist = getPlaylistInfo(props.side, context);
		try {
			commandBackend('addCriterias', {
				criterias: props.checkedKaras.map(a => {
					return { type: 1001, value: a.kid, plaid: playlist.plaid };
				}),
			});
			setEffectBlacklist(true);
			setTimeout(props.closeKaraMenu, 350);
		} catch (e) {
			//already display
		}
	};

	const addToWhitelist = () => {
		const playlist = getPlaylistInfo(props.side, context);
		try {
			commandBackend('addCriterias', {
				criterias: props.checkedKaras.map(a => {
					return { type: 1001, value: a.kid, plaid: playlist.plaid };
				}),
			});
			setEffectWhitelist(true);
			setTimeout(props.closeKaraMenu, 350);
		} catch (e) {
			//already display
		}
	};

	const handleClick = (e: MouseEvent) => {
		if (!(e.target as Element).closest('#modal') && !(e.target as Element).closest('.karaLineButton')) {
			e.preventDefault();
			props.closeKaraMenu();
		}
	};

	useEffect(() => {
		document.getElementById('root').addEventListener('click', handleClick);
		return () => {
			document.getElementById('root').removeEventListener('click', handleClick);
		};
	}, []);

	const playlist = getPlaylistInfo(props.side, context);
	const oppositePlaylist = getOppositePlaylistInfo(props.side, context);
	return (
		<ul
			className="dropdown-menu"
			style={{
				position: 'absolute',
				zIndex: 9998,
				bottom:
					window.innerHeight < props.topKaraMenu + 250
						? window.innerHeight - props.topKaraMenu + (is_touch_device() ? 65 : 35)
						: undefined,
				top: window.innerHeight < props.topKaraMenu + 250 ? undefined : props.topKaraMenu,
				left: window.innerWidth < props.leftKaraMenu + 250 ? window.innerWidth - 250 : props.leftKaraMenu,
			}}
		>
			{!isNonStandardPlaylist(oppositePlaylist.plaid) && !isNonStandardPlaylist(playlist.plaid) ? (
				<li>
					<a
						href="#"
						onClick={event => {
							props.transferKara(event);
							props.closeKaraMenu();
						}}
					>
						<i className={`fas fa-fw fa-long-arrow-alt-${props.side === 'left' ? 'right' : 'left'}`} />
						&nbsp;
						{i18next.t('KARA_MENU.TRANSFER_SELECT_KARA')}
					</a>
				</li>
			) : null}
			{!isNonStandardPlaylist(oppositePlaylist.plaid) && !isNonStandardPlaylist(playlist.plaid) ? (
				<li>
					<a
						href="#"
						onClick={event => {
							props.transferKara(event, -1);
							props.closeKaraMenu();
						}}
					>
						<i className="fas fa-fw fa-exchange-alt" />
						&nbsp;
						{i18next.t('KARA_MENU.TRANSFER_SELECT_KARA_AFTER_PLAYING')}
					</a>
				</li>
			) : null}
			{playlist.plaid !== nonStandardPlaylists.favorites ? (
				<li className="animate-button-container">
					<a href="#" onClick={makeFavorite}>
						<i className="fas fa-star" />
						&nbsp;
						{i18next.t('KARA_MENU.FAV')}
					</a>
					<a href="#" className={`animate-button-success${effectFavorite ? ' activate' : ''}`}>
						<i className="fas fa-fw fa-check-square" />
						&nbsp;
						{i18next.t('KARA_MENU.FAVORITES_ADDED')}
					</a>
				</li>
			) : null}
			{playlist.flag_current || playlist.flag_public ? (
				<li className="animate-button-container">
					<a href="#" onClick={freeKara} title={i18next.t('KARA_MENU.FREE')}>
						<i className="fas fa-gift" />
						&nbsp;
						{i18next.t('KARA_MENU.FREE_SHORT')}
					</a>
					<a href="#" className={`animate-button-success${effectFree ? ' activate' : ''}`}>
						<i className="fas fa-fw fa-check-square" />
						&nbsp;
						{i18next.t('KARA_MENU.FREED')}
					</a>
				</li>
			) : null}
			{!isNonStandardPlaylist(playlist.plaid) ? (
				<li className="animate-button-container">
					<a href="#" onClick={changeVisibilityKaraOn} title={i18next.t('KARA_MENU.VISIBLE_ON')}>
						<i className="fas fa-eye" />
						&nbsp;
						{i18next.t('KARA_MENU.VISIBLE_ON_SHORT')}
					</a>
					<a href="#" className={`animate-button-success${effectVisibility ? ' activate' : ''}`}>
						<i className="fas fa-fw fa-check-square" />
						&nbsp;
						{i18next.t('KARA_MENU.SHOWN')}
					</a>
				</li>
			) : null}
			{!isNonStandardPlaylist(playlist.plaid) ? (
				<li className="animate-button-container">
					<a href="#" onClick={changeVisibilityKaraOff} title={i18next.t('KARA_MENU.VISIBLE_OFF')}>
						<i className="fas fa-eye-slash" />
						&nbsp;
						{i18next.t('KARA_MENU.VISIBLE_OFF_SHORT')}
					</a>
					<a href="#" className={`animate-button-success${effectVisibility ? ' activate' : ''}`}>
						<i className="fas fa-fw fa-check-square" />
						&nbsp;
						{i18next.t('KARA_MENU.HIDDEN')}
					</a>
				</li>
			) : null}
			{!playlist.flag_blacklist ? (
				<li className="animate-button-container">
					<a href="#" onClick={addToBlacklist}>
						<i className="fas fa-ban" />
						&nbsp;
						{i18next.t('KARA_MENU.ADD_BLACKLIST')}
					</a>
					<a href="#" className={`animate-button-success${effectBlacklist ? ' activate' : ''}`}>
						<i className="fas fa-fw fa-check-square" />
						&nbsp;
						{i18next.t('KARA_MENU.BLACKLISTED')}
					</a>
				</li>
			) : null}
			{!playlist.flag_whitelist ? (
				<li className="animate-button-container">
					<a href="#" onClick={addToWhitelist}>
						<i className="fas fa-check-circle" />
						&nbsp;
						{i18next.t('KARA_MENU.ADD_WHITELIST')}
					</a>
					<a href="#" className={`animate-button-success${effectWhitelist ? ' activate' : ''}`}>
						<i className="fas fa-fw fa-check-square" />
						&nbsp;
						{i18next.t('KARA_MENU.WHITELISTED')}
					</a>
				</li>
			) : null}
		</ul>
	);
}

export default CheckedKaraMenuModal;
