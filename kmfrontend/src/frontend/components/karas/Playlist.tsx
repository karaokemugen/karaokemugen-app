import 'react-virtualized/styles.css';

import i18next from 'i18next';
import debounce from 'lodash.debounce';
import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import { SortableContainer } from 'react-sortable-hoc';
import { AutoSizer, CellMeasurer, CellMeasurerCache, Index, IndexRange, InfiniteLoader, List, ListRowProps } from 'react-virtualized';

import { BLCSet } from '../../../../../src/types/blacklist';
import { DBBlacklist, DBBLC } from '../../../../../src/types/database/blacklist';
import { DBPL } from '../../../../../src/types/database/playlist';
import { PublicPlayerState } from '../../../../../src/types/state';
import { setCurrentBlSet, setPosPlaying } from '../../../store/actions/frontendContext';
import { setSettings } from '../../../store/actions/settings';
import GlobalContext from '../../../store/context';
import { buildKaraTitle } from '../../../utils/kara';
import { commandBackend, getSocket } from '../../../utils/socket';
import { callModal, displayMessage, eventEmitter, is_touch_device, secondsTimeSpanToHMS } from '../../../utils/tools';
import { KaraElement } from '../../types/kara';
import { Tag } from '../../types/tag';
import SuggestionModal from '../modals/SuggestionModal';
import BlacklistCriterias from './BlacklistCriterias';
import KaraLine from './KaraLine';
import PlaylistHeader from './PlaylistHeader';
require('./Playlist.scss');

const chunksize = 400;
const _cache = new CellMeasurerCache({ defaultHeight: 44, fixedWidth: true });
let timer: any;

interface IProps {
	idPlaylist?: number;
	scope: string;
	side: number;
	idPlaylistTo: number;
	tags?: Array<Tag> | undefined;
	searchMenuOpen?: boolean;
	playlistList?: Array<PlaylistElem>;
	toggleSearchMenu?: () => void;
	majIdsPlaylist: (side: number, value: number) => void;
	toggleKaraDetail: (kara:KaraElement, idPlaylist: number) => void;
	searchValue?: string;
	searchCriteria?: 'year' | 'tag';
}

interface IState {
	searchValue?: string;
	searchCriteria?: 'year' | 'tag';
	searchType?: string;
	getPlaylistInProgress: boolean;
	stopUpdate: boolean;
	forceUpdate: boolean;
	forceUpdateFirst: boolean;
	scope?: string;
	idPlaylist: number;
	bLSet?: BLCSet
	data: KaraList | Array<DBBLC> | undefined;
	scrollToIndex?: number;
	playlistInfo?: DBPL;
	bLSetList: BLCSet[];
	checkedkaras: number;
	playing?: number;
	songsBeforeJingle?: number;
	songsBeforeSponsor?: number;
	goToPlaying?: boolean;
	_goToPlaying?: boolean; // Avoid scroll event trigger
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

	constructor(props: IProps) {
		super(props);
		this.state = {
			getPlaylistInProgress: false,
			stopUpdate: false,
			forceUpdate: false,
			forceUpdateFirst: false,
			idPlaylist: 0,
			bLSet: undefined,
			data: undefined,
			bLSetList: [],
			searchType: 'search',
			checkedkaras: 0,
			searchCriteria : this.props.searchCriteria,
			searchValue: this.props.searchValue
		};
	}

	componentWillReceiveProps(nextProps: IProps) {
		if (nextProps.idPlaylistTo && nextProps.idPlaylistTo !== this.props.idPlaylistTo) {
			this.playlistForceRefresh(true);
		}
	}

	async componentDidMount() {
		if (this.context.globalState.auth.isAuthenticated) {
			await this.initCall();
		}
		getSocket().on('playingUpdated', this.playingUpdate);
		getSocket().on('whitelistUpdated', this.whitelistUpdated);
		getSocket().on('blacklistUpdated', this.blacklistUpdated);
		getSocket().on('favoritesUpdated', this.favoritesUpdated);
		getSocket().on('playlistContentsUpdated', this.playlistContentsUpdatedFromServer);
		getSocket().on('playlistInfoUpdated', this.playlistInfoUpdated);
		getSocket().on('publicPlaylistUpdated', this.publicPlaylistUpdated);
		getSocket().on('publicPlaylistEmptied', this.publicPlaylistEmptied);
		getSocket().on('KIDUpdated', this.KIDUpdated);
		getSocket().on('playerStatus', this.updateCounters);
		window.addEventListener('resize', this.refreshUiOnResize, true);
		eventEmitter.addChangeListener('playlistContentsUpdatedFromClient', this.playlistContentsUpdatedFromClient);
		eventEmitter.addChangeListener('changeIdPlaylist', this.changeIdPlaylistFromOtherSide);
	}

