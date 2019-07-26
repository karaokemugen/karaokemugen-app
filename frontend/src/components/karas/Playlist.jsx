import React, { Component } from "react";
import { withTranslation } from "react-i18next";
import PlaylistHeader from "./PlaylistHeader";
import KaraDetail from "./KaraDetail";
import KaraLine from "./KaraLine";
import axios from "axios";
import {
  readCookie,
  createCookie,
  secondsTimeSpanToHMS,
  is_touch_device
} from "../toolsReact";

class Playlist extends Component {
  constructor(props) {
    super(props);
    this.state = {
      searchValue: "",
      playlistCommands: false
    };
    this.getIdPlaylist = this.getIdPlaylist.bind(this);
    this.changeIdPlaylist = this.changeIdPlaylist.bind(this);
    this.getPlaylist = this.getPlaylist.bind(this);
    this.playingUpdate = this.playingUpdate.bind(this);
    this.changeSearchValue = this.changeSearchValue.bind(this);
    this.getPlaylistInfo = this.getPlaylistInfo.bind(this);
    this.getPlInfosElement = this.getPlInfosElement.bind(this);
    this.handleScroll = this.handleScroll.bind(this);
    this.scrollToBottom = this.scrollToBottom.bind(this);
    this.scrollToPlaying = this.scrollToPlaying.bind(this);
    this.updateQuotaAvailable = this.updateQuotaAvailable.bind(this);
    this.togglePlaylistCommands = this.togglePlaylistCommands.bind(this);
    this.playlistRef = React.createRef();
  }

  async componentDidMount() {
    await this.getPlaylistToAddId();
    await this.getPlaylistList();
    await this.getIdPlaylist();
    await this.getPlaylist();
    window.socket.on("playingUpdated", this.playingUpdate);
    window.socket.on("playlistsUpdated", this.getPlaylistList);
    window.socket.on("whitelistUpdated", () => {
      if (this.state.idPlaylist === -3) this.getPlaylist();
    });
    window.socket.on("blacklistUpdated", () => {
      if (this.state.idPlaylist === -2 || this.state.idPlaylist === -4)
        this.getPlaylist();
    });
    window.socket.on("favoritesUpdated", () => {
      if (this.state.idPlaylist === -5) this.getPlaylist();
    });
    window.socket.on("playlistContentsUpdated", idPlaylist => {
      if (this.state.idPlaylist === Number(idPlaylist)) this.getPlaylist();
    });
    window.socket.on("playlistInfoUpdated", idPlaylist => {
      if (this.state.idPlaylist === Number(idPlaylist)) this.getPlaylistInfo();
    });
    window.socket.on('quotaAvailableUpdated', this.updateQuotaAvailable);
  }


  updateQuotaAvailable(data) {
    if (this.props.logInfos.username === data.username) {
      var quotaString = '';
      if (data.quotaType == 1) {
        quotaString = data.quotaLeft;
      } else if (data.quotaType == 2) {
        quotaString = secondsTimeSpanToHMS(data.quotaLeft, 'ms');
      }
      if (data.quotaLeft == -1) {
        quotaString = '\u221e';
      }
      this.setState({quotaString: quotaString})
    }
  }

