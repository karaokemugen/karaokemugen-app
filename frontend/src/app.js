import React, { Suspense } from 'react';
import ReactDOM from 'react-dom';
import Options from './components/options/Options';
import Modal from './components/modals/Modal';
import ProfilModal from './components/modals/ProfilModal';
import PollModal from './components/modals/PollModal';
import RestrictedHelpModal from './components/modals/RestrictedHelpModal';
import HelpModal from './components/modals/HelpModal';
import OnlineStatsModal from './components/modals/OnlineStatsModal'
import './components/i18n';
import io from 'socket.io-client';
import './app.css'

const Loader = () => (
  <div>loading...</div>
);

window.socket = io();

document.getElementById('manage') ? ReactDOM.render(<Suspense fallback={<Loader />}><Options /></Suspense>, document.getElementById('manage')) : null;

window.callModal = (type, title, message, callback, placeholder) => {
  ReactDOM.render(<Suspense fallback={<Loader />}><Modal type={type} title={title} message={message} callback={callback} placeholder={placeholder} /></Suspense>, document.getElementById('root'));
  $('#modalBox').modal('show');
};
window.callProfileModal = (settingsOnline) => {
  ReactDOM.render(<Suspense fallback={<Loader />}><ProfilModal settingsOnline={settingsOnline}/></Suspense>, document.getElementById('root'));
  $('#profilModal').modal('show');
};
window.callPollModal = () => {
  ReactDOM.render(<Suspense fallback={<Loader />}><PollModal/></Suspense>, document.getElementById('root'));
};
ReactDOM.render(<Suspense fallback={<Loader />}><RestrictedHelpModal /></Suspense>, document.getElementById('root'));
window.callHelpModal = (mode, version) => {
  ReactDOM.render(<Suspense fallback={<Loader />}><HelpModal mode={mode} version={version}/></Suspense>, document.getElementById('root'));
  $('#helpModal').modal('show');
};
window.callOnlineStatsModal = () => {
  ReactDOM.render(<Suspense fallback={<Loader />}><OnlineStatsModal /></Suspense>, document.getElementById('root'));
  $('#onlineStatsModal').modal('show');
};