	componentWillUnmount() {
		getSocket().off('playingUpdated', this.playingUpdate);
		getSocket().off('whitelistUpdated', this.whitelistUpdated);
		getSocket().off('blacklistUpdated', this.blacklistUpdated);
		getSocket().off('favoritesUpdated', this.favoritesUpdated);
		getSocket().off('playlistContentsUpdated', this.playlistContentsUpdatedFromServer);
		getSocket().off('playlistInfoUpdated', this.playlistInfoUpdated);
		getSocket().off('publicPlaylistUpdated', this.publicPlaylistUpdated);
		getSocket().off('publicPlaylistEmptied', this.publicPlaylistEmptied);
		getSocket().off('KIDUpdated', this.KIDUpdated);
		getSocket().off('playerStatus', this.updateCounters);
		window.removeEventListener('resize', this.refreshUiOnResize, true);
		eventEmitter.removeChangeListener('playlistContentsUpdatedFromClient', this.playlistContentsUpdatedFromClient);
		eventEmitter.removeChangeListener('changeIdPlaylist', this.changeIdPlaylistFromOtherSide);
	}

	whitelistUpdated = () => {
		if (this.state.idPlaylist === -3) this.getPlaylist();
	}

	blacklistUpdated = () => {
		if (this.state.idPlaylist === -2 || this.state.idPlaylist === -4)
			this.getPlaylist();
	}

	favoritesUpdated = () => {
		if (this.state.idPlaylist === -5) this.getPlaylist();
	}

	playlistInfoUpdated = (idPlaylist: string) => {
		if (this.state.idPlaylist === Number(idPlaylist)) this.getPlaylistInfo();
	}

	publicPlaylistUpdated = (idPlaylist: number) => {
		if (this.props.scope !== 'admin' && this.props.side
			&& idPlaylist !== this.context.globalState.settings.data.state.publicPlaylistID) {
			setSettings(this.context.globalDispatch);
			this.changeIdPlaylist(idPlaylist);
		}
	}

	publicPlaylistEmptied = async () => {
		if (this.state.idPlaylist === -1) {
			const data = this.state.data as KaraList;
			for (const kara of data.content) {
				if (kara) {
					kara.my_public_plc_id = [];
					kara.flag_inplaylist = false;
					kara.flag_upvoted = false;
				}
			}
			await this.setState({ data });
			this.playlistForceRefresh(true);
		}
	}

	KIDUpdated = async (event: {
		kid: string,
		flag_inplaylist: boolean,
		username: string,
		requester: string,
		flag_upvoted: boolean,
		my_public_plc_id: number
	}[]) => {
		if (this.state.idPlaylist === -1) {
			const data = this.state.data as KaraList;
			for (const kara of data.content) {
				for (const karaUpdated of event) {
					if (kara?.kid === karaUpdated.kid) {
						if (karaUpdated.flag_inplaylist === false || karaUpdated.flag_inplaylist === true) {
							kara.flag_inplaylist = karaUpdated.flag_inplaylist;
							if (karaUpdated.flag_inplaylist === false) {
								kara.my_public_plc_id = [];
							}
						}
						if (karaUpdated.username === this.context.globalState.auth.data.username) {
							if (karaUpdated.flag_upvoted === false || karaUpdated.flag_upvoted === true) {
								kara.flag_upvoted = karaUpdated.flag_upvoted;
							}
						}
						if (karaUpdated.requester === this.context.globalState.auth.data.username) {
							kara.my_public_plc_id = [karaUpdated.my_public_plc_id];
						}
					}
				}
			}
			await this.setState({ data });
			this.playlistForceRefresh(true);
		}
	}

