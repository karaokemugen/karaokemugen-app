import React, { Component } from 'react';
import i18next from 'i18next';
import { is_touch_device, secondsTimeSpanToHMS, getTagInLanguage, getSerieLanguage } from '../tools';
import KaraDetail from './KaraDetail';
import axios from 'axios';
import ActionsButtons from './ActionsButtons';
import { buildKaraTitle, displayMessage } from '../tools';
import store from '../../store';
import { SortableHandle } from 'react-sortable-hoc';
import ReactDOM from 'react-dom';
import { DBPL } from '../../../../src/types/database/playlist';
import { Config } from '../../../../src/types/config';
import { DBKaraTag } from '../../../../src/lib/types/database/kara';
import { KaraElement } from '../../types/kara';
import { Token } from '../../../../src/lib/types/user';
import { DBBlacklist } from '../../../../src/types/database/blacklist';

const DragHandle = SortableHandle(() => <span className="dragHandle"><i className="fas fa-ellipsis-v"></i></span>);

interface IProps {
	kara: KaraElement;
	side: number;
	config: Config;
	idPlaylist: number;
	idPlaylistTo: number;
	playlistInfo: DBPL | undefined;
	scope: string;
	playlistCommands?: boolean;
	i18nTag: { [key: string]: { [key: string]: string } };
	avatar_file: string;
	index: number;
	showVideo: (file: string) => void;
	checkKara: (id: number | string) => void;
	deleteCriteria: (kara: DBBlacklist) => void;
}

const pathAvatar = '/avatars/';
class KaraLine extends Component<IProps, {}> {

	toggleKaraDetail = () => {
		ReactDOM.render(<KaraDetail kid={this.props.kara.kid} playlistcontentId={this.props.kara.playlistcontent_id} scope={this.props.scope}
			idPlaylist={this.props.idPlaylist} mode='list'
			publicOuCurrent={this.props.playlistInfo && (this.props.playlistInfo.flag_current || this.props.playlistInfo.flag_public)}
			showVideo={this.props.showVideo} freeKara={this.freeKara}>
		</KaraDetail>, document.getElementById('modal'));
	};

	getTagInLocale = (tag: DBKaraTag) => {
		return getTagInLanguage(tag, store.getNavigatorLanguage() as string, 'eng', this.props.i18nTag);
	};

	upvoteKara = () => {
		let data = this.props.kara.flag_upvoted ? { 'downvote': 'true' } : {};
		axios.post(`/playlists/${this.props.idPlaylist}/karas/${this.props.kara.playlistcontent_id}/vote`, data);
	};

	deleteKara = async () => {
		if (this.props.idPlaylist == -5) {
			await axios.delete('/favorites', { data: { kid: [this.props.kara.kid] } });
		} else if (this.props.idPlaylist == -2) {
			this.props.deleteCriteria(this.props.kara as unknown as DBBlacklist);
		} else if (this.props.idPlaylist == -3) {
			await axios.delete('/whitelist', { data: { kid: [this.props.kara.kid] } });
		} else {
			await axios.delete('/playlists/' + this.props.idPlaylist + '/karas/', { data: { plc_id: [this.props.kara.playlistcontent_id] } });
		}
	};

	playKara = () => {
		if (this.props.idPlaylist < 0) {
			axios.post(`/karas/${this.props.kara.kid}/play`);
		} else {
			axios.put(`/playlists/${this.props.idPlaylist}/karas/${this.props.kara.playlistcontent_id}`, { flag_playing: true });
		}
	};

