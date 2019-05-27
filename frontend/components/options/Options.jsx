import React, { Component } from 'react';
import { withTranslation } from 'react-i18next';
import PlayerOptions from './PlayerOptions';
import KaraokeOptions from './KaraokeOptions';
import InterfaceOptions from './InterfaceOptions';
import axios from 'axios';
require('babel-polyfill');

axios.defaults.headers.common['authorization'] = localStorage.getItem('kmToken');
axios.defaults.headers.common['onlineAuthorization'] = localStorage.getItem('kmOnlineToken');

class Options extends Component {

  constructor(props) {
    super(props);
    this.state = {
      settings: this.getSettings()
    };
    this.saveSettings = this.saveSettings.bind(this);
  }

	expand (str, val) {
		return str.split('.').reduceRight((acc, currentValue) => {
			return { [currentValue]: acc };
		}, val);
	};

  async saveSettings(event) {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    var data = this.expand(event.target.id, eval(value));
    const res = await axios.put('/api/admin/settings', {
      setting: JSON.stringify(data)
    });
    this.setState({settings: res.data.data})
  }

  async getSettings() {
    const res = await axios.get('/api/admin/settings');
    this.setState({ settings: res.data.data })
  }

  render() {
    const t = this.props.t;
    var displays = [];
    return (
      <>
        <div className="col-lg-2 col-xs-0" />
        <div
          className="panel col-lg-8 col-xs-12 modalPage"
        >
          <form className="form-horizontal" id="settings">
            <ul className="nav nav-tabs nav-justified">
              <li className="modal-title active">
                <a
                  data-toggle="tab"
                  href="#nav-player"
                  role="tab"
                  aria-controls="nav-login"
                  aria-selected="true"
                >
                  {t("SETTINGS_PLAYER")}
                </a>
              </li>
              <li className="modal-title">
                <a
                  data-toggle="tab"
                  href="#nav-karaoke"
                  role="tab"
                  aria-controls="nav-lokaraokegin"
                  aria-selected="false"
                >
                  {t("SETTINGS_KARAOKE")}
                </a>
              </li>
              <li className="modal-title">
                <a
                  data-toggle="tab"
                  href="#nav-interface"
                  role="tab"
                  aria-controls="nav-interface"
                  aria-selected="false"
                >
                  {t("SETTINGS_INTERFACE")}
                </a>
              </li>
            </ul>

            <div className="tab-content">
              <div
                id="nav-player"
                role="tabpanel"
                aria-labelledby="nav-player-tab"
                className="modal-body tab-pane fade in active"
              >
                <PlayerOptions displays={displays} onChange={this.saveSettings} settings={this.state.settings} />
              </div>
              <div
                id="nav-interface"
                role="tabpanel"
                aria-labelledby="nav-interface-tab"
                className="modal-body tab-pane fade"
              >
                <InterfaceOptions onChange={this.saveSettings} settings={this.state.settings} />
              </div>
              <div
                id="nav-karaoke"
                role="tabpanel"
                aria-labelledby="nav-karaoke-tab"
                className="modal-body tab-pane fade"
              >
                <KaraokeOptions onChange={this.saveSettings} settings={this.state.settings}/>
              </div>
            </div>
          </form>
        </div>
        <div className="col-lg-2 col-xs-0" />
      </>
    );
  };
}

export default withTranslation()(Options);