  async getPlaylistList() {
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
        name: "Blacklist",
        flag_visible: true
      });
    if (
      this.props.scope === "admin" ||
      this.props.config.Frontend.Permissions.AllowViewBlacklistCriterias
    )
      playlistList.push({
        playlist_id: -4,
        name: "Blacklist criterias",
        flag_visible: true
      });
    if (
      this.props.scope === "admin" ||
      this.props.config.Frontend.Permissions.AllowViewWhitelist
    )
      playlistList.push({
        playlist_id: -3,
        name: "Whitelist",
        flag_visible: true
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
  }

  async getPlaylistToAddId() {
    var playlistToAdd = this.props.config.Karaoke.Private
      ? "current"
      : "public";
    const response = await axios.get("/api/public/playlists/" + playlistToAdd);
    this.setState({ playlistToAddId: response.data.data.playlist_id });
  }

  getIdPlaylist() {
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
  }

  changeIdPlaylist(e) {
    createCookie("mugenPlVal" + this.props.side, e.target.value, 365);
    this.setState({ idPlaylist: Number(e.target.value) }, this.getPlaylist);
  }

  changeSearchValue(e) {
    this.setState({ searchValue: e.target.value });
    clearTimeout(timer);
    timer = setTimeout(() => {
      this.getPlaylist();
    }, 200);
  }

  async getPlaylistInfo() {
    var response = await axios.get(
      "/api/" + this.props.scope + "/playlists/" + this.state.idPlaylist
    );
    this.setState({ playlistInfo: response.data.data });
  }

  getPlaylistUrl() {
    var url;
    if (this.state.idPlaylist >= 0) {
      url =
        "/api/" +
        this.props.scope +
        "/playlists/" +
        this.state.idPlaylist +
        "/karas";
    } else if (this.state.idPlaylist === -1) {
      url = "/api/public/karas";
    } else if (this.state.idPlaylist === -2) {
      url = "/api/" + this.props.scope + "/blacklist";
    } else if (this.state.idPlaylist === -3) {
      url = "/api/" + this.props.scope + "/whitelist";
    } else if (this.state.idPlaylist === -4) {
      url = "/api/" + this.props.scope + "/blacklist/criterias";
    } else if (this.state.idPlaylist === -5) {
      url = "/api/public/favorites";
    } else if (this.state.idPlaylist === -6) {
      url = "/api/public/karas/recent";
    }
    return url;
  }

  async getPlaylist() {
    var url = this.getPlaylistUrl();
    if (this.state.idPlaylist >= 0) {
      this.getPlaylistInfo();
    }
    url =
      url +
      "?filter=" +
      this.state.searchValue +
      "&from=" +
      (this.state.data && this.state.data.infos.from > 0 ? this.state.data.infos.from : 0) +
      "&size=400";
    var response = await axios.get(url);
    this.playlistRef.current.scrollTo(0, 1);
    var karas = response.data.data;
    karas.content = karas.content.map(element => {
      element.karaRef = React.createRef();
      return element;
    });
    this.setState({ data: karas });
  }

  playingUpdate(data) {
    if (this.props.idPlaylist === data.playlist_id) {
      var playlistData = this.state.data;
      playlistData.content.forEach(kara => {
        if (kara.flag_playing) {
          kara.flag_playing = false;
          kara.flag_dejavu = true;
        } else if (kara.playlistcontent_id === data.plc_id) {
          kara.flag_playing = true;
        }
      });
      this.setState({ data: playlistData });
    }
  }

  getPlInfosElement() {
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
  }

  outerHeight(el) {
    var height = el.offsetHeight;
    var style = getComputedStyle(el);

    height += parseInt(style.marginTop) + parseInt(style.marginBottom);
    return height;
  }

  handleScroll() {
    var container_height = document.querySelector('.playlistContainer').offsetHeight;
    var scroll_by = document.querySelector('.playlistContainer').scrollTop;
    var content_height = this.outerHeight(document.querySelector('.playlistContainer > ul'))
    var percent = 100 * scroll_by / (content_height - container_height)

    if (this.state.data.infos.count > 400 && (percent === 100 || percent === 0)) {
      var data = this.state.data;
      data.infos.from = percent === 100 ? data.infos.from + 400 : data.infos.from - 400;
      data.infos.to = percent === 100 ? data.infos.to + 400 : data.infos.to - 400;
      this.setState({ data: data }, this.getPlaylist);
    }
  }

  scrollToBottom() {
    var container_height = document.querySelector('.playlistContainer').offsetHeight;
    var content_height = this.outerHeight(document.querySelector('.playlistContainer > ul'))
    this.playlistRef.current.scrollTo(0, content_height - container_height - 1);
  }

  scrollToPlaying() {
    var ref;
    this.state.data.content.forEach(element => { if (element.flag_playing) ref = element.karaRef });
    ref.current.scrollIntoView({ behavior: "smooth" });
  }

  togglePlaylistCommands() {
    this.setState({playlistCommands: !this.state.playlistCommands});
  }

  render() {
    const t = this.props.t;
    return this.props.scope === "public" &&
      this.props.side === 1 && this.props.config &&
      this.props.config.Frontend.Mode === 1 ? (
        <div class="playlistContainer">
          <ul id="playlist1" side="1" class="list-group">
            <li class="list-group-item">
              <KaraDetail data={this.state.data} mode="karaCard" />
            </li>
          </ul>
        </div>
      ) : (
        <React.Fragment>
          <PlaylistHeader
            side={this.props.side}
            scope={this.props.scope}
            playlistList={this.state.playlistList}
            playlistToAddId={this.state.playlistToAddId}
            idPlaylist={this.state.idPlaylist}
            changeIdPlaylist={this.changeIdPlaylist}
            searchValue={this.state.searchValue}
            playlistInfo={this.state.playlistInfo}
            changeSearchValue={this.changeSearchValue}
            getPlaylistUrl={this.getPlaylistUrl}
            togglePlaylistCommands = {this.togglePlaylistCommands}
            playlistCommands={this.state.playlistCommands}
          />
          <div
            className="playlistContainer"
            onScroll={this.handleScroll}
            ref={this.playlistRef}
          >
            <ul id={"playlist" + this.props.side} className="list-group">
              {this.state.data &&
                this.state.data.content.map(kara => {
                  // build the kara line
                  return (
                    //<div ref={kara.karaRef} key={Math.random()}></div>
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
                      mode={this.props.config.Frontend.Mode}
                      logInfos={this.props.logInfos}
                      playlistCommands={this.state.playlistCommands}
                    />
                  );
                })}
              {this.props.config &&
                this.props.config.Gitlab.Enabled &&
                this.state.idPlaylist === -1 &&
                this.state.data.infos.count === this.state.data.infos.from + 400 ? (
                  <li className="list-group-item karaSuggestion">
                    {t("KARA_SUGGESTION_MAIL")}
                  </li>
                ) : null}
            </ul>
          </div>
          <div
            className="plFooter">
            <div className="plBrowse">
              <button
                title={t("GOTO_TOP")}
                className="btn btn-sm btn-action"
                onClick={() => this.playlistRef.current.scrollTo(0, 5)}
              >
                <i className="glyphicon glyphicon glyphicon-menu-up" />
              </button>
              <button
                title={t("GOTO_PLAYING")}
                className="btn btn-sm btn-action"
                onClick={this.scrollToPlaying}
                action="goTo"
                value="playing"
              >
                <i className="glyphicon glyphicon glyphicon-play" />
              </button>
              <button
                title={t("GOTO_BOTTOM")}
                className="btn btn-sm btn-action"
                onClick={this.scrollToBottom}
              >
                <i className="glyphicon glyphicon glyphicon-menu-down" />
              </button>
            </div>
            <div className="plInfos">{this.getPlInfosElement()}</div>
            {this.props.side === 1 && this.state.quotaString ? 
              <div id="plQuota" className="plQuota right">
                {this.props.t('QUOTA')}{this.state.quotaString}
              </div> : null
            }
          </div>
        </React.Fragment>
      );
  }
}

export default withTranslation()(Playlist);
