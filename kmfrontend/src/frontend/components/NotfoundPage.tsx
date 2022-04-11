import './NotfoundPage.scss';

import i18next from 'i18next';
import { useLocation, Link } from 'react-router-dom';

import image404 from '../../assets/nanami-surpris.png';

function NotfoundPage() {
	const location = useLocation();

	return (
		<div className="page404-lost">
			<h1>{i18next.t('NOT_FOUND_PAGE.404')}</h1>
			<h3>{i18next.t('NOT_FOUND_PAGE.404_2')}</h3>
			<div className="you-are-here">
				{location.pathname} &lt;----- {i18next.t('NOT_FOUND_PAGE.404_3')}
			</div>
			<Link to="/" className="page404-btn">
				{i18next.t('NOT_FOUND_PAGE.404_4')}
			</Link>
			<div>
				<img alt="" height="150" src={image404} />
			</div>
		</div>
	);
}

export default NotfoundPage;
