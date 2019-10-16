import React, { Component } from "react";
import i18next from 'i18next';
import PlaylistHeader from "./PlaylistHeader";
import KaraDetail from "./KaraDetail";
import KaraLine from "./KaraLine";
import axios from "axios";
import {readCookie, createCookie, secondsTimeSpanToHMS, is_touch_device, getSocket, displayMessage, callModal} from "../tools";
import BlacklistCriterias from "./BlacklistCriterias";
import {SortableContainer, SortableElement} from 'react-sortable-hoc';
import store from "../../store";

require('./Playlist.scss');

const maxBeforeUpdate = 100;

class Playlist extends Component {
  constructor(props) {
    super(props);
    this.state = {
      searchValue: undefined,
      searchCriteria: undefined,
      playlistCommands: false,
      getPlaylistInProgress: false,
      searchType: undefined
    };
    this.playlistRef = React.createRef();
  }

  async componentDidMount() {
    if (axios.defaults.headers.common['authorization']) {
      this.getPlaylistList();
      await this.getPlaylistToAddId();
      await this.getIdPlaylist();
      this.getPlaylist();
    }
    getSocket().on("playingUpdated", this.playingUpdate);
    getSocket().on("playlistsUpdated", this.getPlaylistList);
    getSocket().on("whitelistUpdated", () => {
      if (this.state.idPlaylist === -3) this.getPlaylist();
    });
    getSocket().on("blacklistUpdated", () => {
      if (this.state.idPlaylist === -2 || this.state.idPlaylist === -4)
        this.getPlaylist();
    });
    getSocket().on("favoritesUpdated", () => {
      if (this.state.idPlaylist === -5) this.getPlaylist();
    });
    getSocket().on("playlistContentsUpdated", this.playlistContentsUpdated);
    getSocket().on("playlistInfoUpdated", idPlaylist => {
      if (this.state.idPlaylist === Number(idPlaylist)) this.getPlaylistInfo();
    });
    getSocket().on('quotaAvailableUpdated', this.updateQuotaAvailable);
    store.addChangeListener('playlistContentsUpdated', this.playlistContentsUpdated);
  }

  componentWillUnmount() {
    store.removeChangeListener('playlistContentsUpdated', this.playlistContentsUpdated);
  }

  playlistContentsUpdated = idPlaylist => {
    if (this.state.idPlaylist === Number(idPlaylist)) this.getPlaylist();
  };

  updateQuotaAvailable = data => {
    if (this.props.logInfos.username === data.username) {
      var quotaString = '';
      if (data.quotaType == 1) {
        quotaString = data.quotaLeft;
      } else if (data.quotaType == 2) {
        quotaString = secondsTimeSpanToHMS(data.quotaLeft, 'ms');
      }
      if (data.quotaLeft == -1) {
        quotaString = <i className="fas fa-infinity"></i>;
      }
      this.setState({ quotaString: quotaString })
    }
  };

  getPlaylistList = async () => {
    const response = await axios.get(
      "/api/" + this.props.scope + "/playlists/"
    );
    const kmStats = await axios.get("/api/public/stats");
    var playlistList = response.data.data;
    if (
      this.props.scope === "admin" ||
      this.props.config.Frontend.Permissions.AllowViewBlacklist
    )
      playlistList.push({
        playlist_id: -2,
        name: "Blacklist"
      });
    if (
      this.props.scope === "admin" ||
      this.props.config.Frontend.Permissions.AllowViewBlacklistCriterias
    )
      playlistList.push({
        playlist_id: -4,
        name: "Blacklist criterias"
      });
    if (
      this.props.scope === "admin" ||
      this.props.config.Frontend.Permissions.AllowViewWhitelist
    )
      playlistList.push({
        playlist_id: -3,
        name: "Whitelist"
      });
    if (this.props.scope === "admin")
      playlistList.push({
        playlist_id: -5,
        name: "Favs"
      });
    if (this.props.scope === "admin")
      playlistList.push({
        playlist_id: -1,
        name: "Karas",
        karacount: kmStats.data.data.karas
      });
    this.setState({ playlistList: playlistList });
  };

