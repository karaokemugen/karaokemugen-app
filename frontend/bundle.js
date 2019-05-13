import React, { Suspense } from 'react';
import ReactDOM from 'react-dom';
import KaraokeOptions from './components/KaraokeOptions';
import './components/i18n';

const Loader = () => (
    <div>loading...</div>
  );

ReactDOM.render(<Suspense fallback={<Loader />}><KaraokeOptions /></Suspense>, document.getElementById('nav-karaoke'));
