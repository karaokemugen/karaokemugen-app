import './Loading.scss';

import i18next from 'i18next';
import { useEffect,useState } from 'react';

import { isElectron } from '../electron';

function Loading() {
	const [showLoadingText, setShowLoadingText] = useState(false);

	let timeout: NodeJS.Timeout;

	useEffect(() => {
		timeout = setTimeout(() => setShowLoadingText(true), 1000);
		return () => {
			clearTimeout(timeout);
		};
	}, []);

	return (
		<div className="loading-container">
			{
				showLoadingText ?
					<>
						<span className="header">{i18next.t('LOADING')}</span>
						<span>{isElectron() ? i18next.t('LOADING_SUBTITLE_ELECTRON') : i18next.t('LOADING_SUBTITLE')}</span>
					</> : null
			}
		</div>
	);
}

export default Loading;