  async getPlaylistToAddId() {
    var playlistToAdd = this.props.config.Karaoke.Private
      ? "current"
      : "public";
    const response = await axios.get("/api/public/playlists/" + playlistToAdd);
    this.setState({ playlistToAddId: response.data.data.playlist_id });
  }

  getIdPlaylist = () => {
    var value;
    if (this.props.scope === "public") {
      value =
        this.props.side === 1 && this.props.mode !== 1
          ? -1
          : this.state.playlistToAddId;
    } else {
      var plVal1Cookie = readCookie("mugenPlVal1");
      var plVal2Cookie = readCookie("mugenPlVal2");
      if (plVal1Cookie == plVal2Cookie) {
        plVal2Cookie = null;
        plVal1Cookie = null;
      }
      plVal2Cookie = Number(plVal2Cookie);
      plVal1Cookie = Number(plVal1Cookie);

      if (plVal1Cookie === NaN) plVal1Cookie = null;
      if (plVal2Cookie === NaN) plVal2Cookie = null;

      if (this.props.side === 1) {
        value = plVal1Cookie ? plVal1Cookie : -1;
      } else {
        value = plVal2Cookie ? plVal2Cookie : this.state.playlistToAddId;
      }
    }
    this.setState({ idPlaylist: value });
    this.props.majIdsPlaylist(this.props.side, value);
  };

  changeIdPlaylist = idPlaylist => {
    createCookie("mugenPlVal" + this.props.side, idPlaylist, 365);
    this.setState({ idPlaylist: Number(idPlaylist),data:undefined }, this.getPlaylist);
    this.props.majIdsPlaylist(this.props.side, idPlaylist);
  };

  editNamePlaylist = () => {
    callModal('prompt', i18next.t('CL_RENAME_PLAYLIST', { playlist: this.state.playlistInfo.name }), '', newName => {
      axios.put('/api/' + this.props.scope + '/playlists/' + this.state.idPlaylist, { name: newName, flag_visible: this.state.playlistInfo.flag_public });
      var playlistInfo = this.state.playlistInfo;
      playlistInfo.name = newName;
      this.setState({ playlistInfo: playlistInfo });
    });
  };

  getPlaylistInfo = async () => {
    if (!this.state.getPlaylistInProgress) {
      var response = await axios.get(
        "/api/" + this.props.scope + "/playlists/" + this.state.idPlaylist
      );
      this.setState({ playlistInfo: response.data.data });
    }
  };

  getPlaylistUrl = idPlaylistParam => {
    var idPlaylist = idPlaylistParam ? idPlaylistParam : this.state.idPlaylist;
    var url;
    if (idPlaylist >= 0) {
      url =
        "/api/" +
        this.props.scope +
        "/playlists/" +
        idPlaylist +
        "/karas";
    } else if (idPlaylist === -1) {
      url = "/api/public/karas";
    } else if (idPlaylist === -2) {
      url = "/api/" + this.props.scope + "/blacklist";
    } else if (idPlaylist === -3) {
      url = "/api/" + this.props.scope + "/whitelist";
    } else if (idPlaylist === -4) {
      url = "/api/" + this.props.scope + "/blacklist/criterias";
    } else if (idPlaylist === -5) {
      url = "/api/public/favorites";
    }
    return url;
  };

