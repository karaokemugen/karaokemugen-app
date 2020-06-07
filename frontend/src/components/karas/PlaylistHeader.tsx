import React, { Component } from 'react';
import i18next from 'i18next';
import axios from 'axios';
import getLucky from '../../assets/clover.png';
import ActionsButtons from './ActionsButtons';
import { buildKaraTitle, displayMessage, callModal, is_touch_device } from '../tools';
import Autocomplete from '../generic/Autocomplete';
import store from '../../store';
import ReactDOM from 'react-dom';
import FavMixModal from '../modals/FavMixModal';
import { KaraElement } from '../../types/kara';
import { DBPL, DBPLC } from '../../../../src/types/database/playlist';
import { User, Token } from '../../../../src/lib/types/user';
import { Tag } from '../../types/tag';
import { Config } from '../../../../src/types/config';
import prettyBytes from 'pretty-bytes';
import SelectWithIcon from '../generic/SelectWithIcon';
import { BLCSet } from '../../../../src/types/blacklist';
import BlcSetCopyModal from '../modals/BlcSetCopyModal';
require ('./PlaylistHeader.scss');

var tagsTypesList = [
	'BLCTYPE_1',
	'BLCTYPE_3',
	'BLCTYPE_2',
	'BLCTYPE_4',
	'BLCTYPE_5',
	'BLCTYPE_6',
	'DETAILS_YEAR',
	'BLCTYPE_8',
	'BLCTYPE_9',
	'BLCTYPE_7',
	'BLCTYPE_10',
	'BLCTYPE_11',
	'BLCTYPE_12',
	'BLCTYPE_13',];

interface IProps {
	idPlaylist: number;
	bLSet?: BLCSet;
	idPlaylistTo: number;
	scope: string;
	side: number;
	playlistInfo: DBPL | undefined;
	playlistCommands: boolean;
	tags: Array<Tag> | undefined;
	config: Config;
	playlistList: Array<PlaylistElem>;
	searchMenuOpen?: boolean;
	bLSetList: BLCSet[];
	getPlaylistUrl: (idPlaylistParam?:number) => string;
	changeIdPlaylist: (idPlaylist:number, idBLSet?:number) => void;
	playlistWillUpdate: () => void;
	playlistDidUpdate: () => void;
	getPlaylist: (searchType?:string) => void;
	onChangeTags: (type:number|string, value:string) => void;
	editNamePlaylist: () => void;
	addAllKaras: () => void;
	selectAllKaras: () => void;
	transferCheckedKaras: () => void;
	deleteCheckedKaras: () => void;
	addCheckedKaras: () => void;
	togglePlaylistCommands: () => void;
	toggleSearchMenu?: () => void;
}

interface IState {
	selectAllKarasChecked: boolean;
	tagType: number|string;
	activeFilter: number;
	activeFilterUUID: string;
}

class PlaylistHeader extends Component<IProps,IState> {
	constructor(props:IProps) {
		super(props);
		this.state = {
			selectAllKarasChecked: false,
			tagType: 2,
			activeFilter: 1,
			activeFilterUUID: ''
		};
	}

  addRandomKaras = () => {
  	callModal('prompt', i18next.t('CL_ADD_RANDOM_TITLE'), '', (nbOfRandoms:number) => {
  		axios.get(`${this.props.getPlaylistUrl()}?random=${nbOfRandoms}`).then(randomKaras => {
  			if (randomKaras.data.content.length > 0) {
  				let textContent = randomKaras.data.content.map((e:KaraElement) => <React.Fragment key={e.kid}>{buildKaraTitle(e, true)} <br /><br /></React.Fragment>);
  				callModal('confirm', i18next.t('CL_CONGRATS'), <React.Fragment>{i18next.t('CL_ABOUT_TO_ADD')}<br /><br />{textContent}</React.Fragment>, () => {
  					var karaList = randomKaras.data.content.map((a:KaraElement) => {
  						return a.kid;
  					});
  					var urlPost = '/playlists/' + this.props.idPlaylistTo + '/karas';
  					axios.post(urlPost, { kid: karaList });
  				}, '');
  			}
  		});
  	}, '1');
  };

