import './KaraMenuModal.scss';

import {
	faArrowsTurnToDots,
	faBan,
	faCheckCircle,
	faCheckSquare,
	faExchangeAlt,
	faEye,
	faEyeSlash,
	faGift,
	faLevelUpAlt,
	faLongArrowAltLeft,
	faLongArrowAltRight,
	faStar,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import i18next from 'i18next';
import { useContext, useEffect, useState } from 'react';

import GlobalContext from '../../../store/context';
import { getOppositePlaylistInfo, getPlaylistInfo } from '../../../utils/kara';
import { commandBackend } from '../../../utils/socket';
import { is_touch_device, isNonStandardPlaylist, nonStandardPlaylists } from '../../../utils/tools';
import { KaraElement } from '../../types/kara';
import { WS_CMD } from '../../../utils/ws.mjs';
import { DBKara } from '../../../../../src/lib/types/database/kara';

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
	const [kara, setKara] = useState<DBKara & Partial<KaraElement>>(props.kara);
	const [effectFavorite, setEffectFavorite] = useState(false);
	const [effectBlacklist, setEffectBlacklist] = useState(false);
	const [effectWhitelist, setEffectWhitelist] = useState(false);
	const [effectFree, setEffectFree] = useState(false);
	const [effectVisibility, setEffectVisibility] = useState(false);
	const [effectShuffle, setEffectShuffle] = useState(false);

	const getKaraDetail = async () => {
		try {
			const playlist = getPlaylistInfo(props.side, context);
			const response =
				playlist && isNonStandardPlaylist(playlist.plaid)
					? await commandBackend(WS_CMD.GET_KARA, { kid: props.kara.kid })
					: await commandBackend(WS_CMD.GET_PLC, { plc_id: props.kara.plcid });
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
						<FontAwesomeIcon icon={props.side === 'left' ? faLongArrowAltRight : faLongArrowAltLeft} />
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
						<FontAwesomeIcon icon={faExchangeAlt} />
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
						<FontAwesomeIcon icon={faLevelUpAlt} />
						&nbsp;
						{i18next.t('KARA_MENU.MOVE_KARA')}
					</div>
				</li>
			) : null}
			{playlist.plaid !== nonStandardPlaylists.favorites ? (
				<li className="animate-button-container">
					<div onClick={makeFavorite}>
						<FontAwesomeIcon icon={faStar} />
						&nbsp;
						{kara.flag_favorites ? i18next.t('KARA_MENU.FAV_DEL') : i18next.t('KARA_MENU.FAV')}
					</div>
					<div className={`animate-button-success${effectFavorite ? ' activate' : ''}`}>
						<FontAwesomeIcon icon={faCheckSquare} />
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
						<FontAwesomeIcon icon={faGift} />
						&nbsp;
						{i18next.t('KARA_MENU.FREE_SHORT')}
					</div>
					<div className={`animate-button-success${effectFree ? ' activate' : ''}`}>
						<FontAwesomeIcon icon={faCheckSquare} />
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
								<FontAwesomeIcon icon={faEyeSlash} />
								&nbsp;
								{i18next.t('KARA_MENU.VISIBLE_OFF_SHORT')}
							</>
						) : (
							<>
								<FontAwesomeIcon icon={faEye} />
								&nbsp;
								{i18next.t('KARA_MENU.VISIBLE_ON_SHORT')}
							</>
						)}
					</div>
					<div className={`animate-button-success${effectVisibility ? ' activate' : ''}`}>
						<FontAwesomeIcon icon={faCheckSquare} />
						&nbsp;
						{kara.flag_visible ? i18next.t('KARA_MENU.HIDDEN') : i18next.t('KARA_MENU.SHOWN')}
					</div>
				</li>
			) : null}
			{playlist.plaid !== context.globalState.settings.data.state.blacklistPlaid ? (
				<li className="animate-button-container">
					<div onClick={addToBlacklist}>
						<FontAwesomeIcon icon={faBan} />
						&nbsp;
						{i18next.t('KARA_MENU.ADD_BLACKLIST')}
					</div>
					<div className={`animate-button-success${effectBlacklist ? ' activate' : ''}`}>
						<FontAwesomeIcon icon={faCheckSquare} />
						&nbsp;
						{i18next.t('KARA_MENU.BLACKLISTED')}
					</div>
				</li>
			) : null}
			{playlist.plaid !== context.globalState.settings.data.state.whitelistPlaid ? (
				<li className="animate-button-container">
					<div onClick={addToWhitelist}>
						<FontAwesomeIcon icon={faCheckCircle} />
						&nbsp;
						{i18next.t('KARA_MENU.ADD_WHITELIST')}
					</div>
					<div className={`animate-button-success${effectWhitelist ? ' activate' : ''}`}>
						<FontAwesomeIcon icon={faCheckSquare} />
						&nbsp;
						{i18next.t('KARA_MENU.WHITELISTED')}
					</div>
				</li>
			) : null}
			{!isNonStandardPlaylist(playlist.plaid) ? (
				<li className="animate-button-container">
					<div onClick={shuffleSongs}>
						<FontAwesomeIcon icon={faArrowsTurnToDots} />
						&nbsp;
						{i18next.t('KARA_MENU.SHUFFLE')}
					</div>
					<div className={`animate-button-success${effectShuffle ? ' activate' : ''}`}>
						<FontAwesomeIcon icon={faCheckSquare} />
						&nbsp;
						{i18next.t('KARA_MENU.SHUFFLED')}
					</div>
				</li>
			) : null}
		</ul>
	) : null;
}

export default KaraMenuModal;
