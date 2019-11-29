import React, { Component } from 'react';
import i18next from 'i18next';
import iso639 from 'iso-639';
import axios from 'axios';
import Autocomplete from '../generic/Autocomplete';
import blankAvatar from '../../../../assets/blank.png';
import { displayMessage, callModal } from '../tools';
import ReactDOM from 'react-dom';
import OnlineProfileModal from './OnlineProfileModal';
require('babel-polyfill');
import store from '../../store';
class ProfilModal extends Component {
	constructor(props) {
		super(props);
		this.state = {
			pathAvatar: '/avatars/',
			users: [],
			user: {},
			passwordDifferent: 'form-control',
			activeView: 1
		};
	}

	async componentDidMount() {
		this.getUser();
		this.getUserList();
	}

    onKeyPress = event => {
    	const user = this.state.user;
    	user[event.target.name] = event.target.value;
    	this.setState({ user: user });
    	if (event.which === 13) {
    		if (this.state.user.password && this.state.user.password === this.state.user.passwordConfirmation || !this.state.user.password) {
    			this.setState({ passwordDifferent: 'form-control' });
    			axios.put('/api/public/myaccount/', this.state.user);
    		} else {
    			this.setState({ passwordDifferent: 'form-control redBorders' });
    		}
    	}
    };

    onClick(name, value) {
    	const user = this.state.user;
    	user[name] = value;
    	this.setState({ user: user });
    	if (this.state.user.password && this.state.user.password === this.state.user.passwordConfirmation || !this.state.user.password) {
    		this.setState({ passwordDifferent: 'form-control' });
    		axios.put('/api/public/myaccount/', this.state.user);
    	} else {
    		this.setState({ passwordDifferent: 'form-control redBorders' });
    	}
    }

    async getUser() {
    	var response = await axios.get('/api/public/myaccount/');
    	var user = response.data.data;
    	user.password = undefined;
    	this.setState({ user: user });
    }

    async getUserList() {
    	var response = await axios.get('/api/public/users/');
    	this.setState({ users: response.data.data.filter(a => a.flag_online) });
    }

    profileConvert = () => {
    	ReactDOM.render(<OnlineProfileModal type="convert" loginServ={this.props.settingsOnline.Host} />, document.getElementById('modal'));
    };

    profileDelete = () => {
    	ReactDOM.render(<OnlineProfileModal type="delete" />, document.getElementById('modal'));
    };

    favImport = event => {
    	if (!window.FileReader) return alert('FileReader API is not supported by your browser.');
    	var input = event.target;
    	if (input.files && input.files[0]) {
    		var file = input.files[0];
    		var fr = new FileReader();
    		fr.onload = () => {
    			callModal('confirm', i18next.t('CONFIRM_FAV_IMPORT'), '', function (confirm) {
    				if (confirm) {
    					var data = {};
    					data['favorites'] = fr['result'];
    					axios.post('/api/public/favorites/import', data);
    				}
    			});
    		};
    		fr.readAsText(file);
    	}
    };

