import '../../styles/start/Start.scss';
import '../../styles/start/SetupPage.scss';

import i18next from 'i18next';
import { useContext } from 'react';
import { Redirect, Route, Switch, withRouter } from 'react-router';

import logo from '../../../assets/Logo-final-fond-transparent.png';
import GlobalContext from '../../../store/context';
import SetupLoading from './SetupLoading';
import SetupPageRepo from './SetupPageRepo';
import SetupPageStats from './SetupPageStats';
import SetupPageUser from './SetupPageUser';

function SetupPage() {
	const context = useContext(GlobalContext);

	return (
		<div className="start-page">
			<div className="wrapper setup">
				<div className="logo">
					<img src={logo} alt="Logo Karaoke Mugen" />
				</div>
				<div className="title">{i18next.t('SETUP_PAGE.TITLE')}</div>
				<div className="aside">
					<nav>
						<ul>
							<li>
								<a href="http://mugen.karaokes.moe/contact.html">
									<i className="fas fa-pencil-alt" />
									{i18next.t('WELCOME_PAGE.CONTACT')}
								</a>
							</li>
							<li>
								<a href="http://mugen.karaokes.moe/">
									<i className="fas fa-link" />
									{i18next.t('WELCOME_PAGE.SITE')}
								</a>
							</li>
						</ul>
					</nav>
				</div>
				<div className="main">
					<Switch>
						<Route path="/setup/loading" component={SetupLoading} />
						<Route path="/setup/stats" component={SetupPageStats}/>
						<Route path="/setup/repo" component={SetupPageRepo} />
						<Route path="/setup/user" component={SetupPageUser} />
						<Redirect to={context?.globalState.settings.data.user.login !== 'admin' ? '/setup/repo' : '/setup/user'} />
					</Switch>
				</div>
			</div>
		</div>
	);
}

export default withRouter(SetupPage);
