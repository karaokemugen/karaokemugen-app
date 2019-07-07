import React, { Suspense } from 'react';
import ReactDOM from 'react-dom';
import Options from './components/options/Options';
import Modal from './components/modals/Modal';
import ProfilModal from './components/modals/ProfilModal';
import PollModal from './components/modals/PollModal';
import RestrictedHelpModal from './components/modals/RestrictedHelpModal';
import HelpModal from './components/modals/HelpModal';
import OnlineStatsModal from './components/modals/OnlineStatsModal'
import LoginModal from './components/modals/LoginModal'
import './components/i18n';
import io from 'socket.io-client';
import './app.css'
import axios from 'axios';
import WelcomePage from './components/WelcomePage';
import KaraDetail from './components/KaraDetail';

const Loader = () => (
  <div>loading...</div>
);

window.socket = io();

var settings = {};
var getSettings = async () => {
  const res = await axios.get('/api/public/settings');
  settings = res.data.data;
}
getSettings();

window.socket.on('settingsUpdated', getSettings);

document.getElementById('manage') ? ReactDOM.render(<Suspense fallback={<Loader />}><Options /></Suspense>, document.getElementById('manage')) : null;

var callModal = (type, title, message, callback, placeholder) => {
  ReactDOM.render(<Suspense fallback={<Loader />}><Modal type={type} title={title} message={message} callback={callback} placeholder={placeholder} /></Suspense>, document.getElementById('root'));
  $('#modalBox').modal('show');
};
window.callModal = callModal;

var callProfileModal = () => {
  ReactDOM.render(<Suspense fallback={<Loader />}><ProfilModal settingsOnline={settings.config.Online} /></Suspense>, document.getElementById('root'));
  $('#profilModal').modal('show');
};
window.callProfileModal = callProfileModal;
window.callPollModal = () => {
  ReactDOM.render(<Suspense fallback={<Loader />}><PollModal /></Suspense>, document.getElementById('root'));
};
document.getElementById('root') ? ReactDOM.render(<Suspense fallback={<Loader />}><RestrictedHelpModal /></Suspense>, document.getElementById('root')) : null;
window.callHelpModal = () => {
  ReactDOM.render(<Suspense fallback={<Loader />}><HelpModal mode={settings.Karaoke.Private} version={settings.version} /></Suspense>, document.getElementById('root'));
  $('#helpModal').modal('show');
};
window.callOnlineStatsModal = () => {
  ReactDOM.render(<Suspense fallback={<Loader />}><OnlineStatsModal /></Suspense>, document.getElementById('root'));
  $('#onlineStatsModal').modal('show');
};
var callLoginModal = (scope, admpwd, callback) => {
  ReactDOM.render(<Suspense fallback={<Loader />}><LoginModal scope={scope} config={settings.config} admpwd={admpwd} callback={callback} /></Suspense>, document.getElementById('root'));
  if (!admpwd) $('#loginModal').modal('show');
}
window.callLoginModal = callLoginModal;
window.welcomePage = () => {
  ReactDOM.render(<Suspense fallback={<Loader />}>
      <WelcomePage loginModal={callLoginModal} profileModal={callProfileModal}/>
    </Suspense>, document.getElementById('welcomepage'));
}

window.buildKaraDetails = (data, mode, element, publicOuCurrent) => {
  ReactDOM.render(<Suspense fallback={<Loader />}>
    <KaraDetail data={data} mode={mode} publicOuCurrent={publicOuCurrent}/>
  </Suspense>, element);
} 
