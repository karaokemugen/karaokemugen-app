import './PlaylistHeader.scss';

import i18next from 'i18next';
import prettyBytes from 'pretty-bytes';
import React, { Component, MouseEvent as MouseEventReact } from 'react';

import { User } from '../../../../../src/lib/types/user';
import { BLCSet } from '../../../../../src/types/blacklist';
import { DBPL, DBPLC } from '../../../../../src/types/database/playlist';
import { setFilterValue } from '../../../store/actions/frontendContext';
import { closeModal, showModal } from '../../../store/actions/modal';
import GlobalContext from '../../../store/context';
import { buildKaraTitle } from '../../../utils/kara';
import { commandBackend } from '../../../utils/socket';
import { callModal, displayMessage, is_touch_device } from '../../../utils/tools';
import { KaraElement } from '../../types/kara';
import { Tag } from '../../types/tag';
import Autocomplete from '../generic/Autocomplete';
import SelectWithIcon from '../generic/SelectWithIcon';
import BlcSetCopyModal from '../modals/BlcSetCopyModal';
import CheckedKaraMenuModal from '../modals/CheckedKaraMenuModal';
import DeletePlaylistModal from '../modals/DeletePlaylistModal';
import FavMixModal from '../modals/FavMixModal';
import PlaylistModal from '../modals/PlaylistModal';
import ShuffleModal from '../modals/ShuffleModal';
import ActionsButtons from './ActionsButtons';

const tagsTypesList = [
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
	'BLCTYPE_13',
	'BLCTYPE_14'];

interface IProps {
	idPlaylist: number;
	bLSet?: BLCSet;
	idPlaylistTo: number;
	side: number;
	playlistInfo: DBPL | undefined;
	tags: Array<Tag> | undefined;
	playlistList: Array<PlaylistElem>;
	searchMenuOpen?: boolean;
	bLSetList: BLCSet[];
	checkedKaras: KaraElement[];
	changeIdPlaylist: (idPlaylist: number, idBLSet?: number) => void;
	changeIdPlaylistSide2?: (idPlaylist: number) => void;
	playlistWillUpdate: () => void;
	playlistDidUpdate: () => void;
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
}

interface IState {
	selectAllKarasChecked: boolean;
	tagType: number;
	tags: Tag[];
	activeFilter: 'search' | 'recent' | 'requested';
	orderByLikes: boolean;
	activeFilterUUID: string;
	playlistCommands: boolean;
	karaMenu: boolean;
}

class PlaylistHeader extends Component<IProps, IState> {
	static contextType = GlobalContext;
	context: React.ContextType<typeof GlobalContext>

	constructor(props: IProps) {
		super(props);
		this.state = {
			karaMenu: false,
			playlistCommands: false,
			selectAllKarasChecked: false,
			tagType: 2,
			tags: this.props.tags?.filter(tag => tag.type.includes(2)) || [],
			activeFilter: 'search',
			orderByLikes: false,
			activeFilterUUID: ''
		};
	}

	componentDidUpdate(prevProps: Readonly<IProps>) {
		if (prevProps.tags?.length !== this.props.tags?.length) {
			this.setState({ tags: this.props.tags?.filter(tag => tag.type.includes(this.state.tagType)) });
		}
	}

	addOrEditPlaylist = (mode: 'create' | 'edit') => {
		this.togglePlaylistCommands();
		showModal(this.context.globalDispatch, <PlaylistModal
			changeIdPlaylist={this.props.changeIdPlaylist}
			idPlaylist={this.props.idPlaylist}
			playlistInfo={this.props.playlistInfo}
			bLSet={this.props.bLSet}
			mode={mode}
		/>);
	};

	deletePlaylist = () => {
		this.togglePlaylistCommands();
		const playlistList = this.getListToSelect()
			.filter(pl => Number(pl.value) > 0
				&& Number(pl.value) !== this.props.idPlaylist);
		if (playlistList.length === 0)
			displayMessage('error', i18next.t('MODAL.DELETE_PLAYLIST_MODAL.IMPOSSIBLE'));
		else
			showModal(this.context.globalDispatch, <DeletePlaylistModal
				changeIdPlaylist={this.props.changeIdPlaylist}
				idPlaylist={this.props.idPlaylist}
				idPlaylistTo={this.props.idPlaylistTo}
				playlistInfo={this.props.playlistInfo}
				bLSet={this.props.bLSet}
				playlistList={playlistList}
				bLSetList={this.props.bLSetList?.filter(set => set.blc_set_id !== this.props.bLSet.blc_set_id).map(set => {
					return {value: set.blc_set_id.toString(), label: set.name, icons: []};
				})}
				context={this.context}
			/>);
	};

