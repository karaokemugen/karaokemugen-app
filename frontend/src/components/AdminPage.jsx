import React, { Component } from "react";
import { withTranslation } from "react-i18next";
import Playlist from "./karas/Playlist";
import OnlineStatsModal from "./modals/OnlineStatsModal"
import AdminHeader from "./AdminHeader"
import Options from "./options/Options"
import ProfilModal from "./modals/ProfilModal"
import LoginModal from "./modals/LoginModal"
import ProgressBar from "./karas/ProgressBar";

class AdminPage extends Component {
  constructor(props) {
    super(props);
    this.state = {
      options: false,
      loginModal: !this.props.logInfos.token || this.props.logInfos.role !== 'admin',
      profileModal: false,
      onlineStatsModal: this.props.settings.config.Online.Stats === undefined,
      idsPlaylist: { left: '', right: '' }
    };
    this.majIdsPlaylist = this.majIdsPlaylist.bind(this);
  }

  majIdsPlaylist(side, value) {
    var idsPlaylist = this.state.idsPlaylist;
    if (side === 1) {
      idsPlaylist.left = value;
    } else {
      idsPlaylist.right = value;
    }
    this.setState({ idsPlaylist: idsPlaylist })
  }

  stopVideo() {
    var video = $('#video');
    $('.overlay').hide();
    video[0].pause();
    video.removeAttr('src');
  }

  render() {
    const t = this.props.t;
    return (
      <div id="adminPage">
        {this.state.onlineStatsModal ?
          <OnlineStatsModal toggleOnlineStatsModal={() => this.setState({ onlineStatsModal: !this.state.onlineStatsModal })} /> : null
        }
        {this.state.loginModal ?
          <LoginModal scope='admin' config={this.props.settings.config} updateLogInfos={this.props.updateLogInfos}
            toggleLoginModal={() => this.setState({ loginModal: !this.state.loginModal })} /> : null
        }
        {this.state.profileModal ?
          <ProfilModal settingsOnline={this.props.settings.config.Online} updateLogInfos={this.props.updateLogInfos} logInfos={this.props.logInfos}
            toggleProfileModal={() => this.setState({ profileModal: !this.state.profileModal })} /> : null
        }
        <AdminHeader config={this.props.settings.config} toggleProfileModal={() => this.setState({ profileModal: !this.state.profileModal })}
          callModal={window.callModal} setOptionMode={() => this.setState({ options: !this.state.options })} powerOff={this.props.powerOff}
          logOut={this.props.logOut} options={this.state.options}/>
        <ProgressBar webappMode={this.props.settings.config.Frontend.Mode} />
        <div id="underHeader" className="underHeader container-fluid">
          {!this.state.options ?
            <div className="playlist-main row" id="playlist">
              <div className="panel col-lg-6 col-xs-6" id="panel1" side="1">
                <Playlist scope='admin' side={1} navigatorLanguage={this.props.navigatorLanguage} logInfos={this.props.logInfos} config={this.props.settings.config}
                  idPlaylistTo={this.state.idsPlaylist.right} majIdsPlaylist={this.majIdsPlaylist} tags={this.props.tags} />
              </div>

              <div className="panel col-lg-6 col-xs-6" id="panel2" side="2">
                <Playlist scope='admin' side={2} navigatorLanguage={this.props.navigatorLanguage} logInfos={this.props.logInfos} config={this.props.settings.config}
                  idPlaylistTo={this.state.idsPlaylist.left} majIdsPlaylist={this.majIdsPlaylist} tags={this.props.tags} />
              </div>
            </div> :
            <div className="row" id="manage">
              <Options settings={this.props.settings} />
            </div>
          }
          <div className="toastMessageContainer"></div>
        </div>
        <div className="overlay" onClick={this.stopVideo}>
          <video id="video" src="" type="video/mp4" autoPlay>
          </video>
        </div>
        <a id="downloadAnchorElem"></a>
      </div>
    );
  }
}

export default withTranslation()(AdminPage);