	initCall = async () => {
		await this.getIdPlaylist();
		if (this.props.scope === 'public' || this.props.playlistList
			.filter(playlist => playlist.playlist_id === this.state.idPlaylist).length !== 0) {
			if (this.props.scope === 'admin') await this.loadBLSet();
			await this.getPlaylist();
		}
	}

	playlistContentsUpdatedFromClient = (idPlaylist: number) => {
		const data = this.state.data as KaraList;
		if (this.state.idPlaylist > 0 && data) data.infos.from = 0;
		this.setState({ data: data });
		if (this.state.idPlaylist === Number(idPlaylist) && !this.state.stopUpdate) this.getPlaylist(this.state.searchType);
	}

	refreshUiOnResize = () => {
		this.playlistForceRefresh(true);
	}

	changeIdPlaylistFromOtherSide = ({ side, playlist }: { side: number, playlist: number }) => {
		if (this.props.side === side) this.changeIdPlaylist(playlist);
	}

	SortableList = SortableContainer(List, { withRef: true });

	isRowLoaded = ({ index }: Index) => {
		return Boolean(this.state.data && (this.state.data as KaraList).content[index]);
	}

	loadMoreRows = async ({ startIndex, stopIndex }: IndexRange) => {
		if (!this.state.getPlaylistInProgress) {
			const data = this.state.data as KaraList;
			data.infos.from = Math.floor(stopIndex / chunksize) * chunksize;
			await this.setState({ data: data });
			if (timer) clearTimeout(timer);
			timer = setTimeout(this.getPlaylist, 1000);
		}
	}

