import 'react-virtualized/styles.css';
import './Playlist.scss';

import i18next from 'i18next';
import debounce from 'lodash.debounce';
import React, { Component, createRef } from 'react';
import { SortableContainer } from 'react-sortable-hoc';
import { AutoSizer, CellMeasurer, CellMeasurerCache, Index, IndexRange, InfiniteLoader, List, ListRowProps } from 'react-virtualized';

import { DownloadedStatus } from '../../../../../src/lib/types/database/download';
import { DBPL } from '../../../../../src/lib/types/database/playlist';
import { Criteria } from '../../../../../src/lib/types/playlist';
import { KaraDownloadRequest } from '../../../../../src/types/download';
import { PublicPlayerState } from '../../../../../src/types/state';
import GlobalContext from '../../../store/context';
import { buildKaraTitle } from '../../../utils/kara';
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
	playlist: DBPL;
	oppositePlaylist: DBPL;
	scope: string;
	side: 'left' | 'right';
	tags?: Array<Tag> | undefined;
	searchMenuOpen?: boolean;
	playlistList?: Array<PlaylistElem>;
	toggleSearchMenu?: () => void;
	majIdsPlaylist: (side: 'left' | 'right', value: string) => void;
	toggleKaraDetail: (kara: KaraElement, plaid: string, index?: number) => void;
	searchValue?: string;
	searchCriteria?: 'year' | 'tag';
	indexKaraDetail?: number;
	clearIndexKaraDetail?: () => void;
	searchType?: 'search' | 'recent' | 'requested';
}

interface IState {
	searchValue?: string;
	searchCriteria?: 'year' | 'tag';
	searchType?: 'search' | 'recent' | 'requested';
	orderByLikes: boolean
	getPlaylistInProgress: boolean;
	stopUpdate: boolean;
	forceUpdate: boolean;
	forceUpdateFirst: boolean;
	scope?: string;
	data: KaraList | undefined;
	scrollToIndex?: number;
	checkedKaras: number;
	playing?: number;
	songsBeforeJingle?: number;
	songsBeforeSponsor?: number;
	goToPlaying?: boolean;
	_goToPlaying?: boolean; // Avoid scroll event trigger
	selectAllKarasChecked: boolean;
	height: number;
	criteriasOpen: boolean;
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

class Playlist extends Component<IProps, IState> {
	static contextType = GlobalContext;
	context: React.ContextType<typeof GlobalContext>
	refContainer = createRef<HTMLDivElement>();

	constructor(props: IProps) {
		super(props);
		this.state = {
			getPlaylistInProgress: false,
			stopUpdate: false,
			forceUpdate: false,
			forceUpdateFirst: false,
			data: undefined,
			searchType: this.props.searchType ? this.props.searchType : 'search',
			orderByLikes: false,
			checkedKaras: 0,
			searchCriteria: this.props.searchCriteria,
			searchValue: this.props.searchValue,
			selectAllKarasChecked: false,
			height: 0,
			criteriasOpen: false
		};
	}
	async componentDidMount() {
		if (this.context.globalState.auth.isAuthenticated) {
			await this.initCall();
		}
		getSocket().on('playingUpdated', this.playingUpdate);
		getSocket().on('favoritesUpdated', this.favoritesUpdated);
		getSocket().on('playlistContentsUpdated', this.playlistContentsUpdatedFromServer);
		getSocket().on('publicPlaylistEmptied', this.publicPlaylistEmptied);
		getSocket().on('KIDUpdated', this.KIDUpdated);
		getSocket().on('playerStatus', this.updateCounters);
		window.addEventListener('resize', this.resizeCheck, { passive: true, capture: true });
		eventEmitter.addChangeListener('playlistContentsUpdatedFromClient', this.playlistContentsUpdatedFromClient);
		eventEmitter.addChangeListener('changeIdPlaylist', this.changeIdPlaylistFromOtherSide);
	}

	componentWillUnmount() {
		getSocket().off('playingUpdated', this.playingUpdate);
		getSocket().off('favoritesUpdated', this.favoritesUpdated);
		getSocket().off('playlistContentsUpdated', this.playlistContentsUpdatedFromServer);
		getSocket().off('publicPlaylistEmptied', this.publicPlaylistEmptied);
		getSocket().off('KIDUpdated', this.KIDUpdated);
		getSocket().off('playerStatus', this.updateCounters);
		window.removeEventListener('resize', this.resizeCheck);
		eventEmitter.removeChangeListener('playlistContentsUpdatedFromClient', this.playlistContentsUpdatedFromClient);
		eventEmitter.removeChangeListener('changeIdPlaylist', this.changeIdPlaylistFromOtherSide);
	}

