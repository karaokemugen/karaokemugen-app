import i18next from 'i18next';
import React, { Component, CSSProperties, Key, MouseEvent } from 'react';
import ReactDOM from 'react-dom';
import { SortableElement, SortableElementProps, SortableHandle } from 'react-sortable-hoc';

import { DBKaraTag } from '../../../../../src/lib/types/database/kara';
import { Tag } from '../../../../../src/lib/types/tag';
import { DBBlacklist } from '../../../../../src/types/database/blacklist';
import { DBPL } from '../../../../../src/types/database/playlist';
import { GlobalContextInterface } from '../../../store/context';
import { buildKaraTitle, getSerieLanguage, getTagInLocale } from '../../../utils/kara';
import { commandBackend } from '../../../utils/socket';
import { tagTypes } from '../../../utils/tagTypes';
import { displayMessage, is_touch_device, secondsTimeSpanToHMS } from '../../../utils/tools';
import { KaraElement } from '../../types/kara';
import KaraMenuModal from '../modals/KaraMenuModal';
import ActionsButtons from './ActionsButtons';
import KaraDetail from './KaraDetail';

require('./KaraLine.scss');

const DragHandle = SortableHandle(() => <span className="dragHandle"><i className="fas fa-ellipsis-v"></i></span>);

interface IProps {
	kara: KaraElement;
	side: number;
	idPlaylist: number;
	idPlaylistTo: number;
	playlistInfo: DBPL | undefined;
	scope: string;
	i18nTag: { [key: string]: { [key: string]: string } };
	avatar_file: string;
	indexInPL: number;
	checkKara: (id: number | string) => void;
	deleteCriteria: (kara: DBBlacklist) => void;
	jingle: boolean;
	sponsor: boolean;
	style: CSSProperties;
	key: Key;
	context: GlobalContextInterface;
	toggleKaraDetail: (kara:KaraElement, idPlaylist: number) => void;
}

interface IState {
	karaMenu: boolean;
	problematic: boolean
}

const pathAvatar = '/avatars/';
class KaraLine extends Component<IProps & SortableElementProps, IState> {

	constructor(props: IProps & SortableElementProps) {
		super(props);
		this.state = {
			karaMenu: false,
			problematic: this.isProblematic()
		};
	}

	upvoteKara = () => {
		const data = this.props.kara.flag_upvoted ?
			{ downvote: 'true', plc_id: this.props.kara.playlistcontent_id } :
			{plc_id: this.props.kara.playlistcontent_id};
		commandBackend('votePLC', data);
	};

	deleteKara = async () => {
		if (this.props.idPlaylist === -1) {
			await commandBackend('deleteKaraFromPlaylist', {
				plc_id: this.props.kara.my_public_plc_id,
				pl_id: this.props.context.globalState.settings.data.state.publicPlaylistID
			});
		} else if (this.props.idPlaylist === -5) {
			await commandBackend('deleteFavorites', { kid: [this.props.kara.kid] });
		} else if (this.props.idPlaylist === -2) {
			this.props.deleteCriteria(this.props.kara as unknown as DBBlacklist);
		} else if (this.props.idPlaylist === -3) {
			await commandBackend('deleteKaraFromWhitelist', { kid: [this.props.kara.kid] });
		} else {
			await commandBackend('deleteKaraFromPlaylist', {
				plc_id: [this.props.kara.playlistcontent_id],
				pl_id: this.props.idPlaylist
			});
		}
	};

	playKara = () => {
		if (this.props.idPlaylist < 0) {
			commandBackend('playKara', {kid: this.props.kara.kid});
		} else {
			commandBackend('editPLC', {
				flag_playing: true,
				pl_id: this.props.idPlaylist,
				plc_id: this.props.kara.playlistcontent_id
			});
		}
	};

