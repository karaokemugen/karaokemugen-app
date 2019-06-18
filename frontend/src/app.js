import React, { Suspense } from 'react';
import ReactDOM from 'react-dom';
import Options from './components/options/Options';
import Modal from './components/Modal';
import './components/i18n';

import './app.css'

const Loader = () => (
    <div>loading...</div>
  );

document.getElementById('manage') ? ReactDOM.render(<Suspense fallback={<Loader />}><Options/></Suspense>, document.getElementById('manage')) : null;
ReactDOM.render(<Suspense fallback={<Loader />}><Modal/></Suspense>, document.getElementById('modalBox'));
