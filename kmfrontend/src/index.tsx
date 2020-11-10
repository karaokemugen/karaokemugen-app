import './utils/i18n';
import './utils/isoLanguages';
import './utils/electron';
import './common.scss';

import { ConfigProvider } from 'antd';
import enUS from 'antd/es/locale/en_US';
import frFR from 'antd/es/locale/fr_FR';
import React from 'react';
import ReactDOM from 'react-dom';

import App from './App';
import GlobalStateProvider from './store/GlobalStateProvider';

ReactDOM.render(<GlobalStateProvider>
	<ConfigProvider locale={navigator.languages[0].includes('fr') ? frFR : enUS}>
		<App />
	</ConfigProvider>
</GlobalStateProvider>, document.getElementById('root'));