	addKara = async (_event?: any, pos?: number) => {
		let url = '';
		let data;
		if (this.props.idPlaylistTo === -5) {
			url = 'addFavorites';
			data = { kid: [this.props.kara.kid] };
		} else if (this.props.scope === 'admin') {
			if (this.props.idPlaylistTo > 0) {
				if (this.props.idPlaylist > 0 && !pos) {
					url = 'copyKaraToPlaylist';
					data = {
						pl_id: this.props.idPlaylistTo,
						plc_id: [this.props.kara.playlistcontent_id]
					};
				} else {
					url = 'addKaraToPlaylist';
					if (pos) {
						data = {
							pl_id: this.props.idPlaylistTo,
							requestedby: this.props.context.globalState.auth.data.username,
							kid: this.props.kara.kid,
							pos: pos + 1
						};
					} else {
						data = {
							pl_id: this.props.idPlaylistTo,
							requestedby: this.props.context.globalState.auth.data.username,
							kid: this.props.kara.kid
						};
					}
				}
			} else if (this.props.idPlaylistTo === -2 || this.props.idPlaylistTo === -4) {
				url = 'createBLC';
				data = {
					blcriteria_type: 1001,
					blcriteria_value: this.props.kara.kid,
					set_id: this.props.context.globalState.frontendContext.currentBlSet
				};
			} else if (this.props.idPlaylistTo === -3) {
				url = 'addKaraToWhitelist';
				data = { kid: [this.props.kara.kid] };
			}
		} else {
			url = 'addKaraToPublicPlaylist';
			data = { requestedby: this.props.context.globalState.auth.data.username, kid: this.props.kara.kid };
		}
		const response = await commandBackend(url, data);
		if (response && response.code && response.plc && response.plc.time_before_play) {
			const playTime = new Date(Date.now() + response.plc.time_before_play * 1000);
			const playTimeDate = playTime.getHours() + 'h' + ('0' + playTime.getMinutes()).slice(-2);
			const beforePlayTime = secondsTimeSpanToHMS(response.plc.time_before_play, 'hm');
			displayMessage('success', <div>
				{i18next.t(`SUCCESS_CODES.${response.code}`)}
				<br />
				{i18next.t('TIME_BEFORE_PLAY', {
					time: beforePlayTime,
					date: playTimeDate
				})}
			</div>);
		}
	};

	transferKara = async (event: any, pos?: number) => {
		await this.addKara(event, pos);
		this.deleteKara();
	};

	checkKara = () => {
		if (this.props.idPlaylist >= 0) {
			this.props.checkKara(this.props.kara.playlistcontent_id);
		} else {
			this.props.checkKara(this.props.kara.kid);
		}
	};

	changeVisibilityKara = () => {
		commandBackend('editPLC', {
			flag_visible: true,
			pl_id: this.props.idPlaylist,
			plc_id: this.props.kara.playlistcontent_id
		});
	};

	compareTag = (a: DBKaraTag, b: DBKaraTag) => {
		return a.name.localeCompare(b.name);
	}

	karaFamilies = this.props.kara.families ? this.props.kara.families.sort(this.compareTag).map(tag => {
		return <div key={tag.name} className="tag blue" title={getTagInLocale(tag, this.props.i18nTag)}>{tag.short ? tag.short : tag.name}</div>;
	}) : [];

	karaPlatforms = this.props.kara.platforms ? this.props.kara.platforms.sort(this.compareTag).map(tag => {
		return <div key={tag.name} className="tag blue" title={getTagInLocale(tag, this.props.i18nTag)}>{tag.short ? tag.short : tag.name}</div>;
	}) : [];

	karaGenres = this.props.kara.genres ? this.props.kara.genres.sort(this.compareTag).map(tag => {
		return <div key={tag.name} className="tag blue" title={getTagInLocale(tag, this.props.i18nTag)}>{tag.short ? tag.short : tag.name}</div>;
	}) : [];

	karaOrigins = this.props.kara.origins ? this.props.kara.origins.sort(this.compareTag).map(tag => {
		return <div key={tag.name} className="tag blue" title={getTagInLocale(tag, this.props.i18nTag)}>{tag.short ? tag.short : tag.name}</div>;
	}) : [];

	karaMisc = this.props.kara.misc ? this.props.kara.misc.sort(this.compareTag).map(tag => {
		return <div key={tag.name} className="tag black" title={getTagInLocale(tag, this.props.i18nTag)}>{tag.short ? tag.short : tag.name}</div>;
	}) : [];
	isMulti = this.props.kara.langs ? this.props.kara.langs.find(e => e.name.indexOf('mul') > -1) : null;
	karaLangs = (this.props.kara.langs && this.isMulti) ?
		<div key={this.isMulti.name} className="tag">
			{getTagInLocale(this.isMulti, this.props.i18nTag)}
		</div> :
		this.props.kara.langs ?
			this.props.kara.langs.sort(this.compareTag).map(tag => {
				return <div key={tag.name} className="tag green">
					{getTagInLocale(tag, this.props.i18nTag)}
				</div>;
			}) : [];
	karaSongTypes = this.props.kara.songtypes ? this.props.kara.songtypes.sort(this.compareTag).map(tag => {
		return <div key={tag.name} className="tag green">
			{getTagInLocale(tag, this.props.i18nTag)}{this.props.kara.songorder > 0 ? ' ' + this.props.kara.songorder : ''}
		</div>;
	}) : [];
	karaTitle = buildKaraTitle(this.props.context.globalState.settings.data, this.props.kara, false, this.props.i18nTag);

