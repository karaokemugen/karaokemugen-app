import React from "react";
import { useTranslation } from "react-i18next";

var InterfaceOptions = (props) => {
  const { t } = useTranslation();

  return (
    <>
      <div className="form-group">
        <label htmlFor="Frontend.Mode" className="col-xs-4 control-label">
          {t("WEBAPPMODE")}
        </label>
        <div className="col-xs-6">
          <select
            type="number"
            className="form-control"
            id="Frontend.Mode"
            onChange={props.onChange}
          >
            <option value="0">{t("WEBAPPMODE_CLOSED")}</option>
            <option value="1">{t("WEBAPPMODE_LIMITED")}</option>
            <option value="2">{t("WEBAPPMODE_OPEN")}</option>
          </select>
        </div>
      </div>

      <div className="form-group">
        <label
          htmlFor="Frontend.SeriesLanguageMode"
          className="col-xs-4 control-label"
        >
          {t("SERIE_NAME_MODE")}
        </label>
        <div className="col-xs-6">
          <select
            type="number"
            className="form-control"
            id="Frontend.SeriesLanguageMode"
            onChange={props.onChange}
          >
            <option value="0">{t("SERIE_NAME_MODE_ORIGINAL")}</option>
            <option value="1">{t("SERIE_NAME_MODE_SONG")}</option>
            <option value="2">{t("SERIE_NAME_MODE_ADMIN")}</option>
            <option value="3">{t("SERIE_NAME_MODE_USER")}</option>
          </select>
        </div>
      </div>

      <div className="form-group">
        <label
          htmlFor="Frontend.Permissions.AllowViewBlacklist"
          className="col-xs-4 control-label"
        >
          {t("ENGINEALLOWVIEWBLACKLIST")}
        </label>
        <div className="col-xs-6">
          {" "}
          <input
            type="checkbox"
            id="Frontend.Permissions.AllowViewBlacklist"
            onChange={props.onChange}
          />
        </div>
      </div>

      <div className="form-group">
        <label
          htmlFor="Frontend.Permissions.AllowViewBlacklistCriterias"
          className="col-xs-4 control-label"
        >
          {t("ENGINEALLOWVIEWBLACKLISTCRITERIAS")}
        </label>
        <div className="col-xs-6">
          {" "}
          <input
            type="checkbox"
            id="Frontend.Permissions.AllowViewBlacklistCriterias"
            onChange={props.onChange}
          />
        </div>
      </div>

      <div className="form-group">
        <label
          htmlFor="Frontend.Permissions.AllowViewWhitelist"
          className="col-xs-4 control-label"
        >
          {t("ENGINEALLOWVIEWWHITELIST")}
        </label>
        <div className="col-xs-6">
          {" "}
          <input
            type="checkbox"
            id="Frontend.Permissions.AllowViewWhitelist"
            onChange={props.onChange}
          />
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="Karaoke.CreatePreviews" className="col-xs-4 control-label">
          {t("ENGINECREATEPREVIEWS")}
        </label>
        <div className="col-xs-6">
          {" "}
          <input type="checkbox" id="Karaoke.CreatePreviews" onChange={props.onChange} />
        </div>
      </div>
    </>
  );
};

export default InterfaceOptions;
