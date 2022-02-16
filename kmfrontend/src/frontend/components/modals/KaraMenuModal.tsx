import './KaraMenuModal.scss';

import i18next from 'i18next';
import { useContext, useEffect, useState } from 'react';

import GlobalContext from '../../../store/context';
import { getOppositePlaylistInfo, getPlaylistInfo } from '../../../utils/kara';
import { commandBackend } from '../../../utils/socket';
import { is_touch_device, isNonStandardPlaylist, nonStandardPlaylists } from '../../../utils/tools';
import { KaraElement } from '../../types/kara';

interface IProps {
	kara: KaraElement;
	side: 'left' | 'right';
	topKaraMenu: number;
	leftKaraMenu: number;
	closeKaraMenu: () => void;
	transferKara: (event: any, pos?: number) => void;
}

function KaraMenuModal(props: IProps) {
	const context = useContext(GlobalContext);
	const [kara, setKara] = useState(props.kara);
	const [effectFavorite, setEffectFavorite] = useState(false);
	const [effectBlacklist, setEffectBlacklist] = useState(false);
	const [effectWhitelist, setEffectWhitelist] = useState(false);
	const [effectFree, setEffectFree] = useState(false);
	const [effectVisibility, setEffectVisibility] = useState(false);

	const getKaraDetail = async () => {
		try {
			let url;
			let data;
			const playlist = getPlaylistInfo(props.side, context);
			if (playlist && isNonStandardPlaylist(playlist.plaid)) {
				url = 'getKara';
				data = { kid: props.kara.kid };
			} else {
				url = 'getPLC';
				data = {
					plaid: playlist.plaid,
					plc_id: props.kara.plcid,
				};
			}
			const response = await commandBackend(url, data);
			setKara(response);
			document.getElementById('root').addEventListener('click', handleClick);
		} catch (err) {
			props.closeKaraMenu();
		}
	};

	const freeKara = () => {
		try {
			commandBackend('editPLC', {
				plc_ids: [kara?.plcid],
				flag_free: true,
			});
			setEffectFree(true);
			setTimeout(props.closeKaraMenu, 350);
		} catch (e) {
			// already display
		}
	};

	const changeVisibilityKara = () => {
		try {
			commandBackend('editPLC', {
				plc_ids: [kara?.plcid],
				flag_visible: !kara?.flag_visible,
			});
			setEffectVisibility(true);
			setTimeout(props.closeKaraMenu, 350);
		} catch (e) {
			// already display
		}
	};

	const makeFavorite = () => {
		try {
			kara?.flag_favorites
				? commandBackend('deleteFavorites', {
						kids: [kara?.kid],
				  })
				: commandBackend('addFavorites', {
						kids: [kara?.kid],
				  });
			setEffectFavorite(true);
			setTimeout(props.closeKaraMenu, 350);
		} catch (e) {
			// already display
		}
	};

	const addToBlacklist = () => {
		try {
			commandBackend('addCriterias', {
				criterias: [
					{
						type: 1001,
						value: kara?.kid,
						plaid: context.globalState.settings.data.state.blacklistPlaid,
					},
				],
			});
			setEffectBlacklist(true);
			setTimeout(props.closeKaraMenu, 350);
		} catch (e) {
			// already display
		}
	};

	const addToWhitelist = () => {
		try {
			commandBackend('addCriterias', {
				criterias: [
					{
						type: 1001,
						value: kara?.kid,
						plaid: context.globalState.settings.data.state.whitelistPlaid,
					},
				],
			});
			setEffectWhitelist(false);
			setTimeout(props.closeKaraMenu, 350);
		} catch (e) {
			// already display
		}
	};

	const handleClick = (e: MouseEvent) => {
		if (!(e.target as Element).closest('#modal') && !(e.target as Element).closest('.karaLineButton')) {
			e.preventDefault();
			props.closeKaraMenu();
		}
	};

	useEffect(() => {
		getKaraDetail();
		return () => {
			document.getElementById('root').removeEventListener('click', handleClick);
		};
	}, []);

	const playlist = getPlaylistInfo(props.side, context);
	const oppositePlaylist = getOppositePlaylistInfo(props.side, context);
	return kara ? (
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
						{i18next.t('KARA_MENU.TRANSFER_KARA')}
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
						{i18next.t('KARA_MENU.TRANSFER_KARA_AFTER_PLAYING')}
					</a>
				</li>
			) : null}
			{!isNonStandardPlaylist(playlist.plaid) && !props.kara?.flag_playing ? (
				<li>
					<a
						href="#"
						onClick={() => {
							try {
								commandBackend('editPLC', {
									pos: -1,
									plc_ids: [props.kara.plcid],
								});
								props.closeKaraMenu();
							} catch (e) {
								// already display
							}
						}}
					>
						<i className="fas fa-fw fa-level-up-alt" />
						&nbsp;
						{i18next.t('KARA_MENU.MOVE_KARA')}
					</a>
				</li>
			) : null}
			{playlist.plaid !== nonStandardPlaylists.favorites ? (
				<li className="animate-button-container">
					<a href="#" onClick={makeFavorite}>
						<i className="fas fa-fw fa-star" />
						&nbsp;
						{kara.flag_favorites ? i18next.t('KARA_MENU.FAV_DEL') : i18next.t('KARA_MENU.FAV')}
					</a>
					<a href="#" className={`animate-button-success${effectFavorite ? ' activate' : ''}`}>
						<i className="fas fa-fw fa-check-square" />
						&nbsp;
						{kara.flag_favorites
							? i18next.t('KARA_MENU.FAVORITES_REMOVED')
							: i18next.t('KARA_MENU.FAVORITES_ADDED')}
					</a>
				</li>
			) : null}
			{(playlist.flag_current || playlist.flag_public) && !kara.flag_free ? (
				<li className="animate-button-container">
					<a href="#" onClick={freeKara} title={i18next.t('KARA_MENU.FREE')}>
						<i className="fas fa-fw fa-gift" />
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
					<a
						href="#"
						onClick={changeVisibilityKara}
						title={
							kara.flag_visible ? i18next.t('KARA_MENU.VISIBLE_OFF') : i18next.t('KARA_MENU.VISIBLE_ON')
						}
					>
						{kara.flag_visible ? (
							<>
								<i className="fas fa-fw fa-eye-slash" />
								&nbsp;
								{i18next.t('KARA_MENU.VISIBLE_OFF_SHORT')}
							</>
						) : (
							<>
								<i className="fas fa-fw fa-eye" />
								&nbsp;
								{i18next.t('KARA_MENU.VISIBLE_ON_SHORT')}
							</>
						)}
					</a>
					<a href="#" className={`animate-button-success${effectVisibility ? ' activate' : ''}`}>
						<i className="fas fa-fw fa-check-square" />
						&nbsp;
						{kara.flag_visible ? i18next.t('KARA_MENU.HIDDEN') : i18next.t('KARA_MENU.SHOWN')}
					</a>
				</li>
			) : null}
			{playlist.plaid !== context.globalState.settings.data.state.blacklistPlaid ? (
				<li className="animate-button-container">
					<a href="#" onClick={addToBlacklist}>
						<i className="fas fa-fw fa-ban" />
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
			{playlist.plaid !== context.globalState.settings.data.state.whitelistPlaid ? (
				<li className="animate-button-container">
					<a href="#" onClick={addToWhitelist}>
						<i className="fas fa-fw fa-check-circle" />
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
	) : null;
}

export default KaraMenuModal;