	isProblematic = () => {
		let problematic = false;
		for (const tagType of Object.keys(tagTypes)) {
			if ((this.props.kara[tagType.toLowerCase()] as unknown as Tag[])?.length > 0
				&& this.props.kara[tagType.toLowerCase()].some((t: Tag) => t.problematic)) {
				problematic = true;
			}
		}
		return problematic;
	}

	getSerieOrSingers(data: KaraElement) {
		return (data.series && data.series.length > 0) ? data.series.map(e => getSerieLanguage(this.props.context.globalState.settings.data, e, data.langs[0].name, this.props.i18nTag)).join(', ')
			: data.singers.map(e => getTagInLocale(e, this.props.i18nTag)).join(', ');
	}

	openKaraMenu(event: MouseEvent) {
		if (event?.currentTarget) {
			const element = (event.currentTarget as Element).getBoundingClientRect();
			ReactDOM.render(<KaraMenuModal
				kara={this.props.kara}
				side={this.props.side}
				idPlaylist={this.props.idPlaylist}
				idPlaylistTo={this.props.idPlaylistTo}
				publicOuCurrent={this.props.playlistInfo && (this.props.playlistInfo.flag_current || this.props.playlistInfo.flag_public)}
				topKaraMenu={element.bottom}
				leftKaraMenu={element.left}
				transferKara={this.transferKara}
				closeKaraMenu={this.closeKaraMenu}
				context={this.props.context}
			/>, document.getElementById('modal'));
			this.setState({ karaMenu: true });
		}
	}

	closeKaraMenu = () => {
		const element = document.getElementById('modal');
		if (element) ReactDOM.unmountComponentAtNode(element);
		this.setState({ karaMenu: false });
	}

	karaSerieOrSingers = this.getSerieOrSingers(this.props.kara);

