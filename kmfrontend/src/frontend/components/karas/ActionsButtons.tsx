import './ActionsButtons.scss';

import i18next from 'i18next';
import { useContext } from 'react';

import GlobalContext from '../../../store/context';
import { getOppositePlaylistInfo, getPlaylistInfo } from '../../../utils/kara';
import { nonStandardPlaylists } from '../../../utils/tools';
import { KaraElement } from '../../types/kara';

interface IProps {
	scope: 'admin' | 'public';
	isHeader?: boolean;
	side: 'left' | 'right';
	kara?: KaraElement;
	checkedKaras?: number;
	addKara: (event?: any, pos?: number) => void;
	deleteKara: () => void;
	deleteFavorite: () => void;
	upvoteKara?: () => void;
	refuseKara: () => void;
	acceptKara: () => void;
}

function ActionsButtons(props: IProps) {
	const context = useContext(GlobalContext);

	const onRightClickAdd = (e: any) => {
		if (props.scope === 'admin') {
			e.preventDefault();
			e.stopPropagation();
			props.addKara(e, -1);
		}
	};

	const playlist = getPlaylistInfo(props.side, context);
	const oppositePlaylist = getOppositePlaylistInfo(props.side, context);
	const classValue = props.isHeader ? 'btn btn-default karaLineButton' : 'btn btn-action karaLineButton';
	return (
		<>
			{props.scope === 'admin' &&
			playlist?.plaid === context.globalState.settings.data.state.publicPlaid &&
			oppositePlaylist?.plaid === context.globalState.settings.data.state.currentPlaid ? (
					<button
						title={i18next.t(props.isHeader ? 'TOOLTIP_REFUSE_SELECT_KARA' : 'TOOLTIP_REFUSE_KARA')}
						className={`${classValue} ${props.kara?.flag_refused ? 'off' : ''}`}
						onClick={props.refuseKara}
					>
						<i className="fas fa-times" />
					</button>
				) : null}

			{props.scope === 'admin' &&
			playlist?.plaid === context.globalState.settings.data.state.publicPlaid &&
			oppositePlaylist?.plaid === context.globalState.settings.data.state.currentPlaid ? (
					<button
						title={i18next.t(props.isHeader ? 'TOOLTIP_ACCEPT_SELECT_KARA' : 'TOOLTIP_ACCEPT_KARA')}
						className={`${classValue} ${props.kara?.flag_accepted ? 'on' : ''}`}
						onClick={props.acceptKara}
					>
						<i className="fas fa-check" />
					</button>
				) : null}

			{playlist?.plaid !== nonStandardPlaylists.favorites &&
			((props.scope === 'admin' &&
				playlist?.plaid !== nonStandardPlaylists.library &&
				!(props.isHeader && playlist?.flag_smart) &&
				!(
					playlist?.plaid === context.globalState.settings.data.state.publicPlaid &&
					oppositePlaylist?.plaid === context.globalState.settings.data.state.currentPlaid
				)) ||
				(props.scope !== 'admin' &&
					!props.kara?.flag_dejavu &&
					!props.kara?.flag_playing &&
					((props.kara?.my_public_plc_id && props.kara?.my_public_plc_id[0]) ||
						(playlist?.plaid === context.globalState.settings.data.state.publicPlaid &&
							props.kara.username === context.globalState.auth.data.username)))) ? (
					<button
						title={i18next.t(props.isHeader ? 'TOOLTIP_DELETE_SELECT_KARA' : 'TOOLTIP_DELETEKARA')}
						disabled={props?.checkedKaras === 0}
						className={classValue}
						onClick={props.deleteKara}
					>
						<i className="fas fa-eraser" />
					</button>
				) : null}

			{playlist?.plaid === nonStandardPlaylists.favorites ? (
				<button
					title={i18next.t(props.isHeader ? 'TOOLTIP_DELETE_SELECT_FAVS' : 'TOOLTIP_DELETE_FAVS')}
					className={classValue + ' yellow'}
					onClick={props.deleteFavorite}
				>
					<i className="fas fa-star" />
				</button>
			) : null}

			{(props.scope === 'admin' &&
				oppositePlaylist?.plaid !== nonStandardPlaylists.library &&
				oppositePlaylist?.plaid !== nonStandardPlaylists.favorites &&
				!(
					playlist?.plaid === context.globalState.settings.data.state.publicPlaid &&
					oppositePlaylist?.plaid === context.globalState.settings.data.state.currentPlaid
				)) ||
			(props.scope === 'public' &&
				context?.globalState.settings.data.config?.Frontend?.Mode === 2 &&
				playlist?.plaid !== context.globalState.settings.data.state.publicPlaid &&
				playlist?.plaid !== context.globalState.settings.data.state.currentPlaid &&
				(!props.kara?.public_plc_id || !props.kara?.public_plc_id[0])) ? (
					<button
						title={
							props.isHeader
								? i18next.t('TOOLTIP_ADD_SELECT_KARA')
								: `${i18next.t('TOOLTIP_ADDKARA')}${
									props.scope === 'admin' ? ' - ' + i18next.t('TOOLTIP_ADDKARA_ADMIN') : ''
							  }`
						}
						className={classValue}
						onContextMenu={onRightClickAdd}
						onClick={props.addKara}
						disabled={props?.checkedKaras === 0}
					>
						<i className="fas fa-plus" />
					</button>
				) : null}

			{props.scope !== 'admin' &&
			((props.kara.public_plc_id?.length > 0 && props.kara.my_public_plc_id?.length === 0) ||
				props.kara?.upvotes > 0) ? (
					<button
						title={i18next.t('TOOLTIP_UPVOTE')}
						className={`${classValue} upvoteKara`}
						onClick={props.upvoteKara}
						disabled={props.kara.my_public_plc_id?.length > 0}
					>
						<i
							className={`fas fa-thumbs-up ${props.kara?.flag_upvoted ? 'currentUpvote' : ''}
						${props.kara?.upvotes > 0 ? ' upvotes' : ''}`}
						/>
						{props.kara?.upvotes > 0 && props.kara?.upvotes}
					</button>
				) : null}
		</>
	);
}

export default ActionsButtons;
