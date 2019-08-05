import { Switch, Route } from 'react-router'
import WelcomePage from './components/WelcomePage';
import AdminPage from './components/AdminPage';
import PublicPage from './components/PublicPage';
import React, { Component, Suspense } from 'react';
import ReactDOM from 'react-dom';
import { BrowserRouter } from "react-router-dom";
import i18n from './components/i18n';
import NotFoundPage from './components/NotfoundPage'
import langs from "langs";
import axios from "axios";
import { readCookie, parseJwt, createCookie, eraseCookie, getSocket } from "./components/tools"
import Modal from './components/modals/Modal';
import './components/oldTools';
class App extends Component {
    constructor(props) {
        super(props);
        window.callModal = this.callModal;
        this.state = {
            navigatorLanguage: this.getNavigatorLanguage(),
            logInfos: this.getLogInfos(),
            admpwd: window.location.search.indexOf('admpwd') ? window.location.search.split("=")[1] : undefined,
            shutdownPopup: false
        }
        this.getSettings = this.getSettings.bind(this);
        this.updateLogInfos = this.updateLogInfos.bind(this);
        this.powerOff = this.powerOff.bind(this);
        axios.defaults.headers.common['authorization'] = document.cookie.replace(/(?:(?:^|.*;\s*)mugenToken\s*\=\s*([^;]*).*$)|^.*$/, "$1");
        axios.defaults.headers.common['onlineAuthorization'] = document.cookie.replace(/(?:(?:^|.*;\s*)mugenTokenOnline\s*\=\s*([^;]*).*$)|^.*$/, "$1");
    }

    getLogInfos() {
        let logInfos = {};
        var token = readCookie('mugenToken');
        var onlineToken = readCookie('mugenTokenOnline');
        if (token) {
            logInfos = parseJwt(token);
            logInfos.token = token;
            if (onlineToken) {
                logInfos.onlineToken = onlineToken;
            }
        }
        return logInfos;
    }

    updateLogInfos(data) {
        let logInfos = parseJwt(data.token);
        createCookie('mugenToken', data.token, -1);
        if (data.onlineToken) {
            createCookie('mugenTokenOnline', data.onlineToken, -1);
        } else if (!logInfos.username.includes('@')) {
            eraseCookie('mugenTokenOnline');
        }

        logInfos.token = data.token;
        logInfos.onlineToken = data.onlineToken;
        this.setState({ logInfos: logInfos });
        axios.defaults.headers.common['authorization'] = document.cookie.replace(/(?:(?:^|.*;\s*)mugenToken\s*\=\s*([^;]*).*$)|^.*$/, "$1");
        axios.defaults.headers.common['onlineAuthorization'] = document.cookie.replace(/(?:(?:^|.*;\s*)mugenTokenOnline\s*\=\s*([^;]*).*$)|^.*$/, "$1");
    }

    logOut() {
        eraseCookie('mugenToken');
        eraseCookie('mugenTokenOnline');
        this.setState({ logInfos: {} });
        axios.defaults.headers.common['authorization'] = document.cookie.replace(/(?:(?:^|.*;\s*)mugenToken\s*\=\s*([^;]*).*$)|^.*$/, "$1");
        axios.defaults.headers.common['onlineAuthorization'] = document.cookie.replace(/(?:(?:^|.*;\s*)mugenTokenOnline\s*\=\s*([^;]*).*$)|^.*$/, "$1");
    }

    async parseTags() {
        const response = await axios.get('/api/public/tags');
		return response.data.data.content.map(val => {
            var trad = val.i18n[this.state.navigatorLanguage];
            return {id:val.tid, text: trad ? trad : val.name, type: val.types, karacount: val.karacount};
        });
    }

    async parseSeries() {
        const response = await axios.get('/api/public/series');
		return response.data.data.content.map(val => {
            return {id:val.sid, text: val.i18n_name, type: ['serie'],
                aliases : val.aliases, karacount : val.karacount};
        });
    }

    async parseYears() {
        const response = await axios.get('/api/public/years');
        return response.data.data.content.map(val =>{
            return {id:val.year, text: val.year, type: ['year'], karacount: val.karacount};
        });
    }

    async componentDidMount() {
        this.getSettings();
        getSocket().on('settingsUpdated', this.getSettings);
        getSocket().on('connect', () => this.setState({ shutdownPopup: false }));
        getSocket().on('disconnect', () => this.setState({ shutdownPopup: true }));
        const [tags, series, years] = await Promise.all([this.parseTags(), this.parseSeries(), this.parseYears()]);
        this.setState({tags: tags.concat(series, years)});
    }

    async getSettings() {
        const res = await axios.get('/api/public/settings');
        this.setState({ settings: res.data.data });
    }

    getNavigatorLanguage() {
        var navigatorLanguage;
        var languages = langs.all();
        var index = 0;
        while (!navigatorLanguage && index < languages.length) {
            if (navigator.languages[0].substring(0, 2) === languages[index]["1"]) {
                navigatorLanguage = languages[index]["2B"];
            }
            index++;
        }
        return navigatorLanguage;
    }

    callModal(type, title, message, callback, placeholder) {
        ReactDOM.render(<Suspense fallback={<div>loading...</div>}><Modal type={type} title={title} message={message}
            callback={callback} placeholder={placeholder} /></Suspense>, document.getElementById('modal'));
    }

    powerOff() {
        axios.post("/api/admin/shutdown");
        this.setState({ shutdownPopup: true });
    }

    render() {
        return (
            this.state.shutdownPopup ?
                <div className="shutdown-popup">
                    <div className="noise-wrapper" style={{opacity: 1}}>
                        <div className="noise"></div>'
				    </div>
                    <div className="shutdown-popup-text">{i18n.t('SHUTDOWN_POPUP')}<br/>{"·´¯`(>_<)´¯`·"}</div>
                    <button title={i18n.t('TOOLTIP_CLOSEPARENT')} className="closeParent btn btn-action"
                    onClick={() => this.setState({shutdownPopup: false})}>
                        <i className="fas fa-times"></i>
                    </button>
                </div> :
                this.state.settings ?
                    <Switch>
                        <Route path="/welcome" render={(props) => <WelcomePage {...props}
                            navigatorLanguage={this.state.navigatorLanguage} settings={this.state.settings} logInfos={this.state.logInfos}
                            admpwd={this.state.admpwd} updateLogInfos={this.updateLogInfos} logOut={this.logOut} />} />
                        <Route path="/admin" render={(props) => <AdminPage {...props}
                            navigatorLanguage={this.state.navigatorLanguage} settings={this.state.settings} logInfos={this.state.logInfos}
                            updateLogInfos={this.updateLogInfos} powerOff={this.powerOff}logOut={this.logOut} tags={this.state.tags} />} />
                        <Route exact path="/" render={(props) => <PublicPage {...props}
                            navigatorLanguage={this.state.navigatorLanguage} settings={this.state.settings} logInfos={this.state.logInfos}
                            updateLogInfos={this.updateLogInfos} logOut={this.logOut} tags={this.state.tags} />} />
                        <Route component={NotFoundPage} />
                    </Switch> : null
        )
    }
}

export default App;
ReactDOM.render(<BrowserRouter><App /></BrowserRouter>, document.getElementById('root'));