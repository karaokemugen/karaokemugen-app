import React, { Component } from "react";
import KmAppWrapperDecorator from "./decorators/KmAppWrapperDecorator"
import PlaylistMainDecorator from "./decorators/PlaylistMainDecorator";
import KmAppBodyDecorator from "./decorators/KmAppBodyDecorator"
import Playlist from "./karas/Playlist";
import OnlineStatsModal from "./modals/OnlineStatsModal"
import AdminHeader from "./AdminHeader"
import Options from "./options/Options"
import ProfilModal from "./modals/ProfilModal"
import LoginModal from "./modals/LoginModal"
import ProgressBar from "./karas/ProgressBar";
import ReactDOM from 'react-dom';
class AdminPage extends Component {
  constructor(props) {
    super(props);
    this.state = {
      options: false,
      idsPlaylist: { left: '', right: '' },
      searchMenuOpen1: false,
      searchMenuOpen2: false
    };
    this.majIdsPlaylist = this.majIdsPlaylist.bind(this);
    this.toggleSearchMenu1 = this.toggleSearchMenu1.bind(this);
    this.toggleSearchMenu2 = this.toggleSearchMenu2.bind(this);
    if (!this.props.logInfos.token || this.props.logInfos.role !== 'admin') {
      this.openLoginOrProfileModal()
    } else if (this.props.settings.config.Online.Stats === undefined) {
      ReactDOM.render(<OnlineStatsModal />, document.getElementById('modal'));
    }
  }

  majIdsPlaylist(side, value) {
    var idsPlaylist = this.state.idsPlaylist;
    if (side === 1) {
      idsPlaylist.left = Number(value);
    } else {
      idsPlaylist.right = Number(value);
    }
    this.setState({ idsPlaylist: idsPlaylist })
  }

  toggleSearchMenu1() {
    this.setState({searchMenuOpen1: !this.state.searchMenuOpen1});
  }

  toggleSearchMenu2() {
    this.setState({searchMenuOpen2: !this.state.searchMenuOpen2});
  }

  openLoginOrProfileModal() {
    if (this.props.logInfos.token) {
      <ProfilModal 
        settingsOnline={this.props.settings.config.Online}
        updateLogInfos={this.props.updateLogInfos}
        logInfos={this.props.logInfos} />
    } else {
      ReactDOM.render(<LoginModal 
        scope='admin'
        config={this.props.settings.config}
        updateLogInfos={this.props.updateLogInfos}
      />, document.getElementById('modal'));
    }
  }

  render() {
    return (
      <div id="adminPage">        
        <KmAppWrapperDecorator>

          <AdminHeader 
            config={this.props.settings.config}
            toggleProfileModal={this.openLoginOrProfileModal}
            setOptionMode={() => this.setState({ options: !this.state.options })}
            powerOff={this.props.powerOff}
            logOut={this.props.logOut}
            options={this.state.options}
            ></AdminHeader>

          <ProgressBar scope='admin' webappMode={this.props.settings.config.Frontend.Mode}></ProgressBar>

          <KmAppBodyDecorator mode="admin" extraClass="">
            {
              this.state.options ?   
                <div className="row " id="manage">
                  <Options settings={this.props.settings} />
                </div>
              : null
            }
            <PlaylistMainDecorator className={this.state.options ? "hidden" : ""}>
                <Playlist 
                  scope='admin'
                  side={1}
                  navigatorLanguage={this.props.navigatorLanguage}
                  logInfos={this.props.logInfos}
                  config={this.props.settings.config}
                  idPlaylistTo={this.state.idsPlaylist.right}
                  majIdsPlaylist={this.majIdsPlaylist}
                  tags={this.props.tags}
                  toggleSearchMenu={this.toggleSearchMenu1}
                  searchMenuOpen={this.state.searchMenuOpen1}
                  showVideo={this.props.showVideo}
                  />
                <Playlist
                  scope='admin'
                  side={2}
                  navigatorLanguage={this.props.navigatorLanguage}
                  logInfos={this.props.logInfos}
                  config={this.props.settings.config}
                  idPlaylistTo={this.state.idsPlaylist.left}
                  majIdsPlaylist={this.majIdsPlaylist}
                  tags={this.props.tags}
                  toggleSearchMenu={this.toggleSearchMenu2}
                  searchMenuOpen={this.state.searchMenuOpen2}
                  showVideo={this.props.showVideo}
                  />
              </PlaylistMainDecorator>
            }
          </KmAppBodyDecorator>

        </KmAppWrapperDecorator>
      </div>
    );
  }
}

export default AdminPage;