	render() {
		const kara = this.props.kara;
		const scope = this.props.scope;
		const idPlaylist = this.props.idPlaylist;
		return (
			<li key={this.props.key} style={this.props.style}>
				<div className={`list-group-item ${kara.flag_playing ? 'currentlyplaying ' : ''} ${kara.flag_dejavu ? 'dejavu ' : ''}
				${this.props.indexInPL % 2 === 0 ? 'list-group-item-even ' : ''} ${(this.props.jingle || this.props.sponsor) && scope === 'admin' ? 'marker ' : ''}
				${this.props.sponsor && scope === 'admin' ? 'green' : ''}`}>
					{scope === 'public' && kara.username !== this.props.context.globalState.auth.data.username && kara.flag_visible === false ?
						<div className="contentDiv">
							<div>
								{
									(this.props.context.globalState.settings.data.config.Playlist.MysterySongs.Labels as string[])[(this.props.context.globalState.settings.data.config.Playlist.MysterySongs.Labels as string[]).length * Math.random() | 0]
								}
							</div>
						</div> :
						<React.Fragment>
							<div className="actionDiv">
								{(!(is_touch_device() && scope === 'admin') || !is_touch_device())
									&& this.props.context.globalState.settings.data.config.Frontend.ShowAvatarsOnPlaylist
									&& this.props.avatar_file ?
									<img className={`img-circle ${is_touch_device() ? 'mobile' : ''}`}
										src={pathAvatar + this.props.avatar_file} alt="User Pic" title={kara.nickname} /> : null}
								<div className="btn-group">
									{this.props.idPlaylistTo !== idPlaylist && 
										(this.props.scope === 'admin' || this.props.context?.globalState.settings.data.config?.Frontend.Mode === 2) ?
										<ActionsButtons
											idPlaylistTo={this.props.idPlaylistTo}
											idPlaylist={idPlaylist}
											scope={this.props.scope}
											side={this.props.side}
											kara={kara}
											addKara={this.addKara}
											deleteKara={this.deleteKara}
											transferKara={this.transferKara} />
										: null}
									{scope === 'admin' ?
										<button title={i18next.t('KARA_MENU.KARA_COMMANDS')}
											onClick={(event) => {
												this.state.karaMenu ? this.closeKaraMenu() : this.openKaraMenu(event);
											}}
											className={'btn btn-sm btn-action showPlaylistCommands karaLineButton' + (this.state.karaMenu ? ' btn-primary' : '')}>
											<i className="fas fa-wrench"></i>
										</button> : null
									}
								</div>
								{!is_touch_device() && scope === 'admin' && idPlaylist > 0 ? <DragHandle /> : null}
							</div>
							{scope === 'admin' && idPlaylist !== -2 && idPlaylist !== -4 ?
								<span className="checkboxKara" onClick={this.checkKara}>
									{kara.checked ? <i className="far fa-check-square"></i>
										: <i className="far fa-square"></i>}
								</span> : null}
							<div className="infoDiv">
								{scope === 'admin' ?
									<button title={i18next.t(idPlaylist < 0 ? 'KARA_MENU.PLAY_LIBRARY' : 'KARA_MENU.PLAY')}
										className="btn btn-sm btn-action playKara karaLineButton" onClick={this.playKara}>
										<i className={`fas ${idPlaylist < 0 ? 'fa-play' : 'fa-play-circle'}`}></i>
									</button> : null}
								{scope === 'admin' && idPlaylist > 0 && !kara.flag_visible ?
									<button type="button" className={'btn btn-sm btn-action btn-primary'} onClick={this.changeVisibilityKara}>
										<i className="fas fa-eye-slash"></i>
									</button> : null
								}
								{scope !== 'admin' && !kara.flag_dejavu && !kara.flag_playing && kara.username === this.props.context.globalState.auth.data.username
									&& idPlaylist === this.props.context.globalState.settings.data.state.publicPlaylistID ?
									<button title={i18next.t('TOOLTIP_DELETEKARA')} className="btn btn-sm btn-action karaLineButton"
										onClick={this.deleteKara}><i className="fas fa-minus"></i></button> : null}
								{scope !== 'admin' && this.props.idPlaylist > 0 && this.props.playlistInfo?.flag_public ?
									<button className='upvoteKara btn btn-sm btn-action'
										title={i18next.t('TOOLTIP_UPVOTE')}
										disabled={this.props.kara.username === this.props.context.globalState.auth.data.username}
										onClick={this.upvoteKara}>
										<i className={`fas fa-thumbs-up ${kara.flag_upvoted ? 'currentUpvote' : ''} ${kara.upvotes > 0 ? 'upvotes' : ''}`} />
										{kara.upvotes > 0 && kara.upvotes}
									</button> : null}
							</div>
							{is_touch_device() || this.props.scope === 'public' ?
								<div className="contentDiv contentDivMobile" onClick={() => this.props.toggleKaraDetail(kara, idPlaylist)} tabIndex={1}>
									<div className={`disable-select contentDivMobileTop ${this.state.problematic ? 'problematic' : ''}`}>
										<div>
											<div className="contentDivMobileTitle">{kara.title}</div>
											<div className="contentDivMobileSerie">{this.karaSerieOrSingers}</div>
										</div>
										{kara.upvotes && this.props.scope === 'admin' ?
											<div className="upvoteCount"
												title={i18next.t('TOOLTIP_FREE')}>
												<i className="fas fa-thumbs-up" />
												{kara.upvotes}
											</div> : null
										}
									</div>
									<div className="disable-select">
										<div className="tagConteneur mobile">
											{this.karaLangs}
											{this.karaSongTypes}
											{this.karaFamilies}
											{this.karaPlatforms}
											{this.karaGenres}
											{this.karaOrigins}
											{this.karaMisc}
										</div>
									</div>
								</div> :
								<div className="contentDiv" onClick={() => this.props.toggleKaraDetail(kara, idPlaylist)} tabIndex={1}>
									<div className={`disable-select karaTitle ${this.state.problematic ? 'problematic' : ''}`}>
										{this.karaTitle}
										{kara.upvotes && this.props.scope === 'admin' ?
											<div className="upvoteCount"
												title={i18next.t('UPVOTE_NUMBER')}>
												<i className="fas fa-thumbs-up" />
												{kara.upvotes}
											</div> : null
										}
										<div className="tagConteneur">
											{this.karaFamilies}
											{this.karaPlatforms}
											{this.karaGenres}
											{this.karaOrigins}
											{this.karaMisc}
										</div>
									</div>
								</div>
							}
						</React.Fragment>
					}
				</div>
				{(this.props.sponsor && this.props.jingle && scope === 'admin') ? <div className="marker-label green">
					{i18next.t('JINGLE_SPONSOR')}
				</div> : this.props.jingle && scope === 'admin' ? <div className="marker-label">
					{i18next.t('JINGLE')}
				</div> : this.props.sponsor && scope === 'admin' ? <div className="marker-label green">
					{i18next.t('SPONSOR')}
				</div> : ''}
			</li>
		);
	}
}

export default SortableElement(KaraLine, { withRef: true });
