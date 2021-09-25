import 'react-virtualized/styles.css';
import './Playlist.scss';

import i18next from 'i18next';
import debounce from 'lodash.debounce';
import React, { useContext, useEffect, useRef, useState } from 'react';
import { SortableContainer } from 'react-sortable-hoc';
import { AutoSizer, CellMeasurer, CellMeasurerCache, Index, IndexRange, InfiniteLoader, List, ListRowProps } from 'react-virtualized';

import { DownloadedStatus } from '../../../../../src/lib/types/database/download';
import { KaraDownloadRequest } from '../../../../../src/types/download';
import { PublicPlayerState } from '../../../../../src/types/state';
import GlobalContext from '../../../store/context';
import { buildKaraTitle, getOppositePlaylistInfo, getPlaylistInfo } from '../../../utils/kara';
import { commandBackend, getSocket } from '../../../utils/socket';
import {
	callModal,
	displayMessage,
	eventEmitter,
	is_touch_device, isNonStandardPlaylist,
	nonStandardPlaylists,
	secondsTimeSpanToHMS
} from '../../../utils/tools';
import { KaraElement } from '../../types/kara';
import { Tag } from '../../types/tag';
import CriteriasList from './CriteriasList';
import KaraLine from './KaraLine';
import PlaylistHeader from './PlaylistHeader';

const chunksize = 400;
const _cache = new CellMeasurerCache({ defaultHeight: 44, fixedWidth: true });
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
	avatars: any,
	i18n?: any;
	infos: {
		count: number,
		from: number,
		to: number
	}
}

