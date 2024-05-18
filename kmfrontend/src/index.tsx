import './common.scss';
import './utils/electron';
import './utils/i18n';
import './utils/isoLanguages';
import './utils/polyfills';
import './utils/socket';

import ReactDOM from 'react-dom';
import { BrowserRouter } from 'react-router-dom';

import App from './App';
import GlobalStateProvider from './store/GlobalStateProvider';

ReactDOM.render(
	<GlobalStateProvider>
		<BrowserRouter>
			<App />
		</BrowserRouter>
	</GlobalStateProvider>,
	document.getElementById('mountpoint')
);
