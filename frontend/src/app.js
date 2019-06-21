import React, { Suspense } from 'react';
import ReactDOM from 'react-dom';
import Options from './components/options/Options';
import Modal from './components/modals/Modal';
import ProfilModal from './components/modals/ProfilModal';
import './components/i18n';

import './app.css'

const Loader = () => (
  <div>loading...</div>
);

document.getElementById('manage') ? ReactDOM.render(<Suspense fallback={<Loader />}><Options /></Suspense>, document.getElementById('manage')) : null;

window.callModal = (type, title, message, callback, placeholder) => (
  ReactDOM.render(<Suspense fallback={<Loader />}><Modal type={type} title={title} message={message} callback={callback} placeholder={placeholder} /></Suspense>, document.getElementById('modalBox'))
);
ReactDOM.render(<Suspense fallback={<Loader />}><ProfilModal/></Suspense>, document.getElementById('profilModal'))