function Playlist(props: IProps) {
	const context = useContext(GlobalContext);
	const refContainer = useRef<HTMLDivElement>();
	const [searchValue, setSearchValue] = useState(props.searchValue);
	const [searchCriteria, setSearchCriteria] = useState<'year' | 'tag'>(props.searchCriteria);
	const [searchType, setSearchType] = useState<'search' | 'recent' | 'requested'>(props.searchType ? props.searchType : 'search');
	const [orderByLikes, setOrderByLikes] = useState(false);
	const [isPlaylistInProgress, setPlaylistInProgress] = useState(false);
	const [stopUpdate, setStopUpdate] = useState(false);
	const [forceUpdate, setForceUpdate] = useState(false);
	const [data, setData] = useState<KaraList>();
	const [scrollToIndex, setScrollToIndex] = useState<number>();
	const [checkedKaras, setCheckedKaras] = useState(0);
	const [playing, setPlaying] = useState<number>();
	const [songsBeforeJingle, setSongsBeforeJingle] = useState<number>();
	const [songsBeforeSponsor, setSongsBeforeSponsor] = useState<number>();
	const [goToPlaying, setGotToPlaying] = useState<boolean>();
	// Avoid scroll event trigger
	const [goToPlayingAvoidScroll, setGotToPlayingAvoidScroll] = useState<boolean>();
	const [selectAllKarasChecked, setSelectAllKarasChecked] = useState(false);
	const [height, setHeight] = useState(0);
	const [criteriasOpen, setCriteriasOpen] = useState(false);

	const favoritesUpdated = () => {
		if (getPlaylistInfo(props.side, context)?.plaid === nonStandardPlaylists.favorites) getPlaylist();
	};

	const publicPlaylistEmptied = () => {
		if (getPlaylistInfo(props.side, context)?.plaid === nonStandardPlaylists.library && data) {
			for (const kara of data.content) {
				if (kara) {
					kara.my_public_plc_id = [];
					kara.public_plc_id = [];
					kara.flag_upvoted = false;
				}
			}
			setData(data);
		}
	};

	const KIDUpdated = async (event: {
		kid: string,
		username: string,
		requester: string,
		flag_upvoted: boolean,
		plc_id: number[],
		download_status: DownloadedStatus
	}[]) => {
		if ((getPlaylistInfo(props.side, context)?.plaid === nonStandardPlaylists.library
			|| getPlaylistInfo(props.side, context)?.plaid === nonStandardPlaylists.favorites
			|| (event.length > 0 && event[0].download_status))
			&& data?.content) {
			for (const kara of data.content) {
				for (const karaUpdated of event) {
					if (kara?.kid === karaUpdated.kid) {
						if (karaUpdated.plc_id) {
							kara.public_plc_id = karaUpdated.plc_id;
							if (!karaUpdated.plc_id[0]) {
								kara.my_public_plc_id = [];
							}
						}
						if (karaUpdated.username === context.globalState.auth.data.username
							&& karaUpdated.flag_upvoted === false || karaUpdated.flag_upvoted === true) {
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
			setData(data);
		}
	};

	const initCall = async () => {
		resizeCheck();
		setGotToPlaying(!isNonStandardPlaylist(getPlaylistInfo(props.side, context)?.plaid));
		setCriteriasOpen(false);
		await getPlaylist();
	};

	const playlistContentsUpdatedFromClient = (plaid: string) => {
		if (getPlaylistInfo(props.side, context)?.plaid === plaid && !stopUpdate) {
			if (!isNonStandardPlaylist(getPlaylistInfo(props.side, context)?.plaid)) data.infos.from = 0;
			setData(data);
			setScrollToIndex(0);
			getPlaylist(searchType);
		}
	};

	const resizeCheck = () => {
		playlistForceRefresh();
		// Calculate empty space for fillSpace cheat.
		// Virtual lists doesn't expand automatically, or more than needed, so the height is forced by JS calculations
		// using getBoundingClientRect
		if (refContainer.current) {
			const wrapper = refContainer.current.getBoundingClientRect();
			setHeight(window.innerHeight - wrapper.top);
		}
	};

	const toggleSearchMenu = () => {
		props.toggleSearchMenu();
		setTimeout(resizeCheck, 0);
	};

	const SortableList = SortableContainer(List);

	const isRowLoaded = ({ index }: Index) => {
		return Boolean(data?.content[index]);
	};

	const loadMoreRows = async ({ stopIndex }: IndexRange) => {
		if (!isPlaylistInProgress) {
			data.infos.from = Math.floor(stopIndex / chunksize) * chunksize;
			setData(data);
			if (timer) clearTimeout(timer);
			timer = setTimeout(getPlaylist, 1000);
		}
	};

	const rowRenderer = ({ index, key, parent, style }: ListRowProps) => {
		let content: KaraElement;
		if (data?.content[index]) {
			content = data.content[index];
			return (
				<CellMeasurer
					cache={_cache}
					columnIndex={0}
					key={key}
					parent={parent}
					rowIndex={index}
				>
					<KaraLine
						index={index}
						indexInPL={index}
						key={content.kid}
						kara={content}
						scope={props.scope}
						i18nTag={data.i18n}
						side={props.side}
						checkKara={checkKara}
						avatar_file={data.avatars[content.username]}
						deleteCriteria={deleteCriteria}
						jingle={typeof songsBeforeJingle === 'number' && (index === playing +
							songsBeforeJingle)}
						sponsor={typeof songsBeforeSponsor === 'number' && (index === playing +
							songsBeforeSponsor)}
						style={style}
						toggleKaraDetail={(kara, idPlaylist) => {
							props.toggleKaraDetail(kara, idPlaylist, index);
						}}
						sortable={searchType !== 'recent'
							&& searchType !== 'requested'
							&& !searchValue
							&& !orderByLikes
							&& !getFilterValue(props.side)}
					/>
				</CellMeasurer>
			);
		} else {
			return <div key={key} style={style}>
				<div className="list-group-item">
					<div className="actionDiv" />
					<div className="infoDiv" />
					<div className="contentDiv" >{i18next.t('LOADING')}</div>
				</div>
			</div>;
		}
	};

	const noRowsRenderer = () => {
		return <React.Fragment>
			{getPlaylistInfo(props.side, context)?.plaid === nonStandardPlaylists.library && props.scope === 'admin' ? (
				<div className="list-group-item karaSuggestion">
					<div>{i18next.t('KARA_SUGGESTION_NOT_FOUND')}</div>
					{context?.globalState.settings.data.config.System.Repositories
						.filter(value => value.Enabled && value.Online).map(value => <a href={`https://${value.Name}/`} >{value.Name}</a>)}
					<a href="https://suggest.karaokes.moe" >suggest.karaokes.moe</a>
				</div>
			) : null}
		</React.Fragment>;
	};

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

	const playlistWillUpdate = () => {
		setData(undefined);
		setPlaylistInProgress(true);
	};

	const playlistDidUpdate = async () => {
		await getPlaylist();
		scrollToPlaying();
	};

	const getFilterValue = (side: 'left' | 'right') => {
		return side === 'left' ?
			context.globalState.frontendContext.filterValue1 || '' :
			context.globalState.frontendContext.filterValue2 || '';
	};

	const getPlaylist = async (searchTypeParam?: 'search' | 'recent' | 'requested', orderByLikes?: boolean) => {
		const criterias: any = {
			'year': 'y',
			'tag': 't'
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
		param.from = (data?.infos?.from > 0 ? data.infos.from : 0);
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
				const result = await commandBackend('findPlayingSongInPlaylist', { plaid: getPlaylistInfo(props.side, context)?.plaid });
				if (result?.index !== -1) {
					setScrollToIndex(result.index);
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

	const playingUpdate = (dataUpdate: { plaid: string, plc_id: number }) => {
		if (getPlaylistInfo(props.side, context)?.plaid === dataUpdate.plaid && !stopUpdate) {
			let indexPlaying;
			data?.content.forEach((kara, index) => {
				if (kara?.flag_playing) {
					kara.flag_playing = false;
					kara.flag_dejavu = true;
				} else if (kara?.plcid === dataUpdate.plc_id) {
					kara.flag_playing = true;
					indexPlaying = index;
					if (goToPlaying) {
						setScrollToIndex(index);
						setGotToPlayingAvoidScroll(true);
					}
					setPlaying(indexPlaying);
				}
			});
		}
	};

	const getPlInfosElement = () => {
		let plInfos = '';
		if (getPlaylistInfo(props.side, context)?.plaid && data?.infos?.count) {
			plInfos =
				(data.infos.count +
					' karas') +
				(!isNonStandardPlaylist(getPlaylistInfo(props.side, context)?.plaid) && getPlaylistInfo(props.side, context)?.duration
					? ` ~ ${is_touch_device() ? 'dur.' : i18next.t('DETAILS.DURATION')} ` +
					secondsTimeSpanToHMS(getPlaylistInfo(props.side, context)?.duration, 'hm') +
					` / ${secondsTimeSpanToHMS(getPlaylistInfo(props.side, context)?.time_left, 'hm')} ${is_touch_device() ? 're.' : i18next.t('DURATION_REMAINING')} `
					: '');
		}
		return plInfos;
	};

	const scrollToPlaying = async () => {
		if (playing) {
			setScrollToIndex(playing);
			setGotToPlaying(true);
			setGotToPlayingAvoidScroll(true);
		} else {
			const result = await commandBackend('findPlayingSongInPlaylist', { plaid: getPlaylistInfo(props.side, context)?.plaid });
			if (result?.index !== -1) {
				setScrollToIndex(result.index);
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
			'year': 'y',
			'tag': 't'
		};
		return {
			q: ((searchCriteria && criterias[searchCriteria] && searchValue) ?
				`${criterias[searchCriteria]}:${searchValue}` : undefined),
			order: searchType !== 'search' ? searchType : undefined,
			orderByLikes: orderByLikes || undefined
		};
	};

	const addRandomKaras = () => {
		callModal(context.globalDispatch, 'prompt', i18next.t('CL_ADD_RANDOM_TITLE'), '', async (nbOfRandoms: number) => {
			const randomKaras = await commandBackend(getPlaylistUrl(), {
				filter: getFilterValue(props.side),
				plaid: getPlaylistInfo(props.side, context)?.plaid,
				random: nbOfRandoms,
				...getSearchTagForAddAll()
			});
			if (randomKaras.content.length > 0) {
				const textContent = randomKaras.content.map((e: KaraElement) => <React.Fragment key={e.kid}>{buildKaraTitle(context.globalState.settings.data, e, true)} <br /><br /></React.Fragment>);
				callModal(context.globalDispatch, 'confirm', i18next.t('CL_CONGRATS'), <React.Fragment>{i18next.t('CL_ABOUT_TO_ADD')}<br /><br />{textContent}</React.Fragment>, () => {
					const karaList = randomKaras.content.map((a: KaraElement) => {
						return a.kid;
					});
					commandBackend('addKaraToPlaylist', {
						kids: karaList,
						plaid: getOppositePlaylistInfo(props.side, context).plaid
					}).catch(() => { });
				}, '');
			}
		}, '1');
	};

	const addAllKaras = async () => {
		const response = await commandBackend(getPlaylistUrl(), {
			filter: getFilterValue(props.side),
			plaid: getPlaylistInfo(props.side, context)?.plaid,
			...getSearchTagForAddAll()
		});
		const karaList = response.content.map((a: KaraElement) => a.kid);
		displayMessage('info', i18next.t('PL_MULTIPLE_ADDED', { count: response.content.length }));
		commandBackend('addKaraToPlaylist', {
			kids: karaList,
			requestedby: context.globalState.auth.data.username,
			plaid: getOppositePlaylistInfo(props.side, context).plaid
		}).catch(() => { });
	};

	const addCheckedKaras = async (_event?: any, pos?: number) => {
		const listKara = data.content.filter(a => a?.checked);
		if (listKara.length === 0) {
			displayMessage('warning', i18next.t('SELECT_KARAS_REQUIRED'));
			return;
		}
		const idsKara = listKara.map(a => a.kid);
		const idsKaraPlaylist = listKara.map(a => String(a.plcid));
		let url = '';
		let dataApi;

		if (!getOppositePlaylistInfo(props.side, context).flag_smart) {
			if (!isNonStandardPlaylist(getPlaylistInfo(props.side, context)?.plaid) && !pos) {
				url = 'copyKaraToPlaylist';
				dataApi = {
					plaid: getOppositePlaylistInfo(props.side, context).plaid,
					plc_ids: idsKaraPlaylist
				};
			} else {
				url = 'addKaraToPlaylist';
				if (pos) {
					dataApi = {
						plaid: getOppositePlaylistInfo(props.side, context).plaid,
						requestedby: context.globalState.auth.data.username,
						kids: idsKara,
						pos: pos
					};
				} else {
					dataApi = {
						plaid: getOppositePlaylistInfo(props.side, context).plaid,
						requestedby: context.globalState.auth.data.username,
						kids: idsKara
					};
				}
			}
		} else if (getOppositePlaylistInfo(props.side, context).flag_smart) {
			url = 'addCriterias';
			dataApi = {
				criterias: idsKara.map(kid => {
					return { type: 1001, value: kid, plaid: getOppositePlaylistInfo(props.side, context).plaid };
				})
			};
		} else if (getOppositePlaylistInfo(props.side, context).plaid === nonStandardPlaylists.favorites) {
			url = 'addFavorites';
			dataApi = {
				kids: idsKara
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
				kids: listKara.map(a => a.kid)
			};
		} else if (!getPlaylistInfo(props.side, context)?.flag_smart) {
			const idsKaraPlaylist = listKara.map(a => a.plcid);
			url = 'deleteKaraFromPlaylist';
			dataApi = {
				plc_ids: idsKaraPlaylist
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
			kids: listKara.map(a => a.kid)
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
			flag_accepted: true
		}).catch(() => { });
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
			flag_refused: true
		}).catch(() => { });
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
					repository: kara.repository
				};
			});
		if (karaList.length > 0) commandBackend('addDownloads', { downloads: karaList }).catch(() => { });
	};

	const onChangeTags = (type: number | string, value: string) => {
		const newSearchCriteria = type === 0 ? 'year' : 'tag';
		const newStringValue = (value && searchCriteria === 'tag') ? `${value}~${type}` : value;
		setSearchCriteria(newSearchCriteria);
		setSearchValue(newStringValue);
	};

	const deleteCriteria = (kara: KaraElement) => {
		callModal(context.globalDispatch, 'confirm', i18next.t('CL_DELETE_CRITERIAS_PLAYLIST', { type: i18next.t(`CRITERIA.CRITERIA_TYPE_${kara.criterias[0].type}`) }),
			<div style={{ maxHeight: '200px' }}>
				{data.content
					.filter((e) => e.criterias[0].value === kara.criterias[0].value && e.criterias[0].type === kara.criterias[0].type)
					.map((criteria) => {
						return <div key={kara.kid}>
							{buildKaraTitle(context.globalState.settings.data, criteria as unknown as KaraElement, true)}
						</div>;
					})
				}
			</div>, async (confirm: boolean) => {
				if (confirm) {
					await commandBackend('removeCriterias', {
						criterias: [{
							plaid: getPlaylistInfo(props.side, context)?.plaid,
							type: kara.criterias[0].type,
							value: kara.criterias[0].value
						}]
					});
					if (kara.criterias.length > 1) {
						kara.criterias = kara.criterias.slice(1);
						deleteCriteria(kara);
					}
				}
			});
	};

	const sortRow = ({ oldIndex, newIndex }: { oldIndex: number, newIndex: number }) => {
		if (oldIndex !== newIndex) {
			// extract plcid based on sorter index
			const plcid = data.content[oldIndex].plcid;

			// fix index to match api behaviour
			let apiIndex = newIndex + 1;
			if (newIndex > oldIndex)
				apiIndex = apiIndex + 1;
			try {
				commandBackend('editPLC', {
					pos: apiIndex,
					plc_ids: [plcid]
				}).finally(() => {
					setStopUpdate(false);
				});

				const kara = data.content[oldIndex];
				let karas: KaraElement[] = [...data.content];
				delete karas[oldIndex];
				karas = karas.filter(kara => !!kara);
				karas.splice(newIndex, 0, kara);
				data.content = karas;
				setData(data);
				setForceUpdate(!forceUpdate);
			} catch (e) {
				//already display
			}
		}
	};

	const debounceClear = () => setGotToPlayingAvoidScroll(false);
	const debouncedClear = debounce(debounceClear, 500, { maxWait: 1000 });

	const clearScrollToIndex = () => {
		if (goToPlayingAvoidScroll) {
			debouncedClear();
		} else {
			setScrollToIndex(-1);
			setGotToPlaying(false);
			setGotToPlayingAvoidScroll(false);
		}
	};

	const playlistForceRefresh = () => {
		setForceUpdate(!forceUpdate);
		_cache.clearAll();
	};

	useEffect(() => {
		playlistForceRefresh();
	}, [getOppositePlaylistInfo(props.side, context)?.plaid]);


	useEffect(() => {
		getPlaylist(props.searchType);
	}, [props.searchType]);


	useEffect(() => {
		initCall();
		if (props.scope === 'admin' && getPlaylistInfo(props.side, context)?.plaid === nonStandardPlaylists.library && props.searchMenuOpen) {
			props.toggleSearchMenu && props.toggleSearchMenu();
		}
	}, [getPlaylistInfo(props.side, context)?.plaid]);


	useEffect(() => {
		getPlaylist('search');
	}, [searchValue]);

	useEffect(() => {
		playlistForceRefresh();
		if (props.indexKaraDetail) {
			setScrollToIndex(props.indexKaraDetail);
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
		window.addEventListener('resize', resizeCheck, { passive: true, capture: true });
		eventEmitter.addChangeListener('playlistContentsUpdatedFromClient', playlistContentsUpdatedFromClient);
		return () => {
			getSocket().off('playingUpdated', playingUpdate);
			getSocket().off('favoritesUpdated', favoritesUpdated);
			getSocket().off('playlistContentsUpdated', playlistContentsUpdatedFromServer);
			getSocket().off('publicPlaylistEmptied', publicPlaylistEmptied);
			getSocket().off('KIDUpdated', KIDUpdated);
			getSocket().off('playerStatus', updateCounters);
			window.removeEventListener('resize', resizeCheck);
			eventEmitter.removeChangeListener('playlistContentsUpdatedFromClient', playlistContentsUpdatedFromClient);
		};
	}, []);

	const playlist = getPlaylistInfo(props.side, context);
	return <div className="playlist--wrapper">
		{props.scope === 'admin' ?
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
				playlistWillUpdate={playlistWillUpdate}
				playlistDidUpdate={playlistDidUpdate}
				checkedKaras={data?.content?.filter(a => a?.checked)}
				addRandomKaras={addRandomKaras}
				downloadAllMedias={downloadAllMedias}
				criteriasOpen={criteriasOpen}
				openCloseCriterias={() => setCriteriasOpen(!criteriasOpen)}
			/> : null
		}
		<div
			id={'playlist' + props.side}
			className="playlistContainer"
			ref={refContainer}
		>
			{
				(!data || data?.infos
					&& (data.infos.count === 0 || !data.infos.count))
					&& isPlaylistInProgress
					? <div className="loader" />
					: (
						data && !criteriasOpen
							? <InfiniteLoader
								isRowLoaded={isRowLoaded}
								loadMoreRows={loadMoreRows}
								rowCount={data.infos.count || 0}>
								{({ onRowsRendered, registerChild }) => (
									<AutoSizer disableHeight>
										{({ width }) => {
											return (
												<SortableList
													{...[forceUpdate]}
													pressDelay={0}
													helperClass={`playlist-dragged-item ${props.side === 'right' ? 'side-right' : 'side-left'}`}
													useDragHandle={true}
													ref={registerChild}
													onRowsRendered={onRowsRendered}
													rowCount={(data.infos.count) || 0}
													rowHeight={_cache.rowHeight}
													rowRenderer={rowRenderer}
													noRowsRenderer={noRowsRenderer}
													height={height}
													width={width}
													onSortStart={() => setStopUpdate(true)}
													onSortEnd={sortRow}
													onScroll={clearScrollToIndex}
													scrollToIndex={scrollToIndex}
													scrollToAlignment="start"
												/>);
										}}
									</AutoSizer>
								)}
							</InfiniteLoader>
							: playlist?.flag_smart && criteriasOpen ? <CriteriasList
								tags={props.tags}
								plaid={playlist?.plaid}
							/> : null
					)
			}
		</div>
		<div
			className="plFooter">
			<div className="plBrowse btn-group">
				<button
					type="button"
					title={i18next.t('GOTO_TOP')}
					className="btn btn-action"
					onClick={() => {
						setScrollToIndex(0);
						setGotToPlaying(false);
						setGotToPlayingAvoidScroll(false);
					}}
				>
					<i className="fas fa-chevron-up" />
				</button>
				{!isNonStandardPlaylist(playlist?.plaid) ?
					<button
						type="button"
						title={i18next.t('GOTO_PLAYING')}
						className={`btn btn-action ${goToPlaying ? 'btn-active' : ''}`}
						onClick={scrollToPlaying}
						value="playing"
					>
						<i className="fas fa-play" />
					</button> : null
				}
				<button
					type="button"
					title={i18next.t('GOTO_BOTTOM')}
					className="btn btn-action"
					onClick={() => {
						setScrollToIndex(data.infos?.count - 1);
						setGotToPlaying(false);
						setGotToPlayingAvoidScroll(false);
					}}
				>
					<i className="fas fa-chevron-down" />
				</button>
			</div>
			<div className="plInfos">{getPlInfosElement()}</div>
			{checkedKaras > 0 ?
				<div className="plQuota selection">
					{i18next.t('CHECKED')}{checkedKaras}
				</div> : null
			}
		</div>
	</div>;
}

export default Playlist;