	favoritesUpdated = () => {
		if (this.props.playlist.plaid === nonStandardPlaylists.favorites) this.getPlaylist();
	}

	publicPlaylistEmptied = () => {
		if (this.props.playlist.plaid === nonStandardPlaylists.library && this.state.data) {
			const data = this.state.data as KaraList;
			for (const kara of data.content) {
				if (kara) {
					kara.my_public_plc_id = [];
					kara.public_plc_id = [];
					kara.flag_upvoted = false;
				}
			}
			this.setState({ data }, () => this.playlistForceRefresh(true));
		}
	}

	KIDUpdated = async (event: {
		kid: string,
		username: string,
		requester: string,
		flag_upvoted: boolean,
		plc_id: number[],
		download_status: DownloadedStatus
	}[]) => {
		if ((this.props.playlist.plaid === nonStandardPlaylists.library
			|| this.props.playlist.plaid === nonStandardPlaylists.favorites
			|| (event.length > 0 && event[0].download_status))
			&& (this.state.data as KaraList)?.content) {
			const data = this.state.data as KaraList;
			for (const kara of data.content) {
				for (const karaUpdated of event) {
					if (kara?.kid === karaUpdated.kid) {
						if (karaUpdated.plc_id) {
							kara.public_plc_id = karaUpdated.plc_id;
							if (!karaUpdated.plc_id[0]) {
								kara.my_public_plc_id = [];
							}
						}
						if (karaUpdated.username === this.context.globalState.auth.data.username
							&& karaUpdated.flag_upvoted === false || karaUpdated.flag_upvoted === true) {
							kara.flag_upvoted = karaUpdated.flag_upvoted;
						}
						if (karaUpdated.requester === this.context.globalState.auth.data.username) {
							kara.my_public_plc_id = karaUpdated.plc_id;
						}
						if (karaUpdated.download_status) {
							kara.download_status = karaUpdated.download_status;
						}
					}
				}
			}
			this.setState({ data }, () => this.playlistForceRefresh(true));
		}
	}

	initCall = async () => {
		this.resizeCheck();
		this.setState({ goToPlaying: !isNonStandardPlaylist(this.props.playlist.plaid), criteriasOpen: false });
		if (this.props.scope === 'public' || this.props.playlistList
			.filter(playlist => playlist.plaid === this.props.playlist.plaid).length !== 0) {
			await this.getPlaylist();
		}
	}

	playlistContentsUpdatedFromClient = (plaid: string) => {
		if (this.props.playlist.plaid === plaid && !this.state.stopUpdate) {
			const data = this.state.data as KaraList;
			if (!isNonStandardPlaylist(this.props.playlist.plaid) && data) data.infos.from = 0;
			this.setState({ data: data, scrollToIndex: 0 });
			this.getPlaylist(this.state.searchType);
		}
	}

	resizeCheck = () => {
		this.playlistForceRefresh(true);
		// Calculate empty space for fillSpace cheat.
		// Virtual lists doesn't expand automatically, or more than needed, so the height is forced by JS calculations
		// using getBoundingClientRect
		if (this.refContainer.current) {
			const wrapper = this.refContainer.current.getBoundingClientRect();
			this.setState({ height: window.innerHeight - wrapper.top });
		}
	}

	toggleSearchMenu = () => {
		this.props.toggleSearchMenu();
		setTimeout(this.resizeCheck, 0);
	}

	changeIdPlaylistFromOtherSide = ({ side, playlist }: { side: 'left' | 'right', playlist: string }) => {
		if (this.props.side === side) this.changeIdPlaylist(playlist);
	}

	SortableList = SortableContainer(List, { withRef: true });

	isRowLoaded = ({ index }: Index) => {
		return Boolean(this.state.data && (this.state.data as KaraList).content[index]);
	}

	loadMoreRows = async ({ stopIndex }: IndexRange) => {
		if (!this.state.getPlaylistInProgress) {
			const data = this.state.data as KaraList;
			data.infos.from = Math.floor(stopIndex / chunksize) * chunksize;
			this.setState({ data: data });
			if (timer) clearTimeout(timer);
			timer = setTimeout(this.getPlaylist, 1000);
		}
	}

