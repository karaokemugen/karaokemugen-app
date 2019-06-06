import React, { Component } from "react";
import { withTranslation } from 'react-i18next';
import Switch from '../Switch';

class InterfaceOptions extends Component {


  render() {
    const t = this.props.t;
    var settings = this.props.settings;
    return (settings.Frontend ?
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
              onChange={this.props.onChange}
              value={settings.Frontend.Mode}
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
              onChange={this.props.onChange}
              value={settings.Frontend.SeriesLanguageMode}
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
            <Switch idInput="Frontend.Permissions.AllowViewBlacklist" handleChange={this.props.onChange}
              isChecked={settings.Frontend.Permissions.AllowViewBlacklist} />
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
            <Switch idInput="Frontend.Permissions.AllowViewBlacklistCriterias" handleChange={this.props.onChange}
              isChecked={settings.Frontend.Permissions.AllowViewBlacklistCriterias} />
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
            <Switch idInput="Frontend.Permissions.AllowViewWhitelist" handleChange={this.props.onChange}
              isChecked={settings.Frontend.Permissions.AllowViewWhitelist} />
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="Karaoke.CreatePreviews" className="col-xs-4 control-label">
            {t("ENGINECREATEPREVIEWS")}
          </label>
          <div className="col-xs-6">
            <Switch idInput="Karaoke.CreatePreviews" handleChange={this.props.onChange}
              isChecked={settings.Karaoke.CreatePreviews} />
          </div>
        </div>
      </> : null
    );
  }
}

export default withTranslation()(InterfaceOptions);
