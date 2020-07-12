import 'react-virtualized/styles.css';

import axios from 'axios';
import i18next from 'i18next';
import debounce from 'lodash.debounce';
import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import { SortableContainer, SortableElement } from 'react-sortable-hoc';
import { AutoSizer, CellMeasurer, CellMeasurerCache, Index, IndexRange, InfiniteLoader, List, ListRowProps } from 'react-virtualized';

import { Token } from '../../../../src/lib/types/user';
import { BLCSet } from '../../../../src/types/blacklist';
import { Config } from '../../../../src/types/config';
import { DBBlacklist, DBBLC } from '../../../../src/types/database/blacklist';
import { DBPL } from '../../../../src/types/database/playlist';
import { PublicPlayerState } from '../../../../src/types/state';
import store from '../../store';
import { KaraElement } from '../../types/kara';
import { Tag } from '../../types/tag';
import SuggestionModal from '../modals/SuggestionModal';
import { buildKaraTitle, callModal, displayMessage, getSocket, is_touch_device, secondsTimeSpanToHMS } from '../tools';
import BlacklistCriterias from './BlacklistCriterias';
import KaraDetail from './KaraDetail';
import KaraLine from './KaraLine';
import PlaylistHeader from './PlaylistHeader';
require('./Playlist.scss');

const chunksize = 400;
const _cache = new CellMeasurerCache({ defaultHeight: 40, fixedWidth: true });
let timer: any;

interface IProps {
	scope: string;
	side: number;
	config: Config;
	idPlaylistTo: number;
	kidPlaying?: string | undefined;
	tags?: Array<Tag> | undefined;
	searchMenuOpen?: boolean;
	playlistList: Array<PlaylistElem>;
	toggleSearchMenu?: () => void;
	showVideo: (file: string) => void;
	updateKidPlaying?: (kid: string) => void;
	majIdsPlaylist: (side: number, value: number) => void;
}

