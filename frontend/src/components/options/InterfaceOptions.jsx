import React, { Component } from "react";
import { withTranslation } from 'react-i18next';
import Switch from '../Switch';
import { dotify } from '../tools';

class InterfaceOptions extends Component {
  constructor(props) {
    super(props);
    this.state = {
      settings: dotify(this.props.settings)
    };
    this.onChange = this.onChange.bind(this);
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.settings !== this.state.settings) {
      this.setState({ settings: dotify(nextProps.settings) });
    }
  }

  onChange(e) {
    var settings = this.state.settings;
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    settings[event.target.id] = eval(value);
    this.setState({ settings: settings });
    if (e.target.type != "number" || (Number(e.target.value))) this.props.onChange(e);
  }

  render() {
    const t = this.props.t;
    var settings = this.state.settings;
    return (
      <React.Fragment>
        <div className="form-group">
          <label className="col-xs-4 control-label">
            {t("WEBAPPMODE")}
          </label>
          <div className="col-xs-6">
            <select
              type="number"
              className="form-control"
              id="Frontend.Mode"
              onChange={this.onChange}
              value={settings["Frontend.Mode"]}
            >
              <option value="0">{t("WEBAPPMODE_CLOSED")}</option>
              <option value="1">{t("WEBAPPMODE_LIMITED")}</option>
              <option value="2">{t("WEBAPPMODE_OPEN")}</option>
            </select>
          </div>
        </div>

        <div className="form-group">
          <label className="col-xs-4 control-label">
            {t("SERIE_NAME_MODE")}
          </label>
          <div className="col-xs-6">
            <select
              type="number"
              className="form-control"
              id="Frontend.SeriesLanguageMode"
              onChange={this.onChange}
              value={settings["Frontend.SeriesLanguageMode"]}
            >
              <option value="0">{t("SERIE_NAME_MODE_ORIGINAL")}</option>
              <option value="1">{t("SERIE_NAME_MODE_SONG")}</option>
              <option value="2">{t("SERIE_NAME_MODE_ADMIN")}</option>
              <option value="3">{t("SERIE_NAME_MODE_USER")}</option>
            </select>
          </div>
        </div>

        <div className="form-group">
          <label className="col-xs-4 control-label">
            {t("ENGINEALLOWVIEWBLACKLIST")}
          </label>
          <div className="col-xs-6">
            <Switch idInput="Frontend.Permissions.AllowViewBlacklist" handleChange={this.onChange}
              isChecked={settings["Frontend.Permissions.AllowViewBlacklist"]} />
          </div>
        </div>

        <div className="form-group">
          <label className="col-xs-4 control-label">
            {t("ENGINEALLOWVIEWBLACKLISTCRITERIAS")}
          </label>
          <div className="col-xs-6">
            <Switch idInput="Frontend.Permissions.AllowViewBlacklistCriterias" handleChange={this.onChange}
              isChecked={settings["Frontend.Permissions.AllowViewBlacklistCriterias"]} />
          </div>
        </div>

        <div className="form-group">
          <label className="col-xs-4 control-label">
            {t("ENGINEALLOWVIEWWHITELIST")}
          </label>
          <div className="col-xs-6">
            <Switch idInput="Frontend.Permissions.AllowViewWhitelist" handleChange={this.onChange}
              isChecked={settings["Frontend.Permissions.AllowViewWhitelist"]} />
          </div>
        </div>
      </React.Fragment>
    );
  }
}

export default withTranslation()(InterfaceOptions);
