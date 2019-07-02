import React, { Suspense } from 'react';
import ReactDOM from 'react-dom';
import Options from './components/options/Options';
import Modal from './components/modals/Modal';
import ProfilModal from './components/modals/ProfilModal';
import PollModal from './components/modals/PollModal';
import './components/i18n';
import io from 'socket.io-client';
import './app.css'

const Loader = () => (
  <div>loading...</div>
);

window.socket = io();

document.getElementById('manage') ? ReactDOM.render(<Suspense fallback={<Loader />}><Options /></Suspense>, document.getElementById('manage')) : null;

window.callModal = (type, title, message, callback, placeholder) => (
  ReactDOM.render(<Suspense fallback={<Loader />}><Modal type={type} title={title} message={message} callback={callback} placeholder={placeholder} /></Suspense>, document.getElementById('modalBox'))
);
window.callProfileModal = (settingsOnline) => (
  ReactDOM.render(<Suspense fallback={<Loader />}><ProfilModal settingsOnline={settingsOnline}/></Suspense>, document.getElementById('profilModal'))
);
window.callPollModal = () => {
  document.getElementById('pollModal') ? ReactDOM.render(<Suspense fallback={<Loader />}><PollModal/></Suspense>, document.getElementById('pollModal')) : null;
};