	addPlaylist = () => {
		if (this.props.idPlaylist === -4) {
			callModal('prompt', i18next.t('BLC.ADD'), '', (playlistName: string) => {
				axios.post('/blacklist/set', { name: playlistName, flag_current: false }).then(response => {
					this.props.changeIdPlaylist(-4, response.data.id);
				});
			});
		} else {
			callModal('prompt', i18next.t('CL_CREATE_PLAYLIST'), '', (playlistName: string) => {
				axios.post('/playlists', { name: playlistName, flag_visible: false, flag_current: false, flag_public: false }).then(response => {
					this.props.changeIdPlaylist(response.data);
				});
			});
		}
	};

  deletePlaylist = () => {
	  callModal('confirm', i18next.t('CL_DELETE_PLAYLIST', 
		  { playlist: this.props.idPlaylist === -4 ?
			this.props.bLSet?.name :
			(this.props.playlistInfo as DBPL).name }), '', (confirm:boolean) => {
  		if (confirm) {
			  let url = this.props.idPlaylist === -4 ? 
				  `/blacklist/set/${this.props.bLSet?.blc_set_id}` : 
				  `/playlists/${this.props.idPlaylist}`
			  axios.delete(url);
			  if (this.props.idPlaylist === -4) {
				this.props.changeIdPlaylist(-4);
			  } else {
				this.props.changeIdPlaylist(store.getModePlaylistID());
			  }
  		}
  	});
  };

  startFavMix = async () => {
  	var response = await axios.get('/users/');
  	var userList = response.data.filter((u:User) => (u.type as number) < 2);
  	ReactDOM.render(<FavMixModal changeIdPlaylist={this.props.changeIdPlaylist} userList={userList} />, document.getElementById('modal'));
  };