  getPlaylist = async (searchType, scrollInProgress) => {
    var data = {getPlaylistInProgress: true};
    if (searchType) {
      data.searchType = searchType;
    } else if (!scrollInProgress) {
      data.searchType = undefined;
    }
    var url = this.getPlaylistUrl();
    if (this.state.idPlaylist >= 0) {
      this.getPlaylistInfo();
    }
    await this.setState(data);

    url +=
      "?filter=" +
      store.getFilterValue(this.props.side) + 
      "&from=" +
      (this.state.data && this.state.data.infos && this.state.data.infos.from > 0 && store.getFilterValue(this.props.side) === '' ? this.state.data.infos.from : 0) +
      "&size=" + maxBeforeUpdate;

      if(this.state.searchType) {
        this.state.searchCriteria = this.state.searchCriteria ?
          {
            'year' : 'y',
            'serie' : 's',
            'tag' : 't'
          }[this.state.searchCriteria]
          : '';
  
          url += '&searchType=' + this.state.searchType
          + ((this.state.searchCriteria && this.state.searchValue) ? ('&searchValue=' + this.state.searchCriteria + ':' + this.state.searchValue) : '');
      }
    if (scrollInProgress) {
      this.playlistRef.current.scrollTo(0, 1);
    }
    var response = await axios.get(url);
    var karas = response.data.data;
    if (this.state.idPlaylist > 0) {
      karas.content.forEach(kara => {
        if (kara.flag_playing) {
          store.setPosPlaying(kara.pos);
          if (this.props.config.Frontend.Mode === 1 && this.props.scope === "public") {
            this.props.updateKidPlaying(kara.kid);
          }
        }
      });
    }
    this.setState({ data: karas, getPlaylistInProgress: false });
  };

  playingUpdate = data => {
    if (this.state.idPlaylist === data.playlist_id) {
      var playlistData = this.state.data;
      playlistData.content.forEach(kara => {
        if (kara.flag_playing) {
          kara.flag_playing = false;
          kara.flag_dejavu = true;
        } else if (kara.playlistcontent_id === data.plc_id) {
          kara.flag_playing = true;
          store.setPosPlaying(kara.pos);
          if (this.props.config.Frontend.Mode === 1 && this.props.scope === "public") {
            this.props.updateKidPlaying(kara.kid);
          }
        }
      });
      this.setState({ data: playlistData });
    }
  };

  getPlInfosElement = () => {
    var plInfos = "";
    if (this.state.idPlaylist && this.state.data) {
      plInfos =
        this.state.idPlaylist != -4
          ? this.state.data.infos.from + "-" + this.state.data.infos.to
          : "";
      plInfos +=
        (this.state.idPlaylist != -4
          ? " / " +
          this.state.data.infos.count +
          (!is_touch_device() ? " karas" : "")
          : "") +
        (this.state.idPlaylist > -1 && this.state.playlistInfo
          ? " ~ dur. " +
          secondsTimeSpanToHMS(this.state.playlistInfo.duration, "hm") +
          " / re. " +
          secondsTimeSpanToHMS(this.state.playlistInfo.time_left, "hm")
          : "");
    }
    return plInfos;
  };

  outerHeight(el) {
    var height = el.offsetHeight;
    var style = getComputedStyle(el);

    height += parseInt(style.marginTop) + parseInt(style.marginBottom);
    return height;
  }

  handleScroll = () => {
    var container_height = document.querySelector('#playlistContainer'+this.props.side).offsetHeight;
    var scroll_by = document.querySelector('#playlistContainer'+this.props.side).scrollTop;
    var content_height = this.outerHeight(document.querySelector('#playlistContainer'+this.props.side+ ' > ul'))
    var percent = 100 * scroll_by / (content_height - container_height)

    if (this.state.data && this.state.data.infos 
      && this.state.data.infos.count > maxBeforeUpdate 
      && (percent === 100 || percent === 0)) {
      var data = this.state.data;
      data.infos.from = percent === 100 ? data.infos.from + maxBeforeUpdate : data.infos.from - maxBeforeUpdate;
      data.infos.to = percent === 100 ? data.infos.to + maxBeforeUpdate : data.infos.to - maxBeforeUpdate;
      if (data.infos.from >= 0) {
        this.setState({data: data }, () => this.getPlaylist(undefined, true));
      }
    }
  };

