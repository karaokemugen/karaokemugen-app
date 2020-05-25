import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';

import './i18n';
import './isoLanguages';
import GlobalStateProvider from './store/GlobalStateProvider';

ReactDOM.render(<GlobalStateProvider><App /></GlobalStateProvider>, document.getElementById('root'));
