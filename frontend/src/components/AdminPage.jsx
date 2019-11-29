import React, { Component } from 'react';
import KmAppWrapperDecorator from './decorators/KmAppWrapperDecorator';
import PlaylistMainDecorator from './decorators/PlaylistMainDecorator';
import KmAppBodyDecorator from './decorators/KmAppBodyDecorator';
import Playlist from './karas/Playlist';
import AdminHeader from './AdminHeader';
import Options from './options/Options';
import ProfilModal from './modals/ProfilModal';
import LoginModal from './modals/LoginModal';
import ProgressBar from './karas/ProgressBar';
import ReactDOM from 'react-dom';
import store from '../store';
import { displayMessage, is_touch_device, getSocket } from './tools';
import i18next from 'i18next';
import AdminMessageModal from './modals/AdminMessageModal';
import axios from 'axios';

class AdminPage extends Component {
	constructor(props) {
		super(props);
		this.state = {
			options: false,
			idsPlaylist: { left: '', right: '' },
			searchMenuOpen1: false,
			searchMenuOpen2: false,
			mobileMenu: false,
			statusPlayer: {}
		};
		if (!store.getLogInfos() || !store.getLogInfos().token || store.getLogInfos().role !== 'admin') {
			if (store.getLogInfos() && store.getLogInfos().token && store.getLogInfos().role !== 'admin') {
				displayMessage('warning', i18next.t('ADMIN_PLEASE'));
			}
			store.logOut();
			this.openLoginOrProfileModal();
		}
	}

	componentDidMount() {
		if (is_touch_device()) {
			getSocket().on('playerStatus', data => {
				var val = parseInt(data.volume);
				var base = 100;
				var pow = 0.76;
				val = val / base;
				data.volume = base * Math.pow(val, 1 / pow);
				this.setState({ statusPlayer: data });
			});
		}
	}

  majIdsPlaylist = (side, value) => {
  	var idsPlaylist = this.state.idsPlaylist;
  	if (side === 1) {
  		idsPlaylist.left = Number(value);
  	} else {
  		idsPlaylist.right = Number(value);
  	}
  	this.setState({ idsPlaylist: idsPlaylist });
  };

  toggleSearchMenu1 = () => {
  	this.setState({searchMenuOpen1: !this.state.searchMenuOpen1});
  };

  toggleSearchMenu2 = () => {
  	this.setState({searchMenuOpen2: !this.state.searchMenuOpen2});
  };

  openLoginOrProfileModal = () => {
  	if (store.getLogInfos() && store.getLogInfos().token) {
  		ReactDOM.render(<ProfilModal 
  			settingsOnline={this.props.settings.config.Online}
  		/>, document.getElementById('modal'));
  	} else {
  		ReactDOM.render(<LoginModal 
  			scope='admin'
  		/>, document.getElementById('modal'));
  	}
  };

  adminMessage = () => {
  	ReactDOM.render(<AdminMessageModal />, document.getElementById('modal'));
  };

  putPlayerCommando(event) {
  	var namecommand = event.currentTarget.getAttribute('namecommand');
  	var data;
  	if (namecommand === 'setVolume') {
  		var volume = parseInt(event.currentTarget.value);
  		var base = 100;
  		var pow = 0.76;
  		volume = Math.pow(volume, pow) / Math.pow(base, pow);
  		volume = volume * base;
  		data = {
  			command: namecommand,
  			options: volume,
  		};
  	} else if (namecommand === 'goTo') {
  		data = {
  			command: namecommand,
  			options: 1
  		};
  	} else {
  		data = {
  			command: namecommand
  		};
  	}
  	axios.put('/api/admin/player', data);
  }

  render() {
  	return (
  		<div id="adminPage">      
  			<KmAppWrapperDecorator>

  				<AdminHeader 
  					config={this.props.settings.config}
  					toggleProfileModal={this.openLoginOrProfileModal}
  					setOptionMode={() => {
  						this.setState({ options: !this.state.options });
  						store.getTuto() && store.getTuto().move(1);
  					}}
  					powerOff={this.props.powerOff}
					  options={this.state.options}
					  adminMessage={this.adminMessage}
					  putPlayerCommando={this.putPlayerCommando}
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
  					<PlaylistMainDecorator className={this.state.options ? 'hidden' : ''}>
  						<Playlist 
  							scope='admin'
  							side={1}
  							navigatorLanguage={this.props.navigatorLanguage}
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
			  {is_touch_device() ? (
  				<div className="fixed-action-btn right mobileActions">
  					<a
  						className="btn-floating btn-large waves-effect z-depth-3 klogo"
  						onClick={() =>
  							this.setState({ mobileMenu: !this.state.mobileMenu })
  						}
  						style={{
  							backgroundColor: '#1b4875',
  							border: '.5px solid #FFFFFF12'
  						}}
  					/>
  					{this.state.mobileMenu ? (
  						<ul>
						  <li>
							  <a
								  className="z-depth-3 btn-floating btn-large btn-danger"
								  style={{ backgroundColor: '#111' }}
								  namecommand="stopNow"
								  onClick={this.putPlayerCommando}
							  >
								  <i className="fas fa-stop"></i>
							  </a>
						  </li>
						  <li>
							  <a
								  className="z-depth-3 btn-floating btn-large"
								  style={{ backgroundColor: '#111' }}
								  namecommand="goTo"
								  defaultValue="0"
								  onClick={this.putPlayerCommando}
							  >
								  <i className="fas fa-backward"></i>
							  </a>
						  </li>
						  <li>
							  <a
								  className="z-depth-3 btn-floating btn-large"
								  style={{ backgroundColor: '#111' }}
								  namecommand={this.state.statusPlayer.showSubs ? 'hideSubs' : 'showSubs'}
								  onClick={this.putPlayerCommando}
							  >
  									{this.state.statusPlayer.showSubs ? (
  										<i className="fas fa-closed-captioning"></i>
  									) : (
  										<span className="fa-stack">
  											<i className="fas fa-closed-captioning fa-stack-1x"></i>
  											<i className="fas fa-ban fa-stack-2x" style={{color:'#943d42',opacity:0.7}}></i>
  										</span>
  									)}
							  </a>
						  </li>
						  <li>
							  <a
								  className="z-depth-3 btn-floating btn-large"
								  style={{ backgroundColor: '#111' }}
								  onClick={this.adminMessage}
							  >
								  <i className="fas fa-comment" />
							  </a>
						  </li>
						  <li>
							  <a
								  className="z-depth-3 btn-floating btn-large"
								  style={{ backgroundColor: '#111' }}
								  onClick={this.props.powerOff}
							  >
								  <i className="fas fa-power-off" />
							  </a>
						  </li>
  							<li>
  								<a
  									className="z-depth-3 btn-floating btn-large logout"
  									style={{ backgroundColor: '#111' }}
  									onClick={store.logOut}
  								>
  									<i className="fas fa-sign-out-alt" />
  								</a>
  							</li>
  							<li>
  								<a
  									className="z-depth-3 btn-floating btn-large changePseudo"
  									id="changePseudo"
  									style={{ backgroundColor: '#431b50' }}
  									onClick={this.openLoginOrProfileModal}
  								>
  									<i className="fas fa-user" />
  								</a>
  							</li>
  						</ul>
  					) : null}
  				</div>
  				) : null}
  		</div>
  	);
  }
}

export default AdminPage;