	rowRenderer = ({ index, isScrolling, key, parent, style }: ListRowProps) => {
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
						idPlaylist={this.state.idPlaylist}
						playlistInfo={this.state.playlistInfo}
						i18nTag={(this.state.data as KaraList).i18n}
						side={this.props.side}
						idPlaylistTo={this.props.idPlaylistTo}
						checkKara={this.checkKara}
						avatar_file={(this.state.data as KaraList).avatars[content.username]}
						deleteCriteria={this.deleteCriteria}
						jingle={typeof this.state.songsBeforeJingle === 'number' && (index === this.state.playing +
							this.state.songsBeforeJingle)}
						sponsor={typeof this.state.songsBeforeSponsor === 'number' && (index === this.state.playing +
							this.state.songsBeforeSponsor)}
						style={style}
						context={this.context}
						toggleKaraDetail={this.props.toggleKaraDetail}
					/>
				</CellMeasurer>
			);
		} else {
			return <li key={key} style={style}>
				<div className="list-group-item">
					<div className="actionDiv" />
					<div className="infoDiv" />
					<div className="contentDiv" >{i18next.t('LOADING')}</div>
				</div>
			</li>;
		}
	}

	noRowsRenderer = () => {
		return <React.Fragment>
			{this.context?.globalState.settings.data.config?.Gitlab.Enabled &&
				this.state.idPlaylist === -1 ? (
					<li className="list-group-item karaSuggestion">
						<div>{i18next.t('KARA_SUGGESTION_NOT_FOUND')}</div>
						{this.props.scope === 'admin' ?
							<React.Fragment>
								<div><a href="/system/km/karas/download">{i18next.t('KARA_SUGGESTION_DOWNLOAD')}</a></div>
								<div>{i18next.t('KARA_SUGGESTION_OR')}</div>
								<div><a onClick={this.karaSuggestion}>{i18next.t('KARA_SUGGESTION_GITLAB_ADMIN')}</a></div>
							</React.Fragment> :
							<div><a onClick={this.karaSuggestion}>{i18next.t('KARA_SUGGESTION_GITLAB')}</a></div>
						}
					</li>
				) : null}
		</React.Fragment>;
	}

	playlistContentsUpdatedFromServer = (idPlaylist: number) => {
		if (this.state.idPlaylist === Number(idPlaylist) && !this.state.stopUpdate) this.getPlaylist();
	};

	getIdPlaylist = async () => {
		let value: number;
		if (this.props.scope === 'public') {
			value = this.props.idPlaylist;
		} else {
			let plVal1Cookie = localStorage.getItem('mugenPlVal1');
			let plVal2Cookie = localStorage.getItem('mugenPlVal2');
			if (plVal1Cookie === plVal2Cookie) {
				plVal2Cookie = null;
				plVal1Cookie = null;
			}

			if (this.props.side === 1) {
				value = plVal1Cookie !== null && !isNaN(Number(plVal1Cookie))
					&& this.props.playlistList.filter(playlist => playlist.playlist_id === Number(plVal1Cookie)).length > 0 ?
					Number(plVal1Cookie) : -1;
			} else {
				value = plVal2Cookie !== null && !isNaN(Number(plVal2Cookie))
					&& this.props.playlistList.filter(playlist => playlist.playlist_id === Number(plVal1Cookie)).length > 0 ?
					Number(plVal2Cookie) : this.context.globalState.settings.data.state.currentPlaylistID;
			}
		}
		await this.setState({ idPlaylist: value });
		this.props.majIdsPlaylist(this.props.side, value);
	};

	loadBLSet = async (idBLSet?: number) => {
		const bLSetList = await commandBackend('getBLCSets');
		const bLSet = bLSetList.filter((set: BLCSet) => idBLSet ? set.blc_set_id === idBLSet : set.flag_current)[0];
		await this.setState({ bLSetList: bLSetList, bLSet: bLSet });
		setCurrentBlSet(this.context.globalDispatch, bLSet.blc_set_id);
	}

	changeIdPlaylist = async (idPlaylist: number, idBLSet?: number) => {
		if (idPlaylist === -2 || idPlaylist === -4) {
			await this.loadBLSet(idBLSet);
		}
		if (this.props.scope === 'admin' && this.state.idPlaylist === -1 && this.props.searchMenuOpen) {
			this.props.toggleSearchMenu && this.props.toggleSearchMenu();
		}
		localStorage.setItem(`mugenPlVal${this.props.side}`, idPlaylist.toString());
		const oldIdPlaylist = this.state.idPlaylist;
		await this.setState({ idPlaylist: Number(idPlaylist), data: undefined, playlistInfo: undefined });
		this.getPlaylist();
		this.props.majIdsPlaylist(this.props.side, idPlaylist);
		if (idPlaylist === this.props.idPlaylistTo) {
			eventEmitter.emitChange('changeIdPlaylist', { side: this.props.side === 1 ? 2 : 1, playlist: oldIdPlaylist });
		}
	};

	editNamePlaylist = () => {
		if (this.state.idPlaylist === -4) {
			callModal('prompt', i18next.t('CL_RENAME_PLAYLIST', { playlist: this.state.bLSet?.name }), '', (newName: string) => {
				commandBackend('editBLCSet', {
					name: newName,
					set_di: this.state.bLSet?.blc_set_id
				});
				const bLSet = this.state.bLSet as BLCSet;
				bLSet.name = newName;
				this.setState({ bLSet: bLSet });
			});
		} else {
			callModal('prompt', i18next.t('CL_RENAME_PLAYLIST', { playlist: (this.state.playlistInfo as DBPL).name }), '', (newName: string) => {
				commandBackend('editPlaylist', {
					name: newName,
					flag_visible: (this.state.playlistInfo as DBPL).flag_visible,
					pl_id: this.state.idPlaylist
				});
				const playlistInfo = this.state.playlistInfo as DBPL;
				playlistInfo.name = newName;
				this.setState({ playlistInfo: playlistInfo });
			});
		}
	};

	getPlaylistInfo = async () => {
		if (!this.state.getPlaylistInProgress) {
			const response = await commandBackend('getPlaylist', { pl_id: this.state.idPlaylist });
			this.setState({ playlistInfo: response });
		}
	};

	getPlaylistUrl = (idPlaylistParam?: number) => {
		const idPlaylist: number = idPlaylistParam ? idPlaylistParam : this.state.idPlaylist;
		let url = '';
		if (idPlaylist >= 0) {
			url = 'getPlaylistContents';
		} else if (idPlaylist === -1) {
			url = 'getKaras';
		} else if (idPlaylist === -2) {
			url = 'getBlacklist';
		} else if (idPlaylist === -3) {
			url = 'getWhitelist';
		} else if (idPlaylist === -4) {
			url = 'getBLCSet';
		} else if (idPlaylist === -5) {
			url = 'getFavorites';
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

	getFilterValue(side: number) {
		return side === 1 ?
			this.context.globalState.frontendContext.filterValue1 || '' :
			this.context.globalState.frontendContext.filterValue2 || '';
	}

	getPlaylist = async (searchType?: string) => {
		const criterias: any = {
			'year': 'y',
			'tag': 't'
		};
		const stateData = this.state.data as KaraList;
		let data: any = { getPlaylistInProgress: true };
		if (searchType) {
			data.searchType = searchType;
			data.data = this.state.data;
			if (data?.data?.infos) data.data.infos.from = 0;
			this.setState({ searchType: searchType });
		} else if (stateData?.infos?.from === 0) {
			data.searchType = undefined;
		}
		await this.setState(data);
		const url: string = this.getPlaylistUrl();
		const param:any = {};
		if (this.state.idPlaylist >= 0) {
			this.getPlaylistInfo();
			param.pl_id = this.state.idPlaylist;
		}
		if (url === 'getBLCSet') param.set_id = this.state.bLSet?.blc_set_id;
		
		param.filter = this.getFilterValue(this.props.side);
		param.from = (stateData?.infos?.from > 0 ? stateData.infos.from : 0);
		param.size = chunksize;
		if ((this.state.searchType && this.state.searchType !== 'search') || (this.state.searchCriteria && this.state.searchValue)) {
			const searchCriteria = this.state.searchCriteria ?
				criterias[this.state.searchCriteria]
				: '';
			param.searchType = this.state.searchType;
			if (searchCriteria && this.state.searchValue) param.searchValue = searchCriteria + ':' + this.state.searchValue;
		}
		const karas: KaraList = await commandBackend(url, param);
		if (this.state.idPlaylist > 0) {
			karas.content.forEach((kara, index) => {
				if (kara?.flag_playing) {
					setPosPlaying(this.context.globalDispatch, kara.pos, this.props.side);
					this.setState({ scrollToIndex: index, _goToPlaying: true, playing: index });
				}
			});
		}
		if (karas.infos?.from > 0) {
			data = this.state.data;
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
		} else {
			data = karas;
		}
		this.setState({ data: data, getPlaylistInProgress: false });
		this.playlistForceRefresh(true);
	};

	playingUpdate = (data: { playlist_id: number, plc_id: number }) => {
		if (this.state.idPlaylist === data.playlist_id && !this.state.stopUpdate) {
			const playlistData = this.state.data as KaraList;
			let indexPlaying;
			playlistData?.content.forEach((kara, index) => {
				if (kara?.flag_playing) {
					kara.flag_playing = false;
					kara.flag_dejavu = true;
				} else if (kara?.playlistcontent_id === data.plc_id) {
					kara.flag_playing = true;
					indexPlaying = index;
					setPosPlaying(this.context.globalDispatch, kara.pos, this.props.side);
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
		if (this.state.idPlaylist && stateData && stateData.infos && stateData.infos.count) {
			plInfos =
				this.state.idPlaylist !== -4 ? stateData.infos.from + '-' + stateData.infos.to : '';
			plInfos +=
				(this.state.idPlaylist !== -4
					? ' / ' +
					stateData.infos.count +
					(!is_touch_device() ? ' karas' : '')
					: '') +
				(this.state.idPlaylist > -1 && this.state.playlistInfo
					? ` ~ ${is_touch_device() ? 'dur.' : i18next.t('DETAILS_DURATION')} ` +
					secondsTimeSpanToHMS(this.state.playlistInfo.duration, 'hm') +
					` / ${secondsTimeSpanToHMS(this.state.playlistInfo.time_left, 'hm')} ${is_touch_device() ? 're.' : i18next.t('DURATION_REMAINING')} `
					: '');
		}
		return plInfos;
	};

	scrollToPlaying = async () => {
		if (this.state.playing) {
			this.setState({ scrollToIndex: this.state.playing, goToPlaying: true, _goToPlaying: true });
		} else {
			const result = await commandBackend('findPlayingSongInPlaylist', { pl_id: this.state.idPlaylist });
			if (result?.index !== -1) {
				this.setState({ scrollToIndex: result.index, goToPlaying: true, _goToPlaying: true });
			}
		}
	};

	updateCounters = (event: PublicPlayerState) => {
		if (this.state.playlistInfo && this.state.playlistInfo.flag_current)
			this.setState({ songsBeforeJingle: event.songsBeforeJingle, songsBeforeSponsor: event.songsBeforeSponsor });
		else this.setState({ songsBeforeJingle: undefined, songsBeforeSponsor: undefined });
	}

	selectAllKaras = () => {
		const data = this.state.data;
		let checkedkaras = 0;
		for (const kara of (this.state.data as KaraList)?.content) {
			if (kara) {
				kara.checked = !kara.checked;
				if (kara.checked) checkedkaras++;
			}
		}
		this.setState({ data, checkedkaras });
		this.playlistForceRefresh(true);
	};

	checkKara = (id: string | number) => {
		const data = this.state.data as KaraList;
		let checkedkaras = this.state.checkedkaras;
		for (const kara of data.content) {
			if (this.state.idPlaylist >= 0) {
				if (kara.playlistcontent_id === id) {
					kara.checked = !kara.checked;
					if (kara.checked) {
						checkedkaras++;
					} else {
						checkedkaras--;
					}
				}
			} else if (kara.kid === id) {
				kara.checked = !kara.checked;
				if (kara.checked) {
					checkedkaras++;
				} else {
					checkedkaras--;
				}
			}
		}
		this.setState({ data: data, checkedkaras: checkedkaras });
		this.playlistForceRefresh(true);
	};

	getSearchTagForAddAll = () => {
		const criterias: any = {
			'year': 'y',
			'tag': 't'
		};
		return (this.state.searchType !== 'search' || (this.state.searchCriteria && this.state.searchValue)) ? {
			searchType: this.state.searchType,
			searchValue: ((this.state.searchCriteria && criterias[this.state.searchCriteria] && this.state.searchValue) ?
				`${criterias[this.state.searchCriteria]}:${this.state.searchValue}` : undefined)
		} : {};
	}

	addRandomKaras = () => {
		callModal('prompt', i18next.t('CL_ADD_RANDOM_TITLE'), '', async (nbOfRandoms: number) => {
			const randomKaras = await commandBackend(this.getPlaylistUrl(), {
				filter: this.getFilterValue(this.props.side),
				pl_id: this.state.idPlaylist,
				random: nbOfRandoms,
				...this.getSearchTagForAddAll()
			});
			if (randomKaras.content.length > 0) {
				const textContent = randomKaras.content.map((e: KaraElement) => <React.Fragment key={e.kid}>{buildKaraTitle(this.context.globalState.settings.data, e, true)} <br /><br /></React.Fragment>);
				callModal('confirm', i18next.t('CL_CONGRATS'), <React.Fragment>{i18next.t('CL_ABOUT_TO_ADD')}<br /><br />{textContent}</React.Fragment>, () => {
					const karaList = randomKaras.content.map((a: KaraElement) => {
						return a.kid;
					});
					commandBackend('addKaraToPlaylist', { kid: karaList, pl_id: this.props.idPlaylistTo });
				}, '');
			}
		}, '1');
	};

	addAllKaras = async () => {
		const response = await commandBackend(this.getPlaylistUrl(), {
			filter: this.getFilterValue(this.props.side),
			set_id: this.state.bLSet?.blc_set_id,
			...this.getSearchTagForAddAll()
		});
		const karaList = response.content.map((a: KaraElement) => a.kid);
		displayMessage('info', i18next.t('PL_MULTIPLE_ADDED', { count: response.content.length }));
		commandBackend('addKaraToPlaylist', { kid: karaList, requestedby: this.context.globalState.auth.data.username, pl_id: this.props.idPlaylistTo });
	};

	addCheckedKaras = async (_event?: any, pos?: number) => {
		const stateData = this.state.data as KaraList;
		const listKara = stateData.content.filter(a => a?.checked);
		if (listKara.length === 0) {
			displayMessage('warning', i18next.t('SELECT_KARAS_REQUIRED'));
			return;
		}
		const idKara = listKara.map(a => a.kid);
		const idKaraPlaylist = listKara.map(a => String(a.playlistcontent_id));
		let url = '';
		let data;

		if (this.props.idPlaylistTo > 0) {
			if (this.state.idPlaylist > 0 && !pos) {
				url = 'copyKaraToPlaylist';
				data = {
					pl_id: this.props.idPlaylistTo,
					plc_id: idKaraPlaylist
				};
			} else {
				url = 'addKaraToPlaylist';
				if (pos) {
					data = {
						pl_id: this.props.idPlaylistTo,
						requestedby: this.context.globalState.auth.data.username,
						kid: idKara,
						pos: pos + 1
					};
				} else {
					data = {
						pl_id: this.props.idPlaylistTo,
						requestedby: this.context.globalState.auth.data.username,
						kid: idKara
					};
				}
			}
		} else if (this.props.idPlaylistTo === -2 || this.props.idPlaylistTo === -4) {
			url = 'createBLC';
			data = {
				blcriteria_type: 1001,
				blcriteria_value: idKara,
				set_id: this.context.globalState.frontendContext.currentBlSet
			};
		} else if (this.props.idPlaylistTo === -3) {
			url = 'addKaraToWhitelist';
			data = { kid: idKara };
		} else if (this.props.idPlaylistTo === -5) {
			url = 'addFavorites';
			data = { kid: stateData.content.filter(a => a.checked).map(a => a.kid) };
		}
		await commandBackend(url, data);
		const karaList = (this.state.data as KaraList);
		for (const kara of karaList.content) {
			if (kara) {
				kara.checked = false;
			}
		}
		this.setState({ data: karaList });
		this.playlistForceRefresh(true);
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
		if (this.state.idPlaylist > 0) {
			const idKaraPlaylist = listKara.map(a => a.playlistcontent_id);
			url = 'deleteKaraFromPlaylist';
			data = {
				plc_id: idKaraPlaylist,
				pl_id: this.state.idPlaylist
			};
		} else if (this.state.idPlaylist === -3) {
			url = 'deleteKaraFromWhitelist';
			data = { kid: listKara.map(a => a.kid) };
		} else if (this.state.idPlaylist === -5) {
			url = 'deleteFavorites';
			data = { kid: listKara.map(a => a.kid) };
		}
		if (url) {
			await commandBackend(url, data);
		}
	};

	karaSuggestion = () => {
		ReactDOM.render(<SuggestionModal />, document.getElementById('modal'));
	}

	onChangeTags = (type: number | string, value: string) => {
		const searchCriteria = type === 0 ? 'year' : 'tag';
		const stringValue = searchCriteria === 'tag' ? `${value}~${type}` : value;
		this.setState({ searchCriteria: searchCriteria, searchValue: stringValue }, () => this.getPlaylist('search'));
	};

	deleteCriteria = (kara: DBBlacklist) => {
		callModal('confirm', i18next.t('CL_DELETE_CRITERIAS_PLAYLIST', { type: i18next.t(`BLACKLIST.BLCTYPE_${kara.blc_type}`) }),
			<div style={{ maxHeight: '200px' }}>
				{((this.state.data as KaraList).content as unknown as DBBlacklist[])
					.filter((e: DBBlacklist) => e.blc_id === kara.blc_id).map((criteria: DBBlacklist) => {
						return <label key={kara.kid}>{buildKaraTitle(this.context.globalState.settings.data, criteria as unknown as KaraElement, true)}</label>;
					})}
			</div>, async (confirm: boolean) => {
				if (confirm) {
					await commandBackend('deleteBLC', {
						blc_id: kara.blc_id,
						set_id: this.context.globalState.frontendContext.currentBlSet
					});
				}
			});
	};

	sortRow = ({ oldIndex, newIndex }: { oldIndex: number, newIndex: number }) => {
		if (oldIndex !== newIndex) {
			const data = this.state.data as KaraList;
			// extract playlistcontent_id based on sorter index
			const playlistcontent_id = data.content[oldIndex].playlistcontent_id;

			// fix index to match api behaviour
			let apiIndex = newIndex + 1;
			if (newIndex > oldIndex)
				apiIndex = apiIndex + 1;

			commandBackend('editPLC', {
				pos: apiIndex,
				pl_id: this.state.idPlaylist,
				plc_id: playlistcontent_id
			});

			let karas: Array<KaraElement> = [];
			if (oldIndex < newIndex) {
				karas = data.content.splice(0, oldIndex).concat(
					data.content.splice(oldIndex + 1, newIndex - oldIndex),
					data.content[oldIndex],
					data.content.splice(newIndex)
				);
			} else if (oldIndex > newIndex) {
				karas = data.content.splice(0, newIndex).concat(
					data.content[oldIndex],
					data.content.splice(newIndex, oldIndex - newIndex),
					data.content.splice(oldIndex + 1)
				);
			}
			data.content = karas;
			this.setState({ data: data, stopUpdate: false });
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

	componentDidUpdate() {
		if (this.state.forceUpdateFirst) {
			setTimeout(() => {
				this.playlistForceRefresh(false);
			}, 50);
		}
	}

	render() {
		return <div className="playlist--wrapper">
			<PlaylistHeader
				side={this.props.side}
				scope={this.props.scope}
				playlistList={this.props.playlistList}
				idPlaylist={this.state.idPlaylist}
				bLSet={this.state.bLSet}
				bLSetList={this.state.bLSetList}
				changeIdPlaylist={this.changeIdPlaylist}
				playlistInfo={this.state.playlistInfo}
				editNamePlaylist={this.editNamePlaylist}
				idPlaylistTo={this.props.idPlaylistTo}
				selectAllKaras={this.selectAllKaras}
				addAllKaras={this.addAllKaras}
				addCheckedKaras={this.addCheckedKaras}
				transferCheckedKaras={this.transferCheckedKaras}
				deleteCheckedKaras={this.deleteCheckedKaras}
				tags={this.props.tags}
				onChangeTags={this.onChangeTags}
				getPlaylist={this.getPlaylist}
				toggleSearchMenu={this.props.toggleSearchMenu}
				searchMenuOpen={this.props.searchMenuOpen}
				playlistWillUpdate={this.playlistWillUpdate}
				playlistDidUpdate={this.playlistDidUpdate}
				checkedkaras={this.state.checkedkaras}
				addRandomKaras={this.addRandomKaras}
			/>
			<div
				id={'playlist' + this.props.side}
				className="playlistContainer"
			>
				{
					(!this.state.data || (this.state.data && (this.state.data as KaraList).infos
						&& ((this.state.data as KaraList).infos.count === 0 || !(this.state.data as KaraList).infos.count)))
						&& this.state.getPlaylistInProgress
						? <div className="loader" />
						: (
							this.state.idPlaylist !== -4 && this.state.data
								? <InfiniteLoader
									isRowLoaded={this.isRowLoaded}
									loadMoreRows={this.loadMoreRows}
									rowCount={(this.state.data as KaraList).infos.count || 0}>
									{({ onRowsRendered, registerChild }) => (
										<AutoSizer>
											{({ height, width }) => {
												return (
													<this.SortableList
														{...[this.state.forceUpdate]}
														pressDelay={0}
														helperClass="playlist-dragged-item"
														useDragHandle={true}
														ref={registerChild}
														onRowsRendered={onRowsRendered}
														rowCount={((this.state.data as KaraList).infos.count) || 0}
														rowHeight={_cache.rowHeight}
														rowRenderer={this.rowRenderer}
														noRowsRenderer={this.noRowsRenderer}
														height={height}
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
								: (
									this.state.data &&
									<BlacklistCriterias
										data={this.state.data as DBBLC[]}
										scope={this.props.scope}
										tags={this.props.tags}
										blSet={this.state.bLSet as BLCSet}
									/>
								)
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
						<i className="fas fa-chevron-up"></i>
					</button>
					{this.state.idPlaylist > 0 ?
						<button
							type="button"
							title={i18next.t('GOTO_PLAYING')}
							className={`btn btn-sm btn-action ${this.state.goToPlaying ? 'btn-active' : ''}`}
							onClick={this.scrollToPlaying}
							value="playing"
						>
							<i className="fas fa-play"></i>
						</button> : null
					}
					<button
						type="button"
						title={i18next.t('GOTO_BOTTOM')}
						className="btn btn-sm btn-action"
						onClick={() => this.setState({ scrollToIndex: (this.state.data as KaraList).infos.count - 1, goToPlaying: false, _goToPlaying: false })}
					>
						<i className="fas fa-chevron-down"></i>
					</button>
				</div>
				<div className="plInfos">{this.getPlInfosElement()}</div>
				{this.state.checkedkaras > 0 ?
					<div className="plQuota selection">
						{i18next.t('CHECKED')}{this.state.checkedkaras}
					</div> : null
				}
			</div>
		</div>;
	}
}

export default Playlist;