	rowRenderer = ({ index, key, parent, style }: ListRowProps) => {
		let content: KaraElement;
		if (this.state.data && (this.state.data as KaraList).content && (this.state.data as KaraList).content[index]) {
			content = (this.state.data as KaraList).content[index];
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
						scope={this.props.scope}
						playlistInfo={this.props.playlist}
						i18nTag={(this.state.data as KaraList).i18n}
						side={this.props.side}
						plaidTo={this.props.oppositePlaylist}
						checkKara={this.checkKara}
						avatar_file={(this.state.data as KaraList).avatars[content.username]}
						deleteCriteria={this.deleteCriteria}
						jingle={typeof this.state.songsBeforeJingle === 'number' && (index === this.state.playing +
							this.state.songsBeforeJingle)}
						sponsor={typeof this.state.songsBeforeSponsor === 'number' && (index === this.state.playing +
							this.state.songsBeforeSponsor)}
						style={style}
						toggleKaraDetail={(kara, idPlaylist) => {
							this.props.toggleKaraDetail(kara, idPlaylist, index);
						}}
						sortable={this.state.searchType !== 'recent'
							&& this.state.searchType !== 'requested'
							&& !this.state.searchValue
							&& !this.state.orderByLikes
							&& !this.getFilterValue(this.props.side)}
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
	}

	noRowsRenderer = () => {
		return <React.Fragment>
			{this.props.playlist.plaid === nonStandardPlaylists.library && this.props.scope === 'admin' ? (
				<div className="list-group-item karaSuggestion">
					<div>{i18next.t('KARA_SUGGESTION_NOT_FOUND')}</div>
					{this.context?.globalState.settings.data.config.System.Repositories
						.filter(value => value.Enabled && value.Online).map(value => <a href={`https://${value.Name}/`} >{value.Name}</a>)}
					<a href="https://suggest.karaokes.moe" >suggest.karaokes.moe</a>
				</div>
			) : null}
		</React.Fragment>;
	}

	playlistContentsUpdatedFromServer = (idPlaylist: string) => {
		if (this.props.playlist.plaid === idPlaylist && !this.state.stopUpdate) this.getPlaylist();
	};

	changeIdPlaylist = async (plaid: string) => {
		if (this.props.scope === 'admin' && this.props.playlist.plaid === nonStandardPlaylists.library && this.props.searchMenuOpen) {
			this.props.toggleSearchMenu && this.props.toggleSearchMenu();
		}
		const oldIdPlaylist = this.props.playlist.plaid;
		await this.props.majIdsPlaylist(this.props.side, plaid);
		if (plaid === this.props.oppositePlaylist.plaid) {
			eventEmitter.emitChange('changeIdPlaylist', { side: this.props.side === 'left' ? 'right' : 'left', playlist: oldIdPlaylist });
		}
	};

	changeIdPlaylistSideRight = async (plaid: string) => {
		await this.props.majIdsPlaylist('right', plaid);
		if (plaid === this.props.playlist.plaid) {
			await this.changeIdPlaylistFromOtherSide({ side: 'left', playlist: this.props.oppositePlaylist.plaid });
		}
	}

	getPlaylistUrl = (plaidParam?: string) => {
		const idPlaylist: string = plaidParam ? plaidParam : this.props.playlist.plaid;
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

	playlistWillUpdate = () => {
		this.setState({ data: undefined, getPlaylistInProgress: true });
	}

	playlistDidUpdate = async () => {
		await this.getPlaylist();
		this.scrollToPlaying();
	}

	getFilterValue(side: 'left' | 'right') {
		return side === 'left' ?
			this.context.globalState.frontendContext.filterValue1 || '' :
			this.context.globalState.frontendContext.filterValue2 || '';
	}

	getPlaylist = async (searchType?: 'search' | 'recent' | 'requested', orderByLikes?: boolean) => {
		const criterias: any = {
			'year': 'y',
			'tag': 't'
		};
		let stateData = this.state.data as KaraList;
		const state: any = { getPlaylistInProgress: true };
		if (searchType) {
			state.searchType = searchType;
			state.data = this.state.data;
			if (state?.data?.infos) state.data.infos.from = 0;
		} else if (stateData?.infos?.from === 0) {
			state.searchType = undefined;
		}
		if (orderByLikes !== undefined) {
			state.orderByLikes = orderByLikes;
		}
		this.setState(state);
		const url: string = this.getPlaylistUrl();
		const param: any = {};
		if (!isNonStandardPlaylist(this.props.playlist.plaid)) {
			param.plaid = this.props.playlist.plaid;
			if (orderByLikes || (orderByLikes === undefined && this.state.orderByLikes)) {
				param.orderByLikes = true;
			}
		}

		param.filter = this.getFilterValue(this.props.side);
		param.from = (stateData?.infos?.from > 0 ? stateData.infos.from : 0);
		param.size = chunksize;
		param.blacklist = true;
		if (searchType) {
			param.order = searchType === 'search' ? undefined : searchType;
		} else if (this.state.searchType && this.state.searchType !== 'search') {
			param.order = this.state.searchType;
		}
		if (this.state.searchCriteria && this.state.searchValue) {
			const searchCriteria = this.state.searchCriteria ?
				criterias[this.state.searchCriteria]
				: '';
			if (searchCriteria && this.state.searchValue) param.q = searchCriteria + ':' + this.state.searchValue;
		}
		try {
			const karas: KaraList = await commandBackend(url, param);
			if (this.state.goToPlaying && !isNonStandardPlaylist(this.props.playlist.plaid)) {
				const result = await commandBackend('findPlayingSongInPlaylist', { plaid: this.props.playlist.plaid });
				if (result?.index !== -1) {
					this.setState({ scrollToIndex: result.index, _goToPlaying: true });
				}
			}
			if (karas.infos?.from > 0) {
				stateData = this.state.data as KaraList;
				if (karas.infos.from < stateData.content.length) {
					for (let index = 0; index < karas.content.length; index++) {
						stateData.content[karas.infos.from + index] = karas.content[index];
					}
				} else {
					if (karas.infos.from > stateData.content.length) {
						const nbCellToFill = stateData.infos.from - stateData.content.length;
						for (let index = 0; index < nbCellToFill; index++) {
							stateData.content.push(undefined);
						}
					}
					stateData.content.push(...karas.content);
				}
				stateData.infos = karas.infos;
				stateData.i18n = Object.assign(stateData.i18n, karas.i18n);
			} else {
				stateData = karas;
			}
			this.setState({ data: stateData, getPlaylistInProgress: false }, () => {
				if (this.props.indexKaraDetail) {
					this.setState({ scrollToIndex: this.props.indexKaraDetail });
					this.props.clearIndexKaraDetail();
				}
				this.playlistForceRefresh(true);
			});
		} catch (e) {
			// already display
		}
	};

	playingUpdate = (data: { plaid: string, plc_id: number }) => {
		if (this.props.playlist.plaid === data.plaid && !this.state.stopUpdate) {
			const playlistData = this.state.data as KaraList;
			let indexPlaying;
			playlistData?.content.forEach((kara, index) => {
				if (kara?.flag_playing) {
					kara.flag_playing = false;
					kara.flag_dejavu = true;
				} else if (kara?.plcid === data.plc_id) {
					kara.flag_playing = true;
					indexPlaying = index;
					if (this.state.goToPlaying) this.setState({ scrollToIndex: index, _goToPlaying: true });
					this.setState({ playing: indexPlaying });
				}
			});
			this.setState({ data: playlistData });
			this.playlistForceRefresh(true);
		}
	};

	getPlInfosElement = () => {
		let plInfos = '';
		const stateData = this.state.data as KaraList;
		if (this.props.playlist.plaid && stateData && stateData.infos && stateData.infos.count) {
			plInfos =
				(stateData.infos.count +
					' karas') +
				(!isNonStandardPlaylist(this.props.playlist.plaid) && this.props.playlist.duration
					? ` ~ ${is_touch_device() ? 'dur.' : i18next.t('DETAILS.DURATION')} ` +
					secondsTimeSpanToHMS(this.props.playlist.duration, 'hm') +
					` / ${secondsTimeSpanToHMS(this.props.playlist.time_left, 'hm')} ${is_touch_device() ? 're.' : i18next.t('DURATION_REMAINING')} `
					: '');
		}
		return plInfos;
	};

	scrollToPlaying = async () => {
		if (this.state.playing) {
			this.setState({ scrollToIndex: this.state.playing, goToPlaying: true, _goToPlaying: true });
		} else {
			const result = await commandBackend('findPlayingSongInPlaylist', { plaid: this.props.playlist.plaid });
			if (result?.index !== -1) {
				this.setState({ scrollToIndex: result.index, goToPlaying: true, _goToPlaying: true });
			}
		}
	};

	updateCounters = (event: PublicPlayerState) => {
		if (this.props.playlist.flag_current) {
			this.setState({ songsBeforeJingle: event.songsBeforeJingle, songsBeforeSponsor: event.songsBeforeSponsor });
		} else {
			this.setState({ songsBeforeJingle: undefined, songsBeforeSponsor: undefined });
		}
	}

	selectAllKaras = () => {
		const data = this.state.data as KaraList;
		if (data?.content) {
			let checkedKaras = 0;
			for (const kara of data.content) {
				if (kara) {
					kara.checked = !this.state.selectAllKarasChecked;
					if (kara.checked) checkedKaras++;
				}
			}
			this.setState({ data, checkedKaras, selectAllKarasChecked: !this.state.selectAllKarasChecked });
			this.playlistForceRefresh(true);
		}
	};

	checkKara = (id: string | number) => {
		const data = this.state.data as KaraList;
		let checkedKaras = this.state.checkedKaras;
		for (const kara of data.content) {
			if (!isNonStandardPlaylist(this.props.playlist.plaid)) {
				if (kara.plcid === id) {
					kara.checked = !kara.checked;
					if (kara.checked) {
						checkedKaras++;
					} else {
						checkedKaras--;
					}
				}
			} else if (kara?.kid === id) {
				kara.checked = !kara.checked;
				if (kara.checked) {
					checkedKaras++;
				} else {
					checkedKaras--;
				}
			}
		}
		this.setState({ data, checkedKaras });
		this.playlistForceRefresh(true);
	};

	getSearchTagForAddAll = () => {
		const criterias: any = {
			'year': 'y',
			'tag': 't'
		};
		return {
			q: ((this.state.searchCriteria && criterias[this.state.searchCriteria] && this.state.searchValue) ?
				`${criterias[this.state.searchCriteria]}:${this.state.searchValue}` : undefined),
			order: this.state.searchType !== 'search' ? this.state.searchType : undefined,
			orderByLikes: this.state.orderByLikes || undefined
		};
	}

	addRandomKaras = () => {
		callModal(this.context.globalDispatch, 'prompt', i18next.t('CL_ADD_RANDOM_TITLE'), '', async (nbOfRandoms: number) => {
			const randomKaras = await commandBackend(this.getPlaylistUrl(), {
				filter: this.getFilterValue(this.props.side),
				plaid: this.props.playlist.plaid,
				random: nbOfRandoms,
				...this.getSearchTagForAddAll()
			});
			if (randomKaras.content.length > 0) {
				const textContent = randomKaras.content.map((e: KaraElement) => <React.Fragment key={e.kid}>{buildKaraTitle(this.context.globalState.settings.data, e, true)} <br /><br /></React.Fragment>);
				callModal(this.context.globalDispatch, 'confirm', i18next.t('CL_CONGRATS'), <React.Fragment>{i18next.t('CL_ABOUT_TO_ADD')}<br /><br />{textContent}</React.Fragment>, () => {
					const karaList = randomKaras.content.map((a: KaraElement) => {
						return a.kid;
					});
					commandBackend('addKaraToPlaylist', {
						kids: karaList,
						plaid: this.props.oppositePlaylist.plaid
					}).catch(() => { });
				}, '');
			}
		}, '1');
	};

	addAllKaras = async () => {
		const response = await commandBackend(this.getPlaylistUrl(), {
			filter: this.getFilterValue(this.props.side),
			plaid: this.props.playlist.plaid,
			...this.getSearchTagForAddAll()
		});
		const karaList = response.content.map((a: KaraElement) => a.kid);
		displayMessage('info', i18next.t('PL_MULTIPLE_ADDED', { count: response.content.length }));
		commandBackend('addKaraToPlaylist', {
			kids: karaList,
			requestedby: this.context.globalState.auth.data.username,
			plaid: this.props.oppositePlaylist.plaid
		}).catch(() => { });
	};

	addCheckedKaras = async (_event?: any, pos?: number) => {
		const stateData = this.state.data as KaraList;
		const listKara = stateData.content.filter(a => a?.checked);
		if (listKara.length === 0) {
			displayMessage('warning', i18next.t('SELECT_KARAS_REQUIRED'));
			return;
		}
		const idsKara = listKara.map(a => a.kid);
		const idsKaraPlaylist = listKara.map(a => String(a.plcid));
		let url = '';
		let data;

		if (!this.props.oppositePlaylist.flag_smart) {
			if (!isNonStandardPlaylist(this.props.playlist.plaid) && !pos) {
				url = 'copyKaraToPlaylist';
				data = {
					plaid: this.props.oppositePlaylist.plaid,
					plc_ids: idsKaraPlaylist
				};
			} else {
				url = 'addKaraToPlaylist';
				if (pos) {
					data = {
						plaid: this.props.oppositePlaylist.plaid,
						requestedby: this.context.globalState.auth.data.username,
						kids: idsKara,
						pos: pos
					};
				} else {
					data = {
						plaid: this.props.oppositePlaylist.plaid,
						requestedby: this.context.globalState.auth.data.username,
						kids: idsKara
					};
				}
			}
		} else if (this.props.oppositePlaylist.flag_smart) {
			url = 'addCriterias';
			data = {
				criterias: idsKara.map(kid => {
					return { type: 1001, value: kid, plaid: this.props.oppositePlaylist.plaid };
				})
			};
		} else if (this.props.oppositePlaylist.plaid === nonStandardPlaylists.favorites) {
			url = 'addFavorites';
			data = {
				kids: idsKara
			};
		}
		try {
			await commandBackend(url, data);
			const karaList = (this.state.data as KaraList);
			for (const kara of karaList.content) {
				if (kara) {
					kara.checked = false;
				}
			}
			this.setState({ data: karaList, selectAllKarasChecked: false });
			this.playlistForceRefresh(true);
		} catch (err) {
			// error already display
		}
	};

	transferCheckedKaras = () => {
		this.addCheckedKaras();
		this.deleteCheckedKaras();
	};

	deleteCheckedKaras = async () => {
		let url;
		let data;
		const stateData = this.state.data as KaraList;
		const listKara = stateData.content.filter(a => a.checked);
		if (listKara.length === 0) {
			displayMessage('warning', i18next.t('SELECT_KARAS_REQUIRED'));
			return;
		}
		if (this.props.playlist.plaid === nonStandardPlaylists.favorites) {
			url = 'deleteFavorites';
			data = {
				kids: listKara.map(a => a.kid)
			};
		} else if (!this.props.playlist.flag_smart) {
			const idsKaraPlaylist = listKara.map(a => a.plcid);
			url = 'deleteKaraFromPlaylist';
			data = {
				plc_ids: idsKaraPlaylist
			};
		}
		if (url) {
			try {
				await commandBackend(url, data);
				this.setState({ checkedKaras: 0, selectAllKarasChecked: false });
			} catch (e) {
				// already display
			}
		}
	};

	deleteCheckedFavorites = async () => {
		const stateData = this.state.data as KaraList;
		const listKara = stateData.content.filter(a => a.checked);
		if (listKara.length === 0) {
			displayMessage('warning', i18next.t('SELECT_KARAS_REQUIRED'));
			return;
		}
		await commandBackend('deleteFavorites', {
			kids: listKara.map(a => a.kid)
		});
		this.setState({ selectAllKarasChecked: false });
	};

	acceptCheckedKara = async () => {
		const stateData = this.state.data as KaraList;
		const listKara = stateData.content.filter(a => a.checked);
		if (listKara.length === 0) {
			displayMessage('warning', i18next.t('SELECT_KARAS_REQUIRED'));
			return;
		}
		const idsKaraPlaylist = listKara.map(a => a.plcid);
		await commandBackend('editPLC', {
			plc_ids: idsKaraPlaylist,
			flag_accepted: true
		}).catch(() => { });
		this.setState({ selectAllKarasChecked: false });
	};


	refuseCheckedKara = async () => {
		const stateData = this.state.data as KaraList;
		const listKara = stateData.content.filter(a => a.checked);
		if (listKara.length === 0) {
			displayMessage('warning', i18next.t('SELECT_KARAS_REQUIRED'));
			return;
		}
		const idsKaraPlaylist = listKara.map(a => a.plcid);
		await commandBackend('editPLC', {
			plc_ids: idsKaraPlaylist,
			flag_refused: true
		}).catch(() => { });
		this.setState({ selectAllKarasChecked: false });
	};

	downloadAllMedias = async () => {
		const response = await commandBackend(this.getPlaylistUrl(), { plaid: this.props.playlist.plaid });
		const karaList: KaraDownloadRequest[] = response.content
			.filter(kara => kara.download_status === 'MISSING')
			.map((kara: KaraElement) => {
				return {
					mediafile: kara.mediafile,
					kid: kara.kid,
					size: kara.mediasize,
					name: buildKaraTitle(this.context.globalState.settings.data, kara, true) as string,
					repository: kara.repository
				};
			});
		if (karaList.length > 0) commandBackend('addDownloads', { downloads: karaList }).catch(() => { });
	}

	onChangeTags = (type: number | string, value: string) => {
		const searchCriteria = type === 0 ? 'year' : 'tag';
		const stringValue = (value && searchCriteria === 'tag') ? `${value}~${type}` : value;
		this.setState({ searchCriteria: searchCriteria, searchValue: stringValue }, () => this.getPlaylist('search'));
	};

	deleteCriteria = (kara: KaraElement) => {
		console.log(kara);
		callModal(this.context.globalDispatch, 'confirm', i18next.t('CL_DELETE_CRITERIAS_PLAYLIST', { type: i18next.t(`CRITERIA.CRITERIA_TYPE_${kara.criterias[0].type}`) }),
			<div style={{ maxHeight: '200px' }}>
				{(this.state.data as KaraList).content
					.filter((e) => e.criterias[0].value === kara.criterias[0].value && e.criterias[0].type === kara.criterias[0].type)
					.map((criteria) => {
						return <div key={kara.kid}>
							{buildKaraTitle(this.context.globalState.settings.data, criteria as unknown as KaraElement, true)}
						</div>;
					})
				}
			</div>, async (confirm: boolean) => {
				if (confirm) {
					await commandBackend('removeCriterias', {criterias: [{
						plaid: this.props.playlist.plaid,
						type: kara.criterias[0].type,
						value: kara.criterias[0].value
					}]});
					if (kara.criterias.length > 1) {
						kara.criterias = kara.criterias.slice(1);
						this.deleteCriteria(kara);
					}
				}
			});
	};

	sortRow = ({ oldIndex, newIndex }: { oldIndex: number, newIndex: number }) => {
		if (oldIndex !== newIndex) {
			const data = this.state.data as KaraList;
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
					this.setState({ stopUpdate: false });
				});

				const kara = data.content[oldIndex];
				let karas: Array<KaraElement> = [...data.content];
				delete karas[oldIndex];
				karas = karas.filter(kara => !!kara);
				karas.splice(newIndex, 0, kara);
				data.content = karas;
				this.setState({ data, forceUpdate: !this.state.forceUpdate });
			} catch (e) {
				//already display
			}
		}
	}

