import './PlaylistHeader.scss';

import i18next from 'i18next';
import { MouseEvent as MouseEventReact, useContext, useState } from 'react';
import { Trans } from 'react-i18next';

import { setFilterValue } from '../../../store/actions/frontendContext';
import { closeModal, showModal } from '../../../store/actions/modal';
import GlobalContext from '../../../store/context';
import { useTagSearch } from '../../../utils/hooks';
import {
	getOppositePlaylistInfo,
	getPlaylistInfo,
	setOppositePlaylistInfo,
	setPlaylistInfo,
} from '../../../utils/kara';
import { tagTypes, YEARS } from '../../../utils/tagTypes';
import { isNonStandardPlaylist, nonStandardPlaylists } from '../../../utils/tools';
import { KaraElement } from '../../types/kara';
import Autocomplete from '../generic/Autocomplete';
import SelectWithIcon from '../generic/SelectWithIcon';
import CheckedKaraMenuModal from '../modals/CheckedKaraMenuModal';
import PlaylistCommandsModal from '../modals/PlaylistCommandsModal';
import ActionsButtons from './ActionsButtons';
import KaraReviews from './KaraReviews';

interface IProps {
	side: 'left' | 'right';
	playlistList: PlaylistElem[];
	searchMenuOpen?: boolean;
	checkedKaras: KaraElement[];
	selectAllKarasChecked: boolean;
	criteriasOpen: boolean;
	getPlaylist: (searchType?: 'search' | 'recent' | 'requested', orderByLikes?: boolean) => void;
	onChangeTags: (type: number | string, value: string) => void;
	addAllKaras: () => void;
	selectAllKaras: () => void;
	transferCheckedKaras: () => void;
	deleteCheckedKaras: () => void;
	deleteCheckedFavorites: () => void;
	addCheckedKaras: () => void;
	refuseCheckedKara: () => void;
	acceptCheckedKara: () => void;
	toggleSearchMenu?: () => void;
	addRandomKaras: () => void;
	downloadAllMedias: () => void;
	openCloseCriterias: () => void;
}

