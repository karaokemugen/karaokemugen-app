import React, { Component } from "react";
import { withTranslation } from "react-i18next";
import axios from "axios";
import getLucky from "../../assets/clover.png"
import ActionsButtons from "./ActionsButtons";
import { buildKaraTitle } from '../tools';

var tagsTypesList = [
  'DETAILS_SERIE',
  'BLCTYPE_3',
  'BLCTYPE_7',
  'BLCTYPE_2',
  'BLCTYPE_4',
  'BLCTYPE_5',
  'BLCTYPE_6',
  'DETAILS_YEAR',
  'BLCTYPE_8',
  'BLCTYPE_9'];
class PlaylistHeader extends Component {
  constructor(props) {
    super(props);
    this.state = {
      selectAllKarasChecked: false,
      tagType: 2
    };
    this.addRandomKaras = this.addRandomKaras.bind(this);
    this.shuffle = this.shuffle.bind(this);
    this.smartShuffle = this.smartShuffle.bind(this);
    this.addPlaylist = this.addPlaylist.bind(this);
    this.deletePlaylist = this.deletePlaylist.bind(this);
    this.startFavMix = this.startFavMix.bind(this);
    this.exportPlaylist = this.exportPlaylist.bind(this);
    this.importPlaylist = this.importPlaylist.bind(this);
    this.deleteAllKaras = this.deleteAllKaras.bind(this);
  }

  addRandomKaras() {
    window.callModal('prompt', this.props.t('CL_ADD_RANDOM_TITLE'), '', function (nbOfRandoms) {
      axios.get(this.props.getPlaylistUrl(), { random: nbOfRandoms }).then(randomKaras => {
        if (randomKaras.content.length > 0) {
          let textContent = randomKaras.content.map(e => buildKaraTitle(e)).join('<br/><br/>');
          window.callModal('confirm', this.props.t('CL_CONGRATS'), this.props.t('CL_ABOUT_TO_ADD') + '<br/><br/>' + textContent, () => {
            var karaList = randomKaras.content.map(a => {
              return a.kid;
            }).join();
            var urlPost = this.props.getPlaylistUrl();
            axios.post(urlPost, { kid: karaList });
          }, '');
        }
      });
    }, '');
  }

  addPlaylist() {
    window.callModal('prompt', this.props.t('CL_CREATE_PLAYLIST'), '', playlistName => {
      axios.post('/api/admin/playlists', { name: playlistName, flag_visible: false, flag_current: false, flag_public: false }).then(response => {
        this.props.changeIdPlaylist(response.data.data);
      });
    }
    );
  }

  deletePlaylist() {
    window.callModal('confirm', this.props.t('CL_DELETE_PLAYLIST', { playlist: this.props.playlistInfo.name }), '', confirm => {
      if (confirm) {
        axios.delete('/api/' + this.props.scope + '/playlists/' + this.props.idPlaylist);
      }
    });
  }

  startFavMix() {
    var response = axios.get('/api/public/users/')
    var userList = response.data.data.filter(u => u.type < 2);

    var userlistStr = '<div class="automixUserlist">';
    userList.array.forEach(k => {
      userlistStr +=
        '<div class="checkbox"><label>'
        + '<input type="checkbox" name="users"'
        + ' value="' + k.login + '" ' + (k.flag_online ? 'checked' : '') + '>'
        + k.nickname + '</label></div>';
    });
    userlistStr += '</div>';

    window.callModal('custom', this.props.t('START_FAV_MIX'),
      userlistStr + '<input type="text"name="duration" placeholder="200 (min)"/>', data => {
        if (!data.duration) data.duration = 200;
        axios.post('/api/admin/automix', data).then(response => {
          this.props.changeIdPlaylist(response.data.data.playlist_id)
        });
      }
    );
  }

