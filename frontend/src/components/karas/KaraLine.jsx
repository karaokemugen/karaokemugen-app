import React, { Component } from 'react';
import i18next from 'i18next';
import { is_touch_device } from '../tools';
import KaraDetail from './KaraDetail';
import axios from 'axios';
import ActionsButtons from './ActionsButtons';
import { buildKaraTitle, displayMessage } from '../tools';
import store from '../../store';
import { sortableHandle } from 'react-sortable-hoc';
import ReactDOM from 'react-dom';

const DragHandle = sortableHandle(() => <span className="dragHandle"><i className="fas fa-ellipsis-v"></i></span>);

class KaraLine extends Component {
	constructor(props) {
		super(props);
		this.state = {
			displayedKaraDetail: false,
			isLike: this.props.kara.flag_upvoted,
			startSwipeX: 0,
			addKaraInProgress: false
		};
	}

  handleSwipe = e => {
  	if (this.props.side === 1 && this.props.config.Frontend.Mode === 2
      && e.changedTouches[0].clientX > this.state.startSwipeX + 100) {
  		this.setState({ addKaraInProgress: true });
  		this.addKara();
  		setTimeout(() => this.setState({ addKaraInProgress: false }), 800);
  	}
  };

  handleStart = e => {
  	this.setState({ startSwipeX: e.changedTouches[0].clientX });
  };

  toggleKaraDetail = () => {
  	if (this.state.displayedKaraDetail) {
  		ReactDOM.unmountComponentAtNode(document.getElementById('modal'));
  	} else {
  		ReactDOM.render(<KaraDetail kid={this.props.kara.kid} playlistcontentId={this.props.kara.playlistcontent_id} scope={this.props.scope} 
  			idPlaylist={this.props.idPlaylist} mode='list' toggleKaraDetail={this.toggleKaraDetail}
  			publicOuCurrent={this.props.playlistInfo && (this.props.playlistInfo.flag_current || this.props.playlistInfo.flag_public)}
  			showVideo={this.props.showVideo} navigatorLanguage={this.props.navigatorLanguage} freeKara={this.freeKara}>
			  </KaraDetail>, document.getElementById('modal'));
  	}
  	this.setState({ displayedKaraDetail: !this.state.displayedKaraDetail });
  };



  getTagInLocale = tag => {
  	if (this.props.i18nTag && this.props.i18nTag[tag.tid]) {
  		let i18nTag = this.props.i18nTag[tag.tid];
  		return i18nTag[this.props.navigatorLanguage] ? i18nTag[this.props.navigatorLanguage] : i18nTag['eng'];
  	} else {
  		return tag.name;
  	}
  };

  likeKara = () => {
  	var data = kara.flag_upvoted ? {} : dataLikeKara = { 'downvote': 'true' };
  	axios.post('/api/public/playlists/public/karas/' + this.props.idPlaylist + '/vote', data);
  	this.setState({ isLike: !this.state.isLike });
  };

  deleteKara = async () => {
  	var response;
  	try {
  		if (this.props.idPlaylist == -5) {
  			response = await axios.delete('/api/public/favorites', { data: { kid: [this.props.kara.kid] }});
  		} else if (this.props.scope === 'admin') {
  			response = await axios.delete('/api/' + this.props.scope + '/playlists/' + this.props.idPlaylist + '/karas/', { data: { plc_id: String(this.props.kara.playlistcontent_id) } });
  		} else {
  			var currentOrPublic = this.props.playlistInfo.flag_current ? 'current' : 'public';
  			response = await axios.delete('/api/' + this.props.scope + '/playlists/' + currentOrPublic + '/karas/' + this.props.kara.playlistcontent_id);
  		}
  		displayMessage('success', i18next.t(response.data.code));
  	} catch (error) {
  		displayMessage('error', error.response.data.code);
  	}
  };

  playKara = () => {
  	axios.put('/api/' + this.props.scope + '/playlists/' + this.props.idPlaylist + '/karas/' + this.props.kara.playlistcontent_id, { flag_playing: true });
  };

