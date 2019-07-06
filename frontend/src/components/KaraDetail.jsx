import React, { Component } from "react";
import { withTranslation } from "react-i18next";
import { is_touch_device, secondsTimeSpanToHMS } from "./toolsReact";

class KaraDetail extends Component {
  constructor(props) {
    super(props);
    this.state = {};
    this.getLastPlayed = this.getLastPlayed.bind(this);
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
              />
            ) : null}
            {data["serie"] ? (
              <button
                className={
                  "moreInfo btn btn-action" + (isTouchScreen ? "mobile" : "")
                }
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