  scrollToBottom = () => {
    var container_height = document.querySelector('.playlistContainer').offsetHeight;
    var content_height = this.outerHeight(document.querySelector('.playlistContainer > ul'))
    this.playlistRef.current.scrollTo(0, content_height - container_height - 1);
  };

  scrollToPlaying = () => {
    let kid;
    this.state.data.content.forEach(element => { if (element.flag_playing) kid = element.kid });
    if(!kid)
      return;

    let target = this.playlistRef.current.querySelector('.playlist-draggable-item[data-kid="'+kid+'"]')
    if(!target)
      return;

    target.scrollIntoView({ behavior: "smooth" });
  };

  togglePlaylistCommands = () => {
    this.setState({ playlistCommands: !this.state.playlistCommands });
  };

  selectAllKaras = () => {
    var data = this.state.data;
    this.state.data.content.forEach(kara => kara.checked = !kara.checked);
    this.setState({ data: data });
  };

  checkKara = id => {
    var data = this.state.data;
    data.content.forEach(kara => {
      if (this.state.idPlaylist >= 0) {
        if (kara.playlistcontent_id === id) {
          kara.checked = !kara.checked
        }
      } else if (kara.kid === id) {
        kara.checked = !kara.checked
      }
    });
    this.setState({ data: data });
  };

  addAllKaras = async () => {
    var response = await axios.get(`${this.getPlaylistUrl()}?filter=${store.getFilterValue(this.props.side)}`);
    var karaList = response.data.data.content.map(a => a.kid).join();
    displayMessage('info', i18next.t('PL_MULTIPLE_ADDED', {count: response.data.data.content.length}));
    axios.post(this.getPlaylistUrl(this.props.idPlaylistTo), { kid: karaList, requestedby: this.props.logInfos.username });
  };

