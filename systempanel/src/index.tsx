import React from 'react';
import ReactDOM from 'react-dom';
import * as Sentry from '@sentry/browser';
import App from './App';

import './i18n';
import './isoLanguages';
import './utils/electron';
import GlobalStateProvider from './store/GlobalStateProvider';

Sentry.init({dsn: "https://464814b9419a4880a2197b1df7e1d0ed@o399537.ingest.sentry.io/5256806"});

ReactDOM.render(<GlobalStateProvider><App /></GlobalStateProvider>, document.getElementById('root'));
