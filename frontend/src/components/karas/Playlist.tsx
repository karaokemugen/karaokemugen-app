import React, { Component } from 'react';
import i18next from 'i18next';
import PlaylistHeader from './PlaylistHeader';
import KaraDetail from './KaraDetail';
import KaraLine from './KaraLine';
import axios from 'axios';
import {readCookie, createCookie, secondsTimeSpanToHMS, is_touch_device, getSocket, displayMessage, callModal, buildKaraTitle} from '../tools';
import BlacklistCriterias from './BlacklistCriterias';
import {SortableContainer, SortableElement} from 'react-sortable-hoc';
import { AutoSizer, InfiniteLoader, CellMeasurer, CellMeasurerCache, List, Index, ListRowProps, IndexRange } from 'react-virtualized';
import store from '../../store';
import { DBPL } from '~../../../src/types/database/playlist';
import { Config } from '~../../../src/types/config';
import 'react-virtualized/styles.css';
import { Tag } from '../../types/tag';
import { KaraElement } from '../../types/kara';
import { DBBLC,DBBlacklist } from '../../../../src/types/database/blacklist';
import { Token } from '../../../../src/lib/types/user';
import SuggestionModal from '../modals/SuggestionModal';
import ReactDOM from 'react-dom';
require('./Playlist.scss');

const chunksize = 400;
const _cache = new CellMeasurerCache({ defaultHeight: 36, fixedWidth: true });
let timer:any;

interface IProps {
	scope: string;
	side: number;
	config: Config;
	idPlaylistTo: number;
	navigatorLanguage: string;
	kidPlaying?: string | undefined;
	tags?: Array<Tag> | undefined;
	searchMenuOpen?: boolean;
	toggleSearchMenu?: () => void;
	showVideo: (file:string) => void;
	updateKidPlaying?: (kid:string) => void;
	majIdsPlaylist: (side:number, value:number) => void;
}

interface IState {
	searchValue?: string;
	searchCriteria?: string;
	searchType?: string;
	playlistCommands: boolean;
	getPlaylistInProgress: boolean;
	stopUpdate: boolean;
	forceUpdate: boolean;
	forceUpdateFirst: boolean;
	scope?: string;
	idPlaylist: number;
	data: KaraList | Array<DBBLC> | undefined;
	quotaString?: any;
	playlistList: Array<PlaylistList>;
	scrollToIndex?: number;
	playlistInfo?: DBPL;
}

interface KaraList {
	content: KaraElement[];
	avatars:any,
	i18n?: any;
	infos: {
		count: number,
		from: number,
		to: number
	}
}

class Playlist extends Component<IProps, IState> {
	constructor(props:IProps) {
		super(props);
		this.state = {
			playlistCommands: false,
			getPlaylistInProgress: false,
			stopUpdate: false,
			forceUpdate: false,
			forceUpdateFirst: false,
			idPlaylist: 0,
			data: undefined,
			playlistList: []
		};
	}

	componentWillReceiveProps(nextProps:IProps) {
		if (nextProps.idPlaylistTo && nextProps.idPlaylistTo !== this.props.idPlaylistTo) {
			this.playlistForceRefresh(true);
		}
	}

	async componentDidMount() {
		if (axios.defaults.headers.common['authorization']) {
			await this.initCall();
		}
		getSocket().on('playingUpdated', this.playingUpdate);
		getSocket().on('playlistsUpdated', this.getPlaylistList);
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
		getSocket().on('playlistContentsUpdated', this.playlistContentsUpdated);
		getSocket().on('playlistInfoUpdated', (idPlaylist:string) => {
			if (this.state.idPlaylist === Number(idPlaylist)) this.getPlaylistInfo();
		});
		getSocket().on('quotaAvailableUpdated', this.updateQuotaAvailable);
		store.addChangeListener('playlistContentsUpdated', (idPlaylist:number) => {
			var data = this.state.data as KaraList;
			data.infos.from = 0;
			this.setState({data: data});
			this.playlistContentsUpdated(idPlaylist);
		});
		store.addChangeListener('loginUpdated', this.initCall);
		getSocket().on('modePlaylistUpdated', (idPlaylist:number) => {
			if (this.props.scope !== 'admin' && this.props.side 
				&& idPlaylist !== store.getModePlaylistID()) {
				store.setModePlaylistID(idPlaylist);
				this.changeIdPlaylist(idPlaylist);
			}
		});

    	window.addEventListener('resize', this.refreshUiOnResize, true);
	}

