import React, { Component } from "react";
import i18next from 'i18next';
import { is_touch_device } from "../tools";
import KaraDetail from "./KaraDetail";
import axios from "axios";
import ActionsButtons from "./ActionsButtons";
import { buildKaraTitle, displayMessage } from '../tools';

import { sortableHandle } from 'react-sortable-hoc';

const DragHandle = sortableHandle(() => <span><i className="glyphicon glyphicon-option-vertical"></i></span>);

class KaraLine extends Component {
  constructor(props) {
    super(props);
    this.state = {
      karaDetailState: false,
      isFavorite: this.props.kara.flag_favorites,
      isLike: this.props.kara.flag_upvoted,
      startSwipeX: 0,
      addKaraInProgress: false
    };
    this.toggleKaraDetail = this.toggleKaraDetail.bind(this);
    this.makeFavorite = this.makeFavorite.bind(this);
    this.getTagInLocale = this.getTagInLocale.bind(this);
    this.handleSwipe = this.handleSwipe.bind(this);
    this.handleStart = this.handleStart.bind(this);
    this.playKara = this.playKara.bind(this);
    this.deleteKara = this.deleteKara.bind(this);
    this.likeKara = this.likeKara.bind(this);
    this.addKara = this.addKara.bind(this);
    this.transferKara = this.transferKara.bind(this);
    this.freeKara = this.freeKara.bind(this);
    this.checkKara = this.checkKara.bind(this);
  }

  handleSwipe(e) {
    if (this.props.side === 1 && this.props.config.Frontend.Mode === 2
      && e.changedTouches[0].clientX > this.state.startSwipeX + 100) {
      this.setState({ addKaraInProgress: true });
      this.addKara();
      setTimeout(() => this.setState({ addKaraInProgress: false }), 800);
    }
  }

  handleStart(e) {
    this.setState({ startSwipeX: e.changedTouches[0].clientX });
  }

  toggleKaraDetail() {
    this.setState({ karaDetailState: !this.state.karaDetailState });
  }

  makeFavorite() {
    this.state.isFavorite ?
      axios.delete('/api/public/favorites', { data: { 'kid': this.props.kara.kid } }) :
      axios.get('/api/public/favorites', { 'kid': this.props.kara.kid })
    this.setState({ isFavorite: !this.state.isFavorite })
  };

  getTagInLocale(tag) {
    if (this.props.i18nTag && this.props.i18nTag[tag.tid]) {
      let i18nTag = this.props.i18nTag[tag.tid];
      return i18nTag[this.props.navigatorLanguage] ? i18nTag[this.props.navigatorLanguage] : i18nTag['eng'];
    } else {
      return tag.name;
    }
  }

  likeKara() {
    var data = kara.flag_upvoted ? {} : dataLikeKara = { 'downvote': 'true' };
    axios.post('/api/public/playlists/public/karas/' + this.props.idPlaylist + '/vote', data);
    this.setState({ isLike: !this.state.isLike })
  }

  async deleteKara() {
    var response;
    try {
      if (this.props.scope === 'admin') {
        response = await axios.delete('/api/' + this.props.scope + '/playlists/' + this.props.idPlaylist + '/karas/', { data: { plc_id: String(this.props.kara.playlistcontent_id) } });
      } else {
        var currentOrPublic = this.props.playlistInfo.flag_current ? 'current' : 'public';
        response = await axios.delete('/api/' + this.props.scope + '/playlists/' + currentOrPublic + '/karas/' + this.props.kara.playlistcontent_id);
      }
      displayMessage('success', 'Success', i18next.t(response.data.code));
    } catch (error) {
      displayMessage('danger', 'Fail', error.response.data.code);
    }
  }

  playKara() {
    axios.put('/api/' + this.props.scope + '/playlists/' + this.props.idPlaylist + '/karas/' + this.props.kara.playlistcontent_id, { flag_playing: true });
  }

