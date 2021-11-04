import './Playlist.scss';

import i18next from 'i18next';
import debounce from 'lodash.debounce';
import {
	Fragment,
	PropsWithChildren,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from 'react';
import { DragDropContext, Draggable, DraggableProvided, Droppable, DropResult } from 'react-beautiful-dnd';
import { ItemProps, ListRange, Virtuoso } from 'react-virtuoso';

import { DownloadedStatus } from '../../../../../src/lib/types/database/download';
import { KaraDownloadRequest } from '../../../../../src/types/download';
import { PublicPlayerState } from '../../../../../src/types/state';
import GlobalContext from '../../../store/context';
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
import { Tag } from '../../types/tag';
import CriteriasList from './CriteriasList';
import KaraLine from './KaraLine';
import PlaylistHeader from './PlaylistHeader';

const chunksize = 400;
let timer: any;

interface IProps {
	scope: 'admin' | 'public';
	side: 'left' | 'right';
	tags?: Tag[];
	searchMenuOpen?: boolean;
	playlistList?: PlaylistElem[];
	toggleSearchMenu?: () => void;
	toggleKaraDetail: (kara: KaraElement, plaid: string, index?: number) => void;
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

	const favoritesUpdated = () => {
		if (getPlaylistInfo(props.side, context)?.plaid === nonStandardPlaylists.favorites) getPlaylist();
	};

	const publicPlaylistEmptied = () => {
		if (getPlaylistInfo(props.side, context)?.plaid === nonStandardPlaylists.library) {
			setData((oldData) => {
				for (const kara of oldData.content) {
					if (kara) {
						kara.my_public_plc_id = [];
						kara.public_plc_id = [];
						kara.flag_upvoted = false;
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
			setData((oldData) => {
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
				return oldData;
			});
		}
	};

	const scrollToIndex = useCallback(
		(index) => {
			virtuoso.current?.scrollToIndex({
				index,
				align: 'start',
				behavior: 'smooth',
			});
		},
		[virtuoso]
	);

	const getFilterValue = (side: 'left' | 'right') => {
		return side === 'left'
			? context.globalState.frontendContext.filterValue1 || ''
			: context.globalState.frontendContext.filterValue2 || '';
	};

	const initCall = async () => {
		setGotToPlaying(!isNonStandardPlaylist(getPlaylistInfo(props.side, context)?.plaid));
		setCriteriasOpen(false);
		await getPlaylist();
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

	const isRowLoaded = (index) => {
		return !!data?.content[index];
	};

	const scrollHandler = async ({ endIndex }: ListRange) => {
		clearScrollToIndex();
		if (isRowLoaded(endIndex)) return;
		else if (!isPlaylistInProgress) {
			data.infos.from = Math.floor(endIndex / chunksize) * chunksize;
			setData(data);
			if (timer) clearTimeout(timer);
			timer = setTimeout(getPlaylist, 1000);
		}
	};

	const HeightPreservingItem = useCallback(({ children, ...props }: PropsWithChildren<ItemProps>) => {
		return (
			// the height is necessary to prevent the item container from collapsing, which confuses Virtuoso measurements
			<div {...props} style={{ minHeight: 1 }}>
				{children}
			</div>
		);
	}, []);

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
		getPlaylistInfo(props.side, context).plaid,
	]);

	const Item = useCallback(
		({ provided, index, isDragging }: { provided: DraggableProvided; index: number; isDragging: boolean }) => {
			let content: KaraElement;
			if (data?.content[index]) {
				content = data.content[index];
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
						jingle={typeof songsBeforeJingle === 'number' && index === playing + songsBeforeJingle}
						sponsor={typeof songsBeforeSponsor === 'number' && index === playing + songsBeforeSponsor}
						toggleKaraDetail={(kara, idPlaylist) => {
							props.toggleKaraDetail(kara, idPlaylist, index);
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
		[sortable, playing, data]
	);

	const noRowsRenderer = useCallback(() => {
		return (
			<>
				{getPlaylistInfo(props.side, context)?.plaid === nonStandardPlaylists.library &&
					props.scope === 'admin' ?
					(
						<div className="list-group-item karaSuggestion">
							<div>{i18next.t('KARA_SUGGESTION_NOT_FOUND')}</div>
							{context?.globalState.settings.data.config.System.Repositories.filter(
								(value) => value.Enabled && value.Online
							).map((value) => (
								<a key={value.Name} href={`https://${value.Name}/`}>
									{value.Name}
								</a>
							))}
							<a href="https://suggest.karaokes.moe">suggest.karaokes.moe</a>
						</div>
					) : null
				}
			</>
		);
	}, [getPlaylistInfo(props.side, context)?.plaid]);

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

	const getPlaylist = async (searchTypeParam?: 'search' | 'recent' | 'requested', orderByLikes?: boolean) => {
		const criterias: any = {
			year: 'y',
			tag: 't',
		};
		setPlaylistInProgress(true);
		if (searchTypeParam) {
			setSearchType(searchTypeParam);
			if (data?.infos) data.infos.from = 0;
			setData(data);
		} else if (data?.infos?.from === 0) {
			setSearchType(undefined);
		}
		if (orderByLikes !== undefined) {
			setOrderByLikes(orderByLikes);
		}
		const url: string = getPlaylistUrl();
		const param: any = {};
		if (!isNonStandardPlaylist(getPlaylistInfo(props.side, context)?.plaid)) {
			param.plaid = getPlaylistInfo(props.side, context)?.plaid;
			if (orderByLikes || (orderByLikes === undefined && orderByLikes)) {
				param.orderByLikes = true;
			}
		}

		param.filter = getFilterValue(props.side);
		param.from = data?.infos?.from > 0 ? data.infos.from : 0;
		param.size = chunksize;
		param.blacklist = true;
		if (searchType) {
			param.order = searchType === 'search' ? undefined : searchType;
		} else if (searchType !== 'search') {
			param.order = searchType;
		}
		if (searchCriteria && searchValue) {
			param.q = `${searchCriteria ? criterias[searchCriteria] : ''}:${searchValue}`;
		}
		try {
			const karas: KaraList = await commandBackend(url, param);
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

	const playingUpdate = (dataUpdate: { plaid: string; plc_id: number }) => {
		if (!stopUpdate && getPlaylistInfo(props.side, context)?.plaid === dataUpdate.plaid) {
			setData((oldData) => {
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
	};

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
					` / ${secondsTimeSpanToHMS(getPlaylistInfo(props.side, context)?.time_left, 'hm')} ${is_touch_device() ? 're.' : i18next.t('DURATION_REMAINING')
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
			setSongsBeforeJingle(event.songsBeforeJingle);
			setSongsBeforeSponsor(event.songsBeforeSponsor);
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
							}).catch(() => { });
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
		}).catch(() => { });
	};

	const addCheckedKaras = async (_event?: any, pos?: number) => {
		const listKara = data.content.filter((a) => a?.checked);
		if (listKara.length === 0) {
			displayMessage('warning', i18next.t('SELECT_KARAS_REQUIRED'));
			return;
		}
		const idsKara = listKara.map((a) => a.kid);
		const idsKaraPlaylist = listKara.map((a) => String(a.plcid));
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
				criterias: idsKara.map((kid) => {
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
		const listKara = data.content.filter((a) => a.checked);
		if (listKara.length === 0) {
			displayMessage('warning', i18next.t('SELECT_KARAS_REQUIRED'));
			return;
		}
		if (getPlaylistInfo(props.side, context)?.plaid === nonStandardPlaylists.favorites) {
			url = 'deleteFavorites';
			dataApi = {
				kids: listKara.map((a) => a.kid),
			};
		} else if (!getPlaylistInfo(props.side, context)?.flag_smart) {
			const idsKaraPlaylist = listKara.map((a) => a.plcid);
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
		const listKara = data.content.filter((a) => a.checked);
		if (listKara.length === 0) {
			displayMessage('warning', i18next.t('SELECT_KARAS_REQUIRED'));
			return;
		}
		await commandBackend('deleteFavorites', {
			kids: listKara.map((a) => a.kid),
		});
		setSelectAllKarasChecked(false);
	};

	const acceptCheckedKara = async () => {
		const listKara = data.content.filter((a) => a.checked);
		if (listKara.length === 0) {
			displayMessage('warning', i18next.t('SELECT_KARAS_REQUIRED'));
			return;
		}
		const idsKaraPlaylist = listKara.map((a) => a.plcid);
		await commandBackend('editPLC', {
			plc_ids: idsKaraPlaylist,
			flag_accepted: true,
		}).catch(() => { });
		setSelectAllKarasChecked(false);
	};

	const refuseCheckedKara = async () => {
		const listKara = data.content.filter((a) => a.checked);
		if (listKara.length === 0) {
			displayMessage('warning', i18next.t('SELECT_KARAS_REQUIRED'));
			return;
		}
		const idsKaraPlaylist = listKara.map((a) => a.plcid);
		await commandBackend('editPLC', {
			plc_ids: idsKaraPlaylist,
			flag_refused: true,
		}).catch(() => { });
		setSelectAllKarasChecked(false);
	};

	const downloadAllMedias = async () => {
		const response = await commandBackend(getPlaylistUrl(), { plaid: getPlaylistInfo(props.side, context)?.plaid });
		const karaList: KaraDownloadRequest[] = response.content
			.filter((kara) => kara.download_status === 'MISSING')
			.map((kara: KaraElement) => {
				return {
					mediafile: kara.mediafile,
					kid: kara.kid,
					size: kara.mediasize,
					name: buildKaraTitle(context.globalState.settings.data, kara, true) as string,
					repository: kara.repository,
				};
			});
		if (karaList.length > 0) commandBackend('addDownloads', { downloads: karaList }).catch(() => { });
	};

	const onChangeTags = (type: number | string, value: string) => {
		const newSearchCriteria = type === 0 ? 'year' : 'tag';
		const newStringValue = value && newSearchCriteria === 'tag' ? `${value}~${type}` : value;
		setSearchCriteria(newSearchCriteria);
		setSearchValue(newStringValue);
	};

	const deleteCriteria = (kara: KaraElement) => {
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
						(e) =>
							e.criterias[0].value === kara.criterias[0].value &&
							e.criterias[0].type === kara.criterias[0].type
					)
					.map((criteria) => {
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
				}
			}
		);
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
				setData((data) => {
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

	const avoidErrorInDnd = (e) => {
		if (
			e.message === 'ResizeObserver loop completed with undelivered notifications.' ||
			e.message === 'ResizeObserver loop limit exceeded'
		) {
			e.stopImmediatePropagation();
		}
	};

	useEffect(() => {
		if (!stopUpdate) {
			if (!isNonStandardPlaylist(getPlaylistInfo(props.side, context)?.plaid) && data) data.infos.from = 0;
			scrollToIndex(0);
			getPlaylist(searchType);
		}
	}, [getFilterValue(props.side)]);

	useEffect(() => {
		getPlaylist(props.searchType);
	}, [props.searchType]);

	useEffect(() => {
		initCall();
		if (
			props.scope === 'admin' &&
			getPlaylistInfo(props.side, context)?.plaid === nonStandardPlaylists.library &&
			props.searchMenuOpen
		) {
			props.toggleSearchMenu && props.toggleSearchMenu();
		}
	}, [getPlaylistInfo(props.side, context)?.plaid]);

	useEffect(() => {
		getPlaylist('search');
	}, [searchValue]);

	useEffect(() => {
		if (props.indexKaraDetail) {
			scrollToIndex(props.indexKaraDetail);
			props.clearIndexKaraDetail();
		}
	}, [data]);

	useEffect(() => {
		if (context.globalState.auth.isAuthenticated) {
			initCall();
		}
		getSocket().on('playingUpdated', playingUpdate);
		getSocket().on('favoritesUpdated', favoritesUpdated);
		getSocket().on('playlistContentsUpdated', playlistContentsUpdatedFromServer);
		getSocket().on('publicPlaylistEmptied', publicPlaylistEmptied);
		getSocket().on('KIDUpdated', KIDUpdated);
		getSocket().on('playerStatus', updateCounters);
		window.addEventListener('error', avoidErrorInDnd);
		return () => {
			getSocket().off('playingUpdated', playingUpdate);
			getSocket().off('favoritesUpdated', favoritesUpdated);
			getSocket().off('playlistContentsUpdated', playlistContentsUpdatedFromServer);
			getSocket().off('publicPlaylistEmptied', publicPlaylistEmptied);
			getSocket().off('KIDUpdated', KIDUpdated);
			getSocket().off('playerStatus', updateCounters);
			window.removeEventListener('error', avoidErrorInDnd);
		};
	}, []);

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
					tags={props.tags}
					onChangeTags={onChangeTags}
					getPlaylist={getPlaylist}
					toggleSearchMenu={toggleSearchMenu}
					searchMenuOpen={props.searchMenuOpen}
					checkedKaras={data?.content?.filter((a) => a?.checked)}
					addRandomKaras={addRandomKaras}
					downloadAllMedias={downloadAllMedias}
					criteriasOpen={criteriasOpen}
					openCloseCriterias={() => setCriteriasOpen(!criteriasOpen)}
				/>
			) : null}
			<div id={'playlist' + props.side} className="playlistContainer" ref={refContainer}>
				{playlist?.flag_smart && criteriasOpen ?
					<CriteriasList tags={props.tags} playlist={playlist} /> : null
				}
				{(data?.infos && (data.infos.count === 0 || !data.infos.count)) && !criteriasOpen && isPlaylistInProgress ? (
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
							{(provided) => (
								<Virtuoso
									components={{
										Item: HeightPreservingItem,
										EmptyPlaceholder: noRowsRenderer,
										Footer: () => <div style={{ height: '2.25rem' }} />,
									}}
									// @ts-ignore
									scrollerRef={provided.innerRef}
									style={{ height: '100%' }}
									itemContent={(index) => (
										<Draggable
											isDragDisabled={!sortable}
											draggableId={`${props.side}-${index}`}
											index={index}
											key={`${props.side}-${index}`}
										>
											{(provided) => (
												<Item provided={provided} index={index} isDragging={false} />
											)}
										</Draggable>
									)}
									totalCount={data.infos.count}
									rangeChanged={scrollHandler}
									ref={virtuoso}
								/>
							)}
						</Droppable>
					</DragDropContext>
				) : null
				}
			</div>
			<div className="plFooter">
				{!criteriasOpen ?
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
								scrollToIndex(data.infos?.count - 1);
								setGotToPlaying(false);
								setGotToPlayingAvoidScroll(false);
							}}
						>
							<i className="fas fa-chevron-down" />
						</button>
					</div>
					: null
				}
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