  addKara = async (event, pos) => {
  	var logInfos = store.getLogInfos();
  	var url;
  	var data;
  	var type;
  	if (this.props.idPlaylistTo == -5) {
  		url = '/api/public/favorites';
  		data = { kid: [this.props.kara.kid] };
  	} else if (this.props.scope === 'admin') {
  		if (this.props.idPlaylistTo > 0) {
  			url = '/api/' + this.props.scope + '/playlists/' + this.props.idPlaylistTo + '/karas';
  			if (this.props.idPlaylist > 0) {
  				if (pos) {
  					data = { plc_id: String(this.props.kara.playlistcontent_id) , pos: pos+1};
  				} else {
  					data = { plc_id: String(this.props.kara.playlistcontent_id) };
  				}
  				type = 'PATCH';
  			} else {
  				if (pos) {
  					data = { requestedby: logInfos.username, kid: this.props.kara.kid, pos: pos+1 };
  				} else {
  					data = { requestedby: logInfos.username, kid: this.props.kara.kid };
  				}
  			}
  		} else if (this.props.idPlaylistTo == -2 || this.props.idPlaylistTo == -4) {
  			url = '/api/' + this.props.scope + '/blacklist/criterias';
  			data = { blcriteria_type: 1001, blcriteria_value: this.props.kara.kid };
  		} else if (this.props.idPlaylistTo == -3) {
  			url = '/api/' + this.props.scope + '/whitelist';
  			data = { kid: this.props.kara.kid };
  		}
  	} else {
  		url = `/api/public/karas/${this.props.kara.kid}`;
  		data = { requestedby: logInfos.username, kid: this.props.kara.kid };
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
  		displayMessage('warning', i18next.t(error.response.data.code));
  	}
  };

  transferKara = () => {
  	this.addKara();
  };

  freeKara = () => {
  	if (this.props.scope === 'admin') {
  		axios.put('/api/' + this.props.scope + '/playlists/' + this.props.idPlaylist + '/karas/' + kara.playlistcontent_id, { flag_free: true });
  	}
  };

  checkKara = () => {
  	if (this.props.idPlaylist >= 0) {
  		this.props.checkKara(this.props.kara.playlistcontent_id);
  	} else {
  		this.props.checkKara(this.props.kara.kid);
  	}
  };

  karaFamilies = this.props.kara.families ? this.props.kara.families.map(tag => {
  	return <div key={tag.name} className="tag" title={this.getTagInLocale(tag)}>{tag.short ? tag.short : '?'}</div>;
  }) : [] ;

  karaPlatforms = this.props.kara.platforms ? this.props.kara.platforms.map(tag => {
  	return <div key={tag.name} className="tag" title={this.getTagInLocale(tag)}>{tag.short ? tag.short : '?'}</div>;
  }) : [];

  karaGenres = this.props.kara.genres ? this.props.kara.genres.map(tag => {
  	return <div key={tag.name} className="tag" title={this.getTagInLocale(tag)}>{tag.short ? tag.short : '?'}</div>;
  }) : [];

  karaOrigins = this.props.kara.origins ? this.props.kara.origins.map(tag => {
  	return <div key={tag.name} className="tag" title={this.getTagInLocale(tag)}>{tag.short ? tag.short : '?'}</div>;
  }) : [];

  karaMisc = this.props.kara.misc ? this.props.kara.misc.map(tag => {
  	return <div key={tag.name} className="tag" title={this.getTagInLocale(tag)}>{tag.short ? tag.short : '?'}</div>;
  }) : [];

  karaTitle = buildKaraTitle(this.props.kara);