  async addKara() {
    var url;
    var data;
    var type;
    if (this.props.scope === 'admin') {
      if (this.props.idPlaylistTo > 0) {
        url = '/api/' + this.props.scope + '/playlists/' + this.props.idPlaylistTo + '/karas';
        if (this.props.idPlaylist > 0) {
          data = { plc_id: this.props.kara.playlistcontent_id };
          type = 'PATCH';
        } else {
          data = { requestedby: this.props.logInfos.username, kid: this.props.kara.kid };
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
      data = { requestedby: this.props.logInfos.username, kid: this.props.kara.kid };
    }
    try {
      var response;
      if (type === 'PATCH') {
        response = await axios.patch(url, data);
      } else {
        response = await axios.post(url, data);
      }
      displayMessage('success', 'Success', i18next.t(response.data.code));
    } catch (error) {
      displayMessage('warning', 'Warning', i18next.t(error.response.data.code));
    }
  }

  transferKara() {
    this.addKara();
  }

  freeKara() {
    if (this.props.scope === 'admin') {
      axios.put('/api/' + this.props.scope + '/playlists/' + this.props.idPlaylist + '/karas/' + kara.playlistcontent_id, { flag_free: true });
    }
  }

  checkKara() {
    if (this.props.idPlaylist >= 0) {
      this.props.checkKara(this.props.kara.playlistcontent_id);
    } else {
      this.props.checkKara(this.props.kara.kid);
    }
  }

  render() {
    var kara = this.props.kara;
    var scope = this.props.scope;
    var idPlaylist = this.props.idPlaylist;
    return (
      <div className={"list-group-item " + (kara.flag_playing ? 'currentlyplaying ' : ' ') + (kara.flag_dejavu ? 'dejavu' : '')}
        style={this.state.addKaraInProgress ? { transform: "translate(100%)" } : {}}
        onTouchEnd={this.handleSwipe} onTouchStart={this.handleStart}>
        {scope === 'public' && kara.username !== this.props.logInfos.username && kara.flag_visible === false ?
          <div className="contentDiv">
            {this.props.config.Playlist.MysterySongs.Labels[this.props.config.Playlist.MysterySongs.Labels.length * Math.random() | 0]}
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
                style={this.state.karaDetailState ? { borderColor: '#8aa9af' } : {}} onClick={this.toggleKaraDetail}
              >
                <i className="fas fa-info-circle"></i>
              </button> : null}
              {scope === 'public' && this.props.logInfos.role !== 'guest' ?
                <button title={i18next.t('TOOLTIP_FAV')} onClick={this.makeFavorite}
                  className={"makeFav btn-sm btn btn-action "
                    + (is_touch_device() ? 'mobile' : '')
                    + (kara.flag_favorites || idPlaylist === -5 ? ' currentFav' : '')}>
                  <i className="fas fa-star"></i>
                </button> : null}
              {scope === 'admin' && idPlaylist > 0 ? <button title={i18next.t('TOOLTIP_PLAYKARA')} className="btn btn-sm btn-action playKara"
                onClick={this.playKara}><i className="fas fa-play"></i></button> : null}
              {scope !== 'admin' && this.props.flagPublic ? <button className={"likeKara btn btn-sm btn-action " + this.state.isLike ? 'currentLike' : ''}
                onClick={this.likeKara}><i className="fas fa-thumbs-up"></i></button> : null}
              {scope !== 'admin' && kara.username == this.props.logInfos.username && (idPlaylist == this.props.playlistToAddId) ?
                <button title={i18next.t('TOOLTIP_DELETEKARA')} className="btn btn-sm btn-action deleteKara"
                  onClick={this.deleteKara}><i className="fas fa-minus"></i></button> : null}
            </div>
            <div className="contentDiv" onClick={is_touch_device() ? this.toggleKaraDetail : null}>
              <div>
                {buildKaraTitle(kara)}
                {kara.families && kara.families.map(tag => {
                  return <div key={tag.name} className="tag" title={this.getTagInLocale(tag)}>{tag.short ? tag.short : '?'}</div>
                })}
                {kara.platforms && kara.platforms.map(tag => {
                  return <div key={tag.name} className="tag" title={this.getTagInLocale(tag)}>{tag.short ? tag.short : '?'}</div>
                })}
                {kara.genres && kara.genres.map(tag => {
                  return <div key={tag.name} className="tag" title={this.getTagInLocale(tag)}>{tag.short ? tag.short : '?'}</div>
                })}
                {kara.origins && kara.origins.map(tag => {
                  return <div key={tag.name} className="tag" title={this.getTagInLocale(tag)}>{tag.short ? tag.short : '?'}</div>
                })}
                {kara.misc && kara.misc.map(tag => {
                  return <div key={tag.name} className="tag" title={this.getTagInLocale(tag)}>{tag.short ? tag.short : '?'}</div>
                })}
                {kara.upvotes ?
                  <div className="tag likeCount" title={i18next.t('TOOLTIP_UPVOTE')} onClick={this.freeKara}>
                    {kara.upvotes}<i className="glyphicon glyphicon-heart"></i>
                  </div> : null
                }
              </div>
            </div>
            {this.state.karaDetailState ?
              <KaraDetail kara={this.props.kara} scope={this.props.scope} idPlaylist={this.props.idPlaylist} mode='list'
                publicOuCurrent={this.props.playlistInfo && (this.props.playlistInfo.flag_current || this.props.playlistInfo.flag_public)}
                toggleKaraDetail={this.toggleKaraDetail} karaDetailState={this.state.karaDetailState}
                makeFavorite={this.makeFavorite} isFavorite={this.state.isFavorite}
                getTagInLocale={this.getTagInLocale} logInfos={this.props.logInfos} freeKara={this.freeKara}></KaraDetail> : null
            }
          </React.Fragment>
        }
      </div>)
  }
}

export default KaraLine;