function PlaylistHeader(props: IProps) {
	const context = useContext(GlobalContext);
	const [tagType, setTagType] = useState(2);
	const [karaMenu, setKaraMenu] = useState(false);
	const [playlistCommands, setPlaylistCommands] = useState(false);
	const [activeFilterUUID, setActiveFilterUUID] = useState('');
	const [orderByLikes, setOrderByLikes] = useState(false);
	const [activeFilter, setActiveFilter] = useState<'search' | 'recent' | 'requested'>('search');

	const getKarasList = (activeFilter: 'search' | 'recent' | 'requested', orderByLikes = false) => {
		setActiveFilter(activeFilter);
		setOrderByLikes(orderByLikes);
		props.getPlaylist(activeFilter, orderByLikes);
	};

	const onChangeTags = (value: string) => {
		setActiveFilterUUID(value);
		props.onChangeTags(tagType, value);
	};

	const getPlaylistIcon = (playlist: PlaylistElem) => {
		// public & current playlist :  play-circle & globe icons
		if (playlist?.flag_public && playlist?.flag_current) return ['fa-play-circle', 'fa-globe'];
		// public playlist : globe icon
		if (playlist?.flag_public) return ['fa-globe'];
		// current playlist : play-circle icon
		if (playlist?.flag_current) return ['fa-play-circle'];
		// library : book icon
		if (playlist?.plaid === nonStandardPlaylists.library) return ['fa-book'];
		// animelist depending of user settings
		if (playlist?.plaid === nonStandardPlaylists.animelist)
			return [`icon-${context?.globalState.settings.data.user.anime_list_to_fetch}`];
		// blacklist : ban icon
		if (playlist?.plaid === context.globalState.settings.data.state.blacklistPlaid) return ['fa-ban'];
		// whitelist : check-circle icon
		if (playlist?.plaid === context.globalState.settings.data.state.whitelistPlaid) return ['fa-check-circle'];
		// favorites : star icon
		if (playlist?.plaid === nonStandardPlaylists.favorites) return ['fa-star'];
		// others playlist : list-ol icon
		return ['fa-list-ol'];
	};

	const getListToSelect = () => {
		return props.playlistList.map(playlist => {
			return {
				value: playlist?.plaid,
				label: playlist?.name,
				icons: getPlaylistIcon(playlist),
			};
		});
	};

	const getFlagLabel = (playlist: PlaylistElem) => {
		if (playlist?.flag_public && playlist?.flag_current) return ` (${i18next.t('FLAGS.CURRENT_PUBLIC')})`;
		if (playlist?.flag_public) return ` (${i18next.t('FLAGS.PUBLIC')})`;
		if (playlist?.flag_current) return ` (${i18next.t('FLAGS.CURRENT')})`;
		return '';
	};

	const openPlaylistCommands = (event: MouseEventReact) => {
		document.getElementById('root').click();
		if (event?.currentTarget) {
			const element = (event.currentTarget as Element).getBoundingClientRect();
			showModal(
				context.globalDispatch,
				<PlaylistCommandsModal
					side={props.side}
					criteriasOpen={props.criteriasOpen}
					topKaraMenu={element.bottom}
					leftKaraMenu={element.left}
					closePlaylistCommands={closePlaylistCommands}
					addAllKaras={props.addAllKaras}
					addRandomKaras={props.addRandomKaras}
					downloadAllMedias={props.downloadAllMedias}
					getListToSelect={getListToSelect}
				/>
			);
			setPlaylistCommands(true);
		}
	};

	const closePlaylistCommands = () => {
		closeModal(context.globalDispatch);
		setPlaylistCommands(false);
	};

	const openKaraMenu = (event: MouseEventReact) => {
		document.getElementById('root').click();
		if (event?.currentTarget) {
			const element = (event.currentTarget as Element).getBoundingClientRect();

			showModal(
				context.globalDispatch,
				<CheckedKaraMenuModal
					checkedKaras={props.checkedKaras}
					side={props.side}
					topKaraMenu={element.bottom}
					leftKaraMenu={element.left}
					closeKaraMenu={closeKaraMenu}
					transferKara={props.transferCheckedKaras}
				/>
			);
			setKaraMenu(true);
		}
	};

	const closeKaraMenu = () => {
		closeModal(context.globalDispatch);
		setKaraMenu(false);
	};

	let timer;
	const changeFilterValue = e => {
		if (timer) clearTimeout(timer);
		timer = setTimeout(
			() => setFilterValue(context.globalDispatch, e.target.value, props.side, playlist?.plaid),
			1000
		);
	};

	const [tags, tagSearch] = useTagSearch(tagType, context);

	const playlist = getPlaylistInfo(props.side, context);
	const oppositePlaylist = getOppositePlaylistInfo(props.side, context);
	const plCommandsContainer = !props.criteriasOpen ? (
		<div className="actionDiv">
			<div className="btn-group">
				<button
					title={i18next.t('ADVANCED.SELECT_ALL')}
					onClick={() => {
						props.selectAllKaras();
					}}
					className="btn btn-default karaLineButton"
				>
					{props.selectAllKarasChecked ? (
						<i className="far fa-check-square" />
					) : (
						<i className="far fa-square" />
					)}
				</button>
				<ActionsButtons
					side={props.side}
					scope="admin"
					isHeader={true}
					addKara={props.addCheckedKaras}
					deleteKara={props.deleteCheckedKaras}
					refuseKara={props.refuseCheckedKara}
					acceptKara={props.acceptCheckedKara}
					deleteFavorite={props.deleteCheckedFavorites}
					checkedKaras={props.checkedKaras?.length}
				/>
				<button
					title={i18next.t('KARA_MENU.KARA_COMMANDS')}
					onClick={event => {
						karaMenu ? closeKaraMenu() : openKaraMenu(event);
					}}
					className={'btn btn-action showPlaylistCommands karaLineButton' + (karaMenu ? ' btn-primary' : '')}
				>
					<i className="fas fa-wrench" />
				</button>
			</div>
		</div>
	) : null;

	const searchMenu = (
		<div className="searchMenuContainer">
			{playlist?.plaid === nonStandardPlaylists.library ? (
				<div className="filterContainer">
					<div
						className="filterButton"
						onClick={() => {
							setActiveFilterUUID('');
							props.onChangeTags(tagType, '');
						}}
					>
						<i className="fas fa-eraser" /> <span>{i18next.t('CLEAR_FILTER')}</span>
					</div>
					<select
						className="filterElement filterTags"
						onChange={e => {
							setTagType(parseInt(e.target.value));
							tagSearch('', parseInt(e.target.value));
							setActiveFilterUUID('');
						}}
						value={tagType}
					>
						{Object.entries(tagTypes).map(([key, value]) => (
							<option key={value.type} value={value.type}>
								{i18next.t(`TAG_TYPES.${key}_other`)}
							</option>
						))}
						<option key={YEARS.type} value={YEARS.type}>
							{i18next.t('DETAILS.YEAR')}
						</option>
					</select>
					<div className="filterElement filterTagsOptions">
						<Autocomplete
							value={activeFilterUUID || ''}
							options={tags}
							onType={tagSearch}
							onChange={onChangeTags}
						/>
					</div>
				</div>
			) : null}
			<div className="filterContainer">
				<div
					tabIndex={0}
					className={'filterElement ' + (activeFilter === 'search' ? 'filterElementActive' : '')}
					onClick={() => getKarasList('search')}
					onKeyPress={() => getKarasList('search')}
				>
					<i
						className={`fas fa-fw ${
							!isNonStandardPlaylist(playlist?.plaid) ? 'fa-list-ol' : 'fa-sort-alpha-down'
						}`}
					/>{' '}
					{i18next.t('VIEW_STANDARD')}
				</div>
				{[nonStandardPlaylists.library, nonStandardPlaylists.favorites].includes(playlist?.plaid) ? (
					<div
						tabIndex={0}
						className={'filterElement ' + (activeFilter === 'recent' ? 'filterElementActive' : '')}
						onClick={() => getKarasList('recent')}
						onKeyPress={() => getKarasList('recent')}
					>
						<i className="far fa-clock" /> {i18next.t('VIEW_RECENT')}
					</div>
				) : null}
				{playlist?.plaid === nonStandardPlaylists.library ? (
					<div
						tabIndex={0}
						className={'filterElement ' + (activeFilter === 'requested' ? 'filterElementActive' : '')}
						onClick={() => getKarasList('requested')}
						onKeyPress={() => getKarasList('requested')}
					>
						<i className="fas fa-fire" /> {i18next.t('VIEW_POPULAR')}
					</div>
				) : null}
				{!isNonStandardPlaylist(playlist?.plaid) ? (
					<div
						tabIndex={0}
						className={'filterElement ' + (orderByLikes ? 'filterElementActive' : '')}
						onClick={() => getKarasList(undefined, true)}
						onKeyPress={() => getKarasList(undefined, true)}
						title={i18next.t('VIEW_LIKES_TOOLTIP')}
					>
						<i className="fas fa-thumbs-up" /> {i18next.t('VIEW_LIKES')}
					</div>
				) : null}
			</div>
		</div>
	);
	return (
		<>
			<div className="panel-heading plDashboard">
				<div className="btn-group">
					<div className="dropdown">
						<button
							title={i18next.t('ADVANCED.PLAYLIST_COMMANDS')}
							onClick={event => {
								playlistCommands ? closePlaylistCommands() : openPlaylistCommands(event);
							}}
							className={
								'btn btn-default showPlaylistCommands karaLineButton' +
								(playlistCommands ? ' btn-primary' : '')
							}
						>
							<i className="fas fa-cog" />
						</button>
					</div>
					<SelectWithIcon
						list={getListToSelect()}
						value={playlist?.plaid?.toString()}
						onChange={(value: any) => {
							if (props.searchMenuOpen) props.toggleSearchMenu();
							setPlaylistInfo(props.side, context, value);
						}}
					/>

					<div className="btn-group">
						{[nonStandardPlaylists.library, nonStandardPlaylists.favorites].includes(playlist?.plaid) ? (
							<button
								type="button"
								title={i18next.t('PLAYLIST_HEADER.FILTERS')}
								className={
									'btn btn-default karaLineButton' +
									(props.searchMenuOpen ||
									activeFilter !== 'search' ||
									activeFilterUUID !== '' ||
									orderByLikes
										? ' btn-primary'
										: '')
								}
								onClick={props.toggleSearchMenu}
							>
								<i className="fas fa-fw fa-filter" />
								{activeFilter !== 'search' || activeFilterUUID !== ''
									? i18next.t('PLAYLIST_HEADER.ACTIVE_FILTER')
									: null}
							</button>
						) : null}
						{playlist?.flag_smart ? (
							<button
								type="button"
								title={i18next.t(
									props.criteriasOpen ? 'PLAYLIST_HEADER.SHOW_SONGS' : 'PLAYLIST_HEADER.EDIT_CRITERIA'
								)}
								className={'btn btn-default' + (props.criteriasOpen ? ' btn-primary' : '')}
								onClick={props.openCloseCriterias}
							>
								<i className={`fas fa-fw ${props.criteriasOpen ? 'fa-list-ul' : 'fa-sliders-h'}`} />
								{i18next.t(
									props.criteriasOpen ? 'PLAYLIST_HEADER.SHOW_SONGS' : 'PLAYLIST_HEADER.EDIT_CRITERIA'
								)}
							</button>
						) : null}
					</div>
				</div>
				<div className="plSearch">
					<input
						type="text"
						placeholder={`\uF002 ${i18next.t('SEARCH')}`}
						defaultValue={
							props.side === 'left'
								? context.globalState.frontendContext.filterValue1
								: context.globalState.frontendContext.filterValue2
						}
						onChange={changeFilterValue}
						disabled={props.criteriasOpen}
					/>
				</div>
				{plCommandsContainer}
			</div>
			<div className="panel-heading mobile">
				<select value={playlist?.plaid} onChange={e => setPlaylistInfo(props.side, context, e.target.value)}>
					{props.playlistList?.map(playlist => {
						return (
							<option key={playlist?.plaid} value={playlist?.plaid}>
								{playlist?.name}
								{getFlagLabel(playlist)}
							</option>
						);
					})}
				</select>
				<i className="fas fa-arrow-right" />
				<select
					value={oppositePlaylist?.plaid}
					onChange={e => setOppositePlaylistInfo(props.side, context, e.target.value)}
				>
					{props.playlistList?.map(playlist => {
						return (
							<option key={playlist?.plaid} value={playlist?.plaid}>
								{playlist?.name}
								{getFlagLabel(playlist)}
							</option>
						);
					})}
				</select>
			</div>
			{props.searchMenuOpen ? searchMenu : null}
			{playlist?.flag_public && !playlist?.flag_current && playlist.karacount > 0 ? (
				<p className="playlist-tooltip">
					<a
						href="#"
						onClick={() => {
							showModal(context.globalDispatch, <KaraReviews side={props.side} />);
						}}
					>
						<strong>{i18next.t('KAROULETTE.START')}</strong>
					</a>
				</p>
			) : null}
			{playlist?.flag_smart ? (
				!props.criteriasOpen ? (
					<p className="playlist-tooltip">
						<Trans
							i18nKey="CRITERIA.EXPL"
							components={{ 1: <a href="#" onClick={() => props.openCloseCriterias()} /> }}
							defaults=""
						/>
					</p>
				) : (
					<p className="playlist-tooltip">
						<Trans
							i18nKey="CRITERIA.EXPL_OPEN"
							components={{ 1: <a href="#" onClick={() => props.openCloseCriterias()} /> }}
							defaults=""
						/>
					</p>
				)
			) : null}
		</>
	);
}

export default PlaylistHeader;
