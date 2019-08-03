import React, { Component } from "react";
import { withTranslation } from "react-i18next";
import { is_touch_device, secondsTimeSpanToHMS } from "../toolsReact";
import axios from "axios";

class KaraDetail extends Component {
  constructor(props) {
    super(props);
    this.state = {
      showLyrics: false
    };
    this.getLastPlayed = this.getLastPlayed.bind(this);
    this.moreInfo = this.moreInfo.bind(this);
    this.showVideo = this.showVideo.bind(this);
    this.showFullLyrics = this.showFullLyrics.bind(this);
    this.getKaraDetail = this.getKaraDetail.bind(this);
    this.getTagNames = this.getTagNames.bind(this);
    this.fullLyricsRef = React.createRef();
    this.getKaraDetail();
  }

  async getKaraDetail() {
    var urlInfoKara = this.props.idPlaylist > 0 ?
      '/api/' + this.props.scope + '/playlists/' + this.props.idPlaylist + '/karas/' + this.props.kara.playlistcontent_id :
      '/api/public/karas/' + this.props.kara.kid;
    var response = await axios.get(urlInfoKara);
    const kara = response.data.data;
    this.setState({ kara: kara });
  }

  getLastPlayed(lastPlayed_at, lastPlayed) {
    if (
      lastPlayed &&
      !lastPlayed.days &&
      !lastPlayed.months &&
      !lastPlayed.years
    ) {
      var timeAgo =
        (lastPlayed.seconds ? lastPlayed.seconds : 0) +
        (lastPlayed.minutes ? lastPlayed.minutes * 60 : 0) +
        (lastPlayed.hours ? lastPlayed.hours * 3600 : 0);
      var timeAgoStr =
        lastPlayed.minutes || lastPlayed.hours
          ? secondsTimeSpanToHMS(timeAgo, "hm")
          : secondsTimeSpanToHMS(timeAgo, "ms");

      return this.props.t("DETAILS_LAST_PLAYED_2", { time: timeAgoStr });
    } else if (lastPlayed_at) {
      return new Date(lastPlayed_at).toLocaleDateString();
    }
  }

  async moreInfo() {
    var openExternalPageButton =
      '<i class="glyphicon glyphicon-new-window"></i>';
    var externalUrl = "";
    var serie = this.state.kara.serie;
    var extraSearchInfo = "";
    var searchLanguage = navigator.languages[0];
    searchLanguage = searchLanguage.substring(0, 2);
    var searchUrl =
      "https://" +
      searchLanguage +
      ".wikipedia.org/w/api.php?origin=*&action=query&format=json&formatversion=2&list=search&utf8=&srsearch=" +
      extraSearchInfo +
      serie;
    var detailsUrl = "";

    var xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function () {
      if (this.readyState == 4 && this.status == 200) {
        var json = JSON.parse(this.response);
        var results = json.query.search;
        var contentResult = json.query.pages;
        var searchInfo = json.query.searchinfo;

        if (results && results.length > 0 && detailsUrl === "") {
          var pageId = results[0].pageid;
          externalUrl =
            "https://" + searchLanguage + ".wikipedia.org/?curid=" + pageId;
          detailsUrl =
            "https://" +
            searchLanguage +
            ".wikipedia.org/w/api.php?origin=*&action=query&format=json&formatversion=2&prop=extracts&exintro=&explaintext=&pageids=" +
            pageId;
          xhttp.open("GET", detailsUrl, true);
          xhttp.send();
        } else if (
          contentResult &&
          contentResult.length > 0 &&
          detailsUrl !== ""
        ) {
          var extract = contentResult[0].extract;
          extract = extract.replace(/\n/g, "<br /><br />");
          extract = extract.replace(serie, "<b>" + serie + "</b>");
          extract = extract.replace("anime", "<b>anime</b>");
          window.callModal(
            "alert",
            '<a target="_blank" href="' +
            externalUrl +
            '">' +
            serie +
            " " +
            openExternalPageButton +
            "</a>",
            extract
          );
        } else if (
          searchInfo &&
          searchInfo.totalhits === 0 &&
          searchInfo.suggestion
        ) {
          var searchUrl =
            "https://" +
            searchLanguage +
            ".wikipedia.org/w/api.php?origin=*&action=query&format=json&formatversion=2&list=search&utf8=&srsearch=" +
            searchInfo.suggestion;
          xhttp.open("GET", searchUrl, true);
          xhttp.send();
        } else {
          window.displayMessage(
            "warning",
            "",
            this.props.t("NO_EXT_INFO", serie)
          );
        }
      }
    };
    xhttp.open("GET", searchUrl, true);
    xhttp.send();
  }

