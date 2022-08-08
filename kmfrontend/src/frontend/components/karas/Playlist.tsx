import './Playlist.scss';

import i18next from 'i18next';
import { debounce } from 'lodash';
import { Fragment, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { DragDropContext, Draggable, DraggableProvided, Droppable, DropResult } from 'react-beautiful-dnd';
import { ItemProps, ListRange, Virtuoso } from 'react-virtuoso';

import { DownloadedStatus } from '../../../../../src/lib/types/database/download';
import { KaraDownloadRequest } from '../../../../../src/types/download';
import { PublicPlayerState } from '../../../../../src/types/state';
import GlobalContext from '../../../store/context';
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
import TasksEvent from '../../../TasksEvent';

const chunksize = 400;
let timer: any;

interface IProps {
	scope: 'admin' | 'public';
	side: 'left' | 'right';
	searchMenuOpen?: boolean;
	playlistList?: PlaylistElem[];
	toggleSearchMenu?: () => void;
	openKara: (kara: KaraElement, index?: number) => void;
	searchValue?: string;
	searchCriteria?: 'year' | 'tag';
	indexKaraDetail?: number;
	clearIndexKaraDetail?: () => void;
	searchType?: 'search' | 'recent' | 'requested';
}
interface KaraList {
	content: KaraElement[];
	avatars: any;
	i18n?: any;
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
	const [searchType, setSearchType] = useState<'search' | 'recent' | 'requested'>(
		props.searchType ? props.searchType : 'search'
	);
	const [orderByLikes, setOrderByLikes] = useState(false);
	const [isPlaylistInProgress, setPlaylistInProgress] = useState(false);
	const [stopUpdate, setStopUpdate] = useState(false);
	const [data, setData] = useState<KaraList>();
	const [checkedKaras, setCheckedKaras] = useState(0);
	const [playing, setPlaying] = useState<number>();
	const [songsBeforeJingle, setSongsBeforeJingle] = useState<number>();
	const [songsBeforeSponsor, setSongsBeforeSponsor] = useState<number>();
	const [goToPlaying, setGotToPlaying] = useState<boolean>();
	// Avoid scroll event trigger
	const [goToPlayingAvoidScroll, setGotToPlayingAvoidScroll] = useState<boolean>();
	const [selectAllKarasChecked, setSelectAllKarasChecked] = useState(false);
	const [criteriasOpen, setCriteriasOpen] = useState(false);
	const virtuoso = useRef<any>(null);
	const plaid = useRef<string>(getPlaylistInfo(props.side, context)?.plaid);

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
		if (
			getPlaylistInfo(props.side, context)?.plaid === nonStandardPlaylists.library ||
			getPlaylistInfo(props.side, context)?.plaid === nonStandardPlaylists.favorites ||
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
			const result = await commandBackend('getPlayerStatus');
			updateCounters(result);
		} catch (e) {
			// already display
		}
	};

	const initCall = async () => {
		getPlayerStatus();
		setCriteriasOpen(false);
		if (isNonStandardPlaylist(getPlaylistInfo(props.side, context)?.plaid)) {
			scrollToIndex(0, false);
		}
		await getPlaylist();
		if (!isNonStandardPlaylist(getPlaylistInfo(props.side, context)?.plaid)) {
			scrollToPlaying();
		}
		setTimeout(props.clearIndexKaraDetail, 0);
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
		if (isRowLoaded(startIndex)) return;
		else if (!isPlaylistInProgress) {
			data.infos.from = Math.floor(startIndex / chunksize) * chunksize;
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
			props.scope === 'admin' &&
			!isNonStandardPlaylist(getPlaylistInfo(props.side, context).plaid) &&
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

	const HeightPreservingItem = ({ children, ...props }: PropsWithChildren<ItemProps>) => {
		const ref = useRef<HTMLDivElement>(null);
		const [height, setHeight] = useState<string>(null);

		useEffect(() => {
			if (ref.current.firstChild) {
				const realHeight = (ref.current.firstChild as HTMLDivElement).getBoundingClientRect();
				setHeight(`${realHeight.height}px`);
			}
		}, [props['data-index']]);

		return (
			// the height is necessary to prevent the item container from collapsing, which confuses Virtuoso measurements
			<div {...props} ref={ref} style={{ height: height || props['data-known-size'] || undefined }}>
				{children}
			</div>
		);
	};

	const Item = useCallback(
		({ provided, index, isDragging }: { provided: DraggableProvided; index: number; isDragging: boolean }) => {
			let content: KaraElement;
			if (data?.content[index]) {
				content = data.content[index];
				if (!playing && content.flag_playing) setPlaying(index);
				const jingle =
					typeof songsBeforeJingle === 'number' &&
					// Are jingles enabled?
					context.globalState.settings.data.config.Playlist.Medias.Jingles.Enabled &&
					// Use modulo to calculate each occurrence
					(index - (playing + songsBeforeJingle)) %
						context.globalState.settings.data.config.Playlist.Medias.Jingles.Interval ===
						0;
				const sponsor =
					typeof songsBeforeSponsor === 'number' &&
					// Are sponsors enabled?
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
		[sortable, playing, data, songsBeforeSponsor, songsBeforeJingle, checkedKaras]
	);

	const [repoInProgress, setRepoInProgress] = useState(false);

	const noRowsRenderer = useCallback(() => {
		return (
			<>
				{getPlaylistInfo(props.side, context)?.plaid === nonStandardPlaylists.library &&
				props.scope === 'admin' ? (
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
								{context?.globalState.settings.data.config.System.Repositories.filter(
									value => value.Enabled && value.Online
								).map(value => (
									<a key={value.Name} href={`https://${value.Name}/`}>
										{value.Name}
									</a>
								))}
								<a href="https://kara.moe/suggest">kara.moe/suggest</a>
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

	const getPlaylistUrl = (plaidParam?: string) => {
		const idPlaylist: string = plaidParam ? plaidParam : getPlaylistInfo(props.side, context)?.plaid;
		let url: string;
		if (idPlaylist === nonStandardPlaylists.library) {
			url = 'getKaras';
		} else if (idPlaylist === nonStandardPlaylists.favorites) {
			url = 'getFavorites';
		} else {
			url = 'getPlaylistContents';
		}
		return url;
	};

	const getPlaylist = async (searchTypeParam?: 'search' | 'recent' | 'requested', orderByLikesParam?: boolean) => {
		const criterias: any = {
			year: 'y',
			tag: 't',
		};
		setPlaylistInProgress(true);
		const loadingPlaid = getPlaylistInfo(props.side, context)?.plaid;
		let search = searchType;
		let order = orderByLikes;
		if (searchTypeParam) {
			setSearchType(searchTypeParam);
			search = searchTypeParam;
			if (data?.infos) data.infos.from = 0;
			setData(data);
		} else if (data?.infos?.from === 0) {
			setSearchType(undefined);
			search = undefined;
		}
		if (orderByLikesParam !== undefined) {
			setOrderByLikes(orderByLikesParam);
			order = orderByLikesParam;
		}
		const url: string = getPlaylistUrl();
		const param: any = {};
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
			props.scope === 'public' &&
			context.globalState.settings.data.user.flag_parentsonly &&
			param.plaid !== nonStandardPlaylists.favorites;
		if (search) {
			param.order = search === 'search' ? undefined : search;
		} else if (search !== 'search') {
			param.order = search;
		}
		if (searchCriteria && searchValue) {
			param.q = `${searchCriteria ? criterias[searchCriteria] : ''}:${searchValue}`;
		}
		try {
			const karas: KaraList = await commandBackend(url, param);
			// Check if the plaid is still relevant after request
			if (loadingPlaid !== plaid.current) return;
			if (goToPlaying && !isNonStandardPlaylist(getPlaylistInfo(props.side, context)?.plaid)) {
				const result = await commandBackend('findPlayingSongInPlaylist', {
					plaid: getPlaylistInfo(props.side, context)?.plaid,
				});
				if (result?.index !== -1) {
					scrollToIndex(result.index);
					setGotToPlayingAvoidScroll(true);
				}
			}
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
		} catch (e) {
			// already display
		}
	};

	const playingUpdate = useCallback(
		(dataUpdate: { plaid: string; plc_id: number }) => {
			if (!stopUpdate && getPlaylistInfo(props.side, context)?.plaid === dataUpdate.plaid) {
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
		},
		[goToPlaying]
	);

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
		if (getPlaylistInfo(props.side, context)?.plaid && data?.infos?.count) {
			plInfos =
				data.infos.count +
				' karas' +
				(!isNonStandardPlaylist(getPlaylistInfo(props.side, context)?.plaid) &&
				getPlaylistInfo(props.side, context)?.duration
					? ` ~ ${is_touch_device() ? 'dur.' : i18next.t('DETAILS.DURATION')} ` +
					  secondsTimeSpanToHMS(getPlaylistInfo(props.side, context)?.duration, 'hm') +
					  ` / ${secondsTimeSpanToHMS(getPlaylistInfo(props.side, context)?.time_left, 'hm')} ${
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
			const result = await commandBackend('findPlayingSongInPlaylist', {
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
				if (kara.plcid === id) {
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
		const criterias: any = {
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
					const textContent = randomKaras.content.map((e: KaraElement) => (
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
							const karaList = randomKaras.content.map((a: KaraElement) => {
								return a.kid;
							});
							commandBackend('addKaraToPlaylist', {
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
		const karaList = response.content.map((a: KaraElement) => a.kid);
		displayMessage('info', i18next.t('PL_MULTIPLE_ADDED', { count: response.content.length }));
		commandBackend('addKaraToPlaylist', {
			kids: karaList,
			requestedby: context.globalState.auth.data.username,
			plaid: getOppositePlaylistInfo(props.side, context).plaid,
		}).catch(() => {});
	};

	const addCheckedKaras = async (_event?: any, pos?: number) => {
		const listKara = data?.content.filter(a => a?.checked);
		if (!listKara || listKara.length === 0) {
			displayMessage('warning', i18next.t('SELECT_KARAS_REQUIRED'));
			return;
		}
		const idsKara = listKara.map(a => a.kid);
		const idsKaraPlaylist = listKara.map(a => a.plcid);
		let url = '';
		let dataApi;

		if (!getOppositePlaylistInfo(props.side, context).flag_smart) {
			if (!isNonStandardPlaylist(getPlaylistInfo(props.side, context)?.plaid) && !pos) {
				url = 'copyKaraToPlaylist';
				dataApi = {
					plaid: getOppositePlaylistInfo(props.side, context).plaid,
					plc_ids: idsKaraPlaylist,
				};
			} else {
				url = 'addKaraToPlaylist';
				if (pos) {
					dataApi = {
						plaid: getOppositePlaylistInfo(props.side, context).plaid,
						requestedby: context.globalState.auth.data.username,
						kids: idsKara,
						pos: pos,
					};
				} else {
					dataApi = {
						plaid: getOppositePlaylistInfo(props.side, context).plaid,
						requestedby: context.globalState.auth.data.username,
						kids: idsKara,
					};
				}
			}
		} else if (getOppositePlaylistInfo(props.side, context).flag_smart) {
			url = 'addCriterias';
			dataApi = {
				criterias: idsKara.map(kid => {
					return { type: 1001, value: kid, plaid: getOppositePlaylistInfo(props.side, context).plaid };
				}),
			};
		} else if (getOppositePlaylistInfo(props.side, context).plaid === nonStandardPlaylists.favorites) {
			url = 'addFavorites';
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
		} catch (err) {
			// error already display
		}
	};

	const transferCheckedKaras = () => {
		addCheckedKaras();
		deleteCheckedKaras();
	};

	const deleteCheckedKaras = async () => {
		let url;
		let dataApi;
		const listKara = data.content.filter(a => a.checked);
		if (listKara.length === 0) {
			displayMessage('warning', i18next.t('SELECT_KARAS_REQUIRED'));
			return;
		}
		if (getPlaylistInfo(props.side, context)?.plaid === nonStandardPlaylists.favorites) {
			url = 'deleteFavorites';
			dataApi = {
				kids: listKara.map(a => a.kid),
			};
		} else if (!getPlaylistInfo(props.side, context)?.flag_smart) {
			const idsKaraPlaylist = listKara.map(a => a.plcid);
			url = 'deleteKaraFromPlaylist';
			dataApi = {
				plc_ids: idsKaraPlaylist,
			};
		}
		if (url) {
			try {
				await commandBackend(url, dataApi);
				setCheckedKaras(0);
				setSelectAllKarasChecked(false);
			} catch (e) {
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
		await commandBackend('deleteFavorites', {
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
		await commandBackend('editPLC', {
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
		await commandBackend('editPLC', {
			plc_ids: idsKaraPlaylist,
			flag_refused: true,
		}).catch(() => {});
		setSelectAllKarasChecked(false);
	};

	const downloadAllMedias = async () => {
		const response = await commandBackend(getPlaylistUrl(), { plaid: getPlaylistInfo(props.side, context)?.plaid });
		const karaList: KaraDownloadRequest[] = response.content
			.filter(kara => kara.download_status === 'MISSING')
			.map((kara: KaraElement) => {
				return {
					mediafile: kara.mediafile,
					kid: kara.kid,
					size: kara.mediasize,
					name: buildKaraTitle(context.globalState.settings.data, kara, true) as string,
					repository: kara.repository,
				};
			});
		if (karaList.length > 0) commandBackend('addDownloads', { downloads: karaList }).catch(() => {});
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
				typeLabel = i18next.t(`TAG_TYPES.${getTagTypeName(criteria.type)}_other`);
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
		await commandBackend('removeCriterias', {
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
				setData(data => {
					// extract plcid based on sorter index
					const plcid = data.content[oldIndex].plcid;

					// fix index to match api behaviour
					let apiIndex = newIndex + 1;
					if (newIndex > oldIndex) apiIndex = apiIndex + 1;
					try {
						commandBackend('editPLC', {
							pos: apiIndex,
							plc_ids: [plcid],
						}).finally(() => {
							setStopUpdate(false);
						});

						const result = Array.from(data.content);
						const [removed] = result.splice(oldIndex, 1);
						result.splice(newIndex, 0, removed);
						data.content = result;
					} catch (e) {
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
			props.scope === 'admin' &&
			getPlaylistInfo(props.side, context)?.plaid === nonStandardPlaylists.library &&
			props.searchMenuOpen
		) {
			props.toggleSearchMenu && props.toggleSearchMenu();
		}
	}, [getPlaylistInfo(props.side, context)?.plaid]);

	useDeferredEffect(() => {
		if (data === null) initCall();
	}, [data === null]);

	useDeferredEffect(() => {
		getPlaylist('search');
	}, [searchValue]);

	useDeferredEffect(() => {
		getPlaylist(props.searchType);
	}, [props.searchType]);

	useEffect(() => {
		const favoritesUpdated = () => {
			if (searchType && getPlaylistInfo(props.side, context)?.plaid === nonStandardPlaylists.favorites)
				getPlaylist(searchType);
		};

		getSocket().on('favoritesUpdated', favoritesUpdated);
		getSocket().on('playlistContentsUpdated', playlistContentsUpdatedFromServer);
		getSocket().on('publicPlaylistEmptied', publicPlaylistEmptied);
		getSocket().on('KIDUpdated', KIDUpdated);
		getSocket().on('playerStatus', updateCounters);
		return () => {
			getSocket().off('favoritesUpdated', favoritesUpdated);
			getSocket().off('playlistContentsUpdated', playlistContentsUpdatedFromServer);
			getSocket().off('publicPlaylistEmptied', publicPlaylistEmptied);
			getSocket().off('KIDUpdated', KIDUpdated);
			getSocket().off('playerStatus', updateCounters);
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
			{props.scope === 'admin' ? (
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
				/>
			) : null}
			<div id={'playlist' + props.side} className="playlistContainer" ref={refContainer}>
				{playlist?.flag_smart && criteriasOpen ? <CriteriasList playlist={playlist} /> : null}
				{!data?.infos && !criteriasOpen && isPlaylistInProgress ? (
					<div className="loader" />
				) : data && !criteriasOpen ? (
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
									// @ts-ignore
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
									initialTopMostItemIndex={props.indexKaraDetail || 0}
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
				{!criteriasOpen ? (
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
				<div className="plInfos">{getPlInfosElement()}</div>
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