	debounceClear = () => {
		this.setState(() => {
			return { _goToPlaying: false };
		});
	}
	debouncedClear = debounce(this.debounceClear, 500, { maxWait: 1000 });

	clearScrollToIndex = () => {
		if (this.state._goToPlaying) {
			this.debouncedClear();
		} else {
			this.setState({ scrollToIndex: -1, goToPlaying: false, _goToPlaying: false });
		}
	}

	stopUpdate = () => {
		this.setState({ stopUpdate: true });
	}

	playlistForceRefresh = (forceUpdateFirstParam: boolean) => {
		this.setState({ forceUpdate: !this.state.forceUpdate, forceUpdateFirst: forceUpdateFirstParam });
		_cache.clearAll();
	}

	openCloseCriterias = () => {
		this.setState({criteriasOpen: !this.state.criteriasOpen});
	}

	componentDidUpdate(prevProps: IProps) {
		if (this.props.playlist.plaid !== prevProps.playlist.plaid) {
			this.initCall();
		}
		if (this.props.searchType !== prevProps.searchType) {
			this.getPlaylist(this.props.searchType);
		}
		if (this.props.oppositePlaylist.plaid !== prevProps.oppositePlaylist.plaid) {
			this.playlistForceRefresh(true);
		}
		if (this.state.forceUpdateFirst) {
			setTimeout(() => {
				this.playlistForceRefresh(false);
			}, 50);
		}
	}