  initCall = async () => {
  		await this.getPlaylistList();
	  	await this.getIdPlaylist();
		  if (this.state.idPlaylist === -1 || this.state.playlistList
			.filter(playlist => playlist.playlist_id === this.state.idPlaylist).length !== 0) {
			await this.getPlaylist();
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
  SortableItem = SortableElement(({value,style}:any) => {
  	if(value.content) {
  		let kara = value.content as KaraElement;
  		let s = JSON.parse(JSON.stringify(style));
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
  				navigatorLanguage={this.props.navigatorLanguage}
  				side={this.props.side}
  				config={this.props.config}
  				playlistCommands={this.state.playlistCommands}
  				idPlaylistTo={this.props.idPlaylistTo}
  				checkKara={this.checkKara}
				showVideo={this.props.showVideo}
				avatar_file={(this.state.data as KaraList).avatars[kara.username]}
				deleteCriteria={this.deleteCriteria}
  			/>
  		</li>;
  	} else {
  		var s = JSON.parse(JSON.stringify(style));
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

isRowLoaded = ({index}:Index) => {
	return Boolean(this.state.data && (this.state.data as KaraList).content[index]);
}

loadMoreRows = async ({startIndex, stopIndex}:IndexRange) => {
	if (!this.state.getPlaylistInProgress) {
		var data = this.state.data as KaraList;
		data.infos.from = Math.floor(stopIndex/chunksize)*chunksize;
		await this.setState({data: data});
		if (timer) clearTimeout(timer);
		timer = setTimeout(this.getPlaylist, 1000);
	}
}


rowRenderer = ({ index, isScrolling, key, parent, style }:ListRowProps) => {
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
			<this.SortableItem key={key} index={index} style={style} value={{content,key,index}} />
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

  playlistContentsUpdated = (idPlaylist:number) => {
  	if (this.state.idPlaylist === Number(idPlaylist) && !this.state.stopUpdate) this.getPlaylist(this.state.searchType);
  };

  updateQuotaAvailable = (data:{username:string, quotaType:number, quotaLeft:number}) => {
  	if (store.getLogInfos() && (store.getLogInfos() as Token).username === data.username) {
  		var quotaString:any = '';
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

  getPlaylistList = async () => {
  	const response = await axios.get(
  		'/api/playlists/'
  	);
  	const kmStats = await axios.get('/api/stats');
	var playlistList = response.data;
	if (this.props.scope !== 'admin') {
		playlistList = playlistList.filter((playlist:PlaylistList) => playlist.flag_visible);
	}
  	if (
  		this.props.scope === 'admin' ||
      this.props.config.Frontend.Permissions!.AllowViewBlacklist
  	)
  		playlistList.push({
  			playlist_id: -2,
  			name: i18next.t('PLAYLIST_BLACKLIST')
  		});
  	if (
  		this.props.scope === 'admin' ||
      this.props.config.Frontend.Permissions!.AllowViewBlacklistCriterias
  	)
  		playlistList.push({
  			playlist_id: -4,
  			name: i18next.t('PLAYLIST_BLACKLIST_CRITERIAS')
  		});
  	if (
  		this.props.scope === 'admin' ||
      this.props.config.Frontend.Permissions!.AllowViewWhitelist
  	)
  		playlistList.push({
  			playlist_id: -3,
  			name: i18next.t('PLAYLIST_WHITELIST')
  		});
  	if (this.props.scope === 'admin')
  		playlistList.push({
  			playlist_id: -5,
  			name: i18next.t('PLAYLIST_FAVORITES')
  		});
  	if (this.props.scope === 'admin')
  		playlistList.push({
  			playlist_id: -1,
  			name: i18next.t('PLAYLIST_KARAS'),
  			karacount: kmStats.data.karas
		});
  	this.setState({ playlistList: playlistList});
  };

  getIdPlaylist = () => {
  	var value:number;
  	if (this.props.scope === 'public') {
  		value =
        this.props.side === 1 && this.props.config.Frontend.Mode !== 1
        	? -1
        	: store.getModePlaylistID();
  	} else {
  		var plVal1Cookie = readCookie('mugenPlVal1');
  		var plVal2Cookie = readCookie('mugenPlVal2');
  		if (plVal1Cookie == plVal2Cookie) {
  			plVal2Cookie = null;
  			plVal1Cookie = null;
		}
		
  		if (this.props.side === 1) {
			value = plVal1Cookie != null && Number(plVal1Cookie) !== NaN ? Number(plVal1Cookie) : -1;
  		} else {
			value = plVal2Cookie != null && Number(plVal2Cookie) !== NaN ? Number(plVal2Cookie)  : store.getModePlaylistID();
  		}
	  }
  	this.setState({ idPlaylist: value });
  	this.props.majIdsPlaylist(this.props.side, value);
  };

  changeIdPlaylist = (idPlaylist:number) => {
  	createCookie('mugenPlVal' + this.props.side, idPlaylist, 365);
  	this.setState({ idPlaylist: Number(idPlaylist),data: undefined }, this.getPlaylist);
  	this.props.majIdsPlaylist(this.props.side, idPlaylist);
  };

  editNamePlaylist = () => {
  	callModal('prompt', i18next.t('CL_RENAME_PLAYLIST', { playlist: (this.state.playlistInfo as DBPL).name }), '', (newName:string) => {
		  axios.put('/api/playlists/' + this.state.idPlaylist, 
		  { name: newName, flag_visible: (this.state.playlistInfo as DBPL).flag_public });
  		var playlistInfo = this.state.playlistInfo as DBPL;
  		playlistInfo.name = newName;
  		this.setState({ playlistInfo: playlistInfo });
  	});
  };

  getPlaylistInfo = async () => {
  	if (!this.state.getPlaylistInProgress) {
  		var response = await axios.get(
  			'/api/playlists/' + this.state.idPlaylist
  		);
  		this.setState({ playlistInfo: response.data });
  	}
  };

  getPlaylistUrl = (idPlaylistParam?:number) => {
  	var idPlaylist:number = idPlaylistParam ? idPlaylistParam : this.state.idPlaylist;
	  var url:string = '';
  	if (idPlaylist >= 0) {
  		url =
        '/api/playlists/' +
        idPlaylist +
        '/karas';
  	} else if (idPlaylist === -1) {
  		url = '/api/karas';
  	} else if (idPlaylist === -2) {
  		url = '/api/blacklist';
  	} else if (idPlaylist === -3) {
  		url = '/api/whitelist';
  	} else if (idPlaylist === -4) {
  		url = '/api/blacklist/criterias';
  	} else if (idPlaylist === -5) {
  		url = '/api/favorites';
  	}
  	return url;
  };

  playlistWillUpdate = () => {
  	this.setState({data: undefined, getPlaylistInProgress:true});
  }

  playlistDidUpdate = () => {
  	this.getPlaylist();
  }

  getPlaylist = async (searchType?:string) => {
	var criterias:any = {
		'year' : 'y',
		'serie' : 's',
		'tag' : 't'
	};
	var stateData = this.state.data as KaraList;
  	var data:any = {getPlaylistInProgress: true};
  	if (searchType) {
		data.searchType = searchType;
		data.data = this.state.data;
		data.data.infos.from = 0;
		data.scrollToIndex = 0;
  	} else if (stateData && stateData.infos && stateData.infos.from == 0) {
  		data.searchType = undefined;
  	}
  	var url:string = this.getPlaylistUrl();
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
  	if(this.state.searchType !== 'search' || (this.state.searchCriteria && this.state.searchValue)) {
  		let searchCriteria = this.state.searchCriteria ?
		  criterias[this.state.searchCriteria]
  			: '';
  		url += '&searchType=' + this.state.searchType
          + ((searchCriteria && this.state.searchValue) ? ('&searchValue=' + searchCriteria + ':' + this.state.searchValue) : '');
	}
	try {
	  	var response = await axios.get(url);
		var karas:KaraList = response.data;
		if (this.state.idPlaylist > 0) {
			karas.content.forEach((kara) => {
				if (kara.flag_playing) {
					store.setPosPlaying(kara.pos);
					if (this.props.config.Frontend.Mode === 1 && this.props.scope === 'public') {
						this.props.updateKidPlaying && this.props.updateKidPlaying(kara.kid);
					}
				}
			});
		}
		var data;
		if (karas.infos && karas.infos.from > 0) {
			data = this.state.data;
			if (karas.infos.from < data.content.length) {
				for (let index = 0; index < karas.content.length; index++) {
					data.content[karas.infos.from + index] = karas.content[index];
				}
			} else {
				if (karas.infos.from > data.content.length) {
					var nbCellToFill = data.infos.from - data.content.length;
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
	} catch (error) {
		displayMessage('error', i18next.t(`ERROR_CODES.${error.response.code}`));
	}
  };

  playingUpdate = (data: {playlist_id:number,plc_id:number}) => {
  	if (this.state.idPlaylist === data.playlist_id && !this.state.stopUpdate) {
  		var playlistData = this.state.data as KaraList;
  		playlistData.content.forEach((kara, index) => {
  			if (kara.flag_playing) {
  				kara.flag_playing = false;
  				kara.flag_dejavu = true;
  			} else if (kara.playlistcontent_id === data.plc_id) {
  				kara.flag_playing = true;
  				store.setPosPlaying(kara.pos);
  				this.setState({scrollToIndex: index});
  				if (this.props.config.Frontend.Mode === 1 && this.props.scope === 'public') {
					this.props.updateKidPlaying && this.props.updateKidPlaying(kara.kid);
  				}
  			}
  		});
		  this.setState({ data: playlistData });
  	}
  };

  getPlInfosElement = () => {
	  var plInfos = '';
	  var stateData = this.state.data as KaraList;
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
  	let indexPlaying;
  	(this.state.data as KaraList).content.forEach((element, index) => {
  		if (element.flag_playing) indexPlaying = index;
  	});
  	if (indexPlaying)
  		this.setState({scrollToIndex: indexPlaying});
  };

  togglePlaylistCommands = () => {
  	this.setState({ playlistCommands: !this.state.playlistCommands });
  	store.getTuto() && store.getTuto().move(1);
  };

  selectAllKaras = () => {
  	var data = this.state.data;
  	(this.state.data as KaraList).content.forEach(kara => {
		  if(kara) kara.checked = !kara.checked;
  	});
	  this.setState({ data: data });
	  this.playlistForceRefresh(true);
  };

  checkKara = (id:string|number) => {
  	var data = this.state.data as KaraList;
  	data.content.forEach(kara => {
  		if (this.state.idPlaylist >= 0) {
  			if (kara.playlistcontent_id === id) {
  				kara.checked = !kara.checked;
  			}
  		} else if (kara.kid === id) {
  			kara.checked = !kara.checked;
  		}
  	});
	  this.setState({ data: data });
	  this.playlistForceRefresh(true);
  };

  addAllKaras = async () => {
  	var response = await axios.get(`${this.getPlaylistUrl()}?filter=${store.getFilterValue(this.props.side)}`);
  	var karaList = response.data.content.map((a:KaraElement) => a.kid).join();
  	displayMessage('info', i18next.t('PL_MULTIPLE_ADDED', {count: response.data.content.length}));
  	axios.post(this.getPlaylistUrl(this.props.idPlaylistTo), { kid: karaList, requestedby: (store.getLogInfos() as Token).username });
  };

  addCheckedKaras = async (event?:any, pos?:number) => {
	var stateData = this.state.data as KaraList;
	let listKara = stateData.content.filter(a => a.checked);
	if (listKara.length === 0) {
		displayMessage('warning', i18next.t('SELECT_KARAS_REQUIRED'));
		return ;
	}
  	var idKara = listKara.map(a => a.kid).join();
  	var idKaraPlaylist = listKara.map(a => String(a.playlistcontent_id)).join();
  	var url:string = '';
  	var data;
  	var type;

  	if (this.props.idPlaylistTo > 0) {
  		url = '/api/playlists/' + this.props.idPlaylistTo + '/karas';
  		if (this.state.idPlaylist > 0  && !pos) {
  			data = { plc_id: idKaraPlaylist };
  			type = 'PATCH';
  		} else {
			if (pos) {
				data = { requestedby: (store.getLogInfos() as Token).username, kid: idKara, pos: pos+1 };
			} else {
				data = { requestedby: (store.getLogInfos() as Token).username, kid: idKara };
			}
  		}
  	} else if (this.props.idPlaylistTo == -2 || this.props.idPlaylistTo == -4) {
  		url = '/api/blacklist/criterias';
  		data = { blcriteria_type: 1001, blcriteria_value: idKara };
  	} else if (this.props.idPlaylistTo == -3) {
  		url = '/api/whitelist';
  		data = { kid: idKara };
  	} else if (this.props.idPlaylistTo == -5) {
  		url = '/api/favorites';
  		data = { kid: stateData.content.filter(a => a.checked).map(a => a.kid) };
  	}
  	try {
  		var response;
  		if (type === 'PATCH') {
  			response = await axios.patch(url, data);
  		} else {
  			response = await axios.post(url, data);
  		}
  		displayMessage('success', i18next.t(response.data.code));
  	} catch (error) {
		(error.response.data && error.response.data.plc_id && error.response.data.plc_id.length > 0) ?
			displayMessage('warning', error.response.data.plc_id[0]) :
			displayMessage('warning', i18next.t(`ERROR_CODES.${error.response.data}`));
  	}
  };

  transferCheckedKaras = () => {
  	this.addCheckedKaras();
  	this.deleteCheckedKaras();
  };

  deleteCheckedKaras = async () => {
  	var url;
	var data;
	var stateData = this.state.data as KaraList;
	let listKara = stateData.content.filter(a => a.checked);
	if (listKara.length === 0) {
		displayMessage('warning', i18next.t('SELECT_KARAS_REQUIRED'));
		return ;
	}
  	if (this.state.idPlaylist > 0) {
  		var idKaraPlaylist = listKara.map(a => String(a.playlistcontent_id)).join();
  		url = '/api/playlists/' + this.state.idPlaylist + '/karas/';
  		data = { plc_id: idKaraPlaylist };
  	} else if (this.state.idPlaylist == -3) {
  		var idKara = listKara.map(a => a.kid).join();
  		url = '/api/ ' + this.props.scope + '/whitelist';
  		data = { kid: idKara };
  	} else if (this.state.idPlaylist == -5) {
  		url = '/api/favorites';
  		data = { kid: listKara.map(a => a.kid) };
  	}
  	if (url) {
  		try {
  			var response = await axios.delete(url, {data:data});
  			displayMessage('success', i18next.t(response.data));
  		} catch (error) {
			displayMessage('warning', i18next.t(`ERROR_CODES.${error.response.data}`));
  		}
  	}
  };

  karaSuggestion = () => {
	ReactDOM.render(<SuggestionModal
		songtypes={this.props.tags?.filter(tag => tag.type.includes(3)).map((tag: any) => tag.label)}/>, document.getElementById('modal'));
  }

  onChangeTags = (type:number|string, value:string) => {
  	var searchCriteria = (type === 'serie' || type === 'year') ? type : 'tag';
  	var stringValue = searchCriteria === 'tag' ? `${value}~${type}` : value;
  	this.setState({searchCriteria: searchCriteria, searchValue: stringValue}, () => this.getPlaylist('search'));
  };

  deleteCriteria = (kara:DBBlacklist) => {
	callModal('confirm', i18next.t('CL_DELETE_CRITERIAS_PLAYLIST', { type: i18next.t(`BLCTYPE_${kara.blc_type}`) }),
		<div style={{maxHeight: '200px'}}>
		{((this.state.data as KaraList).content as unknown as DBBlacklist[])
			.filter((e:DBBlacklist) => e.blc_id === kara.blc_id).map((criteria:DBBlacklist) => {
			return <label key={kara.kid}>{buildKaraTitle(criteria as unknown as KaraElement)}</label>
		})}
		</div>, async (confirm:boolean) => {
			if (confirm) {
				try {
					let response = await axios.delete(`/api/blacklist/criterias/${kara.blc_id}`);
					displayMessage('success', i18next.t(response.data));
				} catch (error) {
					displayMessage('warning', i18next.t(error.response.data));
				}
			}
		});
  };

  sortRow = ({oldIndex, newIndex}:{oldIndex:number, newIndex:number}) => {
  	if(oldIndex !== newIndex) {
		let data = this.state.data as KaraList;
  		// extract playlistcontent_id based on sorter index
  		let playlistcontent_id = data.content[oldIndex].playlistcontent_id;

  		// fix index to match api behaviour
  		let apiIndex = newIndex+1;
  		if(newIndex > oldIndex)
  			apiIndex = apiIndex+1;

  		axios.put('/api/playlists/' + this.state.idPlaylist + '/karas/' + playlistcontent_id, { pos: apiIndex });

  		let karas:Array<KaraElement> = [];
  		if(oldIndex<newIndex) {
  			karas = data.content.splice(0,oldIndex).concat(
  				data.content.splice(oldIndex+1,newIndex-oldIndex),
  				data.content[oldIndex],
  				data.content.splice(newIndex)
  			);
  		} else if(oldIndex>newIndex) {
  			karas = data.content.splice(0,newIndex).concat(
  				data.content[oldIndex],
  				data.content.splice(newIndex,oldIndex-newIndex),
  				data.content.splice(oldIndex+1)
  			);
  		}
  		data.content = karas;
  		this.setState({data:data, stopUpdate: false});
  	}
  }
  
  clearScrollToIndex = () => {
  	this.setState({ scrollToIndex: -1 });
  }

  stopUpdate = () => {
	  this.setState({stopUpdate : true});
  }

  playlistForceRefresh = (forceUpdateFirstParam: boolean) => {
	  this.setState({forceUpdate: !this.state.forceUpdate, forceUpdateFirst: forceUpdateFirstParam});
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
					<KaraDetail kid={this.props.kidPlaying} mode="karaCard" scope={this.props.scope} 
						navigatorLanguage={this.props.navigatorLanguage} />
				</li>
  			</div>
  		) : (
  			<div className="playlist--wrapper">
  				<PlaylistHeader
  					side={this.props.side}
					scope={this.props.scope}
					config={this.props.config}
  					playlistList={this.state.playlistList.filter(
						  (playlist:PlaylistList) => playlist.playlist_id !== this.props.idPlaylistTo)}
  					idPlaylist={this.state.idPlaylist}
  					changeIdPlaylist={this.changeIdPlaylist}
  					playlistInfo={this.state.playlistInfo}
  					getPlaylistUrl={this.getPlaylistUrl}
  					togglePlaylistCommands={this.togglePlaylistCommands}
  					playlistCommands={this.state.playlistCommands}
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
  					<ul id={'playlist' + this.props.side} className="list-group" style={{height: '100%'}}>
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
														  {...[this.state.playlistCommands, this.state.forceUpdate]}
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
  											this.state.data
  												? <BlacklistCriterias data={this.state.data as DBBLC[]} scope={this.props.scope} tags={this.props.tags} />
  												: null
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
  							onClick={() => this.setState({scrollToIndex: 0})}
  						>
  							<i className="fas fa-chevron-up"></i>
  						</button>
  						{this.state.playlistInfo && this.state.playlistInfo.flag_current ?
  							<button
  								type="button"
  								title={i18next.t('GOTO_PLAYING')}
  								className="btn btn-sm btn-action"
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
  							onClick={() => this.setState({scrollToIndex: (this.state.data as KaraList).infos.count-1})}
  						>
  							<i className="fas fa-chevron-down"></i>
  						</button>
  					</div>
  					<div className="plInfos">{this.getPlInfosElement()}</div>
  					{this.props.side === 1 && this.state.quotaString ?
  						<div id="plQuota" className="plQuota right">
  							{i18next.t('QUOTA')}{this.state.quotaString}
  						</div> : null
  					}
  				</div>
  			</div>
  		);
  }
}

export default Playlist;