	startFavMix = async () => {
		this.togglePlaylistCommands();
		const response = await commandBackend('getUsers');
		const userList = response.filter((u: User) => (u.type as number) < 2);
		showModal(this.context.globalDispatch, <FavMixModal changeIdPlaylist={this.props.changeIdPlaylist}
			userList={userList}/>);
	};

	exportPlaylist = async () => {
		this.togglePlaylistCommands();
		let url;
		let data;
		if (this.props.idPlaylist === -4) {
			url = 'exportBLCSet';
			data = {set_id: this.props.bLSet?.blc_set_id};
		} else if (this.props.idPlaylist === -5) {
			url = 'exportFavorites';
		} else if (this.props.idPlaylist > 0) {
			url = 'exportPlaylist';
			data = {pl_id: this.props.idPlaylist};
		}
		if (url) {
			const response = await commandBackend(url, data);
			const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(response, null, 4));
			const dlAnchorElem = document.getElementById('downloadAnchorElem');
			if (dlAnchorElem) {
				dlAnchorElem.setAttribute('href', dataStr);
				if (this.props.idPlaylist === -4) {
					dlAnchorElem.setAttribute('download', ['KaraMugen', this.props.bLSet?.name, new Date().toLocaleDateString().replace('\\', '-')].join('_') + '.kmblc');
				} else if (this.props.idPlaylist === -5) {
					dlAnchorElem.setAttribute('download', ['KaraMugen', 'fav', this.context.globalState.auth.data.username, new Date().toLocaleDateString().replace('\\', '-')].join('_') + '.kmfavorites');
				} else {
					dlAnchorElem.setAttribute('download', ['KaraMugen', (this.props.playlistInfo as DBPL).name, new Date().toLocaleDateString().replace('\\', '-')].join('_') + '.kmplaylist');
				}
				dlAnchorElem.click();
			}
		}
	};

	importPlaylist = (e: any) => {
		this.togglePlaylistCommands();
		let url: string;
		let fr: FileReader;
		let file: File;
		if (!window.FileReader) return alert('FileReader API is not supported by your browser.');
		if (e.target.files && e.target.files[0]) {
			file = e.target.files[0];
			fr = new FileReader();
			fr.onload = async () => {
				const data: {
					playlist?: string | ArrayBuffer | null,
					favorites?: string | ArrayBuffer | null,
					blcSet?: string | ArrayBuffer | null
				} = {};
				let name: string;
				if (file.name.includes('.kmblc')) {
					data.blcSet = fr.result;
					url = 'importBLCSet';
					name = JSON.parse(fr.result as string)?.blcSetInfo?.name;
				} else if (file.name.includes('.kmfavorites')) {
					data.favorites = fr.result;
					url = 'importFavorites';
					name = 'Favs';
				} else {
					url = 'importPlaylist';
					data.playlist = fr.result;
					name = JSON.parse(fr.result as string)?.PlaylistInformation?.name;
				}
				const response = await commandBackend(url, data);
				if (response.data.unknownKaras && response.data.unknownKaras.length > 0) {
					const mediasize = response.data.unknownKaras.reduce((accumulator, currentValue) => accumulator + currentValue.mediasize, 0);
					callModal(this.context.globalDispatch, 'confirm', i18next.t('MODAL.UNKNOW_KARAS.TITLE'), (
						<React.Fragment>
							<p>
								{i18next.t('MODAL.UNKNOW_KARAS.DESCRIPTION')}
							</p>
							<div>
								{i18next.t('MODAL.UNKNOW_KARAS.DOWNLOAD_THEM')}
								<label>&nbsp;{i18next.t('MODAL.UNKNOW_KARAS.DOWNLOAD_THEM_SIZE', {mediasize: prettyBytes(mediasize)})}</label>
							</div>
							<br/>
							{response.unknownKaras.map((kara: DBPLC) =>
								<label
									key={kara.kid}>{buildKaraTitle(this.context.globalState.settings.data, kara, true)}</label>)}
						</React.Fragment>), () => commandBackend('addDownloads', {
						downloads: response.unknownKaras.map((kara: DBPLC) => {
							return {
								kid: kara.kid,
								mediafile: kara.mediafile,
								size: kara.mediasize,
								name: kara.karafile.replace('.kara.json', ''),
								repository: kara.repository
							};
						})
					}));
				} else {
					!file.name.includes('.kmfavorites') &&
					displayMessage('success', i18next.t(i18next.t(`SUCCESS_CODES.${response.code}`, {data: name})));
				}
				const playlist_id = file.name.includes('.kmfavorites') ? -5 : response.data.playlist_id;
				this.props.changeIdPlaylist(playlist_id);
			};
			fr.readAsText(file);
		}
	};

	deleteAllKaras = () => {
		this.togglePlaylistCommands();
		callModal(this.context.globalDispatch, 'confirm', i18next.t('CL_EMPTY_LIST'), '', () => {
			if (this.props.idPlaylist === -2 || this.props.idPlaylist === -4) {
				commandBackend('emptyBLCSet', {set_id: this.props.bLSet?.blc_set_id});
			} else if (this.props.idPlaylist === -3) {
				commandBackend('emptyWhitelist');
			} else {
				commandBackend('emptyPlaylist', {pl_id: this.props.idPlaylist});
			}
		});
	};

	getKarasList = (activeFilter: 'search' | 'recent' | 'requested', orderByLikes = false) => {
		this.setState({activeFilter, orderByLikes});
		this.props.getPlaylist(activeFilter, orderByLikes);
	};

	onChangeTags = (value: string) => {
		this.setState({activeFilterUUID: value});
		this.props.onChangeTags(this.state.tagType, value);
	};

	getPlaylistIcon(playlist: PlaylistElem) {
		// public & current playlist :  play-circle & globe icons
		if (playlist?.flag_public && playlist?.flag_current) return ['fa-play-circle', 'fa-globe'];
		// public playlist : globe icon
		if (playlist?.flag_public) return ['fa-globe'];
		// current playlist : play-circle icon
		if (playlist?.flag_current) return ['fa-play-circle'];
		// library : book icon
		if (playlist.playlist_id === -1) return ['fa-book'];
		// blacklist : ban icon
		if (playlist?.playlist_id === -2) return ['fa-ban'];
		// whitelist : check-circle icon
		if (playlist?.playlist_id === -3) return ['fa-check-circle'];
		// blacklist criterias : not-equal icon
		if (playlist?.playlist_id === -4) return ['fa-not-equal'];
		// favorites : star icon
		if (playlist?.playlist_id === -5) return ['fa-star'];
		// others playlist : list-ol icon
		return ['fa-list-ol'];
	}

	getListToSelect = () => {
		return this.props.playlistList.map(playlist => {
			return {
				value: playlist?.playlist_id?.toString(),
				label: playlist.name,
				icons: this.getPlaylistIcon(playlist)
			};
		});
	}

	getFlagLabel = (playlist: PlaylistElem) => {
		if (playlist.flag_public && playlist.flag_current) return ` (${i18next.t('FLAGS.CURRENT_PUBLIC')})`;
		if (playlist.flag_public) return ` (${i18next.t('FLAGS.PUBLIC')})`;
		if (playlist.flag_current) return ` (${i18next.t('FLAGS.CURRENT')})`;
		return '';
	}

	copyBlcSet = () => {
		this.togglePlaylistCommands();
		showModal(this.context.globalDispatch, <BlcSetCopyModal
			bLSetFrom={this.props.bLSet?.blc_set_id as number}
			bLSetList={this.props.bLSetList.filter(blcset => blcset.blc_set_id !== this.props.bLSet?.blc_set_id)}
		/>);
	}

	togglePlaylistCommands = () => {
		this.state.playlistCommands ?
			document.getElementById('root').removeEventListener('click', this.handleClick) :
			document.getElementById('root').addEventListener('click', this.handleClick);
		this.setState({playlistCommands: !this.state.playlistCommands});
	};

	handleClick = (e: MouseEvent) => {
		if (!(e.target as Element).closest('.dropdown-menu') && !(e.target as Element).closest('.showPlaylistCommands')) {
			this.togglePlaylistCommands();
		}
	}

	openShuffleModal = () => {
		this.togglePlaylistCommands();
		showModal(this.context.globalDispatch, <ShuffleModal
			idPlaylist={this.props.idPlaylist}
			playlistWillUpdate={this.props.playlistWillUpdate}
			playlistDidUpdate={this.props.playlistDidUpdate}
		/>);
	}

	openKaraMenu(event: MouseEventReact) {
		if (event?.currentTarget) {
			const element = (event.currentTarget as Element).getBoundingClientRect();
			showModal(this.context.globalDispatch, <CheckedKaraMenuModal
				checkedKaras={this.props.checkedKaras}
				idPlaylist={this.props.idPlaylist}
				idPlaylistTo={this.props.idPlaylistTo}
				publicOuCurrent={this.props.playlistInfo && (this.props.playlistInfo.flag_current || this.props.playlistInfo.flag_public)}
				topKaraMenu={element.bottom}
				leftKaraMenu={element.left}
				closeKaraMenu={this.closeKaraMenu}
				transferKara={this.props.transferCheckedKaras}
				context={this.context}
			/>);
			this.setState({karaMenu: true});
		}
	}

	closeKaraMenu = () => {
		closeModal(this.context.globalDispatch);
		this.setState({karaMenu: false});
	}

	render() {
		const plCommandsContainer = (
			this.props.idPlaylist !== -4 ?
				<div className="actionDiv">
					<div className="btn-group">
						{this.props.idPlaylist !== -4 ?
							<React.Fragment>
								<button
									title={i18next.t('ADVANCED.SELECT_ALL')}
									onClick={() => {
										this.setState({selectAllKarasChecked: !this.state.selectAllKarasChecked});
										this.props.selectAllKaras();
									}}
									className="btn btn-default karaLineButton"
								>
									{
										this.state.selectAllKarasChecked
											? <i className="far fa-check-square"/>
											: <i className="far fa-square"/>
									}
								</button>
								<ActionsButtons
									idPlaylistTo={this.props.idPlaylistTo}
									idPlaylist={this.props.idPlaylist}
									scope='admin'
									side={this.props.side}
									isHeader={true}
									addKara={this.props.addCheckedKaras}
									deleteKara={this.props.deleteCheckedKaras}
									refuseKara={this.props.refuseCheckedKara}
									acceptKara={this.props.acceptCheckedKara}
									deleteFavorite={this.props.deleteCheckedFavorites}
									checkedKaras={this.props.checkedKaras?.length}
									flag_public={this.props.playlistInfo?.flag_public}
								/>
								<button title={i18next.t('KARA_MENU.KARA_COMMANDS')}
									onClick={(event) => {
										this.state.karaMenu ? this.closeKaraMenu() : this.openKaraMenu(event);
									}}
									className={'btn btn-sm btn-action showPlaylistCommands karaLineButton' + (this.state.karaMenu ? ' btn-primary' : '')}>
									<i className="fas fa-wrench" />
								</button>
							</React.Fragment> : null
						}
					</div>
				</div> : null);

		const searchMenu = (this.state.tags.length > 0 ?
			<div className="searchMenuContainer">
				{this.props.idPlaylist === -1 ? <div className="filterContainer">
					<div className="filterButton" onClick={() => {
						this.setState({activeFilterUUID: ''},
							() => this.props.onChangeTags(this.state.tagType, ''));
					}}>
						<i className="fas fa-eraser"/> <span>{i18next.t('CLEAR_FILTER')}</span>
					</div>
					<select className="filterElement filterTags"
						onChange={e => this.setState({
							tags: this.props.tags.filter(tag => tag.type.includes(parseInt(e.target.value))),
							tagType: parseInt(e.target.value), activeFilterUUID: ''
						})}
						value={this.state.tagType}>
						{tagsTypesList.map(val => {
							if (val === 'DETAILS_YEAR') {
								return <option key={val} value={0}>{i18next.t(val)}</option>;
							} else {
								return <option key={val}
											   value={val.replace('BLCTYPE_', '')}>{i18next.t(`BLACKLIST.${val}`)}</option>;
							}
						})}
					</select>
					<div className="filterElement filterTagsOptions">
						<Autocomplete value={this.state.activeFilterUUID || ''}
									  options={this.state.tags}
									  onChange={this.onChangeTags}/>
					</div>
				</div> : null}
				<div className="filterContainer">
					<div tabIndex={0}
						 className={'filterElement ' + (this.state.activeFilter === 'search' ? 'filterElementActive' : '')}
						 onClick={() => this.getKarasList('search')}
						 onKeyPress={() => this.getKarasList('search')}>
						<i className={`fas fa-fw ${this.props.idPlaylist >= 0 ? 'fa-list-ol':'fa-sort-alpha-down'}`} /> {i18next.t('VIEW_STANDARD')}
					</div>
					{this.props.idPlaylist === -1 ? <>
						<div tabIndex={0}
							 className={'filterElement ' + (this.state.activeFilter === 'recent' ? 'filterElementActive' : '')}
							 onClick={() => this.getKarasList('recent')}
							 onKeyPress={() => this.getKarasList('recent')}>
							<i className="far fa-clock"/> {i18next.t('VIEW_RECENT')}
						</div>
						<div tabIndex={0}
							 className={'filterElement ' + (this.state.activeFilter === 'requested' ? 'filterElementActive' : '')}
							 onClick={() => this.getKarasList('requested')}
							 onKeyPress={() => this.getKarasList('requested')}>
							<i className="fas fa-fire"/> {i18next.t('VIEW_POPULAR')}
						</div>
					</> : null}
					{this.props.idPlaylist >= 0 ?
						<div tabIndex={0}
						   className={'filterElement ' + (this.state.orderByLikes ? 'filterElementActive' : '')}
						   onClick={() => this.getKarasList(undefined, true)}
						   onKeyPress={() => this.getKarasList(undefined, true)}
						   title={i18next.t('VIEW_LIKES_TOOLTIP')}>
							<i className="fas fa-thumbs-up"/> {i18next.t('VIEW_LIKES')}
						</div>:null}
				</div>
			</div> : null);
		return (
			<React.Fragment>
				<div className="panel-heading plDashboard">
					<div
						className="dropdown"
					>
						<button title={i18next.t('ADVANCED.PLAYLIST_COMMANDS')} onClick={this.togglePlaylistCommands}
							className={'btn btn-default showPlaylistCommands karaLineButton' + (this.state.playlistCommands ? ' btn-primary' : '')}>
							<i className="fas fa-cog"/>
						</button>
						{this.state.playlistCommands ?
							<ul className="dropdown-menu">
								{this.props.idPlaylist === -4 && this.props.bLSetList.length > 1 ?
									<li>
										<a href="#" onClick={this.copyBlcSet} title={i18next.t('ADVANCED.SHUFFLE')}>
											<i className="fas fa-fw fa-copy"/>
											{i18next.t('BLC.COPY')}
										</a>
									</li> : null
								}
								{this.props.idPlaylist >= 0 ?
									<li>
										<a href="#" onClick={this.openShuffleModal}>
											<i className="fas fa-fw fa-random"/>
											{i18next.t('ADVANCED.SHUFFLE')}
										</a>
									</li> : null
								}
								{this.props.idPlaylistTo >= 0 && this.props.idPlaylist !== -4 ?
									<React.Fragment>
										<li>
											<a href="#" onClick={() => {
												this.togglePlaylistCommands();
												this.props.addAllKaras();
											}} className="danger-hover">
												<i className="fas fa-fw fa-share"/>
												{i18next.t('ADVANCED.ADD_ALL')}
											</a>
										</li>
										{this.props.idPlaylist >= 0 || this.props.idPlaylist === -1 ?
											<li>
												<a href="#" onClick={() => {
													this.togglePlaylistCommands();
													this.props.addRandomKaras();
												}}>
													<i className="fas fa-fw fa-dice"/>
													{i18next.t('ADVANCED.ADD_RANDOM')}
												</a>
											</li> : null
										}
									</React.Fragment>
									: null
								}
								{this.props.idPlaylist >= 0 || this.props.idPlaylist === -4 || this.props.idPlaylist === -3 ?
									<li>
										<a href="#" onClick={this.deleteAllKaras} className="danger-hover">
											<i className="fas fa-fw fa-eraser"/>
											{i18next.t('ADVANCED.EMPTY_LIST')}
										</a>
									</li> : null
								}
								{this.props.idPlaylist >= 0 || this.props.idPlaylist === -4 ?
									<React.Fragment>
										<li>
											<a href="#" onClick={this.deletePlaylist} className="danger-hover">
												<i className="fas fa-fw fa-trash"/>
												{i18next.t(this.props.idPlaylist === -4 ? 'BLC.DELETE' : 'ADVANCED.DELETE')}
											</a>
										</li>
										<li>
											<a href="#" onClick={() => this.addOrEditPlaylist('edit')}>
												<i className="fas fa-fw fa-pencil-alt"/>
												{i18next.t(this.props.idPlaylist === -4 ? 'BLC.EDIT' : 'ADVANCED.EDIT')}
											</a>
										</li>
									</React.Fragment> : null
								}
								{
									this.props.idPlaylist !== -1 ?
										<li>
											<a href="#" onClick={this.exportPlaylist}>
												<i className="fas fa-fw fa-upload"/>
												{i18next.t(this.props.idPlaylist === -4 ? 'BLC.EXPORT' :
													(this.props.idPlaylist === -5 ? 'FAVORITES_EXPORT' : 'ADVANCED.EXPORT'))}
											</a>
										</li> : ''
								}
								<hr/>
								<li>
									<a href="#" onClick={() => this.addOrEditPlaylist('create')}>
										<i className="fas fa-fw fa-plus"/>
										{i18next.t(this.props.idPlaylist === -4 ? 'BLC.ADD' : 'ADVANCED.ADD')}
									</a>
								</li>
								{this.props.idPlaylist !== -4 ?
									<li>
										<a href="#" onClick={this.startFavMix}>
											<i className="fas fa-fw fa-bolt"/>
											{i18next.t('ADVANCED.AUTOMIX')}
										</a>
									</li> : null
								}
								<li>
									<a href="#">
										<label className="importFile" htmlFor={'import-file' + this.props.side}>
											<i className="fas fa-fw fa-download"/>
											{i18next.t(this.props.idPlaylist === -4 ? 'BLC.IMPORT' :
												(this.props.idPlaylist === -5 ? 'FAVORITES_IMPORT' : 'ADVANCED.IMPORT'))}
										</label>
									</a>
									<input id={'import-file' + this.props.side} className="import-file" type="file"
										   style={{display: 'none'}}
										   accept=".kmplaylist, .kmfavorites, .kmblc" onChange={this.importPlaylist}/>
								</li>
							</ul> : null
						}
					</div>
					<SelectWithIcon list={this.getListToSelect()} value={this.props.idPlaylist?.toString()}
						onChange={(value: any) => this.props.changeIdPlaylist(Number(value))}/>
					{this.props.idPlaylist === -4 ?
						<SelectWithIcon
							list={this.props.bLSetList.map(set => {
								return {
									value: set.blc_set_id.toString(),
									label: set.name,
									icons: set.flag_current ? ['fa-play-circle'] : []
								};
							})}
							value={this.props.bLSet?.blc_set_id.toString()}
							onChange={(value: any) => this.props.changeIdPlaylist(this.props.idPlaylist, Number(value))}
						/> : null
					}
					{this.props.idPlaylist >= -1 ?
						<div className="searchMenuButtonContainer btn-group">
							<button type="button" title={i18next.t('FILTERS')}
								className={'searchMenuButton collapsed btn btn-default karaLineButton'
									+ ((this.props.searchMenuOpen ||
										this.state.activeFilter !== 'search' ||
										this.state.activeFilterUUID !== '' ||
										this.state.orderByLikes) ? ' btn-primary' : '')}
								onClick={this.props.toggleSearchMenu}>
								<i className="fas fa-fw fa-filter"/>
								{(this.state.activeFilter !== 'search' ||
									this.state.activeFilterUUID !== '') ? i18next.t('ACTIVE_FILTER') : null}
							</button>
						</div> : null
					}
					<div className="plSearch">
						<input
							type="text"
							placeholder={`\uF002 ${i18next.t('SEARCH')}`}
							defaultValue={this.props.side === 1 ?
								this.context.globalState.frontendContext.filterValue1 :
								this.context.globalState.frontendContext.filterValue2}
							onChange={e => setFilterValue(
								this.context.globalDispatch,
								e.target.value,
								this.props.side,
								this.props.idPlaylist
							)}
						/>
					</div>
					{plCommandsContainer}
				</div>
				{is_touch_device() ?
					<div className="panel-heading mobile">
						<select value={this.props.idPlaylist}
							onChange={(e) => this.props.changeIdPlaylist(Number(e.target.value))}>
							{this.props.playlistList?.map(playlist => {
								return <option key={playlist.playlist_id} value={playlist.playlist_id}>
									{playlist.name}{this.getFlagLabel(playlist)}
								</option>;
							})}
						</select>
						<i className="fas fa-arrow-right"/>
						<select value={this.props.idPlaylistTo}
							onChange={(e) => this.props.changeIdPlaylistSide2(Number(e.target.value))}>
							{this.props.playlistList?.map(playlist => {
								return <option key={playlist.playlist_id} value={playlist.playlist_id}>
									{playlist.name}{this.getFlagLabel(playlist)}
								</option>;
							})}
						</select>
					</div> : null
				}
				{this.props.searchMenuOpen ?
					searchMenu : null
				}
			</React.Fragment>
		);
	}
}

export default PlaylistHeader;