	render() {
		return <div className="playlist--wrapper">
			{this.props.scope === 'admin' ?
				<PlaylistHeader
					side={this.props.side}
					playlistList={this.props.playlistList}
					selectAllKarasChecked={this.state.selectAllKarasChecked}
					changeIdPlaylist={this.changeIdPlaylist}
					changeIdPlaylistSideRight={this.changeIdPlaylistSideRight}
					playlistInfo={this.props.playlist}
					plaidTo={this.props.oppositePlaylist.plaid}
					selectAllKaras={this.selectAllKaras}
					addAllKaras={this.addAllKaras}
					addCheckedKaras={this.addCheckedKaras}
					transferCheckedKaras={this.transferCheckedKaras}
					deleteCheckedKaras={this.deleteCheckedKaras}
					deleteCheckedFavorites={this.deleteCheckedFavorites}
					refuseCheckedKara={this.refuseCheckedKara}
					acceptCheckedKara={this.acceptCheckedKara}
					tags={this.props.tags}
					onChangeTags={this.onChangeTags}
					getPlaylist={this.getPlaylist}
					toggleSearchMenu={this.toggleSearchMenu}
					searchMenuOpen={this.props.searchMenuOpen}
					playlistWillUpdate={this.playlistWillUpdate}
					playlistDidUpdate={this.playlistDidUpdate}
					checkedKaras={(this.state.data as KaraList)?.content?.filter(a => a?.checked)}
					addRandomKaras={this.addRandomKaras}
					downloadAllMedias={this.downloadAllMedias}
					criteriasOpen={this.state.criteriasOpen}
					openCloseCriterias={this.openCloseCriterias}
				/> : null
			}
			<div
				id={'playlist' + this.props.side}
				className="playlistContainer"
				ref={this.refContainer}
			>
				{
					(!this.state.data || (this.state.data && (this.state.data as KaraList).infos
						&& ((this.state.data as KaraList).infos.count === 0 || !(this.state.data as KaraList).infos.count)))
						&& this.state.getPlaylistInProgress
						? <div className="loader" />
						: (
							this.state.data && !this.state.criteriasOpen
								? <InfiniteLoader
									isRowLoaded={this.isRowLoaded}
									loadMoreRows={this.loadMoreRows}
									rowCount={(this.state.data as KaraList).infos.count || 0}>
									{({ onRowsRendered, registerChild }) => (
										<AutoSizer>
											{({ width }) => {
												return (
													<this.SortableList
														{...[this.state.forceUpdate]}
														pressDelay={0}
														helperClass={`playlist-dragged-item ${this.props.side === 'right' ? 'side-right' : 'side-left'}`}
														useDragHandle={true}
														ref={registerChild}
														onRowsRendered={onRowsRendered}
														rowCount={((this.state.data as KaraList).infos.count) || 0}
														rowHeight={_cache.rowHeight}
														rowRenderer={this.rowRenderer}
														noRowsRenderer={this.noRowsRenderer}
														height={this.state.height}
														width={width}
														onSortStart={this.stopUpdate}
														onSortEnd={this.sortRow}
														onScroll={this.clearScrollToIndex}
														scrollToIndex={this.state.scrollToIndex}
														scrollToAlignment="start"
													/>);
											}}
										</AutoSizer>
									)}
								</InfiniteLoader>
								: this.props.playlist.flag_smart && this.state.criteriasOpen ? <CriteriasList
									tags={this.props.tags}
									plaid={this.props.playlist.plaid}
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
						className="btn btn-sm btn-action"
						onClick={() => this.setState({ scrollToIndex: 0, goToPlaying: false, _goToPlaying: false })}
					>
						<i className="fas fa-chevron-up" />
					</button>
					{!isNonStandardPlaylist(this.props.playlist.plaid) ?
						<button
							type="button"
							title={i18next.t('GOTO_PLAYING')}
							className={`btn btn-sm btn-action ${this.state.goToPlaying ? 'btn-active' : ''}`}
							onClick={this.scrollToPlaying}
							value="playing"
						>
							<i className="fas fa-play" />
						</button> : null
					}
					<button
						type="button"
						title={i18next.t('GOTO_BOTTOM')}
						className="btn btn-sm btn-action"
						onClick={() => this.state.data && this.setState({ scrollToIndex: (this.state.data as KaraList).infos?.count - 1, goToPlaying: false, _goToPlaying: false })}
					>
						<i className="fas fa-chevron-down" />
					</button>
				</div>
				<div className="plInfos">{this.getPlInfosElement()}</div>
				{this.state.checkedKaras > 0 ?
					<div className="plQuota selection">
						{i18next.t('CHECKED')}{this.state.checkedKaras}
					</div> : null
				}
			</div>
		</div>;
	}
}

export default Playlist;