  showVideo() {
    var mediafile = this.state.kara.mediafile;
    setTimeout(function () {
      $("#video").attr("src", "/medias/" + mediafile);
      $("#video")[0].play();
      $(".overlay").show();
    }, 1);
  }

  /**
   * show full lyrics of a given kara
   */

  async showFullLyrics() {
    var response = await axios.get("/api/public/karas/" + this.state.kara.kid + "/lyrics");
    if (is_touch_device()) {
      window.callModal('alert', this.props.t('LYRICS'), '<center>' + response.data.data.join('<br/>') + '</center');
    } else {
      this.setState({ lyrics: response.data.data, showLyrics:true });
      this.fullLyricsRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }

  getTagNames(data) {
    var tagNames = [];
    if (data.families) tagNames = tagNames.concat(data.families.map(e => this.props.getTagInLocale(e)))
    if (data.platforms) tagNames = tagNames.concat(data.platforms.map(e => this.props.getTagInLocale(e)))
    if (data.genres) tagNames = tagNames.concat(data.genres.map(e => this.props.getTagInLocale(e)))
    if (data.origins) tagNames = tagNames.concat(data.origins.map(e => this.props.getTagInLocale(e)))
    if (data.misc) tagNames = tagNames.concat(data.misc.map(e => this.props.getTagInLocale(e)))
    return tagNames.join(', ');
  }

  /**
   * Build kara details depending on the data
   * @param {Object} data - data from the kara
   * @param {String} mode - html mode
   * @return {String} the details, as html
   */
  render() {
    if (this.state.kara) {
      const t = this.props.t;
      var data = this.state.kara;
      var todayDate = Date.now();
      var playTime = new Date(todayDate + data.time_before_play * 1000);
      var playTimeDate =
        playTime.getHours() + "h" + ("0" + playTime.getMinutes()).slice(-2);
      var beforePlayTime = secondsTimeSpanToHMS(data.time_before_play, "hm");
      var details = {
        UPVOTE_NUMBER: data.upvotes,
        DETAILS_ADDED:
          (data.created_at
            ? t("DETAILS_ADDED_2") +
            new Date(data.created_at).toLocaleDateString()
            : "") +
          (data.nickname ? " " + t("DETAILS_ADDED_3") + data.nickname : ""),
        DETAILS_PLAYING_IN: data.time_before_play
          ? t("DETAILS_PLAYING_IN_2", {
            time: beforePlayTime,
            date: playTimeDate
          })
          : "",
        DETAILS_LAST_PLAYED: data.lastplayed_ago
          ? this.getLastPlayed(data.lastplayed_at, data.lastplayed_ago)
          : "",
        BLCTYPE_6: data.authors.map(e => this.props.getTagInLocale(e)).join(", "),
        DETAILS_VIEWS: data.played,
        BLCTYPE_4: data.creators.map(e => this.props.getTagInLocale(e)).join(", "),
        DETAILS_DURATION:
          ~~(data.duration / 60) +
          ":" +
          (data.duration % 60 < 10 ? "0" : "") +
          (data.duration % 60),
        DETAILS_LANGUAGE: data.langs.map(e => this.props.getTagInLocale(e)).join(", "),
        BLCTYPE_7: this.getTagNames(data),
        DETAILS_SERIE: data.serie,
        DETAILS_SERIE_ORIG: data.serie_orig,
        BLCTYPE_2: data.singers.map(e => this.props.getTagInLocale(e)).join(", "),
        DETAILS_TYPE: this.props.getTagInLocale(data.songtypes[0])
          + (data.songorder > 0 ? " " + data.songorder : ""),
        DETAILS_YEAR: data.year,
        BLCTYPE_8: data.songwriters.map(e => this.props.getTagInLocale(e)).join(", ")
      };
      var htmlDetails = Object.keys(details).map(function (k) {
        if (details[k]) {
          var detailsLine = details[k].toString().replace(/,/g, ", ");
          return (
            <tr key={k}>
              <td> {t(k)}</td>
              <td> {detailsLine}</td>
            </tr>
          );
        } else {
          return null;
        }
      });
      var makeFavButton = (
        <button
          title={t("TOOLTIP_FAV")}
          onClick={this.props.makeFavorite}
          className={
            (this.props.isFavorite ? "currentFav " : "") +
            (is_touch_device() ? "mobile" : "") +
            " makeFav btn btn-action"
          }
        />
      );

      var lyricsKara =
        data.subfile && this.state.showLyrics ? (
          <div className="lyricsKara alert alert-info" ref={this.fullLyricsRef}>
            <button
              title={t("TOOLTIP_CLOSEPARENT")}
              className="closeParent btn btn-action"
              onClick={() => this.setState({showLyrics: false})}
            />
            <div className="lyricsKaraLoad">
              {this.state.lyrics.map(ligne => {
                return (
                  <React.Fragment key={Math.random()}>
                    {ligne}
                    <br />
                  </React.Fragment>
                );
              })}
            </div>
            <button
              title={t("TOOLTIP_CLOSEPARENT")}
              className="closeParent bottom btn btn-action"
              onClick={() => this.setState({showLyrics: false})}
            />
          </div>
        ) : null;

      var infoKaraTemp;
      if (this.props.mode == "list") {
        infoKaraTemp = (
          <React.Fragment>
            <div className="detailsKara" style={this.props.karaDetailState ? {} : { display: 'none' }}>
              <div className="topRightButtons">
                {is_touch_device() ? null : (
                  <button
                    title={t("TOOLTIP_CLOSEPARENT")}
                    className="closeParent btn btn-action"
                    onClick={this.props.toggleKaraDetail}
                  />
                )}
                {(this.props.scope === "public" && !is_touch_device()) ||
                  this.props.logInfos.role === "guest"
                  ? null
                  : makeFavButton}
                {data.subfile ? (
                  <button
                    title={t("TOOLTIP_SHOWLYRICS")}
                    className={
                      "fullLyrics btn btn-action " +
                      (is_touch_device() ? "mobile" : "")
                    }
                    onClick={this.showFullLyrics}
                  />
                ) : null}
                <button
                  title={t("TOOLTIP_SHOWVIDEO")}
                  className={
                    "showVideo btn btn-action" +
                    (is_touch_device() ? "mobile" : "")
                  }
                  onClick={this.showVideo}
                />
                {data.serie ? (
                  <button
                    className={
                      "moreInfo btn btn-action" + (is_touch_device() ? "mobile" : "")
                    }
                    onClick={this.moreInfo}
                  />
                ) : null}
                {this.props.scope === "admin" && this.props.publicOuCurrent ? (
                  <button
                    title={t("TOOLTIP_UPVOTE")} onClick={this.props.freeKara}
                    className={"likeFreeButton btn btn-action " + 
                      (data.flag_free ? "free btn-primary": "")
                    }
                  />
                ) : null}
              </div>
              <table>
                <tbody>{htmlDetails}</tbody>
              </table>
            </div>
            {lyricsKara}
          </React.Fragment>
        );
      } else if (this.props.mode == "karaCard") {
        if (data.subfile) this.showFullLyrics();
        infoKaraTemp = (
          <React.Fragment>
            <div class="details z-depth-1" id="karaCard">
              <div className="topRightButtons">
                {this.props.logInfos === "guest" ? null : makeFavButton}
              </div>
              <table>
                <tbody>{htmlDetails}</tbody>
              </table>
            </div>
            <div class="lyricsKara alert alert-info">
            {data.subfile && this.state.lyrics.map(ligne => {
                return (
                  <React.Fragment key={Math.random()}>
                    {ligne}
                    <br />
                  </React.Fragment>
                );
              })}
            </div>
          </React.Fragment>
        );
      }

      return infoKaraTemp;
    } else {
      return null;
    }
  }
}

export default withTranslation()(KaraDetail);
