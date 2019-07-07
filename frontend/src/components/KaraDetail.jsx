import React, { Component } from "react";
import { withTranslation } from "react-i18next";
import { is_touch_device, secondsTimeSpanToHMS } from "./toolsReact";

class KaraDetail extends Component {
  constructor(props) {
    super(props);
    this.state = {};
    this.getLastPlayed = this.getLastPlayed.bind(this);
    this.moreInfo = this.moreInfo.bind(this);
    this.showVideo = this.showVideo.bind(this);
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

  async moreInfo () {
    var openExternalPageButton = '<i class="glyphicon glyphicon-new-window"></i>';
    var externalUrl = '';
    var serie = this.props.data["serie"];
    var extraSearchInfo = "";
    var searchLanguage = navigator.languages[0];
    searchLanguage = searchLanguage.substring(0, 2);
    if(!this.props.data["misc_tags"] || 
    (this.props.data["misc_tags"].find(e => e.name == 'TAG_VIDEOGAME')
    && this.props.data["misc_tags"].find(e => e.name == 'TAG_MOVIE'))) {
      extraSearchInfo = 'anime ';
    }
    var searchUrl = "https://" + searchLanguage  + ".wikipedia.org/w/api.php?origin=*&action=query&format=json&formatversion=2&list=search&utf8=&srsearch=" + extraSearchInfo + serie;
    var detailsUrl = "";

    var xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function() {
      if (this.readyState == 4 && this.status == 200) {
        var json = JSON.parse(this.response);
        var results = json.query.search;
        var contentResult = json.query.pages;
        var searchInfo = json.query.searchinfo;

        if(results && results.length > 0 && detailsUrl === ""){
          var pageId = results[0].pageid;
          externalUrl= 'https://' + searchLanguage  + '.wikipedia.org/?curid=' + pageId;
          detailsUrl = 'https://' + searchLanguage + '.wikipedia.org/w/api.php?origin=*&action=query&format=json&formatversion=2&prop=extracts&exintro=&explaintext=&pageids=' + pageId;
          xhttp.open("GET", detailsUrl , true);
          xhttp.send();
        } else if (contentResult && contentResult.length > 0 && detailsUrl !== "") {
          var extract = contentResult[0].extract;
          extract = extract.replace(/\n/g, '<br /><br />');
          extract = extract.replace(serie, '<b>' + serie + '</b>');
          extract = extract.replace('anime', '<b>anime</b>');
          window.callModal('alert', '<a target="_blank" href="' + externalUrl + '">' + serie + ' ' + openExternalPageButton + '</a>', extract);
        } else if (searchInfo && searchInfo.totalhits === 0 && searchInfo.suggestion) {
          var searchUrl = "https://" + searchLanguage  + ".wikipedia.org/w/api.php?origin=*&action=query&format=json&formatversion=2&list=search&utf8=&srsearch=" + searchInfo.suggestion;
          xhttp.open("GET", searchUrl , true);
          xhttp.send();
        } else {
          window.displayMessage('warning', '', this.props.t('NO_EXT_INFO', serie));
        }
      }
    };
    xhttp.open("GET", searchUrl , true);
    xhttp.send();
  };

  showVideo () {
    var previewFile = this.props.data["previewfile"];
    if(previewFile) {
      setTimeout(function() {
        $('#video').attr('src', '/previews/' + previewFile);
        $('#video')[0].play();
        $('.overlay').show();
      }, 1);
    }
  }
  /**
   * Build kara details depending on the data
   * @param {Object} data - data from the kara
   * @param {String} mode - html mode
   * @return {String} the details, as html
   */
  render() {
    const t = this.props.t;
    var data = this.props.data;
    var todayDate = Date.now();
    var playTime = new Date(todayDate + data["time_before_play"] * 1000);
    var playTimeDate =
      playTime.getHours() + "h" + ("0" + playTime.getMinutes()).slice(-2);
    var beforePlayTime = secondsTimeSpanToHMS(data["time_before_play"], "hm");

    var details = {
      UPVOTE_NUMBER: data["upvotes"],
      DETAILS_ADDED:
        (data["created_at"]
          ? t("DETAILS_ADDED_2") +
            new Date(data["created_at"]).toLocaleDateString()
          : "") +
        (data["nickname"] ? " " + t("DETAILS_ADDED_3") + data["nickname"] : ""),
      DETAILS_PLAYING_IN: data["time_before_play"]
        ? t("DETAILS_PLAYING_IN_2", {
            time: beforePlayTime,
            date: playTimeDate
          })
        : "",
      DETAILS_LAST_PLAYED: data["lastplayed_ago"]
        ? this.getLastPlayed(data["lastplayed_at"], data["lastplayed_ago"])
        : "",
      BLCTYPE_6: data["authors"].map(e => e.name).join(", "),
      DETAILS_VIEWS: data["played"],
      BLCTYPE_4: data["creators"].map(e => e.name).join(", "),
      DETAILS_DURATION:
        ~~(data["duration"] / 60) +
        ":" +
        (data["duration"] % 60 < 10 ? "0" : "") +
        (data["duration"] % 60),
      DETAILS_LANGUAGE: data["languages_i18n"].join(", "),
      BLCTYPE_7: data["misc_tags"].map(e => t(e.name)).join(", "),
      DETAILS_SERIE: data["serie"],
      DETAILS_SERIE_ORIG: data["serie_orig"],
      BLCTYPE_2: data["singers"].map(e => e.name).join(", "),
      "DETAILS_TYPE ":
        t(data["songtype"][0].name) + data["songorder"] > 0
          ? " " + data["songorder"]
          : "",
      DETAILS_YEAR: data["year"],
      BLCTYPE_8: data["songwriters"].map(e => e.name).join(", ")
    };
    var htmlDetails = Object.keys(details).map(function(k) {
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
        className={
          (data["flag_favorites"] ? "currentFav " : "") +
          (is_touch_device() ? "mobile" : "") +
          " makeFav btn btn-action"
        }
      />
    );

    var infoKaraTemp;
    if (this.props.mode == "list") {
      infoKaraTemp = (
        <div className="detailsKara">
          <div className="topRightButtons">
            {is_touch_device() ? null : (
              <button
                title={t("TOOLTIP_CLOSEPARENT")}
                className="closeParent btn btn-action"
              />
            )}
            {(scope === "public" && !is_touch_device()) ||
            window.logInfos.role === "guest"
              ? null
              : makeFavButton}
            <button
              title={t("TOOLTIP_SHOWLYRICS")}
              className={
                "fullLyrics btn btn-action " + (isTouchScreen ? "mobile" : "")
              }
            />
            {data["previewfile"] ? (
              <button
                title={t("TOOLTIP_SHOWVIDEO")}
                className={
                  "showVideo btn btn-action" +
                  (is_touch_device() ? "mobile" : "")
                }
                onClick={this.showVideo}
              />
            ) : null}
            {data["serie"] ? (
              <button
                className={
                  "moreInfo btn btn-action" + (isTouchScreen ? "mobile" : "")
                }
                onClick={this.moreInfo}
              />
            ) : null}
            {scope === "admin" && this.props.publicOuCurrent ? (
              <button
                title={t("TOOLTIP_UPVOTE")}
                className={
                  data["flag_free"]
                    ? "free btn-primary"
                    : "" + " likeFreeButton btn btn-action"
                }
              />
            ) : null}
          </div>
          <table>
            <tbody>{htmlDetails}</tbody>
          </table>
        </div>
      );
    } else if (this.props.mode == "karaCard") {
      $.ajax({ url: "public/karas/" + data.kid + "/lyrics" }).done(function(
        data
      ) {
        var lyrics = t("NOLYRICS");
        if (typeof data === "object") {
          lyrics = data.join("<br/>");
        }
        $(".karaCard .lyricsKara").html(lyrics);
      });
      infoKaraTemp = (
        <div>
          <div className="topRightButtons">
            {window.logInfos.role === "guest" ? null : makeFavButton}
          </div>
          <table>
            <tbody>{htmlDetails}</tbody>
          </table>
        </div>
      );
      $(".karaCard > div").show();
    }

    return infoKaraTemp;
  }
}

export default withTranslation()(KaraDetail);