interface IState {
	searchValue?: string;
	searchCriteria?: string;
	searchType?: string;
	getPlaylistInProgress: boolean;
	stopUpdate: boolean;
	forceUpdate: boolean;
	forceUpdateFirst: boolean;
	scope?: string;
	idPlaylist: number;
	bLSet?: BLCSet
	data: KaraList | Array<DBBLC> | undefined;
	quotaString?: any;
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
			checkedkaras: 0
		};
	}

	componentWillReceiveProps(nextProps: IProps) {
		if (nextProps.idPlaylistTo && nextProps.idPlaylistTo !== this.props.idPlaylistTo) {
			this.playlistForceRefresh(true);
		}
		if (nextProps.config.Frontend.Mode && nextProps.config.Frontend.Mode === 2
			&& nextProps.config.Frontend.Mode !== this.props.config.Frontend.Mode) {
			this.getPlaylist();
		}
		if (nextProps.config.Frontend.Mode && nextProps.config.Frontend.Mode === 1
			&& nextProps.config.Frontend.Mode !== this.props.config.Frontend.Mode
			&& this.props.side === 2) {
			this.initCall();
		}
	}

	async componentDidMount() {
		if (axios.defaults.headers.common['authorization']) {
			await this.initCall();
		}
		getSocket().on('playingUpdated', this.playingUpdate);
		getSocket().on('whitelistUpdated', () => {
			if (this.state.idPlaylist === -3) this.getPlaylist();
		});
		getSocket().on('blacklistUpdated', () => {
			if (this.state.idPlaylist === -2 || this.state.idPlaylist === -4)
				this.getPlaylist();
		});
		getSocket().on('favoritesUpdated', () => {
			if (this.state.idPlaylist === -5) this.getPlaylist();
		});
		getSocket().on('playlistContentsUpdated', this.playlistContentsUpdatedFromServer);
		getSocket().on('playlistInfoUpdated', (idPlaylist: string) => {
			if (this.state.idPlaylist === Number(idPlaylist)) this.getPlaylistInfo();
		});
		getSocket().on('quotaAvailableUpdated', this.updateQuotaAvailable);
		store.addChangeListener('playlistContentsUpdated', (idPlaylist: number) => {
			const data = this.state.data as KaraList;
			if (this.state.idPlaylist > 0) data.infos.from = 0;
			this.setState({ data: data });
			this.playlistContentsUpdated(idPlaylist);
		});
		store.addChangeListener('loginUpdated', this.initCall);
		getSocket().on('publicPlaylistUpdated', (idPlaylist: number) => {
			if (this.props.scope !== 'admin' && this.props.side
				&& idPlaylist !== store.getState().publicPlaylistID) {
				const state = store.getState();
				state.publicPlaylistID = idPlaylist;
				store.setState(state);
				this.changeIdPlaylist(idPlaylist);
			}
		});
		getSocket().on('publicPlaylistEmptied', async () => {
			if (this.state.idPlaylist === -1) {
				const data = this.state.data as KaraList;
				for (const kara of data.content) {
					kara.my_public_plc_id = [];
					kara.flag_inplaylist = false;
					kara.flag_upvoted = false;
				}
				await this.setState({ data });
				this.playlistForceRefresh(true);
			}
		});
		getSocket().on('KIDUpdated', async (event: {
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
						if (kara.kid === karaUpdated.kid) {
							if (karaUpdated.flag_inplaylist === false || karaUpdated.flag_inplaylist === true) {
								kara.flag_inplaylist = karaUpdated.flag_inplaylist;
								if (karaUpdated.flag_inplaylist === false) {
									kara.my_public_plc_id = [];
								}
							}
							if (karaUpdated.username === store.getLogInfos()?.username) {
								if (karaUpdated.flag_upvoted === false || karaUpdated.flag_upvoted === true) {
									kara.flag_upvoted = karaUpdated.flag_upvoted;
								}
							}
							if (karaUpdated.requester === store.getLogInfos()?.username) {
								kara.my_public_plc_id = [karaUpdated.my_public_plc_id];
							}
						}
					}
				}
				await this.setState({ data });
				this.playlistForceRefresh(true);
			}
		});
		getSocket().on('playerStatus', this.updateCounters);

		window.addEventListener('resize', this.refreshUiOnResize, true);
	}

	initCall = async () => {
		await this.getIdPlaylist();
		if (this.state.idPlaylist === -1 || this.props.playlistList
			.filter(playlist => playlist.playlist_id === this.state.idPlaylist).length !== 0) {
			if (this.props.scope === 'admin') await this.loadBLSet();
			if (this.props.scope === 'admin' || this.props.config.Frontend.Mode === 2 || this.state.idPlaylist === store.getState().currentPlaylistID) {
				await this.getPlaylist();
			}
		}
	}

	componentWillUnmount() {
		window.removeEventListener('resize', this.refreshUiOnResize, true);
		store.removeChangeListener('playlistContentsUpdated', this.playlistContentsUpdated);
		store.removeChangeListener('loginUpdated', this.initCall);
	}

	refreshUiOnResize = () => {
		this.playlistForceRefresh(true);
	}

	SortableList = SortableContainer((List as any), { withRef: true })
	SortableItem = SortableElement(({ value, style }: any) => {
		if (value.content) {
			const kara = value.content as KaraElement;
			const s = JSON.parse(JSON.stringify(style));
			s.zIndex = 999999999 - value.index;
			return <li data-kid={kara.kid} key={value.key} style={s}>
				<KaraLine
					index={value.index}
					key={kara.kid}
					kara={kara}
					scope={this.props.scope}
					idPlaylist={this.state.idPlaylist}
					playlistInfo={this.state.playlistInfo}
					i18nTag={(this.state.data as KaraList).i18n}
					side={this.props.side}
					config={this.props.config}
					idPlaylistTo={this.props.idPlaylistTo}
					checkKara={this.checkKara}
					showVideo={this.props.showVideo}
					avatar_file={(this.state.data as KaraList).avatars[kara.username]}
					deleteCriteria={this.deleteCriteria}
					jingle={typeof this.state.songsBeforeJingle === 'number' && (value.index === this.state.playing +
						this.state.songsBeforeJingle)}
					sponsor={typeof this.state.songsBeforeSponsor === 'number' && (value.index === this.state.playing +
						this.state.songsBeforeSponsor)}
				/>
			</li>;
		} else {
			const s = JSON.parse(JSON.stringify(style));
			s.height = 39;
			// placeholder line while loading kara content
			return (
				<li key={value.key} style={s}>
					<div className="list-group-item">
						<div className="actionDiv" />
						<div className="infoDiv" />
						<div className="contentDiv" >Loading...</div>
					</div>
				</li>
			);
		}
	});

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
		let content;
		if (this.state.data && (this.state.data as KaraList).content && (this.state.data as KaraList).content[index]) {
			content = (this.state.data as KaraList).content[index];
		} else {
			content = null;
		}
		return (
			<CellMeasurer
				cache={_cache}
				columnIndex={0}
				key={key}
				parent={parent}
				rowIndex={index}
			>
				<this.SortableItem key={key} index={index} style={style} value={{ content, key, index }} />
			</CellMeasurer>
		);
	}

	noRowsRenderer = () => {
		return <React.Fragment>
			{this.props.config &&
				this.props.config.Gitlab.Enabled &&
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

	playlistContentsUpdated = (idPlaylist: number) => {
		if (this.state.idPlaylist === Number(idPlaylist) && !this.state.stopUpdate) this.getPlaylist(this.state.searchType);
	};

	playlistContentsUpdatedFromServer = (idPlaylist: number) => {
		if (this.state.idPlaylist === Number(idPlaylist) && !this.state.stopUpdate) this.getPlaylist();
	};

	updateQuotaAvailable = (data: { username: string, quotaType: number, quotaLeft: number }) => {
		if (store.getLogInfos() && (store.getLogInfos() as Token).username === data.username) {
			let quotaString: any = '';
			if (data.quotaType == 1) {
				quotaString = data.quotaLeft;
			} else if (data.quotaType == 2) {
				quotaString = secondsTimeSpanToHMS(data.quotaLeft, 'ms');
			}
			if (data.quotaLeft == -1) {
				quotaString = <i className="fas fa-infinity"></i>;
			}
			this.setState({ quotaString: quotaString });
		}
	};

	getIdPlaylist = () => {
		let value: number;
		if (this.props.scope === 'public') {
			value =
				this.props.side === 1
					? -1
					: (store.getConfig().Frontend.Mode === 1 ?
						store.getState().currentPlaylistID :
						store.getState().publicPlaylistID);
		} else {
			let plVal1Cookie = localStorage.getItem('mugenPlVal1');
			let plVal2Cookie = localStorage.getItem('mugenPlVal2');
			if (plVal1Cookie === plVal2Cookie) {
				plVal2Cookie = null;
				plVal1Cookie = null;
			}

			if (this.props.side === 1) {
				value = plVal1Cookie !== null && !isNaN(Number(plVal1Cookie)) ? Number(plVal1Cookie) : -1;
			} else {
				value = plVal2Cookie !== null && !isNaN(Number(plVal2Cookie)) ? Number(plVal2Cookie) : store.getState().publicPlaylistID;
			}
		}
		this.setState({ idPlaylist: value });
		this.props.majIdsPlaylist(this.props.side, value);
	};

	loadBLSet = async (idBLSet?: number) => {
		const bLSetList = (await axios.get('/blacklist/set')).data;
		const bLSet = bLSetList.filter((set: BLCSet) => idBLSet ? set.blc_set_id === idBLSet : set.flag_current)[0];
		await this.setState({ bLSetList: bLSetList, bLSet: bLSet });
		store.setCurrentBlSet(bLSet.blc_set_id);
	}

	changeIdPlaylist = async (idPlaylist: number, idBLSet?: number) => {
		if (idPlaylist === -2 || idPlaylist === -4) {
			await this.loadBLSet(idBLSet);
		}
		if (this.props.scope === 'admin' && this.state.idPlaylist === -1 && this.props.searchMenuOpen) {
			this.props.toggleSearchMenu && this.props.toggleSearchMenu();
		}
		localStorage.setItem(`mugenPlVal${this.props.side}`, idPlaylist.toString());
		this.setState({ idPlaylist: Number(idPlaylist), data: undefined }, this.getPlaylist);
		this.props.majIdsPlaylist(this.props.side, idPlaylist);
	};

	editNamePlaylist = () => {
		if (this.state.idPlaylist === -4) {
			callModal('prompt', i18next.t('CL_RENAME_PLAYLIST', { playlist: this.state.bLSet?.name }), '', (newName: string) => {
				axios.put(`/blacklist/set/${this.state.bLSet?.blc_set_id}`, { name: newName });
				const bLSet = this.state.bLSet as BLCSet;
				bLSet.name = newName;
				this.setState({ bLSet: bLSet });
			});
		} else {
			callModal('prompt', i18next.t('CL_RENAME_PLAYLIST', { playlist: (this.state.playlistInfo as DBPL).name }), '', (newName: string) => {
				axios.put(`/playlists/${this.state.idPlaylist}`,
					{ name: newName, flag_visible: (this.state.playlistInfo as DBPL).flag_visible });
				const playlistInfo = this.state.playlistInfo as DBPL;
				playlistInfo.name = newName;
				this.setState({ playlistInfo: playlistInfo });
			});
		}
	};

	getPlaylistInfo = async () => {
		if (!this.state.getPlaylistInProgress) {
			const response = await axios.get(`/playlists/${this.state.idPlaylist}`);
			this.setState({ playlistInfo: response.data });
		}
	};

	getPlaylistUrl = (idPlaylistParam?: number) => {
		const idPlaylist: number = idPlaylistParam ? idPlaylistParam : this.state.idPlaylist;
		let url = '';
		if (idPlaylist >= 0) {
			url =
				'/playlists/' +
				idPlaylist +
				'/karas';
		} else if (idPlaylist === -1) {
			url = '/karas';
		} else if (idPlaylist === -2) {
			url = '/blacklist';
		} else if (idPlaylist === -3) {
			url = '/whitelist';
		} else if (idPlaylist === -4) {
			url = `/blacklist/set/${this.state.bLSet?.blc_set_id}/criterias`;
		} else if (idPlaylist === -5) {
			url = '/favorites';
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
			data.data.infos.from = 0;
			// data.scrollToIndex = 0;
			this.setState({ searchType: searchType });
		} else if (stateData && stateData.infos && stateData.infos.from == 0) {
			data.searchType = undefined;
		}
		let url: string = this.getPlaylistUrl();
		if (this.state.idPlaylist >= 0) {
			this.getPlaylistInfo();
		}
		await this.setState(data);

		url +=
			'?filter=' +
			store.getFilterValue(this.props.side) +
			'&from=' +
			(stateData && stateData.infos && stateData.infos.from > 0 ? stateData.infos.from : 0) +
			'&size=' + chunksize;
		if (this.state.searchType !== 'search' || (this.state.searchCriteria && this.state.searchValue)) {
			const searchCriteria = this.state.searchCriteria ?
				criterias[this.state.searchCriteria]
				: '';
			url += '&searchType=' + this.state.searchType
				+ ((searchCriteria && this.state.searchValue) ? ('&searchValue=' + searchCriteria + ':' + this.state.searchValue) : '');
		}
		const response = await axios.get(url);
		const karas: KaraList = response.data;
		let indexPlaying = undefined;
		if (this.state.idPlaylist > 0) {
			let i = 0;
			for (const kara of karas.content) {
				if (kara?.flag_playing) {
					indexPlaying = i;
					store.setPosPlaying(kara.pos);
					if (this.props.config.Frontend.Mode === 1 && this.props.scope === 'public') {
						this.props.updateKidPlaying && this.props.updateKidPlaying(kara.kid);
					}
				}
				i++;
			}
		}
		if (karas.infos && karas.infos.from > 0) {
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
		this.setState({ data: data, getPlaylistInProgress: false, playing: indexPlaying ? indexPlaying : this.state.playing });
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
					store.setPosPlaying(kara.pos);
					if (this.state.goToPlaying) this.setState({ scrollToIndex: index, _goToPlaying: true });
					this.setState({ playing: indexPlaying });
					if (this.props.config.Frontend.Mode === 1 && this.props.scope === 'public') {
						this.props.updateKidPlaying && this.props.updateKidPlaying(kara.kid);
					}
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
				this.state.idPlaylist != -4 ? stateData.infos.from + '-' + stateData.infos.to : '';
			plInfos +=
				(this.state.idPlaylist != -4
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

	scrollToPlaying = () => {
		if (this.state.playing)
			this.setState({ scrollToIndex: this.state.playing, goToPlaying: true, _goToPlaying: true });
	};

	updateCounters = (event: PublicPlayerState) => {
		if (this.state.playlistInfo && this.state.playlistInfo.flag_current)
			this.setState({ songsBeforeJingle: event.songsBeforeJingle, songsBeforeSponsor: event.songsBeforeSponsor });
		else this.setState({ songsBeforeJingle: undefined, songsBeforeSponsor: undefined });
	}

	selectAllKaras = () => {
		const data = this.state.data;
		let checkedkaras = 0;
		for (const kara of (this.state.data as KaraList).content) {
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

	addAllKaras = async () => {
		const response = await axios.get(`${this.getPlaylistUrl()}?filter=${store.getFilterValue(this.props.side)}`);
		const karaList = response.data.content.map((a: KaraElement) => a.kid);
		displayMessage('info', i18next.t('PL_MULTIPLE_ADDED', { count: response.data.content.length }));
		axios.post(this.getPlaylistUrl(this.props.idPlaylistTo), { kid: karaList, requestedby: (store.getLogInfos() as Token).username });
	};

	addCheckedKaras = async (event?: any, pos?: number) => {
		const stateData = this.state.data as KaraList;
		const listKara = stateData.content.filter(a => a.checked);
		if (listKara.length === 0) {
			displayMessage('warning', i18next.t('SELECT_KARAS_REQUIRED'));
			return;
		}
		const idKara = listKara.map(a => a.kid);
		const idKaraPlaylist = listKara.map(a => String(a.playlistcontent_id));
		let url = '';
		let data;
		let type;

		if (this.props.idPlaylistTo > 0) {
			url = '/playlists/' + this.props.idPlaylistTo + '/karas';
			if (this.state.idPlaylist > 0 && !pos) {
				data = { plc_id: idKaraPlaylist };
				type = 'PATCH';
			} else {
				if (pos) {
					data = { requestedby: (store.getLogInfos() as Token).username, kid: idKara, pos: pos + 1 };
				} else {
					data = { requestedby: (store.getLogInfos() as Token).username, kid: idKara };
				}
			}
		} else if (this.props.idPlaylistTo == -2 || this.props.idPlaylistTo == -4) {
			url = `/blacklist/set/${store.getCurrentBlSet()}/criterias`;
			data = { blcriteria_type: 1001, blcriteria_value: idKara };
		} else if (this.props.idPlaylistTo == -3) {
			url = '/whitelist';
			data = { kid: idKara };
		} else if (this.props.idPlaylistTo == -5) {
			url = '/favorites';
			data = { kid: stateData.content.filter(a => a.checked).map(a => a.kid) };
		}
		if (type === 'PATCH') {
			await axios.patch(url, data);
		} else {
			await axios.post(url, data);
		}
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
			url = '/playlists/' + this.state.idPlaylist + '/karas/';
			data = { plc_id: idKaraPlaylist };
		} else if (this.state.idPlaylist == -3) {
			url = '/whitelist';
			data = { kid: listKara.map(a => a.kid) };
		} else if (this.state.idPlaylist == -5) {
			url = '/favorites';
			data = { kid: listKara.map(a => a.kid) };
		}
		if (url) {
			await axios.delete(url, { data: data });
		}
	};

	karaSuggestion = () => {
		ReactDOM.render(<SuggestionModal />, document.getElementById('modal'));
	}

	onChangeTags = (type: number | string, value: string) => {
		const searchCriteria = type === 'year' ? type : 'tag';
		const stringValue = searchCriteria === 'tag' ? `${value}~${type}` : value;
		this.setState({ searchCriteria: searchCriteria, searchValue: stringValue }, () => this.getPlaylist('search'));
	};

	deleteCriteria = (kara: DBBlacklist) => {
		callModal('confirm', i18next.t('CL_DELETE_CRITERIAS_PLAYLIST', { type: i18next.t(`BLCTYPE_${kara.blc_type}`) }),
			<div style={{ maxHeight: '200px' }}>
				{((this.state.data as KaraList).content as unknown as DBBlacklist[])
					.filter((e: DBBlacklist) => e.blc_id === kara.blc_id).map((criteria: DBBlacklist) => {
						return <label key={kara.kid}>{buildKaraTitle(criteria as unknown as KaraElement, true)}</label>;
					})}
			</div>, async (confirm: boolean) => {
				if (confirm) {
					await axios.delete(`/blacklist/set/${store.getCurrentBlSet()}/criterias/${kara.blc_id}`);
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

			axios.put('/playlists/' + this.state.idPlaylist + '/karas/' + playlistcontent_id, { pos: apiIndex });

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

	debounceClear = (e: any) => {
		this.setState(() => {
			return { _goToPlaying: false };
		});
	}
	debouncedClear = debounce(this.debounceClear, 500, { maxWait: 1000 });

	clearScrollToIndex = (e: any) => {
		if (this.state._goToPlaying) {
			this.debouncedClear(e);
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
		return this.props.scope === 'public' &&
			this.props.side === 1 && this.props.config.Frontend.Mode === 1 ? (
				<div className="playlist--wrapper">
					<li className="list-group-item">
						<KaraDetail kid={this.props.kidPlaying} mode="karaCard" scope={this.props.scope} />
					</li>
				</div>
			) : (
				<div className="playlist--wrapper">
					<PlaylistHeader
						side={this.props.side}
						scope={this.props.scope}
						config={this.props.config}
						playlistList={this.props.playlistList.filter(
							(playlist: PlaylistElem) => playlist.playlist_id !== this.props.idPlaylistTo)}
						idPlaylist={this.state.idPlaylist}
						bLSet={this.state.bLSet}
						bLSetList={this.state.bLSetList}
						changeIdPlaylist={this.changeIdPlaylist}
						playlistInfo={this.state.playlistInfo}
						getPlaylistUrl={this.getPlaylistUrl}
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
					/>
					<div
						id={'playlistContainer' + this.props.side}
						className="playlistContainer"
					>
						<ul id={'playlist' + this.props.side} className="list-group" style={{ height: '100%' }}>
							{
								(!this.state.data || this.state.data && (this.state.data as KaraList).infos
									&& ((this.state.data as KaraList).infos.count === 0 || !(this.state.data as KaraList).infos.count))
									&& this.state.getPlaylistInProgress
									? <li className="getPlaylistInProgressIndicator"><span className="fas fa-sync"></span></li>
									: (
										this.state.idPlaylist !== -4 && this.state.data
											? <InfiniteLoader
												isRowLoaded={this.isRowLoaded}
												loadMoreRows={this.loadMoreRows}
												rowCount={(this.state.data as KaraList).infos.count || 0}>
												{({ onRowsRendered, registerChild }) => (
													<AutoSizer>
														{({ height, width }) => (
															<this.SortableList
																{...[this.state.forceUpdate]}
																pressDelay={0}
																helperClass="playlist-dragged-item"
																useDragHandle={true}
																deferredMeasurementCache={_cache}
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
															/>)}
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
						</ul>
					</div>
					<div
						className="plFooter">
						<div className="plBrowse">
							<button
								type="button"
								title={i18next.t('GOTO_TOP')}
								className="btn btn-sm btn-action"
								onClick={() => this.setState({ scrollToIndex: 0, goToPlaying: false, _goToPlaying: false })}
							>
								<i className="fas fa-chevron-up"></i>
							</button>
							{this.state.playlistInfo && this.state.playlistInfo.flag_current ?
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
						{this.props.side === 1 && this.state.quotaString ?
							<div className="plQuota right">
								{i18next.t('QUOTA')}{this.state.quotaString}
							</div> : null
						}
						{this.state.checkedkaras > 0 ?
							<div className="plQuota right">
								{i18next.t('CHECKED')}{this.state.checkedkaras}
							</div> : null
						}
					</div>
				</div>
			);
	}
}

export default Playlist;
