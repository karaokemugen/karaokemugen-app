import React, { Component } from 'react';
import i18next from 'i18next';
import PlayerOptions from './PlayerOptions';
import KaraokeOptions from './KaraokeOptions';
import InterfaceOptions from './InterfaceOptions';
import axios from 'axios';
import {expand} from '../tools';

class Options extends Component {
  constructor(props) {
    super(props);
    this.state = {
      activeView: 1
    }
  }

  async saveSettings(e) {
    var value = e.target.type === 'checkbox' ? e.target.checked : 
      ((Number(e.target.value) || e.target.value === "0") ? Number(e.target.value) : e.target.value);
    if (value === 'true') {
      value = true;
    } else if (value === 'false') {
      value = false;
    }
    var data = expand(e.target.id, value);
    axios.put('/api/admin/settings', {setting: JSON.stringify(data)});
  }

  render() {
    return (
      <>
        <div className="col-lg-2 col-xs-0" />
        <div
          className="panel col-lg-8 col-xs-12 modalPage"
        >
          <form className="form-horizontal" id="settings">
            <ul className="nav nav-tabs nav-justified">
              <li className={"modal-title " + (this.state.activeView === 1 ? "active" : "")}>
                <a onClick={() => this.setState({activeView: 1})}>{i18next.t("SETTINGS.PLAYER.LABEL")}</a>
              </li>
              <li className={"modal-title " + (this.state.activeView === 2 ? "active" : "")}>
                <a onClick={() => this.setState({activeView: 2})}>{i18next.t("SETTINGS.KARAOKE.LABEL")}</a>
              </li>
              <li className={"modal-title " + (this.state.activeView === 3 ? "active" : "")}>
                <a onClick={() => this.setState({activeView: 3})}>{i18next.t("SETTINGS.INTERFACE.LABEL")}</a>
              </li>
            </ul>

            <div className="tab-content">
              <div className="modal-body">
                {this.state.activeView === 1 ?
                  <PlayerOptions onChange={this.saveSettings} settings={this.props.settings.config} /> : null
                }
                {this.state.activeView === 2 ?
                  <KaraokeOptions onChange={this.saveSettings} settings={this.props.settings.config}/> : null
                }
                {this.state.activeView === 3 ?
                  <InterfaceOptions onChange={this.saveSettings} settings={this.props.settings.config} /> : null
                }
              </div>
            </div>
          </form>
        </div>
        <div className="col-lg-2 col-xs-0" />
      </>
    );
  };
}

export default Options;