	addKara = async (event?: any, pos?: number) => {
		let logInfos = store.getLogInfos();
		let url: string = '';
		let data;
		let type;
		if (this.props.idPlaylistTo == -5) {
			url = '/favorites';
			data = { kid: [this.props.kara.kid] };
		} else if (this.props.scope === 'admin') {
			if (this.props.idPlaylistTo > 0) {
				url = '/playlists/' + this.props.idPlaylistTo + '/karas';
				if (this.props.idPlaylist > 0 && !pos) {
					data = { plc_id: [this.props.kara.playlistcontent_id] };
					type = 'PATCH';
				} else {
					if (pos) {
						data = { requestedby: (logInfos as Token).username, kid: this.props.kara.kid, pos: pos + 1 };
					} else {
						data = { requestedby: (logInfos as Token).username, kid: this.props.kara.kid };
					}
				}
			} else if (this.props.idPlaylistTo == -2 || this.props.idPlaylistTo == -4) {
				url = `/blacklist/set/${store.getCurrentBlSet()}/criterias`;
				data = { blcriteria_type: 1001, blcriteria_value: this.props.kara.kid };
			} else if (this.props.idPlaylistTo == -3) {
				url = '/whitelist';
				data = { kid: [this.props.kara.kid] };
			}
		} else {
			url = `/karas/${this.props.kara.kid}`;
			data = { requestedby: (logInfos as Token).username, kid: this.props.kara.kid };
		}
		let response;
		if (type === 'PATCH') {
			response = await axios.patch(url, data);
		} else {
			response = await axios.post(url, data);
		}
		if (response.data && response.data.data && response.data.data.plc && response.data.data.plc.time_before_play) {
			let playTime = new Date(Date.now() + response.data.data.plc.time_before_play * 1000);
			let playTimeDate = playTime.getHours() + 'h' + ('0' + playTime.getMinutes()).slice(-2);
			let beforePlayTime = secondsTimeSpanToHMS(response.data.data.plc.time_before_play, 'hm');
			displayMessage('success', <div>
				{i18next.t(`SUCCESS_CODES.${response.data.code}`)}
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

	freeKara = () => {
		if (this.props.scope === 'admin') {
			axios.put('/playlists/' + this.props.idPlaylist + '/karas/' + this.props.kara.playlistcontent_id, { flag_free: true });
		}
	};

	checkKara = () => {
		if (this.props.idPlaylist >= 0) {
			this.props.checkKara(this.props.kara.playlistcontent_id);
		} else {
			this.props.checkKara(this.props.kara.kid);
		}
	};

	changeVisibilityKara = () => {
		axios.put('/playlists/' + this.props.idPlaylist + '/karas/' + this.props.kara.playlistcontent_id,
			{ flag_visible: true });
	};

	compareTag = (a: DBKaraTag, b: DBKaraTag) => {
		return a.name.localeCompare(b.name);
	}

	karaFamilies = this.props.kara.families ? this.props.kara.families.sort(this.compareTag).map(tag => {
		return <div key={tag.name} className="tag" title={this.getTagInLocale(tag)}>{tag.short ? tag.short : '?'}</div>;
	}) : [];

	karaPlatforms = this.props.kara.platforms ? this.props.kara.platforms.sort(this.compareTag).map(tag => {
		return <div key={tag.name} className="tag" title={this.getTagInLocale(tag)}>{tag.short ? tag.short : '?'}</div>;
	}) : [];

	karaGenres = this.props.kara.genres ? this.props.kara.genres.sort(this.compareTag).map(tag => {
		return <div key={tag.name} className="tag" title={this.getTagInLocale(tag)}>{tag.short ? tag.short : '?'}</div>;
	}) : [];

	karaOrigins = this.props.kara.origins ? this.props.kara.origins.sort(this.compareTag).map(tag => {
		return <div key={tag.name} className="tag" title={this.getTagInLocale(tag)}>{tag.short ? tag.short : '?'}</div>;
	}) : [];

	karaMisc = this.props.kara.misc ? this.props.kara.misc.sort(this.compareTag).map(tag => {
		return <div key={tag.name} className="tag" title={this.getTagInLocale(tag)}>{tag.short ? tag.short : '?'}</div>;
	}) : [];

	karaTitle = buildKaraTitle(this.props.kara, undefined, this.props.i18nTag);

	getLangs(data: KaraElement) {
		let isMulti = data.langs ? data.langs.find(e => e.name.indexOf('mul') > -1) : false;
		if (data.langs && isMulti) {
			data.langs = [isMulti];
		}
		return data.langs.map(e => e.name).join(', ').toUpperCase();
	}

	getSerieOrSingers(data: KaraElement) {
		return (data.series && data.series.length > 0) ? data.series.map(e => getSerieLanguage(e, data.langs[0].name, this.props.i18nTag)).join(', ')
			: data.singers.map(e => this.getTagInLocale(e)).join(', ');
	}

	getSongtypes(data: KaraElement) {
		return data.songtypes.map(e => e.short ? + e.short : e.name).sort().join(' ') + (data.songorder > 0 ? ' ' + data.songorder : '');
	}

	karaLangs = this.getLangs(this.props.kara);
	karaSerieOrSingers = this.getSerieOrSingers(this.props.kara);
	karaSongTypes = this.getSongtypes(this.props.kara);

	render() {
		let logInfos = store.getLogInfos();
		let kara = this.props.kara;
		let scope = this.props.scope;
		let idPlaylist = this.props.idPlaylist;
		return (
			<div className={'list-group-item ' + (kara.flag_playing ? 'currentlyplaying ' : ' ') + (kara.flag_dejavu ? 'dejavu ' : ' ')
				+ (this.props.index % 2 === 0 ? 'list-group-item-binaire' : '')}>
				{scope === 'public' && logInfos && kara.username !== logInfos.username && kara.flag_visible === false ?
					<div className="contentDiv">
						<div style={{ height: '33px' }}>
							{(this.props.config.Playlist.MysterySongs.Labels as string[])
							[(this.props.config.Playlist.MysterySongs.Labels as string[]).length * Math.random() | 0]
							}
						</div>
					</div> :
					<React.Fragment>
						<div className="actionDiv">
							{((store.getLogInfos() && kara.username !== (store.getLogInfos() as Token).username)
								&& !(is_touch_device() && scope === 'admin') || !is_touch_device())
								&& this.props.config.Frontend.ShowAvatarsOnPlaylist && this.props.avatar_file ?
								<img className={`img-circle ${is_touch_device() ? 'mobile' : ''}`}
									src={pathAvatar + this.props.avatar_file} alt="User Pic" title={kara.nickname} /> : null}
							<div className="actionButtonsDiv">
								{this.props.idPlaylistTo !== idPlaylist ?
									<ActionsButtons idPlaylistTo={this.props.idPlaylistTo} idPlaylist={idPlaylist}
										scope={this.props.scope} kara={kara}
										addKara={this.addKara} deleteKara={this.deleteKara} transferKara={this.transferKara} />
									: null}
							</div>
							{!is_touch_device() && scope === 'admin' && idPlaylist > 0 ? <DragHandle /> : null}
						</div>
						{scope === 'admin' && idPlaylist !== -2 && idPlaylist != -4 ?
							<span className="checkboxKara" onClick={this.checkKara}>
								{kara.checked ? <i className="far fa-check-square"></i>
									: <i className="far fa-square"></i>}
							</span> : null}
						<div className="infoDiv">
							{scope === 'admin' ?
								<button title={i18next.t(idPlaylist < 0 ? 'TOOLTIP_PLAYKARA_LIBRARY' : 'TOOLTIP_PLAYKARA')}
									className="btn btn-sm btn-action playKara karaLineButton" onClick={this.playKara}>
									<i className={`fas ${idPlaylist < 0 ? 'fa-play' : 'fa-play-circle'}`}></i>
								</button> : null}
							{scope === 'admin' && this.props.playlistInfo && idPlaylist > 0 && !kara.flag_visible
								&& (this.props.playlistInfo.flag_current || this.props.playlistInfo.flag_public) ?
								<button type="button" className={'btn btn-sm btn-action btn-primary'} onClick={this.changeVisibilityKara}>
									<i className="fas fa-eye-slash"></i>
								</button> : null
							}
							{scope !== 'admin' && this.props.playlistInfo && this.props.playlistInfo.flag_public ?
								<button className='upvoteKara btn btn-sm btn-action'
									title={i18next.t('TOOLTIP_UPVOTE')}
									disabled={this.props.kara.username === store.getLogInfos()?.username}
									onClick={this.upvoteKara}>
									<i className={`fas fa-thumbs-up ${kara.flag_upvoted ? 'currentUpvote' : ''} ${kara.upvotes > 0 ? 'upvotes' : ''}`} />
									{kara.upvotes > 0 && kara.upvotes}
								</button> : null}
							{scope !== 'admin' && !kara.flag_dejavu && !kara.flag_playing && kara.username === logInfos?.username
								&& (idPlaylist == store.getPublicPlaylistID()) ?
								<button title={i18next.t('TOOLTIP_DELETEKARA')} className="btn btn-sm btn-action karaLineButton"
									onClick={this.deleteKara}><i className="fas fa-minus"></i></button> : null}
						</div>
						{is_touch_device() ?
							<div className="contentDiv contentDivMobile" onClick={this.toggleKaraDetail} tabIndex={1}>
								<div className="disable-select contentDivMobileTop">
									<div className="contentDivMobileFirstColumn">
										<div>{this.karaLangs}</div>
										<div>{this.karaSongTypes}</div>
									</div>
									<div>
										<div className="contentDivMobileSerie">{this.karaSerieOrSingers}</div>
										<div className="contentDivMobileTitle">{kara.title}</div>
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
									<div>
										{this.karaFamilies}
										{this.karaPlatforms}
										{this.karaGenres}
										{this.karaOrigins}
										{this.karaMisc}
									</div>
								</div>
							</div> :
							<div className="contentDiv" onClick={this.toggleKaraDetail} tabIndex={1}>
								<div className="disable-select karaTitle">
									{this.karaTitle}
									{kara.upvotes && this.props.scope === 'admin' ?
										<div className="upvoteCount"
											title={i18next.t('TOOLTIP_FREE')}>
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
			</div>);
	}
}

export default KaraLine;