  exportPlaylist = async () => {
	var url;
	if (this.props.idPlaylist === -4) {
		url = `/blacklist/set/${this.props.bLSet?.blc_set_id}/export`
	} else if (this.props.idPlaylist === -5) {
		url = `/favorites/export`
	} else {
		url = `/playlists/${this.props.idPlaylist}/export`
	}
	var response = await axios.get(url);
  	var dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(response.data, null, 4));
	var dlAnchorElem = document.getElementById('downloadAnchorElem');
	if (dlAnchorElem) {
		dlAnchorElem.setAttribute('href', dataStr);
		if (this.props.idPlaylist === -4) {
			dlAnchorElem.setAttribute('download', ['KaraMugen', this.props.bLSet?.name, new Date().toLocaleDateString().replace('\\', '-')].join('_') + '.kmblc');
		} else if (this.props.idPlaylist === -5) {
			dlAnchorElem.setAttribute('download', ['KaraMugen', 'fav', (store.getLogInfos() as Token).username, new Date().toLocaleDateString().replace('\\', '-')].join('_') + '.kmfavorites');
		} else {
			dlAnchorElem.setAttribute('download', ['KaraMugen', (this.props.playlistInfo as DBPL).name, new Date().toLocaleDateString().replace('\\', '-')].join('_') + '.kmplaylist');
		}
		dlAnchorElem.click();
	}
  };

  importPlaylist = (e:any) => {
	var url: string;
	var fr:FileReader;
	var file:File;
	if (!window.FileReader) return alert('FileReader API is not supported by your browser.');
	if (e.target.files && e.target.files[0]) {
		file = e.target.files[0];
		fr = new FileReader();
		fr.onload = async () => {
			var data:{
				playlist?:string | ArrayBuffer | null,
				favorites?:string | ArrayBuffer | null,
				blcSet?: string | ArrayBuffer | null
			} = {};
			var name:string;
			console.log(file.type)
			console.log(file.name)
			if (file.name.includes('.kmblc')) {
				data.blcSet = fr.result;
				url = '/blacklist/set/import';
				name = JSON.parse(fr.result as string).blcSetInfo.name;
			} else if (file.name.includes('.kmfavorites')) {
				data.favorites = fr.result;
				url = '/favorites/import';
				name = 'Favs';
			} else {
				url = '/playlists/import';
				data.playlist = fr.result;
				name = JSON.parse(fr.result as string).PlaylistInformation.name;
			}
			var response:{data:{code: string, data:{unknownKaras:Array<any>, playlist_id:number}}} = await axios.post(url, data);
			if (response.data.data?.unknownKaras && response.data.data.unknownKaras.length > 0) {
				let mediasize = response.data.data.unknownKaras.reduce((accumulator, currentValue) => accumulator + currentValue.mediasize, 0);
				callModal('confirm', i18next.t('MODAL.UNKNOW_KARAS.TITLE'), (<React.Fragment>
					<p>
						{i18next.t('MODAL.UNKNOW_KARAS.DESCRIPTION')}
					</p>
					<div>
						{i18next.t('MODAL.UNKNOW_KARAS.DOWNLOAD_THEM')}
						<label>&nbsp;{i18next.t('MODAL.UNKNOW_KARAS.DOWNLOAD_THEM_SIZE', {mediasize: prettyBytes(mediasize)})}</label>
					</div>
					<br/>
					{response.data.data.unknownKaras.map((kara:DBPLC) => 
						<label key={kara.kid}>{buildKaraTitle(kara, true)}</label>)}
				</React.Fragment>), () => axios.post('/downloads', {downloads: response.data.data.unknownKaras.map((kara:DBPLC) => {
					return {
						kid: kara.kid,
						mediafile: kara.mediafile,
						size: kara.mediasize,
						name: kara.karafile.replace('.kara.json', ''),
						repository: kara.repository
					}
				})}));
			} else {
				!file.name.includes('.kmfavorites') && 
				displayMessage('success', i18next.t(i18next.t(`SUCCESS_CODES.${response.data.code}`, { data: name })));
			}
			let playlist_id = file.name.includes('.kmfavorites') ? -5 : response.data.data.playlist_id;
			this.props.changeIdPlaylist(playlist_id);
		};
		fr.readAsText(file);
	}
  };

  deleteAllKaras = () => {
	if (this.props.idPlaylist === -2 || this.props.idPlaylist === -4) {
		axios.put(`/blacklist/set/${this.props.bLSet?.blc_set_id}/criterias/empty`);
	} else if (this.props.idPlaylist === -3) {
		axios.put('/whitelist/empty');
	} else {
		axios.put(`${this.props.getPlaylistUrl().replace('/karas', '')}/empty`);
	}
  };

  setFlagCurrent = () => {
	if (this.props.idPlaylist === -4 && !this.props.bLSet?.flag_current) {
		axios.put(`/blacklist/set/${this.props.bLSet?.blc_set_id}/setCurrent`);
  	} else if (!(this.props.playlistInfo as DBPL).flag_current) {
  		axios.put(`/playlists/${this.props.idPlaylist}/setCurrent`);
  	}
  };

  setFlagPublic = () => {
  	if (!(this.props.playlistInfo as DBPL).flag_public) {
  		axios.put('/playlists/' + this.props.idPlaylist + '/setPublic');
  	}
  };

  setFlagVisible = () => {
  	axios.put(`/playlists/${this.props.idPlaylist}`,
  		{ name: (this.props.playlistInfo as DBPL).name, flag_visible: !(this.props.playlistInfo as DBPL).flag_visible });
  };

  shuffle = async () => {
  	this.props.playlistWillUpdate();
  	await axios.put(`/playlists/${this.props.idPlaylist}/shuffle`);
  	this.props.playlistDidUpdate();
  };

  smartShuffle = () => {
  	this.props.playlistWillUpdate();
  	axios.put(`/playlists/${this.props.idPlaylist}/shuffle`, { smartShuffle: 1 });
  	this.props.playlistDidUpdate();
  };

  getKarasList = (activeFilter:number, searchType?:string) => {
  	this.setState({ activeFilter: activeFilter });
  	if (activeFilter === 2 && this.props.idPlaylist !== -5) {
  		this.props.changeIdPlaylist(-5);
  	} else if (activeFilter !== 2 && this.props.idPlaylist !== -1) {
		  this.props.changeIdPlaylist(-1);
		  this.props.getPlaylist(searchType);
  	} else {
		this.props.getPlaylist(searchType);
	  }
  };

  onChangeTags = (value:string) => {
  	this.setState({ activeFilter: 5, activeFilterUUID: value });
  	this.props.onChangeTags(this.state.tagType, value);
  };

	getPlaylistIcon(playlist: PlaylistElem) {
		// public playlist : globe icon
		if (playlist.flag_public) return 'fa-globe';
		// current playlist : play-circle icon
		if (playlist.flag_current) return 'fa-play-circle';
		// library : book icon
		if (playlist.playlist_id === -1) return 'fa-book';
		// blacklist : ban icon
		if (playlist.playlist_id === -2) return 'fa-ban';
		// whitelist : check-circle icon
		if (playlist.playlist_id === -3) return 'fa-check-circle';
		// blacklist criterias : not-equal icon
		if (playlist.playlist_id === -4) return 'fa-not-equal';
		// favorites : star icon
		if (playlist.playlist_id === -5) return 'fa-star';
		// others playlist : list-ol icon
		return 'fa-list-ol';
	}

	getListToSelect = () => {
		if (this.props.scope === 'public' && this.props.side === 1 && this.props.config.Frontend.Mode === 1) {
			return [{value: store.getModePlaylistID().toString(), 
				label: this.props.playlistList.filter(pl => pl.playlist_id === store.getModePlaylistID())[0].name}];
		}
		if (this.props.scope === 'public' && this.props.side === 1) {
			return [{value: '-1', label: i18next.t('PLAYLIST_KARAS')}, {value: '-5', label: i18next.t('PLAYLIST_FAVORITES')}];
		}
		return this.props.playlistList.map(playlist => {
			return {value: playlist.playlist_id.toString(), label: playlist.name, icon:this.getPlaylistIcon(playlist)}
		});
	}

	copyBlcSet = () => {
		ReactDOM.render(<BlcSetCopyModal 
			bLSetFrom={this.props.bLSet?.blc_set_id as number} 
			bLSetList={this.props.bLSetList.filter(blcset => blcset.blc_set_id !== this.props.bLSet?.blc_set_id)} 
			/>, document.getElementById('modal'));
	}

  render() {
  	const commandsControls = (
  		<div className="btn-group plCommands controls">
  			{this.props.idPlaylist >= 0 || this.props.idPlaylist === -4 ?
  				<button title={i18next.t(this.props.idPlaylist === -4 ? 'BLC.EDIT' : 'PLAYLIST_EDIT')} className="btn btn-default" name="editName" onClick={this.props.editNamePlaylist}>
  					<i className="fas fa-pencil-alt"></i>
  				</button> : null
  			}
			{this.props.idPlaylist !== -4 ?
				<button title={i18next.t('START_FAV_MIX')} className="btn btn-default" name="startFavMix" onClick={this.startFavMix}>
					<i className="fas fa-bolt"></i>
				</button> : null
  			}
  			<button title={i18next.t(this.props.idPlaylist === -4 ? 'BLC.ADD' : 'PLAYLIST_ADD')} className="btn btn-default" name="add" onClick={this.addPlaylist}>
  				<i className="fas fa-plus"></i>
  			</button>
			  {(this.props.idPlaylist >= 0 && this.props.playlistInfo && !this.props.playlistInfo.flag_current && !this.props.playlistInfo.flag_public)
			  	|| (this.props.idPlaylist === -4 && !this.props.bLSet?.flag_current) ?
				  <button title={i18next.t(this.props.idPlaylist === -4 ? 'BLC.DELETE' : 'PLAYLIST_DELETE')}
					className="btn btn-danger" name="delete" onClick={this.deletePlaylist}>
  					<i className="fas fa-times"></i>
  				</button> : null
  			}
			  <label title={i18next.t(this.props.idPlaylist === -4 ? 'BLC.IMPORT' : (this.props.idPlaylist === -5 ? 'FAVORITES_IMPORT' : 'PLAYLIST_IMPORT'))} 
			  className="btn btn-default" htmlFor={'import-file' + this.props.side}>
  				<i className="fas fa-download"></i>
  				<input id={'import-file' + this.props.side} className="import-file" type="file" accept=".kmplaylist, .kmfavorites, .kmblc" style={{ display: 'none' }}
  					onChange={this.importPlaylist} />
  			</label>
			  <button title={i18next.t(this.props.idPlaylist === -4 ? 'BLC.EXPORT' : (this.props.idPlaylist === -5 ? 'FAVORITES_EXPORT' : 'PLAYLIST_EXPORT'))} 
			  	className="btn btn-default" name="export" onClick={this.exportPlaylist} >
  				<i className="fas fa-upload"></i>
  			</button>
  		</div>);

  	const actionDivContainer = (
  		<div className="btn-group plCommands actionDiv">
  			{this.props.idPlaylistTo >= 0 && this.props.idPlaylist !== -4 ?
  				<React.Fragment>
  					<button title={i18next.t('ADD_RANDOM_KARAS')} name="addRandomKaras" className="btn btn-default" onClick={this.addRandomKaras}>
  						<img src={getLucky} />
  					</button>
  					<button title={i18next.t('ADD_ALL_KARAS')} className="btn btn-danger" onClick={this.props.addAllKaras}>
  						<i className="fas fa-share"></i>
  					</button>
  				</React.Fragment>
  				: null
  			}
			{this.props.idPlaylist === -4 && this.props.bLSetList.length > 1 ?
				<button title={i18next.t('BLC.COPY')} className="btn btn-default" onClick={this.copyBlcSet}>
					<i className="fas fa-copy"></i>
				</button> : null
			}
  			{this.props.idPlaylist >= 0 || this.props.idPlaylist === -4 ?
  				<button title={i18next.t('EMPTY_LIST')} className="btn btn-danger" onClick={this.deleteAllKaras}>
  					<i className="fas fa-eraser"></i>
  				</button> : null
  			}
			{this.props.idPlaylist !== -4 ?
				<React.Fragment>
					<ActionsButtons idPlaylistTo={this.props.idPlaylistTo} idPlaylist={this.props.idPlaylist}
						scope={this.props.scope} isHeader={true}
						addKara={this.props.addCheckedKaras} deleteKara={this.props.deleteCheckedKaras} transferKara={this.props.transferCheckedKaras} />
					<button
						title={i18next.t('SELECT_ALL')}
						name="selectAllKaras"
						onClick={() => {
							this.setState({ selectAllKarasChecked: !this.state.selectAllKarasChecked });
							this.props.selectAllKaras();
						}}
						className="btn btn-default"
					>
						{
							this.state.selectAllKarasChecked
								? <i className="far fa-check-square"></i>
								: <i className="far fa-square"></i>
						}
					</button>
				</React.Fragment> : null
			}
  		</div>);

      
  	const plCommandsContainer =(
  		this.props.scope === 'admin' && this.props.playlistCommands ?
  			<div className="plCommandsContainer actionDivContainer">
  				<React.Fragment>{commandsControls} {actionDivContainer}</React.Fragment>
  			</div> : null);

  	const searchMenu = (this.props.tags && this.props.tags.filter(tag => tag.type.includes(this.state.tagType)).length > 0 ? 
  		<div className="searchMenuContainer">
  			<div className="filterContainer">
  				<div className={'filterButton ' + (this.state.activeFilter === 5 ? 'filterElementActive' : '')} onClick={() => this.getKarasList(5, 'search')}>
  					<i className="fas fa-filter"></i> <span>{i18next.t('FILTER')}</span>
  				</div>
  				<select className="filterElement filterTags" placeholder="Search"
  					onChange={e => this.setState({ tagType: (Number(e.target.value) ? Number(e.target.value) : e.target.value) })}
  					value={this.state.tagType}>
  					{tagsTypesList.map(val => {
  						if (val === 'DETAILS_YEAR') {
  							return <option key={val} value='year'>{i18next.t(val)}</option>;
  						} else {
  							return <option key={val} value={val.replace('BLCTYPE_', '')}>{i18next.t(val)}</option>;
  						}
  					})}
  				</select>
  				<div className="filterElement filterTagsOptions">
  					<Autocomplete value={this.state.activeFilterUUID || ''}
  						options={this.props.tags.filter(tag => tag.type.includes(this.state.tagType))}
  						onChange={this.onChangeTags} />
  				</div>
  			</div>
  			<div className="filterContainer">
  				<div className={'filterElement ' + (this.state.activeFilter === 1 ? 'filterElementActive' : '')} onClick={() => this.getKarasList(1, 'search')}>
  					<i className="fas fa-sort-alpha-down"></i> {i18next.t('VIEW_STANDARD')}
  				</div>
  				<div className={'filterElement ' + (this.state.activeFilter === 2 ? 'filterElementActive' : '')}  onClick={() => this.getKarasList(2)}>
  					<i className="fas fa-star"></i> {i18next.t('VIEW_FAVORITES')}
  				</div>
  			</div>
  			<div className="filterContainer">
  				<div className={'filterElement ' + (this.state.activeFilter === 3 ? 'filterElementActive' : '')}  onClick={() => this.getKarasList(3, 'recent')}>
  					<i className="far fa-clock"></i> {i18next.t('VIEW_RECENT')}
  				</div>
  				<div className={'filterElement ' + (this.state.activeFilter === 4 ? 'filterElementActive' : '')} onClick={() => this.getKarasList(4, 'requested')}>
  					<i className="fas fa-fire"></i> {i18next.t('VIEW_POPULAR')}
  				</div>
  			</div>
  		</div> : null);

    
  	const plSearch = (<div className="pull-left plSearch">
		  <input type="text" placeholder="&#xF002;" defaultValue={store.getFilterValue(this.props.side)}
		  	onChange={e => store.setFilterValue(e.target.value, this.props.side, this.props.idPlaylist)} />
  	</div>);

  	const flagsContainer = (
  		(this.props.idPlaylist >= 0 && this.props.playlistInfo) || this.props.idPlaylist === -4 && this.props.scope !== 'public' ?
  			<div className="flagsContainer " >
  				<div className="btn-group plCommands flags" id={'flag' + this.props.side}>
					  {!this.props.playlistInfo?.flag_public || this.props.idPlaylist === -4  ?
						<button title={i18next.t(this.props.idPlaylist === -4 ? 'BLC.CURRENT' : 'PLAYLIST_CURRENT')} 
							name="flag_current" onClick={this.setFlagCurrent}
							className={`btn ${(this.props.idPlaylist === -4 && this.props.bLSet?.flag_current) 
								|| this.props.playlistInfo?.flag_current 
								? 'btn-primary' : 'btn-default'}`} >
							<i className="fas fa-play-circle"></i>
						</button> : null
  					}
					{(this.props.idPlaylist !== -4 && !this.props.playlistInfo?.flag_current ?
						<button title={i18next.t('PLAYLIST_PUBLIC')} name="flag_public" onClick={this.setFlagPublic}
							className={'btn ' + (this.props.playlistInfo?.flag_public ? 'btn-primary' : 'btn-default')} >
							<i className="fas fa-globe"></i>
						</button> : null
  					}
  					{this.props.idPlaylist >= 0 ?
  						<button title={i18next.t('PLAYLIST_VISIBLE')} className="btn btn-default" name="flag_visible" onClick={this.setFlagVisible}>
  							{this.props.playlistInfo?.flag_visible ?
  								<i className="fas fa-eye-slash"></i> :
  								<i className="fas fa-eye"></i>
  							}
  						</button> : null
  					}
  				</div>
  			</div> : null
	  );

  	return (
  		<React.Fragment>
  			{this.props.scope !== 'public' || this.props.side !== 1 ?
  				<div className={'panel-heading plDashboard' + (this.props.playlistCommands ? ' advanced' : '')}>
  					{this.props.scope === 'admin' || this.props.config.Frontend.Mode !== 1 ?
  						<React.Fragment>
  							{this.props.scope === 'admin' ?
  								<button title={i18next.t('PLAYLIST_COMMANDS')} onClick={this.props.togglePlaylistCommands}
  									className={'btn btn-default pull-left showPlaylistCommands' + (this.props.playlistCommands ? ' btn-primary' : '')}>
  									<i className="fas fa-wrench"></i>
  								</button> : null
  							}
							{is_touch_device() ?
								<select className="selectPlaylist"
									value={this.props.idPlaylist} onChange={(e) => this.props.changeIdPlaylist(Number(e.target.value))}>
									{(this.props.scope === 'public' && this.props.side === 1 && this.props.config.Frontend.Mode === 1) ?
										<option value={store.getModePlaylistID()} >{this.props.playlistList.filter(pl => pl.playlist_id === store.getModePlaylistID())[0].name}</option> :
										this.props.scope === 'public' && this.props.side === 1 ? (
											<React.Fragment>
												<option value={-1}>{i18next.t('PLAYLIST_KARAS')}</option>
												<option value={-5}>{i18next.t('PLAYLIST_FAVORITES')}</option>
											</React.Fragment>) :
											(<React.Fragment>
												{this.props.playlistList && this.props.playlistList.map(playlist => {
													return <option className="selectPlaylist" key={playlist.playlist_id} value={playlist.playlist_id}>{playlist.name}</option>;
												})}
											</React.Fragment>)
									}
								</select> :
								<SelectWithIcon list={this.getListToSelect()} value={this.props.idPlaylist.toString()} 
									onChange={(value) => this.props.changeIdPlaylist(Number(value))}/>
  							}
							{this.props.scope === 'admin' && this.props.idPlaylist === -4 ?
							  	<select className="selectPlaylist"
									value={this.props.bLSet?.blc_set_id} onChange={(e) => this.props.changeIdPlaylist(this.props.idPlaylist, Number(e.target.value))}>
									{this.props.bLSetList.map(set => {
										return <option className="selectPlaylist" key={set.blc_set_id} value={set.blc_set_id}>{set.name}</option>;
									})}
								</select> : null
  							}
  						</React.Fragment> : null
  					}
  					{this.props.scope === 'admin' ?
  						<React.Fragment>
  							{this.props.idPlaylist > 0 ?
  								<div className="controlsContainer">
  									<div className="btn-group plCommands">
  										<button title={i18next.t('PLAYLIST_SHUFFLE')} className="btn btn-default" name="shuffle" onClick={this.shuffle}>
  											<i className="fas fa-random"></i>
  										</button>
  										<button title={i18next.t('PLAYLIST_SMART_SHUFFLE')} className="btn btn-default" name="smartShuffle" onClick={this.smartShuffle}>
  											<i className="fas fa-random"></i>
  										</button>
  									</div>
  								</div> : null
  							}
  							{this.props.idPlaylist === -1 ?
  								<div className="searchMenuButtonContainer btn-group plCommands">
  									<button type="button" className={'searchMenuButton collapsed btn btn-default' + (this.props.searchMenuOpen ? ' searchMenuButtonOpen' : '')}
  										onClick={this.props.toggleSearchMenu}>
  										<i className="fas fa-filter"></i>
  									</button>
  								</div> : null
  							}
  						</React.Fragment > : null
  					}
  					{this.props.side === 1 ?
  						<React.Fragment>{plSearch}{flagsContainer}{plCommandsContainer}</React.Fragment> :
  						<React.Fragment>{plCommandsContainer}{flagsContainer}{plSearch}</React.Fragment>
  					}

  				</div> : null
  			}
  			{this.props.searchMenuOpen ?
  				searchMenu : null
  			}
  		</React.Fragment >
  	);
  }
}


export default PlaylistHeader;
