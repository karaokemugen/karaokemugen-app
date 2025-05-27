import './KaraMenuModal.scss';

import i18next from 'i18next';
import { useContext, useEffect, useState } from 'react';

import GlobalContext from '../../../store/context';
import { getOppositePlaylistInfo, getPlaylistInfo } from '../../../utils/kara';
import { commandBackend } from '../../../utils/socket';
import { is_touch_device, isNonStandardPlaylist, nonStandardPlaylists } from '../../../utils/tools';
import { KaraElement } from '../../types/kara';
import { WS_CMD } from '../../../utils/ws';
import { DBKara } from '../../../../../src/lib/types/database/kara';
import { WSCmdDefinition } from '../../../../../src/lib/types/frontend';

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
	const [effectShuffle, setEffectShuffle] = useState(false);

	const getKaraDetail = async () => {
		try {
			let url: WSCmdDefinition<object, DBKara>;
			let data;
			const playlist = getPlaylistInfo(props.side, context);
			if (playlist && isNonStandardPlaylist(playlist.plaid)) {
				url = WS_CMD.GET_KARA;
				data = { kid: props.kara.kid };
			} else {
				url = WS_CMD.GET_PLC;
				data = {
					plc_id: props.kara.plcid,
				};
			}
			const response = await commandBackend(url, data);
			setKara(response);
			document.getElementById('root').addEventListener('click', handleClick);
		} catch (_) {
			props.closeKaraMenu();
		}
	};

	const freeKara = () => {
		try {
			commandBackend(WS_CMD.EDIT_PLC, {
				plc_ids: [kara?.plcid],
				flag_free: true,
			});
			setEffectFree(true);
			setTimeout(props.closeKaraMenu, 350);
		} catch (_) {
			// already display
		}
	};

	const changeVisibilityKara = () => {
		try {
			commandBackend(WS_CMD.EDIT_PLC, {
				plc_ids: [kara?.plcid],
				flag_visible: !kara?.flag_visible,
			});
			setEffectVisibility(true);
			setTimeout(props.closeKaraMenu, 350);
		} catch (_) {
			// already display
		}
	};

	const makeFavorite = () => {
		try {
			commandBackend(kara?.flag_favorites ? WS_CMD.DELETE_FAVORITES : WS_CMD.ADD_FAVORITES, {
				kids: [kara?.kid],
			});
			setEffectFavorite(true);
			setTimeout(props.closeKaraMenu, 350);
		} catch (_) {
			// already display
		}
	};

	const addToBlacklist = () => {
		try {
			commandBackend(WS_CMD.ADD_CRITERIAS, {
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
		} catch (_) {
			// already display
		}
	};

	const addToWhitelist = () => {
		try {
			commandBackend(WS_CMD.ADD_CRITERIAS, {
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
		} catch (_) {
			// already display
		}
	};

	const shuffleSongs = () => {
		try {
			commandBackend(
				WS_CMD.RANDOMIZE_PLC,
				{
					plc_ids: [kara?.plcid],
				},
				false,
				60000
			);
			setEffectShuffle(true);
			setTimeout(props.closeKaraMenu, 350);
		} catch (_) {
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
					<div
						onClick={event => {
							props.transferKara(event);
							props.closeKaraMenu();
						}}
					>
						<i className={`fas fa-fw fa-long-arrow-alt-${props.side === 'left' ? 'right' : 'left'}`} />
						&nbsp;
						{i18next.t('KARA_MENU.TRANSFER_KARA')}
					</div>
				</li>
			) : null}
			{!isNonStandardPlaylist(oppositePlaylist.plaid) && !isNonStandardPlaylist(playlist.plaid) ? (
				<li>
					<div
						onClick={event => {
							props.transferKara(event, -1);
							props.closeKaraMenu();
						}}
					>
						<i className="fas fa-fw fa-exchange-alt" />
						&nbsp;
						{i18next.t('KARA_MENU.TRANSFER_KARA_AFTER_PLAYING')}
					</div>
				</li>
			) : null}
			{!isNonStandardPlaylist(playlist.plaid) && !props.kara?.flag_playing ? (
				<li>
					<div
						onClick={() => {
							try {
								commandBackend(WS_CMD.EDIT_PLC, {
									pos: -1,
									plc_ids: [props.kara.plcid],
								});
								props.closeKaraMenu();
							} catch (_) {
								// already display
							}
						}}
					>
						<i className="fas fa-fw fa-level-up-alt" />
						&nbsp;
						{i18next.t('KARA_MENU.MOVE_KARA')}
					</div>
				</li>
			) : null}
			{playlist.plaid !== nonStandardPlaylists.favorites ? (
				<li className="animate-button-container">
					<div onClick={makeFavorite}>
						<i className="fas fa-fw fa-star" />
						&nbsp;
						{kara.flag_favorites ? i18next.t('KARA_MENU.FAV_DEL') : i18next.t('KARA_MENU.FAV')}
					</div>
					<div className={`animate-button-success${effectFavorite ? ' activate' : ''}`}>
						<i className="fas fa-fw fa-check-square" />
						&nbsp;
						{kara.flag_favorites
							? i18next.t('KARA_MENU.FAVORITES_REMOVED')
							: i18next.t('KARA_MENU.FAVORITES_ADDED')}
					</div>
				</li>
			) : null}
			{(playlist.flag_current || playlist.flag_public) && !kara.flag_free ? (
				<li className="animate-button-container">
					<div onClick={freeKara} title={i18next.t('KARA_MENU.FREE')}>
						<i className="fas fa-fw fa-gift" />
						&nbsp;
						{i18next.t('KARA_MENU.FREE_SHORT')}
					</div>
					<div className={`animate-button-success${effectFree ? ' activate' : ''}`}>
						<i className="fas fa-fw fa-check-square" />
						&nbsp;
						{i18next.t('KARA_MENU.FREED')}
					</div>
				</li>
			) : null}
			{!isNonStandardPlaylist(playlist.plaid) ? (
				<li className="animate-button-container">
					<div
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
					</div>
					<div className={`animate-button-success${effectVisibility ? ' activate' : ''}`}>
						<i className="fas fa-fw fa-check-square" />
						&nbsp;
						{kara.flag_visible ? i18next.t('KARA_MENU.HIDDEN') : i18next.t('KARA_MENU.SHOWN')}
					</div>
				</li>
			) : null}
			{playlist.plaid !== context.globalState.settings.data.state.blacklistPlaid ? (
				<li className="animate-button-container">
					<div onClick={addToBlacklist}>
						<i className="fas fa-fw fa-ban" />
						&nbsp;
						{i18next.t('KARA_MENU.ADD_BLACKLIST')}
					</div>
					<div className={`animate-button-success${effectBlacklist ? ' activate' : ''}`}>
						<i className="fas fa-fw fa-check-square" />
						&nbsp;
						{i18next.t('KARA_MENU.BLACKLISTED')}
					</div>
				</li>
			) : null}
			{playlist.plaid !== context.globalState.settings.data.state.whitelistPlaid ? (
				<li className="animate-button-container">
					<div onClick={addToWhitelist}>
						<i className="fas fa-fw fa-check-circle" />
						&nbsp;
						{i18next.t('KARA_MENU.ADD_WHITELIST')}
					</div>
					<div className={`animate-button-success${effectWhitelist ? ' activate' : ''}`}>
						<i className="fas fa-fw fa-check-square" />
						&nbsp;
						{i18next.t('KARA_MENU.WHITELISTED')}
					</div>
				</li>
			) : null}
			{!isNonStandardPlaylist(playlist.plaid) ? (
				<li className="animate-button-container">
					<div onClick={shuffleSongs}>
						<i className="fas fa-fw fa-arrows-turn-to-dots" />
						&nbsp;
						{i18next.t('KARA_MENU.SHUFFLE')}
					</div>
					<div className={`animate-button-success${effectShuffle ? ' activate' : ''}`}>
						<i className="fas fa-fw fa-check-square" />
						&nbsp;
						{i18next.t('KARA_MENU.SHUFFLED')}
					</div>
				</li>
			) : null}
		</ul>
	) : null;
}

export default KaraMenuModal;
