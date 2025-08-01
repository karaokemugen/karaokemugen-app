import './Playlist.scss';

import i18next from 'i18next';
import { debounce } from 'lodash';
import { Fragment, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { DragDropContext, Draggable, DraggableProvided, Droppable, DropResult } from 'react-beautiful-dnd';
import { ListRange, Virtuoso } from 'react-virtuoso';

import type { DownloadedStatus } from '../../../../../src/lib/types/database/download';
import type { KaraDownloadRequest } from '../../../../../src/types/download';
import type { PublicPlayerState } from '../../../../../src/types/state';
import GlobalContext from '../../../store/context';
import TasksEvent from '../../../TasksEvent';
import { useDeferredEffect, useResizeListener } from '../../../utils/hooks';
import { buildKaraTitle, getOppositePlaylistInfo, getPlaylistInfo } from '../../../utils/kara';
import { commandBackend, getSocket } from '../../../utils/socket';
import { getTagTypeName } from '../../../utils/tagTypes';
import {
	callModal,
	displayMessage,
	is_touch_device,
	isNonStandardPlaylist,
	nonStandardPlaylists,
	secondsTimeSpanToHMS,
} from '../../../utils/tools';
import { KaraElement } from '../../types/kara';
import CriteriasList from './CriteriasList';
import KaraLine from './KaraLine';
import PlaylistHeader from './PlaylistHeader';
import QuizRanking from './QuizRanking';
import type { TagTypeNum } from '../../../../../src/lib/types/tag';
import { setIndexKaraDetail } from '../../../store/actions/frontendContext';
import type { RepositoryManifestV2 } from '../../../../../src/lib/types/repo';
import { WS_CMD } from '../../../utils/ws';
import { KaraList as DBKaraList } from '../../../../../src/lib/types/kara';
import { WSCmdDefinition } from '../../../../../src/lib/types/frontend';

// Virtuoso's resize observer can this error,
// which is caught by DnD and aborts dragging.
window.addEventListener('error', e => {
	if (
		e.message === 'ResizeObserver loop completed with undelivered notifications.' ||
		e.message === 'ResizeObserver loop limit exceeded'
	) {
		e.stopImmediatePropagation();
	}
});

const chunksize = 400;
let timer: NodeJS.Timeout;

interface IProps {
	scope: 'admin' | 'public';
	side: 'left' | 'right';
	searchMenuOpen?: boolean;
	playlistList?: PlaylistElem[];
	toggleSearchMenu?: () => void;
	openKara: (kara: KaraElement, index?: number) => void;
	searchValue?: string;
	searchCriteria?: 'year' | 'tag';
	searchType?: 'search' | 'recent' | 'requested' | 'incoming';
	quizRanking?: boolean;
}
interface KaraList {
	content: KaraElement[];
	avatars: Record<string, string>;
	i18n?: Record<string, string>;
	infos: {
		count: number;
		from: number;
		to: number;
	};
}

function Playlist(props: IProps) {
	const context = useContext(GlobalContext);
	const refContainer = useRef<HTMLDivElement>();
	const [searchValue, setSearchValue] = useState(props.searchValue);
	const [searchCriteria, setSearchCriteria] = useState<'year' | 'tag'>(props.searchCriteria);
	const [searchType, setSearchType] = useState<'search' | 'recent' | 'requested' | 'incoming'>(
		props.searchType ? props.searchType : 'search'
	);
	const [orderByLikes, setOrderByLikes] = useState(false);
	const [isPlaylistInProgress, setPlaylistInProgress] = useState(false);
	const [stopUpdate, setStopUpdate] = useState(false);
	const [data, setData] = useState<KaraList>();
	const [checkedKaras, setCheckedKaras] = useState(0);
	const [plcidToSwap, setPlcidToSwap] = useState<number>();
	const [playing, setPlaying] = useState<number>(
		getPlaylistInfo(props.side, context)?.content.findIndex(k => k.flag_playing)
	);
	const [repositories, setRepositories] = useState<{ name: string; url: string; suggestUrl: string }[]>();
	const [songsBeforeJingle, setSongsBeforeJingle] = useState<number>();
	const [songsBeforeSponsor, setSongsBeforeSponsor] = useState<number>();
	const [goToPlaying, setGotToPlaying] = useState<boolean>(props.scope === 'public');
	// Avoid scroll event trigger
	const [goToPlayingAvoidScroll, setGotToPlayingAvoidScroll] = useState<boolean>();
	const [selectAllKarasChecked, setSelectAllKarasChecked] = useState(false);
	const [criteriasOpen, setCriteriasOpen] = useState(false);
	const [refreshLibraryBanner, setRefreshLibraryBanner] = useState(false);
	const virtuoso = useRef(null);
	const plaid = useRef<string>(getPlaylistInfo(props.side, context)?.plaid);

	const quizRanking = context.globalState.settings.data.state.quiz.running && props.quizRanking;
	const isAdmin = props.scope === 'admin';

	const publicPlaylistEmptied = () => {
		if (getPlaylistInfo(props.side, context)?.plaid === nonStandardPlaylists.library) {
			setData(oldData => {
				if (oldData) {
					for (const kara of oldData.content) {
						if (kara) {
							kara.my_public_plc_id = [];
							kara.public_plc_id = [];
							kara.flag_upvoted = false;
						}
					}
				}
				return oldData;
			});
		}
	};

	const KIDUpdated = async (
		event: {
			kid: string;
			username: string;
			requester: string;
			flag_upvoted: boolean;
			plc_id: number[];
			download_status: DownloadedStatus;
		}[]
	) => {
		const playlist = getPlaylistInfo(props.side, context);
		if (
			playlist?.plaid === nonStandardPlaylists.library ||
			playlist?.plaid === nonStandardPlaylists.favorites ||
			(event.length > 0 && event[0].download_status)
		) {
			setData(oldData => {
				if (oldData) {
					for (const kara of oldData.content) {
						for (const karaUpdated of event) {
							if (kara?.kid === karaUpdated.kid) {
								if (karaUpdated.plc_id) {
									kara.public_plc_id = karaUpdated.plc_id;
									if (!karaUpdated.plc_id[0]) {
										kara.my_public_plc_id = [];
									}
								}
								if (
									(karaUpdated.username === context.globalState.auth.data.username &&
										karaUpdated.flag_upvoted === false) ||
									karaUpdated.flag_upvoted === true
								) {
									kara.flag_upvoted = karaUpdated.flag_upvoted;
								}
								if (karaUpdated.requester === context.globalState.auth.data.username) {
									kara.my_public_plc_id = karaUpdated.plc_id;
								}
								if (karaUpdated.download_status) {
									kara.download_status = karaUpdated.download_status;
								}
							}
						}
					}
				}
				return oldData;
			});
		}
	};

	const scrollToIndex = useCallback(
		(index: number, smooth = true) => {
			virtuoso.current?.scrollToIndex({
				index,
				align: 'start',
				behavior: smooth ? 'smooth' : 'auto',
			});
		},
		[virtuoso]
	);

	const getFilterValue = (side: 'left' | 'right') => {
		return side === 'left'
			? context.globalState.frontendContext.filterValue1 || ''
			: context.globalState.frontendContext.filterValue2 || '';
	};

	const getPlayerStatus = async () => {
		try {
			const result = await commandBackend(WS_CMD.GET_PLAYER_STATUS);
			updateCounters(result);
		} catch (_) {
			// already display
		}
	};

	const initCall = async () => {
		getRepositories();
		getPlayerStatus();
		setCriteriasOpen(false);
		await getPlaylist();
		setTimeout(() => setIndexKaraDetail(context.globalDispatch, 0), 100);
	};

	const toggleSearchMenu = () => {
		props.toggleSearchMenu();
	};

	const debounceClear = useCallback(
		debounce(() => setGotToPlayingAvoidScroll(false), 500, { maxWait: 1000 }),
		[]
	);

	const clearScrollToIndex = () => {
		if (goToPlayingAvoidScroll) {
			debounceClear();
		} else {
			setGotToPlaying(false);
			setGotToPlayingAvoidScroll(false);
		}
	};

	const isRowLoaded = index => {
		return !!data?.content[index];
	};

	const scrollHandler = async ({ startIndex, endIndex }: ListRange) => {
		clearScrollToIndex();
		if (!isPlaylistInProgress && (!isRowLoaded(startIndex) || !isRowLoaded(endIndex))) {
			const index = !isRowLoaded(startIndex) ? startIndex : endIndex;
			data.infos.from = Math.floor(index / chunksize) * chunksize;
			data.infos.to =
				data.infos.from + (Math.ceil(endIndex / chunksize) - Math.floor(startIndex / chunksize)) * chunksize;
			setData(data);
			if (timer) clearTimeout(timer);
			timer = setTimeout(getPlaylist, 1000);
		}
	};

	const sortable = useMemo(() => {
		return (
			!is_touch_device() &&
			isAdmin &&
			!isNonStandardPlaylist(getPlaylistInfo(props.side, context)?.plaid) &&
			searchType !== 'recent' &&
			searchType !== 'requested' &&
			!searchValue &&
			!orderByLikes &&
			!getFilterValue(props.side)
		);
	}, [
		searchType,
		searchValue,
		orderByLikes,
		getFilterValue(props.side),
		is_touch_device(),
		getPlaylistInfo(props.side, context)?.plaid,
	]);

	const HeightPreservingItem = ({ children, ...props }: PropsWithChildren) => {
		const [size, setSize] = useState(0);
		const knownSize = props['data-known-size'];
		useEffect(() => {
			setSize(prevSize => {
				return knownSize === 0 ? prevSize : knownSize;
			});
		}, [knownSize]);
		return (
			<div
				{...props}
				className="height-preserving-container"
				//@ts-expect-error check styling in the style tag below
				style={{ '--child-height': `${size}px` }}
			>
				{children}
			</div>
		);
	};

	const Item = useCallback(
		({ provided, index, isDragging }: { provided: DraggableProvided; index: number; isDragging: boolean }) => {
			let content: KaraElement;
			if (data?.content[index]) {
				content = data.content[index];
				const jingle =
					typeof songsBeforeJingle === 'number' &&
					// Are jingles enabled?
					!context.globalState.settings.data.state.quiz.running &&
					context.globalState.settings.data.config.Playlist.Medias.Jingles.Enabled &&
					// Use modulo to calculate each occurrence
					(index - (playing + songsBeforeJingle)) %
						context.globalState.settings.data.config.Playlist.Medias.Jingles.Interval ===
						0;
				const sponsor =
					typeof songsBeforeSponsor === 'number' &&
					// Are sponsors enabled?
					!context.globalState.settings.data.state.quiz.running &&
					context.globalState.settings.data.config.Playlist.Medias.Sponsors.Enabled &&
					// Use modulo to calculate each occurrence
					(index - (playing + songsBeforeSponsor)) %
						context.globalState.settings.data.config.Playlist.Medias.Sponsors.Interval ===
						0;
				return (
					<KaraLine
						indexInPL={index}
						key={`${props.side}-${content.plcid ? content.plcid + '-' : ''}${content.kid}`}
						kara={content}
						scope={props.scope}
						i18nTag={data.i18n}
						side={props.side}
						checkKara={checkKara}
						avatar_file={data.avatars[content.username]}
						deleteCriteria={deleteCriteria}
						jingle={jingle}
						sponsor={sponsor}
						openKara={kara => {
							props.openKara(kara, index);
						}}
						sortable={sortable}
						draggable={provided}
						playingIn={props.searchType === 'incoming'}
						plcidToSwap={plcidToSwap}
						swapPLCs={props.searchType === 'incoming' && data.infos.count > 1 ? swapPLCs : undefined}
					/>
				);
			} else {
				return (
					<div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}>
						<div className="list-group-item">
							<div className="actionDiv" />
							<div className="infoDiv" />
							<div className="contentDiv">{i18next.t('LOADING')}</div>
						</div>
					</div>
				);
			}
		},
		[sortable, playing, data, songsBeforeSponsor, songsBeforeJingle, checkedKaras, plcidToSwap]
	);

	const [repoInProgress, setRepoInProgress] = useState(false);

	const noRowsRenderer = useCallback(() => {
		return (
			<>
				{getPlaylistInfo(props.side, context)?.plaid === nonStandardPlaylists.library && isAdmin ? (
					<div className="list-group-item karaSuggestion">
						<TasksEvent
							limit={6}
							styleTask="page-tasks-wrapper"
							onTask={t => setRepoInProgress(t.length > 0)}
						/>
						{repoInProgress && getFilterValue(props.side).length === 0 ? (
							<>
								<div>{i18next.t('REPO_IN_PROGRESS')}</div>
							</>
						) : (
							<>
								<div>{i18next.t('KARA_SUGGESTION_NOT_FOUND')}</div>
								{repositories?.map(value => (
									<div key={value.name}>
										<div>
											<a key={value.name} href={value.url}>
												{value.name}
											</a>
										</div>
										<div>
											{value.suggestUrl ? (
												<a href={value.suggestUrl}>{value.name}/suggest</a>
											) : null}
										</div>
									</div>
								))}
							</>
						)}
					</div>
				) : null}
			</>
		);
	}, [getPlaylistInfo(props.side, context)?.plaid, repoInProgress, getFilterValue(props.side)]);

	const playlistContentsUpdatedFromServer = (idPlaylist: string) => {
		if (getPlaylistInfo(props.side, context)?.plaid === idPlaylist && !stopUpdate) getPlaylist();
	};

	const displayLibraryBanner = () => {
		if (getPlaylistInfo(props.side, context)?.plaid === nonStandardPlaylists.library) setRefreshLibraryBanner(true);
	};

	const debounceUpdateLibrary = useCallback(
		debounce(() => updateLibrary(), 5000),
		[]
	);

	const updateLibrary = () => {
		if (getPlaylistInfo(props.side, context)?.plaid === nonStandardPlaylists.library) getPlaylist();
	};

	const getPlaylistUrl = (plaidParam?: string) => {
		const idPlaylist: string = plaidParam ? plaidParam : getPlaylistInfo(props.side, context)?.plaid;
		let url: WSCmdDefinition<object, DBKaraList>;
		if (idPlaylist === nonStandardPlaylists.library) {
			url = WS_CMD.GET_KARAS;
		} else if (idPlaylist === nonStandardPlaylists.favorites) {
			url = WS_CMD.GET_FAVORITES;
		} else if (idPlaylist === nonStandardPlaylists.animelist) {
			url = WS_CMD.GET_ANIME_LIST;
		} else {
			url = WS_CMD.GET_PLAYLIST_CONTENTS;
		}
		return url;
	};

	const getPlaylist = async (
		searchTypeParam?: 'search' | 'recent' | 'requested' | 'incoming',
		orderByLikesParam?: boolean
	) => {
		const criterias = {
			year: 'y',
			tag: 't',
		};
		setRefreshLibraryBanner(false);
		setPlaylistInProgress(true);
		const loadingPlaid = getPlaylistInfo(props.side, context)?.plaid;
		let search = searchType;
		let order = orderByLikes;
		if (searchTypeParam) {
			setSearchType(searchTypeParam);
			search = searchTypeParam;
			if (data?.infos) data.infos.from = 0;
			setData(data);
		} else if (data?.infos?.from === 0 && searchType !== 'incoming') {
			setSearchType(undefined);
			search = undefined;
		}
		if (orderByLikesParam !== undefined) {
			setOrderByLikes(orderByLikesParam);
			order = orderByLikesParam;
		}
		const url = getPlaylistUrl();
		const param: {
			plaid: string;
			orderByLikes: boolean;
			filter: string;
			from: number;
			size: number;
			blacklist: boolean;
			parentsOnly: boolean;
			order: string;
			q: string;
			incomingSongs: boolean;
			filterByUser: string;
		} = {} as never;
		if (!isNonStandardPlaylist(loadingPlaid)) {
			param.plaid = loadingPlaid;
			if (order || (order === undefined && order)) {
				param.orderByLikes = true;
			}
		}

		param.filter = getFilterValue(props.side);
		param.from = data?.infos?.from > 0 ? data.infos.from : 0;
		param.size = data?.infos?.from > 0 && data?.infos?.to > 0 ? data.infos.to - data.infos.from : chunksize;

		param.blacklist = true;
		param.parentsOnly =
			!isAdmin &&
			searchCriteria !== 'tag' &&
			context.globalState.settings.data.user.flag_parentsonly &&
			param.plaid !== nonStandardPlaylists.favorites;

		if (search === 'incoming') {
			param.incomingSongs = search === 'incoming';
			param.order = 'search';
			param.filterByUser = context.globalState.auth.data.username;
		} else if (search) {
			param.order = search === 'search' ? undefined : search;
		}
		if (searchCriteria && searchValue) {
			param.q = `${searchCriteria ? criterias[searchCriteria] : ''}:${searchValue}`;
		}
		try {
			const karas: KaraList = await commandBackend(url, param);
			// Check if the plaid is still relevant after request
			if (loadingPlaid !== plaid.current) return;

			if (karas.infos?.from > 0) {
				if (karas.infos.from < data.content.length) {
					for (let index = 0; index < karas.content.length; index++) {
						data.content[karas.infos.from + index] = karas.content[index];
					}
				} else {
					if (karas.infos.from > data.content.length) {
						const nbCellToFill = data.infos.from - data.content.length;
						for (let index = 0; index < nbCellToFill; index++) {
							data.content.push(undefined);
						}
					}
					data.content.push(...karas.content);
				}
				data.infos = karas.infos;
				data.i18n = Object.assign(data.i18n, karas.i18n);
				setData(data);
			} else {
				setData(karas);
			}
			setPlaylistInProgress(false);
		} catch (_) {
			// already display
		}
	};

	const playingUpdate = useCallback(
		(dataUpdate: { plaid: string; plc_id: number }) => {
			if (!stopUpdate && getPlaylistInfo(props.side, context)?.plaid === dataUpdate.plaid) {
				if (props.searchType === 'incoming') {
					getPlaylist();
				} else {
					setData(oldData => {
						if (oldData) {
							let indexPlaying;
							for (let index = 0; index < oldData.content.length; index++) {
								const kara = oldData.content[index];
								if (kara?.plcid === dataUpdate.plc_id) {
									kara.flag_playing = true;
									indexPlaying = index;
									if (goToPlaying) {
										scrollToIndex(index);
										setGotToPlayingAvoidScroll(true);
									}
									setPlaying(indexPlaying);
								} else if (kara?.flag_playing) {
									kara.flag_playing = false;
									kara.flag_dejavu = true;
								}
							}
						}
						return oldData;
					});
				}
			}
		},
		[goToPlaying]
	);

	const gotToPlayingAfterPlaylistUpdate = async () => {
		if (data && goToPlaying && !isNonStandardPlaylist(getPlaylistInfo(props.side, context)?.plaid)) {
			const result = await commandBackend(WS_CMD.FIND_PLAYING_SONG_IN_PLAYLIST, {
				plaid: getPlaylistInfo(props.side, context)?.plaid,
			});
			if (result?.index !== -1) {
				setTimeout(() => scrollToIndex(result.index), 200);
			}
		}
	};

	useEffect(() => {
		if (!goToPlayingAvoidScroll && !context.globalState.frontendContext.indexKaraDetail) {
			gotToPlayingAfterPlaylistUpdate();
		}
		setGotToPlayingAvoidScroll(false);
	}, [data]);

	useEffect(() => {
		getSocket().on('playingUpdated', playingUpdate);
		return () => {
			getSocket().off('playingUpdated', playingUpdate);
		};
	}, [
		goToPlaying,
		context.globalState.frontendContext.playlistInfoLeft,
		context.globalState.frontendContext.playlistInfoRight,
	]);

	const getPlInfosElement = () => {
		let plInfos = '';
		const playlist = getPlaylistInfo(props.side, context);
		if (playlist?.plaid && data?.infos?.count) {
			plInfos =
				data.infos.count +
				' karas' +
				(!isNonStandardPlaylist(playlist?.plaid) && playlist?.duration
					? ` ~ ${is_touch_device() ? 'dur.' : i18next.t('DETAILS.DURATION')} ` +
						secondsTimeSpanToHMS(playlist?.duration, 'hm') +
						` / ${secondsTimeSpanToHMS(playlist?.time_left, 'hm')} ${
							is_touch_device() ? 're.' : i18next.t('DURATION_REMAINING')
						} `
					: '');
		}
		return plInfos;
	};

	const scrollToPlaying = async () => {
		if (playing) {
			scrollToIndex(playing);
			setGotToPlaying(true);
			setGotToPlayingAvoidScroll(true);
		} else {
			const result = await commandBackend(WS_CMD.FIND_PLAYING_SONG_IN_PLAYLIST, {
				plaid: getPlaylistInfo(props.side, context)?.plaid,
			});
			if (result?.index !== -1) {
				scrollToIndex(result.index);
				setGotToPlaying(true);
				setGotToPlayingAvoidScroll(true);
			}
		}
	};

	const updateCounters = (event: PublicPlayerState) => {
		if (getPlaylistInfo(props.side, context)?.flag_current) {
			if (typeof event.songsBeforeJingle === 'number') {
				setSongsBeforeJingle(event.songsBeforeJingle);
			}
			if (typeof event.songsBeforeSponsor === 'number') {
				setSongsBeforeSponsor(event.songsBeforeSponsor);
			}
		} else {
			setSongsBeforeJingle(undefined);
			setSongsBeforeSponsor(undefined);
		}
	};

	const selectAllKaras = () => {
		if (data?.content) {
			let checkedKarasNumber = 0;
			for (const kara of data.content) {
				if (kara) {
					kara.checked = !selectAllKarasChecked;
					if (kara.checked) checkedKarasNumber++;
				}
			}
			setData(data);
			setCheckedKaras(checkedKarasNumber);
			setSelectAllKarasChecked(!selectAllKarasChecked);
		}
	};

	const checkKara = (id: string | number) => {
		let checkedKarasNumber = checkedKaras;
		for (const kara of data.content) {
			if (!isNonStandardPlaylist(getPlaylistInfo(props.side, context)?.plaid)) {
				if (kara?.plcid === id) {
					kara.checked = !kara.checked;
					if (kara.checked) {
						checkedKarasNumber++;
					} else {
						checkedKarasNumber--;
					}
				}
			} else if (kara?.kid === id) {
				kara.checked = !kara.checked;
				if (kara.checked) {
					checkedKarasNumber++;
				} else {
					checkedKarasNumber--;
				}
			}
		}
		setData(data);
		setCheckedKaras(checkedKarasNumber);
	};

	const getSearchTagForAddAll = () => {
		const criterias = {
			year: 'y',
			tag: 't',
		};
		return {
			q:
				searchCriteria && criterias[searchCriteria] && searchValue
					? `${criterias[searchCriteria]}:${searchValue}`
					: undefined,
			order: searchType !== 'search' ? searchType : undefined,
			orderByLikes: orderByLikes || undefined,
		};
	};

	const addRandomKaras = () => {
		callModal(
			context.globalDispatch,
			'prompt',
			i18next.t('CL_ADD_RANDOM_TITLE'),
			'',
			async (nbOfRandoms: number) => {
				const randomKaras = await commandBackend(getPlaylistUrl(), {
					filter: getFilterValue(props.side),
					plaid: getPlaylistInfo(props.side, context)?.plaid,
					random: nbOfRandoms,
					...getSearchTagForAddAll(),
				});
				if (randomKaras.content.length > 0) {
					const textContent = randomKaras.content.map(e => (
						<Fragment key={e.kid}>
							{buildKaraTitle(context.globalState.settings.data, e, true)} <br />
							<br />
						</Fragment>
					));
					callModal(
						context.globalDispatch,
						'confirm',
						i18next.t('CL_CONGRATS'),
						<>
							{i18next.t('CL_ABOUT_TO_ADD')}
							<br />
							<br />
							{textContent}
						</>,
						() => {
							const karaList = randomKaras.content.map(a => {
								return a.kid;
							});
							commandBackend(WS_CMD.ADD_KARA_TO_PLAYLIST, {
								kids: karaList,
								plaid: getOppositePlaylistInfo(props.side, context).plaid,
							}).catch(() => {});
						},
						''
					);
				}
			},
			'1'
		);
	};

	const addAllKaras = async () => {
		const response = await commandBackend(getPlaylistUrl(), {
			filter: getFilterValue(props.side),
			plaid: getPlaylistInfo(props.side, context)?.plaid,
			...getSearchTagForAddAll(),
		});
		const karaList = response.content.map(a => a.kid);
		displayMessage('info', i18next.t('PL_MULTIPLE_ADDED', { count: response.content.length }));
		commandBackend(WS_CMD.ADD_KARA_TO_PLAYLIST, {
			kids: karaList,
			requestedby: context.globalState.auth.data.username,
			plaid: getOppositePlaylistInfo(props.side, context).plaid,
		}).catch(() => {});
	};

	const addCheckedKaras = async (_?, pos?: number) => {
		const listKara = data?.content.filter(a => a?.checked);
		if (!listKara || listKara.length === 0) {
			displayMessage('warning', i18next.t('SELECT_KARAS_REQUIRED'));
			return;
		}
		const idsKara = listKara.map(a => a.kid);
		const idsKaraPlaylist = listKara.map(a => a.plcid);
		let url: WSCmdDefinition<object, any>;
		let dataApi;
		const oppositePlaylist = getOppositePlaylistInfo(props.side, context);

		if (!oppositePlaylist.flag_smart) {
			if (!isNonStandardPlaylist(getPlaylistInfo(props.side, context)?.plaid) && !pos) {
				url = WS_CMD.COPY_KARA_TO_PLAYLIST;
				dataApi = {
					plaid: oppositePlaylist.plaid,
					plc_ids: idsKaraPlaylist,
				};
			} else {
				url = WS_CMD.ADD_KARA_TO_PLAYLIST;
				if (pos) {
					dataApi = {
						plaid: oppositePlaylist.plaid,
						requestedby: context.globalState.auth.data.username,
						kids: idsKara,
						pos: pos,
					};
				} else {
					dataApi = {
						plaid: oppositePlaylist.plaid,
						requestedby: context.globalState.auth.data.username,
						kids: idsKara,
					};
				}
			}
		} else if (oppositePlaylist.flag_smart) {
			url = WS_CMD.ADD_CRITERIAS;
			dataApi = {
				criterias: idsKara.map(kid => {
					return { type: 1001, value: kid, plaid: oppositePlaylist.plaid };
				}),
			};
		} else if (oppositePlaylist.plaid === nonStandardPlaylists.favorites) {
			url = WS_CMD.ADD_FAVORITES;
			dataApi = {
				kids: idsKara,
			};
		}
		try {
			await commandBackend(url, dataApi);
			for (const kara of data.content) {
				if (kara) {
					kara.checked = false;
				}
			}
			setData(data);
			setSelectAllKarasChecked(false);
		} catch (_) {
			// error already display
		}
	};

	const transferCheckedKaras = () => {
		addCheckedKaras();
		deleteCheckedKaras();
	};

	const deleteCheckedKaras = async () => {
		let url: WSCmdDefinition<object, void>;
		let dataApi;
		const listKara = data?.content.filter(a => a.checked) || [];
		if (listKara.length === 0) {
			displayMessage('warning', i18next.t('SELECT_KARAS_REQUIRED'));
			return;
		}
		const playlist = getPlaylistInfo(props.side, context);
		if (playlist?.plaid === nonStandardPlaylists.favorites) {
			url = WS_CMD.DELETE_FAVORITES;
			dataApi = {
				kids: listKara.map(a => a.kid),
			};
		} else if (!playlist?.flag_smart) {
			const idsKaraPlaylist = listKara.map(a => a.plcid);
			url = WS_CMD.DELETE_KARA_FROM_PLAYLIST;
			dataApi = {
				plc_ids: idsKaraPlaylist,
			};
		}
		if (url) {
			try {
				await commandBackend(url, dataApi);
				setCheckedKaras(0);
				setSelectAllKarasChecked(false);
			} catch (_) {
				// already display
			}
		}
	};

	const deleteCheckedFavorites = async () => {
		const listKara = data.content.filter(a => a.checked);
		if (listKara.length === 0) {
			displayMessage('warning', i18next.t('SELECT_KARAS_REQUIRED'));
			return;
		}
		await commandBackend(WS_CMD.DELETE_FAVORITES, {
			kids: listKara.map(a => a.kid),
		});
		setSelectAllKarasChecked(false);
	};

	const acceptCheckedKara = async () => {
		const listKara = data.content.filter(a => a.checked);
		if (listKara.length === 0) {
			displayMessage('warning', i18next.t('SELECT_KARAS_REQUIRED'));
			return;
		}
		const idsKaraPlaylist = listKara.map(a => a.plcid);
		await commandBackend(WS_CMD.EDIT_PLC, {
			plc_ids: idsKaraPlaylist,
			flag_accepted: true,
		}).catch(() => {});
		setSelectAllKarasChecked(false);
	};

	const refuseCheckedKara = async () => {
		const listKara = data.content.filter(a => a.checked);
		if (listKara.length === 0) {
			displayMessage('warning', i18next.t('SELECT_KARAS_REQUIRED'));
			return;
		}
		const idsKaraPlaylist = listKara.map(a => a.plcid);
		await commandBackend(WS_CMD.EDIT_PLC, {
			plc_ids: idsKaraPlaylist,
			flag_refused: true,
		}).catch(() => {});
		setSelectAllKarasChecked(false);
	};

	const downloadAllMedias = async () => {
		const response = await commandBackend(getPlaylistUrl(), { plaid: getPlaylistInfo(props.side, context)?.plaid });
		const karaList: KaraDownloadRequest[] = response.content
			.filter(kara => kara.download_status === 'MISSING')
			.map(kara => {
				return {
					mediafile: kara.mediafile,
					kid: kara.kid,
					size: kara.mediasize,
					name: buildKaraTitle(context.globalState.settings.data, kara, true) as string,
					repository: kara.repository,
				};
			});
		if (karaList.length > 0) commandBackend(WS_CMD.ADD_DOWNLOADS, { downloads: karaList }).catch(() => {});
	};

	const onChangeTags = (type: number | string, value: string) => {
		const newSearchCriteria = type === 0 ? 'year' : 'tag';
		const newStringValue = value && newSearchCriteria === 'tag' ? `${value}~${type}` : value;
		setSearchCriteria(newSearchCriteria);
		setSearchValue(newStringValue);
	};

	const deleteCriteria = (kara: KaraElement) => {
		if (kara.criterias[0].type === 1001) {
			removeCriterias(kara);
		} else {
			const criteria = kara.criterias[0];
			let typeLabel;
			if (criteria.type === 0) {
				typeLabel = i18next.t('DETAILS.YEAR');
			} else if (criteria.type > 1000) {
				typeLabel = i18next.t(`CRITERIA.CRITERIA_TYPE_${criteria.type}`);
			} else {
				typeLabel = i18next.t(`TAG_TYPES.${getTagTypeName(criteria.type as TagTypeNum)}_other`);
			}
			callModal(
				context.globalDispatch,
				'confirm',
				i18next.t('CL_DELETE_CRITERIAS_PLAYLIST', { type: typeLabel }),
				<div style={{ maxHeight: '200px' }}>
					{data.content
						.filter(
							e =>
								e.criterias[0].value === kara.criterias[0].value &&
								e.criterias[0].type === kara.criterias[0].type
						)
						.map(criteria => {
							return (
								<div key={kara.kid}>
									{buildKaraTitle(
										context.globalState.settings.data,
										criteria as unknown as KaraElement,
										true
									)}
								</div>
							);
						})}
				</div>,
				async (confirm: boolean) => {
					if (confirm) {
						removeCriterias(kara);
					}
				}
			);
		}
	};

	const removeCriterias = async (kara: KaraElement) => {
		await commandBackend(WS_CMD.REMOVE_CRITERIAS, {
			criterias: [
				{
					plaid: getPlaylistInfo(props.side, context)?.plaid,
					type: kara.criterias[0].type,
					value: kara.criterias[0].value,
				},
			],
		});
		if (kara.criterias.length > 1) {
			kara.criterias = kara.criterias.slice(1);
			deleteCriteria(kara);
		}
	};

	const sortRow = useCallback(
		(result: DropResult) => {
			if (!result.destination) {
				return;
			}
			if (result.source.index === result.destination.index) {
				return;
			}
			const oldIndex = result.source.index;
			const newIndex = result.destination.index;
			if (oldIndex !== newIndex) {
				setGotToPlayingAvoidScroll(true);
				setData(data => {
					// extract plcid based on sorter index
					const plcid = data.content[oldIndex].plcid;

					// fix index to match api behaviour
					let apiIndex = newIndex + 1;
					if (newIndex > oldIndex) apiIndex = apiIndex + 1;
					try {
						commandBackend(WS_CMD.EDIT_PLC, {
							pos: apiIndex,
							plc_ids: [plcid],
						}).finally(() => {
							setStopUpdate(false);
						});

						const result = Array.from(data.content);
						const [removed] = result.splice(oldIndex, 1);
						result.splice(newIndex, 0, removed);
						data.content = result;
					} catch (_) {
						//already display
					}

					return data;
				});
			}
		},
		[setData]
	);

	const avoidErrorInDnd = e => {
		if (
			e.message === 'ResizeObserver loop completed with undelivered notifications.' ||
			e.message === 'ResizeObserver loop limit exceeded'
		) {
			e.stopImmediatePropagation();
		}
	};

	const getRepositories = async () => {
		const newRepos = [];
		if (context) {
			for (const value of context.globalState.settings.data.config.System.Repositories.filter(
				value => value.Enabled && value.Online
			)) {
				if (isAdmin) {
					const manifest: RepositoryManifestV2 = await commandBackend(WS_CMD.GET_REPO_MANIFEST, {
						name: value.Name,
					});
					newRepos.push({
						name: value.Name,
						url: `http${value.Secure && 's'}://${value.Name}/`,
						suggestUrl: manifest.suggestURL,
					});
				} else {
					newRepos.push({
						name: value.Name,
						url: `http${value.Secure && 's'}://${value.Name}/`,
					});
				}
			}
		}
		setRepositories(newRepos);
	};

	const swapPLCs = async (plc: number) => {
		if (plcidToSwap && plc) {
			if (plc !== plcidToSwap) {
				await commandBackend(WS_CMD.SWAP_PLCS, {
					plcid1: plcidToSwap,
					plcid2: plc,
				});
			}
			setPlcidToSwap(undefined);
		} else if (plc) {
			setPlcidToSwap(plc);
			displayMessage('success', i18next.t('KARA.SWAP_DESCRIPTION'));
		}
	};

	useDeferredEffect(() => {
		getRepositories();
	}, [context.globalState.settings.data.config.System.Repositories]);

	useDeferredEffect(() => {
		if (!stopUpdate) {
			if (!isNonStandardPlaylist(getPlaylistInfo(props.side, context)?.plaid) && data) data.infos.from = 0;
			scrollToIndex(0);
			getPlaylist(searchType);
		}
	}, [getFilterValue(props.side)]);

	useDeferredEffect(() => {
		plaid.current = getPlaylistInfo(props.side, context)?.plaid;
		setData(null); // will trigger initCall
		if (
			isAdmin &&
			getPlaylistInfo(props.side, context)?.plaid === nonStandardPlaylists.library &&
			props.searchMenuOpen &&
			props.toggleSearchMenu
		) {
			props.toggleSearchMenu();
		}
	}, [getPlaylistInfo(props.side, context)?.plaid]);

	useDeferredEffect(() => {
		if (data === null) initCall();
	}, [data === null]);

	useDeferredEffect(() => {
		getPlaylist(searchType);
	}, [searchValue]);

	useDeferredEffect(() => {
		getPlaylist(props.searchType);
	}, [props.searchType]);

	useEffect(() => {
		const favoritesUpdated = () => {
			if (searchType && getPlaylistInfo(props.side, context)?.plaid === nonStandardPlaylists.favorites)
				getPlaylist(searchType);
		};
		const animelistUpdated = () => {
			if (getPlaylistInfo(props.side, context)?.plaid === nonStandardPlaylists.animelist) getPlaylist();
		};

		getSocket().on('favoritesUpdated', favoritesUpdated);
		getSocket().on('animelistUpdated', animelistUpdated);
		getSocket().on('playlistContentsUpdated', playlistContentsUpdatedFromServer);
		getSocket().on('publicPlaylistEmptied', publicPlaylistEmptied);
		getSocket().on('KIDUpdated', KIDUpdated);
		getSocket().on('playerStatus', updateCounters);
		getSocket().on('databaseGenerated', updateLibrary);
		if (isAdmin) {
			getSocket().on('refreshLibrary', displayLibraryBanner);
		} else {
			getSocket().on('refreshLibrary', debounceUpdateLibrary);
		}
		return () => {
			getSocket().off('favoritesUpdated', favoritesUpdated);
			getSocket().off('animelistUpdated', animelistUpdated);
			getSocket().off('playlistContentsUpdated', playlistContentsUpdatedFromServer);
			getSocket().off('publicPlaylistEmptied', publicPlaylistEmptied);
			getSocket().off('KIDUpdated', KIDUpdated);
			getSocket().off('playerStatus', updateCounters);
			getSocket().off('databaseGenerated', updateLibrary);
			if (isAdmin) {
				getSocket().off('refreshLibrary', displayLibraryBanner);
			} else {
				getSocket().off('refreshLibrary', debounceUpdateLibrary);
			}
		};
	}, [
		context.globalState.frontendContext.playlistInfoLeft,
		context.globalState.frontendContext.playlistInfoRight,
		getFilterValue(props.side),
		searchValue,
		searchType,
	]);

	useEffect(() => {
		if (context.globalState.auth.isAuthenticated) {
			initCall();
		}
	}, []);

	useResizeListener(avoidErrorInDnd);

	const playlist = getPlaylistInfo(props.side, context);
	return (
		<div className="playlist--wrapper">
			<style>
				{`
          .height-preserving-container:empty {
            min-height: calc(var(--child-height));
            box-sizing: border-box;
          }
      `}
			</style>
			{isAdmin && !quizRanking ? (
				<PlaylistHeader
					side={props.side}
					playlistList={props.playlistList}
					selectAllKarasChecked={selectAllKarasChecked}
					selectAllKaras={selectAllKaras}
					addAllKaras={addAllKaras}
					addCheckedKaras={addCheckedKaras}
					transferCheckedKaras={transferCheckedKaras}
					deleteCheckedKaras={deleteCheckedKaras}
					deleteCheckedFavorites={deleteCheckedFavorites}
					refuseCheckedKara={refuseCheckedKara}
					acceptCheckedKara={acceptCheckedKara}
					onChangeTags={onChangeTags}
					getPlaylist={getPlaylist}
					toggleSearchMenu={toggleSearchMenu}
					searchMenuOpen={props.searchMenuOpen}
					checkedKaras={data?.content?.filter(a => a?.checked)}
					addRandomKaras={addRandomKaras}
					downloadAllMedias={downloadAllMedias}
					criteriasOpen={criteriasOpen}
					openCloseCriterias={() => setCriteriasOpen(!criteriasOpen)}
					refreshLibraryBanner={refreshLibraryBanner}
				/>
			) : null}
			<div id={'playlist' + props.side} className="playlistContainer" ref={refContainer}>
				{playlist?.flag_smart && criteriasOpen ? <CriteriasList playlist={playlist} /> : null}
				{quizRanking ? <QuizRanking /> : null}
				{!data?.infos && !criteriasOpen && !quizRanking && isPlaylistInProgress ? (
					<div className="loader" />
				) : data && !criteriasOpen && !quizRanking ? (
					<DragDropContext onDragEnd={sortRow}>
						<Droppable
							droppableId={'droppable' + props.side}
							mode="virtual"
							renderClone={(provided, snapshot, rubric) => (
								<Item
									provided={provided}
									isDragging={snapshot.isDragging}
									index={rubric.source.index}
								/>
							)}
						>
							{provided => (
								<Virtuoso
									components={{
										Item: HeightPreservingItem,
										EmptyPlaceholder: noRowsRenderer,
										Footer: () => <div style={{ height: '2.25rem' }} />,
									}}
									// @ts-expect-error Ignore virtuso typing error
									scrollerRef={provided.innerRef}
									style={{ flex: '1 0 auto' }}
									itemContent={index => (
										<Draggable
											isDragDisabled={!sortable}
											draggableId={`${props.side}-${index}`}
											index={index}
											key={`${props.side}-${index}`}
										>
											{provided => <Item provided={provided} index={index} isDragging={false} />}
										</Draggable>
									)}
									initialTopMostItemIndex={context.globalState.frontendContext.indexKaraDetail || 0}
									totalCount={data.infos.count}
									rangeChanged={scrollHandler}
									increaseViewportBy={10}
									ref={virtuoso}
								/>
							)}
						</Droppable>
					</DragDropContext>
				) : null}
			</div>
			<div className="plFooter">
				{!criteriasOpen && !quizRanking ? (
					<div className="plBrowse btn-group">
						<button
							type="button"
							title={i18next.t('GOTO_TOP')}
							className="btn btn-action"
							onClick={() => {
								scrollToIndex(0);
								setGotToPlaying(false);
								setGotToPlayingAvoidScroll(false);
							}}
						>
							<i className="fas fa-chevron-up" />
						</button>
						{!isNonStandardPlaylist(playlist?.plaid) ? (
							<button
								type="button"
								title={i18next.t('GOTO_PLAYING')}
								className={`btn btn-action ${goToPlaying ? 'btn-active' : ''}`}
								onClick={scrollToPlaying}
								value="playing"
							>
								<i className="fas fa-play" />
							</button>
						) : null}
						<button
							type="button"
							title={i18next.t('GOTO_BOTTOM')}
							className="btn btn-action"
							onClick={() => {
								if (data?.infos) {
									scrollToIndex(data.infos.count - 1);
									setGotToPlaying(false);
									setGotToPlayingAvoidScroll(false);
								}
							}}
						>
							<i className="fas fa-chevron-down" />
						</button>
					</div>
				) : null}
				{!quizRanking && <div className="plInfos">{getPlInfosElement()}</div>}
				{checkedKaras > 0 ? (
					<div className="plQuota selection">
						{i18next.t('CHECKED')}
						{checkedKaras}
					</div>
				) : null}
			</div>
		</div>
	);
}

export default Playlist;