  addCheckedKaras = async () => {
    var idKara = this.state.data.content.filter(a => a.checked).map(a => a.kid).join();
    var idKaraPlaylist = this.state.data.content.filter(a => a.checked).map(a => String(a.playlistcontent_id)).join();
    var url;
    var data;
    var type;

    if (this.props.idPlaylistTo > 0) {
      url = '/api/' + this.props.scope + '/playlists/' + this.props.idPlaylistTo + '/karas';
      if (this.state.idPlaylist > 0) {
        data = { plc_id: idKaraPlaylist };
        type = 'PATCH';
      } else {
        data = { requestedby: this.props.logInfos.username, kid: idKara };
      }
    } else if (this.props.idPlaylistTo == -2 || this.props.idPlaylistTo == -4) {
      url = '/api/' + this.props.scope + '/blacklist/criterias';
      data = { blcriteria_type: 1001, blcriteria_value: idKara };
    } else if (this.props.idPlaylistTo == -3) {
      url = '/api/' + this.props.scope + '/whitelist';
      data = { kid: idKara };
    } else if (this.props.idPlaylistTo == -5) {
      url = '/api/public/favorites';
      data = { kid: this.state.data.content.filter(a => a.checked).map(a => a.kid) };
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

  transferCheckedKaras = () => {
    this.addCheckedKaras();
    this.deleteCheckedKaras();
  };

  deleteCheckedKaras = async () => {
    var url;
    var data;
    if (this.state.idPlaylist > 0) {
      var idKaraPlaylist = this.state.data.content.filter(a => a.checked).map(a => String(a.playlistcontent_id)).join();
      url = '/api/' + this.props.scope + '/playlists/' + this.state.idPlaylist + '/karas/';
      data = { plc_id: idKaraPlaylist };
    } else if (this.state.idPlaylist == -3) {
      var idKara = this.state.data.content.filter(a => a.checked).map(a => a.kid).join();
      url = '/api/ ' + this.props.scope + '/whitelist';
      data = { kid: idKara }
    } else if (this.state.idPlaylist == -5) {
      url = '/api/public/favorites';
      data = { kid: this.state.data.content.filter(a => a.checked).map(a => a.kid) };
    }
    if (url) {
      try {
        var response = await axios.delete(url, {data:data});
        displayMessage('success', i18next.t(response.data.code));
      } catch (error) {
        if (error.response.data.code) {
          displayMessage('warning', i18next.t(error.response.data.code));
        } else {
          displayMessage('warning', JSON.stringify(error.response.data));
        }
      }
    }
  };

  karaSuggestion() {
    callModal('prompt', i18next.t('KARA_SUGGESTION_NAME'), '', function (text) {
      axios.post('/api/public/karas/suggest', { karaName: text }).then(response => {
        setTimeout(() => {
          displayMessage('info', <div><label>{i18next.t('KARA_SUGGESTION_INFO')}</label> <br/> 
            {i18next.t('KARA_SUGGESTION_LINK', response.data.data.issueURL, 'console')}</div>, '30000');
        }, 200);
      })
    }, store.getFilterValue(this.props.side));
  }

  onChangeTags = (type, value) => {
    var searchCriteria = (type === 'serie' || type === 'year') ? type : 'tag';
    var stringValue = searchCriteria === 'tag' ? `${value}~${type}` : value;
    this.setState({searchCriteria: searchCriteria, searchValue: stringValue}, () => this.getPlaylist("search"));
  };

  onSortEnd = ({oldIndex, newIndex}) => {
    if(oldIndex!=newIndex)
    {
      // extract playlistcontent_id based on sorter index
      let playlistcontent_id = this.state.data.content[oldIndex].playlistcontent_id;

      // fix index to match api behaviour
      let apiIndex = newIndex+1;
      if(newIndex > oldIndex)
        apiIndex = apiIndex+1;

      // final to api to save order change
      axios.put('/api/' + this.props.scope + '/playlists/' + this.state.idPlaylist + '/karas/' + playlistcontent_id, { pos: apiIndex });

      // internal reordering (avoid waiting the api update)
      let data = this.state.data;
      let t = data.content[oldIndex];
      data.content[oldIndex] = data.content[newIndex];
      data.content[newIndex] = t;
      this.setState({data:data});
    }
  }

  render() {

    const SortableItem = SortableElement(({value,index}) => {
      let kara = value;
      return <li className={!is_touch_device() && this.props.scope === 'admin' ? "playlist-draggable-item" : ""} data-kid={kara.kid}>
          <KaraLine
            key={kara.kid}
            kara={kara}
            scope={this.props.scope}
            idPlaylist={this.state.idPlaylist}
            playlistInfo={this.state.playlistInfo}
            i18nTag={this.state.data.i18n}
            navigatorLanguage={this.props.navigatorLanguage}
            playlistToAddId={this.state.playlistToAddId}
            side={this.props.side}
            config={this.props.config}
            logInfos={this.props.logInfos}
            playlistCommands={this.state.playlistCommands}
            idPlaylistTo={this.props.idPlaylistTo}
            checkKara={this.checkKara}
            showVideo={this.props.showVideo}
          />
      </li>
    });

    const SortableList = SortableContainer(({items}) => {
      return (
        <div>
          {this.state.data.content.map((value, index) => (
            <SortableItem key={`item-${index}`} index={index} value={value} />
          ))}
        </div>
      );
    });

    return this.props.scope === "public" &&
      this.props.side === 1 && this.props.config &&
      this.props.config.Frontend.Mode === 1 ? (
        <div className="playlist--wrapper">
          <div className="playlistContainer">
            <ul id="playlist1" className="list-group" side="1">
              <li className="list-group-item">
                <KaraDetail kid={this.props.kidPlaying} mode="karaCard" scope={this.props.scope} 
                navigatorLanguage={this.props.navigatorLanguage} logInfos={this.props.logInfos} />
              </li>
            </ul>
          </div>
        </div>
      ) : (
        <div className="playlist--wrapper">
          <PlaylistHeader
            side={this.props.side}
            scope={this.props.scope}
            playlistList={this.state.playlistList}
            playlistToAddId={this.state.playlistToAddId}
            idPlaylist={this.state.idPlaylist}
            changeIdPlaylist={this.changeIdPlaylist}
            playlistInfo={this.state.playlistInfo}
            getPlaylistUrl={this.getPlaylistUrl}
            togglePlaylistCommands={this.togglePlaylistCommands}
            playlistCommands={this.state.playlistCommands}
            editNamePlaylist={this.editNamePlaylist}
            logInfos={this.props.logInfos}
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
          />
          <div
            id={"playlistContainer" + this.props.side}
            className="playlistContainer"
            onScroll={this.handleScroll}
            ref={this.playlistRef}
          >
            <ul id={"playlist" + this.props.side} className="list-group">
              {
                this.state.idPlaylist !== -4 && this.state.data
                  ? (!is_touch_device() && this.props.scope === 'admin' ?
                  <SortableList 
                      lockAxis="y"
                      pressDelay={is_touch_device() ? 150 : 0}
                      helperClass="playlist-dragged-item"
                      useDragHandle={!is_touch_device()}
                      onSortEnd={this.onSortEnd}
                      /> : this.state.data.content.map(kara => {
                        return (
                          <li key={Math.random()} data-kid={kara.kid}>
                            <KaraLine
                              key={kara.kid}
                              kara={kara}
                              scope={this.props.scope}
                              idPlaylist={this.state.idPlaylist}
                              playlistInfo={this.state.playlistInfo}
                              i18nTag={this.state.data.i18n}
                              navigatorLanguage={this.props.navigatorLanguage}
                              playlistToAddId={this.state.playlistToAddId}
                              side={this.props.side}
                              config={this.props.config}
                              logInfos={this.props.logInfos}
                              playlistCommands={this.state.playlistCommands}
                              idPlaylistTo={this.props.idPlaylistTo}
                              checkKara={this.checkKara}
                              showVideo={this.props.showVideo}
                            />
                          </li>)
                      })
                  ) : null
              }
              {this.state.idPlaylist !== -4 ?
                <React.Fragment>
                  {this.props.config &&
                    this.props.config.Gitlab.Enabled &&
                    this.state.idPlaylist === -1 &&
                    this.state.data && this.state.data.infos && this.state.data.infos.count === this.state.data.infos.from + maxBeforeUpdate ? (
                      <li className="list-group-item karaSuggestion" onClick={this.karaSuggestion}>
                        {i18next.t("KARA_SUGGESTION_MAIL")}
                      </li>
                    ) : null}
                </React.Fragment> :
                (this.state.data ? 
                <BlacklistCriterias data={this.state.data} scope={this.props.scope} tags={this.props.tags} /> : null
                )
              }
            </ul>
          </div>
          <div
            className="plFooter">
            <div className="plBrowse">
              <button
                type="button"
                title={i18next.t("GOTO_TOP")}
                className="btn btn-sm btn-action"
                onClick={() => this.playlistRef.current.scrollTo(0, 5)}
              >
                <i className="fas fa-chevron-up"></i>
              </button>
              {this.state.playlistInfo && this.state.playlistInfo.flag_current ?
                <button
                  type="button"
                  title={i18next.t("GOTO_PLAYING")}
                  className="btn btn-sm btn-action"
                  onClick={this.scrollToPlaying}
                  action="goTo"
                  value="playing"
                >
                  <i className="fas fa-play"></i>
                </button> : null
              }
              <button
                type="button"
                title={i18next.t("GOTO_BOTTOM")}
                className="btn btn-sm btn-action"
                onClick={this.scrollToBottom}
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
