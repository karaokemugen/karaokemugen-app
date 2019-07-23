import React, { Component } from "react";
import { withTranslation } from "react-i18next";
import axios from "axios";
import getLucky from "../../assets/clover.png"

class PlaylistHeader extends Component {
  constructor(props) {
    super(props);
    this.state = {
    };
    this.addRandomKaras = this.addRandomKaras.bind(this);
  }

  addRandomKaras() {
    window.displayModal('prompt', this.props.t('CL_ADD_RANDOM_TITLE'), '', function (nbOfRandoms) {
      axios.get(this.props.getPlaylistUrl(), { random: nbOfRandoms }).then(randomKaras => {
        if (randomKaras.content.length > 0) {
          let textContent = randomKaras.content.map(e => window.buildKaraTitle(e)).join('<br/><br/>');
          window.displayModal('confirm', this.props.t('CL_CONGRATS'), this.props.t('CL_ABOUT_TO_ADD') + '<br/><br/>' + textContent, () => {
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

  getActionDivContainer() {
    const commandsControls = (
      <div className="btn-group plCommands controls">
        <button title={this.props.t("PLAYLIST_EDIT")} className="btn btn-default" name="editName">
          <i className="glyphicon glyphicon-pencil"></i>
        </button>
        <button title={this.props.t("START_FAV_MIX")} className="btn btn-default plGenericButton" name="startFavMix">
          <i className="glyphicon glyphicon-flash"></i>
        </button>
        <button title={this.props.t("PLAYLIST_ADD")} className="btn btn-default plGenericButton" name="add">
          <i className="glyphicon glyphicon-plus-sign"></i>
        </button>
        <button title={this.props.t("PLAYLIST_DELETE")} className="btn btn-danger" name="delete">
          <i className="glyphicon glyphicon-remove red"></i>
        </button>
        <label htmlFor={"import-file" + this.props.side} title={this.props.t("PLAYLIST_IMPORT")} className="btn btn-default plGenericButton" name="import">
          <i className="glyphicon glyphicon-import"></i>
          <input id={"import-file" + this.props.side} className="import-file" type="file" accept=".kmplaylist" style={{ display: 'none' }} />
        </label>
        <button title={this.props.t("PLAYLIST_EXPORT")} className="btn btn-default" name="export">
          <i className="glyphicon glyphicon-export"></i>
        </button>
      </div>);

    const actionDivContainer = (
      <div className="btn-group plCommands actionDiv">
        {this.props.playlistToAddId >= 0 ?
          <React.Fragment>
            <button title={this.props.t("ADD_RANDOM_KARAS")} name="addRandomKaras" className="btn btn-default clusterAction">
              <img src={getLucky} />
            </button>
            <button title={this.props.t("ADD_ALL_KARAS")} name="addAllKaras" className="btn btn-danger clusterAction">
              <i className="glyphicon glyphicon-share"></i>
            </button>
          </React.Fragment>
          : null
        }
        <button title={this.props.t("EMPTY_LIST")} name="deleteAllKaras" className="btn btn-danger clusterAction">
          <i className="glyphicon glyphicon-erase"></i>
        </button>,
      <button title={this.props.t("ADD_KARA")} name="addKara" className="btn btn-default">
        </button>,
      <button title={this.props.t("DELETE_KARA")} name="deleteKara" className="btn btn-default">
        </button>,
      <button title={this.props.t("TRANSFER_KARA")} name="transferKara" className="btn btn-default">
        </button>,
      <button title={this.props.t("SELECT_ALL")} name="selectAllKaras" className="btn btn-default clusterAction">
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

  getFlagsContainer() {
    return (
    this.props.idPlaylist !== -5 ?
      <div className={"flagsContainer " + (this.props.scope === "public" ? "hidden" : "")} >
        <div className={"btn-group plCommands flags " + (this.props.scope === "public" ? "hidden" : "")}
          id={"flag" + this.props.side}>
          <button title={this.props.t("PLAYLIST_CURRENT")} className={"btn " + (this.props.playlistInfo && this.props.playlistInfo.flag_current ? "btn-primary" : "btn-default")} name="flag_current">
            <i className="glyphicon glyphicon-facetime-video"></i>
          </button>
          <button title={this.props.t("PLAYLIST_PUBLIC")} className={"btn " + (this.props.playlistInfo && this.props.playlistInfo.flag_public ? "btn-primary" : "btn-default")} name="flag_public">
            <i className="glyphicon glyphicon-globe"></i>
          </button>
          <button title={this.props.t("PLAYLIST_VISIBLE")} className="btn btn-default" name="flag_visible">
            <i className="glyphicon glyphicon-eye-close"></i><i className="glyphicon glyphicon-eye-open"></i>
          </button>
        </div>
      </div> : null
      );
  }

  getPlSearch() {
    return (<div className="pull-left plSearch">
      <input type="text" className="form-control input-md" side={this.props.side}
        value={this.props.searchValue} onChange={this.props.changeSearchValue}
        onKeyPress={e => {
          if (e.which == 13) {
            this.props.changeSearchValue(e);
          }
        }}
        id={"searchPlaylist" + this.props.side} placeholder="&#xe003;" name="searchPlaylist" />
    </div>);
  }


  render() {
    const t = this.props.t;

    return (
      <React.Fragment>
        {this.props.scope !== "public" || this.props.side !== 1 ?
          <div className={"panel-heading container-fluid plDashboard"+(this.props.playlistCommands ? " advanced":"")}>
            {this.props.scope === "admin" || this.props.mode !== 1 ?
              <div className={(this.props.scope !== "public" ? "col-lg-8 col-md-7 col-sm-6 col-xs-6 " : "") + "plSelect"}>
                {this.props.scope === "admin" ?
                  <button title={t("PLAYLIST_COMMANDS")} onClick={this.props.togglePlaylistCommands}
                    className={"btn btn-default pull-left showPlaylistCommands"+(this.props.playlistCommands ? " btn-primary" : "")}>
                    <i className="glyphicon glyphicon-wrench"></i>
                  </button> : null
                }
                <select id={"selectPlaylist" + this.props.side} side={this.props.side} type="playlist_select" className="form-control"
                  value={this.props.idPlaylist} onChange={this.props.changeIdPlaylist}>
                  {(this.props.scope === 'public' && this.props.side === 1 && this.props.mode === 1) ?
                    <option value={this.props.playlistToAddId} data-playlist_id={this.props.playlistToAddId}></option> :
                    this.props.scope === 'public' && this.props.side === 1 ? (
                      <React.Fragment>
                        <option value="-1" data-playlist_id="-1"></option>
                        <option value="-6" data-playlist_id="-6"></option>
                        <option value="-5" data-playlist_id="-5"></option>
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
                <div className="controlsContainer">
                  <div className="btn-group plCommands controls">
                    <button title={t("PLAYLIST_SHUFFLE")} className="btn btn-default" name="shuffle">
                      <i className="glyphicon glyphicon-random"></i>
                    </button>
                    <button title={t("PLAYLIST_SMART_SHUFFLE")} className="btn btn-default" name="smartShuffle">
                      <i className="glyphicon glyphicon-random"></i>
                    </button>
                  </div>

                </div>
                <div className="searchMenuButtonContainer btn-group plCommands">
                  <button type="button" className="searchMenuButton collapsed btn btn-default"
                    data-toggle="collapse" data-target={"#searchMenu" + this.props.side} aria-expanded="false">
                    <i className="glyphicon glyphicon-filter"></i>
                  </button>
                </div>
              </React.Fragment > : null
            }
            {this.props.side === 1 ?
              <React.Fragment>{this.getPlSearch()}{this.getFlagsContainer()}{this.getActionDivContainer()}</React.Fragment> :
              <React.Fragment>{this.getActionDivContainer()}{this.getFlagsContainer()}{this.getPlSearch()}</React.Fragment>
            }

          </div> : null
        }
        {this.props.scope === 'admin' || (this.props.side === 1 && this.props.scope === 'public') ?
          <nav className="navbar navbar-default  searchMenuContainer">
            <div className="searchMenu container collapse" id={"searchMenu" + this.props.side}>
              <ul className="nav navbar-nav">
                <li val="-1" searchtype="search" className="tagFilter">
                  <span className='value'>
                    <span className="tagsTypesContainer">
                      <select type="text" className="tagsTypes form-control value" placeholder="Search">
                      </select>
                    </span>
                    <span className="tagsContainer">
                      <select type="text" className="tags form-control value" placeholder="Search">
                      </select>
                    </span>
                  </span>
                  <a className="choice" href="#"><i className="glyphicon glyphicon-filter"></i> {t("FILTER")}</a>
                </li>
                <li className="active"><a className="choice" href="#"><i className="glyphicon glyphicon-sort-by-alphabet"></i> {t("VIEW_STANDARD")}</a></li>
                <li ><a className="choice" href="#"><i className="glyphicon glyphicon-star"></i> {t("VIEW_FAVORITES")}</a></li>
                <li searchtype="recent" ><a className="choice" href="#"><i className="glyphicon glyphicon-time"></i> {t("VIEW_RECENT")}</a></li>
                <li searchtype="requested" ><a className="choice" href="#"><i className="glyphicon glyphicon-fire"></i> {t("VIEW_POPULAR")}</a></li>

              </ul>
            </div>
          </nav> : null
        }
      </React.Fragment >
    )
  }
}


export default withTranslation()(PlaylistHeader);