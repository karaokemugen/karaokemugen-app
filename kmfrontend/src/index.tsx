import './utils/i18n';
import './utils/isoLanguages';
import './utils/electron';
import './common.scss';

import React from 'react';
import ReactDOM from 'react-dom';

import App from './App';
import GlobalStateProvider from './store/GlobalStateProvider';

ReactDOM.render(<GlobalStateProvider><App /></GlobalStateProvider>, document.getElementById('root'));