    async favExport() {
    	const exportFile = await axios.get('/api/public/favorites/export');
    	var dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportFile, null, 4));
    	var dlAnchorElem = document.getElementById('downloadAnchorElem');
    	dlAnchorElem.setAttribute('href', dataStr);
    	dlAnchorElem.setAttribute('download', ['KaraMugen', 'fav', store.getLogInfos().username, new Date().toLocaleDateString().replace('\\', '-')].join('_') + '.kmplaylist');
    	dlAnchorElem.click();
    }

    getUserDetails = async event => {
    	const response = await axios.get('/api/public/users/' + event.currentTarget.id);
    	const responseUserDetails = response.data.data;
    	this.setState({ userDetails: { email: responseUserDetails.email, url: responseUserDetails.url, bio: responseUserDetails.bio, } });
    };

    importAvatar = async event => {
    	var dataFile = new FormData();
    	for (var i = 0; i < event.target.files.length; i++) {
    		dataFile.append('avatarfile', event.target.files[i]);
    	}
    	dataFile.append('nickname', store.getLogInfos().username);

    	const response = await axios.put('/api/public/myaccount', dataFile);
    	const user = this.state.user;
    	user['avatar_file'] = response.data.data.avatar_file;
    	this.setState({ user: user });
    };

    render() {
    	var logInfos = store.getLogInfos();
    	var listLangs = Object.keys(iso639.iso_639_2).map(k => {
    		return { 'label': iso639.iso_639_2[k][i18next.languages[0]][0], 'value': k }; 
    	});
    	if (!this.props.settingsOnline.Users && logInfos.username.includes('@')) {
    		setTimeout(function () {
    			displayMessage('warning', <div><label>{i18next.t('LOG_OFFLINE.TITLE')}</label> <br/> {i18next.t('LOG_OFFLINE.MESSAGE')}</div>, 8000);
    		}, 500);
    	}
    	return (
    		<div className="modal modalPage" id="profilModal">
    			<div className="modal-dialog modal-md">
    				<div className="modal-content">
    					<ul className="nav nav-tabs nav-justified modal-header">
    						<li className={'modal-title ' + (this.state.activeView === 1 ? 'active' : '')}>
    							<a onClick={() => this.setState({activeView: 1})}> {i18next.t('PROFILE')}</a>
    						</li>
    						{logInfos.role !== 'guest' ?
    							<li className={'modal-title ' + (this.state.activeView === 2 ? 'active' : '')}>
    								<a onClick={() => this.setState({activeView: 2})}> {i18next.t('LANGUAGE')}</a>
    							</li> : null
    						}
    						<li className={'modal-title ' + (this.state.activeView === 3 ? 'active' : '')}>
    							<a onClick={() => this.setState({activeView: 3})}> {i18next.t('USERLIST')}</a>
    						</li>
    						<button className="closeModal btn btn-action" 
    							onClick={() => ReactDOM.unmountComponentAtNode(document.getElementById('modal'))}>
    							<i className="fas fa-times"></i>
    						</button>
    					</ul>
    					<div className="tab-content" id="nav-tabContent">
    						{this.state.activeView === 1 ?
    							<div id="nav-profil" className="modal-body" >
    								<div className="profileContent">
    									<div className="col-md-3 col-lg-3 col-xs-12 col-sm-12">
    										<label title={i18next.t('AVATAR_IMPORT')} className="btn btn-default avatar" name="import">
    											<img className="img-circle" name="avatar_file"
    												src={this.state.user.avatar_file ? this.state.pathAvatar + this.state.user.avatar_file : {blankAvatar}}
    												alt="User Pic" />
    											{logInfos.role !== 'guest' ?
    												<input id="avatar" className="import-file" type="file" accept="image/*" style={{ display: 'none' }} onChange={this.importAvatar} /> : null
    											}
    										</label>
    										<p name="login">{this.state.user.login}</p>
    									</div>
    									{logInfos.role !== 'guest' ?
    										<div className="col-md-9 col-lg-9 col-xs-12 col-sm-12 profileData">
    											<div className="profileLine">
    												<i className="fas fa-user"></i>
    												<input className="form-control" name="nickname" type="text" placeholder={i18next.t('PROFILE_USERNAME')} defaultValue={this.state.user.nickname} onKeyUp={this.onKeyPress} />
    											</div>
    											<div className="profileLine">
    												<i className="fas fa-envelope"></i>
    												<input className="form-control" name="email" type="text" placeholder={i18next.t('PROFILE_MAIL')} defaultValue={this.state.user.email} onKeyUp={this.onKeyPress} />
    											</div>
    											<div className="profileLine">
    												<i className="fas fa-link"></i>
    												<input className="form-control" name="url" type="text" placeholder={i18next.t('PROFILE_URL')} defaultValue={this.state.user.url} onKeyUp={this.onKeyPress} />
    											</div>
    											<div className="profileLine">
    												<i className="fas fa-leaf"></i>
    												<input className="form-control" name="bio" type="text" placeholder={i18next.t('PROFILE_BIO')} defaultValue={this.state.user.bio} onKeyUp={this.onKeyPress} />
    											</div>
    											<div className="profileLine">
    												<i className="fas fa-lock"></i>
    												<input className={this.state.passwordDifferent} name="password" type="password"
    													placeholder={i18next.t('PROFILE_PASSWORD')} defaultValue={this.state.user.password} onKeyUp={this.onKeyPress} />
    												<input className={this.state.passwordDifferent}
    													name="passwordConfirmation" type="password" placeholder={i18next.t('PROFILE_PASSWORDCONF')}
    													defaultValue={this.state.user.passwordConfirmation} onKeyUp={this.onKeyPress} style={{ marginLeft: 3 + 'px' }} />
    											</div>
    											<div className="profileLine">
    												<i className="fas fa-star"></i>
    												<label type="button" title={i18next.t('FAVORITES_IMPORT')} className="btn btn-action btn-default col-xs-6 col-lg-6 favImport">
    													<i className="fas fa-download"></i> {i18next.t('IMPORT')}
    													<input id="favImport" className="import-file" type="file" accept=".kmplaylist" style={{ display: 'none' }} onChange={this.favImport} />
    												</label>
    												<button type="button" title={i18next.t('FAVORITES_EXPORT')} className="btn btn-action btn-default col-xs-6 col-lg-6 favExport" onClick={this.favExport}>
    													<i className="fas fa-upload"></i> {i18next.t('EXPORT')}
    												</button>
    											</div>
    											{this.props.settingsOnline.Users && logInfos.role !== 'guest' ?
    												<div className="profileLine">
    													{logInfos.onlineToken ?
    														<button type="button" title={i18next.t('PROFILE_ONLINE_DELETE')} className="btn btn-primary btn-action btn-default col-xs-12 col-lg-12 profileDelete" onClick={this.profileDelete}>
    															<i className="fas fa-retweet"></i> {i18next.t('PROFILE_ONLINE_DELETE')}
    														</button>
    														:
    														<button type="button" title={i18next.t('PROFILE_CONVERT')} className="btn btn-primary btn-action btn-default col-xs-12 col-lg-12 profileConvert" onClick={this.profileConvert}>
    															<i className="fas fa-retweet"></i> {i18next.t('PROFILE_CONVERT')}
    														</button>
    													}
    												</div> : null
    											}
    										</div> : null
    									}
    								</div>
    							</div> : null}
    						{this.state.activeView === 2 ? 
    							<div id="nav-lang" className="modal-body">
    								<div className="profileContent">
    									<div className="col-md-12 col-lg-12 col-xs-12 col-sm-12 profileData">
    										<div className="profileLine row">
    											<label className="col-xs-6 control-label">{i18next.t('SERIE_NAME_MODE')}</label>
    											<div className="col-xs-6">
    												<select type="number" className="form-control" name="series_lang_mode" defaultValue={this.state.user.series_lang_mode} onChange={this.onKeyPress}>
    													<option value="-1" default>{i18next.t('SERIE_NAME_MODE_NO_PREF')}</option>
    													<option value="0">{i18next.t('SERIE_NAME_MODE_ORIGINAL')}</option>
    													<option value="1">{i18next.t('SERIE_NAME_MODE_SONG')}</option>
    													<option value="2">{i18next.t('SERIE_NAME_MODE_ADMIN')}</option>
    													<option value="3">{i18next.t('SERIE_NAME_MODE_USER')}</option>
    													<option value="4">{i18next.t('SERIE_NAME_MODE_USER_FORCE')}</option>
    												</select>
    											</div>
    										</div>
    										{this.state.user.series_lang_mode === '4' ?
    											<React.Fragment>
    												<div className="profileLine row">
    													<label className="col-xs-6 control-label">{i18next.t('MAIN_SERIES_LANG')}</label>
    													<div className="col-xs-6">
    														<Autocomplete className="form-control" name="main_series_lang" value={this.state.user.main_series_lang} options={listLangs} onChange={(value) => this.onClick('main_series_lang', value)} />
    													</div>
    												</div>
    												<div className="profileLine row">
    													<label className="col-xs-6 control-label">{i18next.t('FALLBACK_SERIES_LANG')}</label>
    													<div className="col-xs-6">
    														<Autocomplete className="form-control" name="fallback_series_lang" value={this.state.user.fallback_series_lang} options={listLangs} onChange={(value) => this.onClick('fallback_series_lang', value)} />
    													</div>
    												</div>
    											</React.Fragment> : null
    										}
    									</div>
    								</div>
    							</div> : null
    						}
    						{this.state.activeView === 3 ?
    							<div id="nav-userlist" className="modal-body">
    								<div className="userlist list-group col-md-12 col-lg-12 col-xs-12 col-sm-12">
    									{this.state.users.map(user => {
    										return <li key={user.login} className={user.flag_online ? 'list-group-item online' : 'list-group-item'} id={user.login} onClick={this.getUserDetails}>
    											<div className="userLine">
    												<span className="nickname">{user.nickname}</span>
    												<img className="avatar" src={this.state.pathAvatar + user.avatar_file} />
    											</div>
    											{this.state.userDetails ?
    												<div className="userDetails">
    													<div><i className="fas fa-envelope"></i>{this.state.userDetails.email ? this.state.userDetails.email : ''}</div>
    													<div><i className="fas fa-link"></i>{this.state.userDetails.url ? this.state.userDetails.url : ''}</div>
    													<div><i className="fas fa-leaf"></i>{this.state.userDetails.bio ? this.state.userDetails.bio : ''}</div>
    												</div> : null
    											}
    										</li>;
    									})}
    								</div>
    							</div> : null
    						}
    					</div>

    				</div>
    			</div>
    		</div>
    	);
    }
}

export default ProfilModal;