  render() {
  	var logInfos = store.getLogInfos();
  	var kara = this.props.kara;
  	var scope = this.props.scope;
  	var idPlaylist = this.props.idPlaylist;
  	return (
  		<div className={'list-group-item ' + (kara.flag_playing ? 'currentlyplaying ' : ' ') + (kara.flag_dejavu ? 'dejavu' : '')}
  			style={this.state.addKaraInProgress ? { transform: 'translate(100%)' } : {}}
  			onTouchEnd={this.handleSwipe} onTouchStart={this.handleStart}>
  			{scope === 'public' && kara.username !== logInfos.username && kara.flag_visible === false ?
  				<div className="contentDiv">
  					<div style={{height:'33px'}}>{this.props.config.Playlist.MysterySongs.Labels[this.props.config.Playlist.MysterySongs.Labels.length * Math.random() | 0]}</div>
  				</div> :
  				<React.Fragment>
  					{is_touch_device() && scope !== 'admin' ? null :
  						<div className="actionDiv"> {this.props.idPlaylistTo !== this.props.idPlaylist ?
  							<ActionsButtons idPlaylistTo={this.props.idPlaylistTo} idPlaylist={this.props.idPlaylist}
  								scope={this.props.scope} playlistToAddId={this.props.playlistToAddId}
  								addKara={this.addKara} deleteKara={this.deleteKara} transferKara={this.transferKara} /> : null}

  						{!is_touch_device() && scope === 'admin' && idPlaylist > 0 ? <DragHandle /> : null}

  						</div>
  					}
  					{scope === 'admin' && this.props.idPlaylist !== -2 && this.props.idPlaylist != -4 && this.props.playlistCommands ?
  						<span name="checkboxKara" onClick={this.checkKara}>
  							{kara.checked ? <i className="far fa-check-square"></i>
  								: <i className="far fa-square"></i>}
  						</span> : null}
  					<div className="infoDiv">
  						{scope === 'admin' || !is_touch_device() ? <button title={i18next.t('TOOLTIP_SHOWINFO')} name="infoKara" className="btn btn-sm btn-action"
  							style={this.state.displayedKaraDetail ? { borderColor: '#8aa9af' } : {}} onClick={this.toggleKaraDetail}
  						>
  							<i className="fas fa-info-circle"></i>
  						</button> : null}
  						{scope === 'admin' && idPlaylist > 0 ? <button title={i18next.t('TOOLTIP_PLAYKARA')} className="btn btn-sm btn-action playKara"
  							onClick={this.playKara}><i className="fas fa-play"></i></button> : null}
  						{scope === 'admin' && idPlaylist > 0 && !kara.flag_visible && this.props.playlistInfo 
                && (this.props.playlistInfo.flag_current || this.props.playlistInfo.flag_public) ? (
  								<button
  									type="button"
  									className={'btn btn-sm btn-action btn-primary'}
  								><i className="fas fa-eye-slash"></i></button>
  							) : null}
  						{scope !== 'admin' && this.props.flagPublic ? <button className={'likeKara btn btn-sm btn-action ' + this.state.isLike ? 'currentLike' : ''}
  							onClick={this.likeKara}><i className="fas fa-thumbs-up"></i></button> : null}
  						{scope !== 'admin' && !kara.flag_dejavu && !kara.flag_playing && kara.username == logInfos.username && (idPlaylist == this.props.playlistToAddId) ?
  							<button title={i18next.t('TOOLTIP_DELETEKARA')} className="btn btn-sm btn-action deleteKara"
  								onClick={this.deleteKara}><i className="fas fa-minus"></i></button> : null}
  					</div>
  					<div className="contentDiv" onClick={is_touch_device() ? this.toggleKaraDetail : null}>
  						<div className="disable-select">
  							{this.karaTitle}
  							{kara.upvotes ?
  								<div className="tag likeCount" title={i18next.t('TOOLTIP_UPVOTE')} onClick={this.freeKara}>
  									{kara.upvotes}<i className="fas fa-heart"></i>
  								</div> : null
  							}
  						</div>
  						{is_touch_device() ? null :
						<div className="disable-select">
  							{this.karaFamilies}
  							{this.karaPlatforms}
  							{this.karaGenres}
  							{this.karaOrigins}
  							{this.karaMisc}
						</div>
						}
  					</div>
  				</React.Fragment>
  			}
  		</div>);
  }
}

export default KaraLine;