  async exportPlaylist() {
    var url = idPlaylist === -5 ? '/api/public/favorites' : '/api' + this.props.scope + '/playlists/' + this.props.idPlaylist + '/export'
    var response = await axios.get(url);
    var dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(response.data, null, 4));
    var dlAnchorElem = document.getElementById('downloadAnchorElem');
    dlAnchorElem.setAttribute('href', dataStr);
    if (idPlaylist === -5) {
      dlAnchorElem.setAttribute('download', ['KaraMugen', 'fav', this.props.logInfos.username, new Date().toLocaleDateString().replace('\\', '-')].join('_') + '.kmplaylist');
    } else {
      dlAnchorElem.setAttribute('download', ['KaraMugen', this.props.playlistInfo.name, new Date().toLocaleDateString().replace('\\', '-')].join('_') + '.kmplaylist');
    }
    dlAnchorElem.click();
  }

  importPlaylist() {
    if (!window.FileReader) return alert('FileReader API is not supported by your browser.');
    var input = this;
    if (input.files && input.files[0]) {
      file = input.files[0];
      fr = new FileReader();
      fr.onload = function () {
        var data = {};
        var name;
        if (file.name.includes('KaraMugen_fav')) {
          data['favorites'] = fr['result'];
          url = '/api/public/favorites/import';
          name = 'Favs';
        } else {
          url = '/api/' + scope + '/playlists/import';
          data['playlist'] = fr['result'];
          name = JSON.parse(fr.result).PlaylistInformation.name;
        }
        axios.post(url, data).then(response => {
        window.displayMessage('success', 'Playlist importée' + ' : ', name);
          if (response.unknownKaras && response.unknownKaras.length > 0) {
            window.displayMessage('warning', 'Karas inconnus' + ' : ', response.unknownKaras);
        }
          var playlist_id = file.name.includes('KaraMugen_fav') ? -5 : response.playlist_id;
        this.props.changeIdPlaylist(playlist_id);
        });
      };
      fr.readAsText(file);
    }
  }

  deleteAllKaras() {
    axios.put(this.props.getPlaylistUrl().replace('/karas', '') + '/empty');
  }

  getActionDivContainer() {
    const commandsControls = (
      <div className="btn-group plCommands controls">
        {this.props.idPlaylist >= 0 ?
          <button title={this.props.t("PLAYLIST_EDIT")} className="btn btn-default" name="editName" onClick={this.props.editNamePlaylist}>
            <i className="fas fa-pencil"></i>
          </button> : null
        }
        <button title={this.props.t("START_FAV_MIX")} className="btn btn-default" name="startFavMix" onClick={this.startFavMix}>
          <i className="fas fa-bolt"></i>
        </button>
        <button title={this.props.t("PLAYLIST_ADD")} className="btn btn-default" name="add" onClick={this.addPlaylist}>
          <i className="fas fa-plus"></i>
        </button>
        {this.props.idPlaylist >= 0 && this.props.playlistInfo && !this.props.playlistInfo.flag_current && !this.props.playlistInfo.flag_public ?
          <button title={this.props.t("PLAYLIST_DELETE")} className="btn btn-danger" name="delete" onClick={this.deletePlaylist}>
            <i className="fas fa-times"></i>
          </button> : null
        }
        <label htmlFor={"import-file" + this.props.side} title={this.props.t("PLAYLIST_IMPORT")} className="btn btn-default" name="import">
          <i className="fas fa-download"></i>
          <input id={"import-file" + this.props.side} className="import-file" type="file" accept=".kmplaylist" style={{ display: 'none' }}
            onClick={this.importPlaylist} />
        </label>
        <button title={this.props.t("PLAYLIST_EXPORT")} className="btn btn-default" name="export" onClick={this.exportPlaylist} >
          <i className="fas fa-upload"></i>
        </button>
      </div>);

    const actionDivContainer = (
      <div className="btn-group plCommands actionDiv">
        {this.props.idPlaylistTo >= 0 ?
          <React.Fragment>
            <button title={this.props.t("ADD_RANDOM_KARAS")} name="addRandomKaras" className="btn btn-default clusterAction" onClick={this.addRandomKaras}>
              <img src={getLucky} />
            </button>
            <button title={this.props.t("ADD_ALL_KARAS")} name="addAllKaras" className="btn btn-danger clusterAction" onClick={this.addAllKaras}>
              <i className="fas fa-share"></i>
            </button>
          </React.Fragment>
          : null
        }
        <button title={this.props.t("EMPTY_LIST")} name="deleteAllKaras" className="btn btn-danger clusterAction" onClick={this.deleteAllKaras}>
          <i className="fas fa-eraser"></i>
        </button>
        <ActionsButtons idPlaylistTo={this.props.idPlaylistTo} idPlaylist={this.props.idPlaylist}
          scope={this.props.scope} playlistToAddId={this.props.playlistToAddId} isHeader={true}
          addKara={this.props.addCheckedKaras} deleteKara={this.props.deleteCheckedKaras} transferKara={this.props.transferCheckedKaras} />
        <button 
          title={this.props.t("SELECT_ALL")}
          name="selectAllKaras"
          onClick={() => {
            this.setState({ selectAllKarasChecked: !this.state.selectAllKarasChecked });
            this.props.selectAllKaras();
          }}
          className="btn btn-default clusterAction"
        >
          {
            this.state.selectAllKarasChecked  
              ? <i className="far fa-check-square"></i>
              : <i className="far fa-square"></i>
          }
        </button>
      </div>);

    return (
      this.props.scope === 'admin' && this.props.playlistCommands && this.props.idPlaylist !== -4 ?
        <div className="plCommandsContainer actionDivContainer">
          {this.props.side === 1 ?
            <React.Fragment>{commandsControls} {actionDivContainer}</React.Fragment> :
            <React.Fragment>{actionDivContainer}{commandsControls} </React.Fragment>
          }
        </div> : null)
  }

  setFlagCurrent() {
    if (!this.props.playlistInfo.flag_current) {
      axios.put('/api/admin/playlists/' + this.props.idPlaylist + '/setCurrent');
    }
  }

  setFlagPublic() {
    if (!this.props.playlistInfo.flag_public) {
      axios.put('/api/admin/playlists/' + this.props.idPlaylist + '/setPublic');
    }
  }

  setFlagVisible() {
    axios.put('/api/admin/playlists/' + this.props.idPlaylist,
      { name: this.props.playlistInfo.name, flag_visible: !this.props.playlistInfo.flag_visible });
  }

  getFlagsContainer() {
    return (
      this.props.idPlaylist !== -5 && this.props.scope !== "public" && this.props.playlistInfo ?
        <div className="flagsContainer " >
          <div className="btn-group plCommands flags" id={"flag" + this.props.side}>
            <button title={this.props.t("PLAYLIST_CURRENT")} name="flag_current" onClick={this.setFlagCurrent}
              className={"btn " + (this.props.playlistInfo.flag_current ? "btn-primary" : "btn-default")} >
              <i className="fas fa-video"></i>
            </button>
            <button title={this.props.t("PLAYLIST_PUBLIC")} name="flag_public" onClick={this.setFlagPublic}
              className={"btn " + (this.props.playlistInfo.flag_public ? "btn-primary" : "btn-default")} >
              <i className="fas fa-globe"></i>
            </button>
            {this.props.idPlaylist >= 0 ?
              <button title={this.props.t("PLAYLIST_VISIBLE")} className="btn btn-default" name="flag_visible" onClick={this.setFlagVisible}>
                {this.props.playlistInfo.flag_visible ?
                  <i className="fas fa-eye-slash"></i> :
                  <i className="fas fa-eye"></i>
                }
              </button> : null
            }
          </div>
        </div> : null
    );
  }

  getPlSearch() {
    return (<div className="pull-left plSearch">
      <input type="text" className="form-control input-md" side={this.props.side}
        value={this.props.filterValue} onChange={this.props.changeFilterValue}
        onKeyPress={e => {
          if (e.which == 13) {
            this.props.changeFilterValue(e);
          }
        }}
        id={"searchPlaylist" + this.props.side} placeholder="&#xe003;" name="searchPlaylist" />
    </div>);
  }

  shuffle() {
    axios.put('/api/' + this.props.scope + '/playlists/' + this.props.idPlaylist + '/shuffle')
  }

  smartShuffle() {
    axios.put('/api/' + this.props.scope + '/playlists/' + this.props.idPlaylist + '/shuffle', { smartShuffle: 1 })
  }

  render() {
    const t = this.props.t;
    return (
      <React.Fragment>
        {this.props.scope !== "public" || this.props.side !== 1 ?
          <div className={"panel-heading plDashboard" + (this.props.playlistCommands ? " advanced" : "")}>
            {this.props.scope === "admin" || this.props.mode !== 1 ?
              <div className={(this.props.scope !== "public" ? "col-lg-8 col-md-7 col-sm-6 col-xs-6 " : "") + "plSelect"}>
                {this.props.scope === "admin" && this.props.idPlaylist !== -4 ?
                  <button title={t("PLAYLIST_COMMANDS")} onClick={this.props.togglePlaylistCommands}
                    className={"btn btn-default pull-left showPlaylistCommands" + (this.props.playlistCommands ? " btn-primary" : "")}>
                    <i className="fas fa-wrench"></i>
                  </button> : null
                }
                <select id={"selectPlaylist" + this.props.side} side={this.props.side} type="playlist_select" className="form-control"
                  value={this.props.idPlaylist} onChange={(e) => this.props.changeIdPlaylist(e.target.value)}>
                  {(this.props.scope === 'public' && this.props.side === 1 && this.props.mode === 1) ?
                    <option value={this.props.playlistToAddId} ></option> :
                    this.props.scope === 'public' && this.props.side === 1 ? (
                      <React.Fragment>
                        <option value="-1"></option>
                        <option value="-6"></option>
                        <option value="-5"></option>
                      </React.Fragment>) :
                      this.props.playlistList && this.props.playlistList.map(playlist => {
                        return <option key={playlist.playlist_id} value={playlist.playlist_id}>{playlist.name}</option>;
                      })
                  }
                </select>
              </div> : null
            }
            {this.props.scope === 'admin' ?
              <React.Fragment>
                {this.props.idPlaylist > 0 ?
                  <div className="controlsContainer">
                    <div className="btn-group plCommands controls">
                      <button title={t("PLAYLIST_SHUFFLE")} className="btn btn-default" name="shuffle" onClick={this.shuffle}>
                        <i className="fas fa-random"></i>
                      </button>
                      <button title={t("PLAYLIST_SMART_SHUFFLE")} className="btn btn-default" name="smartShuffle" onClick={this.smartShuffle}>
                        <i className="fas fa-random"></i>
                      </button>
                    </div>
                  </div> : null
                }
                {this.props.idPlaylist === -1 ?
                  <div className="searchMenuButtonContainer btn-group plCommands">
                    <button type="button" className={"searchMenuButton collapsed btn btn-default" + (this.props.searchMenuOpen ? " searchMenuButtonOpen" : "")}
                      onClick={this.props.toggleSearchMenu}>
                      <i className="fas fa-filter"></i>
                    </button>
                  </div> : null
                }
              </React.Fragment > : null
            }
            {this.props.side === 1 ?
              <React.Fragment>{this.getPlSearch()}{this.getFlagsContainer()}{this.getActionDivContainer()}</React.Fragment> :
              <React.Fragment>{this.getActionDivContainer()}{this.getFlagsContainer()}{this.getPlSearch()}</React.Fragment>
            }

          </div> : null
        }
        {this.props.side === 1 && this.props.searchMenuOpen ?
          <nav className="navbar navbar-default  searchMenuContainer">
            <div className="searchMenu container" id={"searchMenu" + this.props.side}>
              <ul className="nav navbar-nav">
                <li className="tagFilter">
                  <span className='value'>
                    <span className="tagsTypesContainer">
                      <select type="text" className="tagsTypes form-control value" placeholder="Search" 
                        onChange={e => this.setState({tagType : Number(e.target.value)})}>
                        {tagsTypesList.map(function (val) {
                          if (val === 'DETAILS_SERIE') {
                            return <option key={val} value='serie'>{t(val)}</option>
                          } else if (val === 'DETAILS_YEAR') {
                            return <option key={val} value='year'>{t(val)}</option>
                          } else {
                            return <option key={val} value={val.replace('BLCTYPE_', '')}>{t(val)}</option>
                          }
                        })}
                      </select>
                    </span>
                    <span className="tagsContainer">
                      <select type="text" className="tags form-control value" placeholder="Search" 
                        onChange={(e) => this.props.onChangeTags(this.state.tagType, e.target.value)}>
                        {this.props.tags && this.props.tags.filter(tag => tag.type.includes(this.state.tagType)).map(tag => {
                          return <option key={tag.id} value={tag.id}>{tag.karacount +" "+ tag.text}</option>
                        })}
                      </select>
                    </span>
                  </span>
                  <a className="choice" href="#" onClick={() => this.props.getPlaylist("search")}><i className="glyphicon glyphicon-filter"></i> {t("FILTER")}</a>
                </li>
                <li className="active"><a className="choice" href="#" onClick={() => this.props.getPlaylist()}>
                  <i className="glyphicon glyphicon-sort-by-alphabet"></i> {t("VIEW_STANDARD")}</a></li>
                <li ><a className="choice" href="#" onClick={() => this.props.getPlaylist()}><i className="glyphicon glyphicon-star"></i> {t("VIEW_FAVORITES")}</a></li>
                <li ><a className="choice" href="#" onClick={() => this.props.getPlaylist("recent")}><i className="glyphicon glyphicon-time"></i> {t("VIEW_RECENT")}</a></li>
                <li ><a className="choice" href="#" onClick={() => this.props.getPlaylist("requested")}><i className="glyphicon glyphicon-fire"></i> {t("VIEW_POPULAR")}</a></li>

              </ul>
            </div>
          </nav> : null
        }
      </React.Fragment >
    )
  }
}


export default withTranslation()(PlaylistHeader);