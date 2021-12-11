import '../styles/start/Start.scss';
import '../styles/start/WelcomePage.scss';

import i18next from 'i18next';
import { useContext, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { Repository } from '../../../../src/lib/types/repo';
import { DBStats } from '../../../../src/types/database/database';
import { Feed } from '../../../../src/types/feeds';
import { Session } from '../../../../src/types/session';
import logo from '../../assets/Logo-final-fond-transparent.png';
import { logout } from '../../store/actions/auth';
import { showModal } from '../../store/actions/modal';
import GlobalContext from '../../store/context';
import TasksEvent from '../../TasksEvent';
import { commandBackend, getSocket } from '../../utils/socket';
import { News } from '../types/news';
import Autocomplete from './generic/Autocomplete';
import OnlineStatsModal from './modals/OnlineStatsModal';
import ProfilModal from './modals/ProfilModal';
import RestartDownloadsModal from './modals/RestartDownloadsModal';
import WelcomePageArticle from './WelcomePageArticle';

function WelcomePage() {
	const context = useContext(GlobalContext);
	const navigate = useNavigate();
	const [searchParams] = useSearchParams();

	const [news, setNews] = useState<News[]>([]);
	const [sessions, setSessions] = useState<Session[]>([]);
	const [activeSession, setActiveSession] = useState<Session>();
	const [catchphrase, setCatchphrase] = useState('');
	const [repositories, setRepositories] = useState<Repository[]>([]);
	const [stats, setStats] = useState<DBStats>();

	const getSessions = async () => {
		const res = await commandBackend('getSessions');
		setSessions(res);
		setActiveSession(res.filter((valueSession: Session) => valueSession.active)[0]);
	};

	const getDownloadQueue = async () => {
		const [downloadQueue, downloadQueueStatus] = await Promise.all([
			commandBackend('getDownloads', undefined, false, 300000),
			commandBackend('getDownloadQueueStatus', undefined, false, 300000),
		]);
		if (
			downloadQueueStatus === 'stopped' &&
			downloadQueue.length > 0 &&
			!sessionStorage.getItem('dlQueueRestart')
		) {
			showModal(context.globalDispatch, <RestartDownloadsModal />);
		}
	};

	const getRepositories = async () => {
		const res = await commandBackend('getRepos');
		setRepositories(res);
	};

	const getStats = async () => {
		const res = await commandBackend('getStats');
		setStats(res);
	};

	const editActiveSession = async (value: string) => {
		const sessionsEdit = sessions.filter(session => session.name === value);
		let sessionId;
		if (sessionsEdit.length === 0) {
			const res = await commandBackend('createSession', { name: value });
			sessionId = res;
			const sessionsList = await commandBackend('getSessions');
			setSessions(sessionsList);
			setActiveSession(sessionsList.filter((valueSession: Session) => valueSession.active)[0]);
		} else {
			setActiveSession(sessionsEdit[0]);
			sessionId = sessionsEdit[0].seid;
			commandBackend('activateSession', { seid: sessionId });
		}
	};

	const getCatchphrase = async () => {
		const res = await commandBackend('getCatchphrase');
		setCatchphrase(res);
	};

	const getNewsFeed = async () => {
		try {
			const data: Feed[] = await commandBackend('getNewsFeed', undefined, undefined, 300000);
			const base = data.find(d => d.name === 'git_base');
			const appli = data.find(d => d.name === 'git_app');
			const mast = data.find(d => d.name === 'mastodon');
			const system = data.find(d => d.name === 'system');
			const news: News[] = [];
			if (base?.body && appli?.body) {
				base.body = JSON.parse(base.body);
				appli.body = JSON.parse(appli.body);
				news.push(
					{
						html: base.body.feed.entry[0].content._text,
						date: base.body.feed.entry[0].updated._text,
						dateStr: new Date(base.body.feed.entry[0].updated._text).toLocaleDateString(),
						title:
							i18next.t('WELCOME_PAGE.BASE_UPDATE') +
							' : ' +
							base.body.feed.title._text +
							(base.body.feed.entry[0].summary._text
								? ' - ' + base.body.feed.entry[0].summary._text
								: ''),
						link: base.body.feed.entry[0].link._attributes.href,
						type: 'base',
					},
					{
						html: appli.body.feed.entry[0].content._text,
						date: appli.body.feed.entry[0].updated._text,
						dateStr: new Date(appli.body.feed.entry[0].updated._text).toLocaleDateString(),
						title:
							i18next.t('WELCOME_PAGE.APP_UPDATE') +
							' : ' +
							appli.body.feed.entry[0].title._text +
							(appli.body.feed.entry[0].summary._text
								? ' - ' + appli.body.feed.entry[0].summary._text
								: ''),
						link: appli.body.feed.entry[0].link._attributes.href,
						type: 'app',
					}
				);
			}
			if (mast?.body) {
				mast.body = JSON.parse(mast.body);
				const max = mast.body.rss.channel.item.length > 3 ? 3 : mast.body.rss.channel.item.length;
				for (let i = 0; i < max; i++) {
					news.push({
						html: mast.body.rss.channel.item[i].description._text,
						date: mast.body.rss.channel.item[i].pubDate._text,
						dateStr: new Date(mast.body.rss.channel.item[i].pubDate._text).toLocaleDateString(),
						title: i18next.t('WELCOME_PAGE.MASTODON_UPDATE'),
						link: mast.body.rss.channel.item[i].link._text,
						type: 'mast',
					});
				}
			}
			if (system?.body) {
				for (const message of JSON.parse(system.body)) {
					news.push(message);
				}
			}
			news.sort((a, b) => {
				const dateA = new Date(a.date);
				const dateB = new Date(b.date);
				return dateA < dateB ? 1 : dateA > dateB ? -1 : 0;
			});
			setNews(news);
		} catch (err) {
			// error already display
		}
	};

	const toggleProfileModal = () => {
		showModal(context.globalDispatch, <ProfilModal scope="admin" />);
	};

	const displayModal = async () => {
		let migrationsToDo;
		try {
			migrationsToDo = (await commandBackend('getMigrationsFrontend')).filter(res => !res.flag_done).length > 0;
		} catch (e) {
			migrationsToDo = false;
		}
		if (migrationsToDo) {
			navigate('/migrate');
		} else if (
			context?.globalState.settings.data.config?.Online.Stats === undefined ||
			context?.globalState.settings.data.config?.Online.ErrorTracking === undefined
		) {
			showModal(context.globalDispatch, <OnlineStatsModal />);
		} else {
			getDownloadQueue();
		}
	};

	useEffect(() => {
		displayModal();
		getCatchphrase();
		getNewsFeed();
		getSessions();
		getRepositories();
		getStats();
		getSocket().on('statsRefresh', getStats);
		return () => {
			getSocket().off('statsRefresh', getStats);
		};
	}, []);

	const sessionsList = sessions.map(session => {
		return { label: session.name, value: session.name };
	});
	return (
		<div className="start-page">
			<div className="wrapper welcome">
				<div className="logo">
					<img src={logo} alt="Logo Karaoke Mugen" />
				</div>
				<TasksEvent limit={3} isWelcomePage={true} />
				<div className="aside">
					<nav>
						<ul>
							<li>
								<a href="http://mugen.karaokes.moe/contact.html">
									<i className="fas fa-fw fa-pencil-alt" />
									{i18next.t('WELCOME_PAGE.CONTACT')}
								</a>
							</li>
							<li>
								<a href="http://mugen.karaokes.moe/">
									<i className="fas fa-fw fa-link" />
									{i18next.t('WELCOME_PAGE.SITE')}
								</a>
							</li>
							<li>
								<a href="#" onClick={toggleProfileModal}>
									<i className="fas fa-fw fa-user" />
									<span>{context.globalState.settings.data.user.nickname}</span>
								</a>
							</li>
							<li>
								<a
									href="#"
									title={i18next.t('LOGOUT')}
									className="logout"
									onClick={() => logout(context.globalDispatch)}
								>
									<i className="fas fa-fw fa-sign-out-alt" />
									<span>{i18next.t('LOGOUT')}</span>
								</a>
							</li>
						</ul>
					</nav>
					<div className="session-setting">
						{sessionsList.length > 0 ? (
							<>
								<article>
									<label>{i18next.t('WELCOME_PAGE.ACTIVE_SESSION')}</label>
									<Autocomplete
										value={activeSession?.name}
										options={sessionsList}
										onChange={editActiveSession}
										acceptNewValues={true}
									/>
								</article>
								<article>
									<a
										href={`/system/sessions/${activeSession?.seid}`}
										title={i18next.t('WELCOME_PAGE.EDIT_SESSION')}
									>
										<i className="fas fa-fw fa-edit" />
									</a>
								</article>
							</>
						) : null}
					</div>
				</div>

				<main className="main">
					<section className="tiles-panel">
						{context?.globalState.settings.data.user?.flag_tutorial_done ? (
							<article className="tile-manage">
								<button type="button" onClick={() => navigate('/admin' + window.location.search)}>
									<i className="fas fa-fw fa-list" />
									<span>{i18next.t('WELCOME_PAGE.KARAMANAGER')}</span>
								</button>
							</article>
						) : (
							<article className="tile-tutorial">
								<button type="button" onClick={() => navigate('/admin' + window.location.search)}>
									<i className="fas fa-fw fa-hand-point-right" />
									<span>{i18next.t('WELCOME_PAGE.GETSTARTED')}</span>
								</button>
							</article>
						)}
						<article className="tile-system">
							<button type="button" onClick={() => navigate('/system')}>
								<i className="fas fa-fw fa-cog" />
								<span>{i18next.t('WELCOME_PAGE.ADMINISTRATION')}</span>
							</button>
						</article>
						<article className="tile-system">
							<button type="button" onClick={() => navigate('/public' + window.location.search)}>
								<i className="fas fa-fw fa-user" />
								<span>{i18next.t('WELCOME_PAGE.PUBLIC')}</span>
							</button>
						</article>
						<article className="tile-help">
							<button type="button" onClick={() => navigate('https://mugen.karaokes.moe/docs/')}>
								<i className="fas fa-fw fa-question-circle" />
								<span>{i18next.t('WELCOME_PAGE.HELP')}</span>
							</button>
						</article>
						<article className="tile-download">
							<button type="button" onClick={() => navigate('/system/karas/download')}>
								<i className="fas fa-fw fa-download" />
								<span>{i18next.t('WELCOME_PAGE.DOWNLOAD')}</span>
							</button>
						</article>
						<article className="tile-logs">
							<button type="button" onClick={() => navigate('/system/log')}>
								<i className="fas fa-fw fa-terminal" />
								<span>{i18next.t('WELCOME_PAGE.LOGS')}</span>
							</button>
						</article>
						<article className="tile-stats">
							<blockquote>
								<label>
									<i className="fas fa-fw fa-chart-line" />
									{i18next.t('WELCOME_PAGE.STATS')}
								</label>
								<ul>
									<li onClick={() => navigate('/system/karas')}>
										<strong>{i18next.t('WELCOME_PAGE.STATS_KARAS')}</strong>
										<span>{stats?.karas}</span>
									</li>
									<li onClick={() => navigate('/system/tags?type=1')}>
										<strong>{i18next.t('WELCOME_PAGE.STATS_SERIES')}</strong>
										<span>{stats?.series}</span>
									</li>
									<li onClick={() => navigate('/system/tags')}>
										<strong>{i18next.t('WELCOME_PAGE.STATS_TAGS')}</strong>
										<span>{stats?.tags}</span>
									</li>
								</ul>
							</blockquote>
						</article>
						<article className="tile-repositories">
							<blockquote>
								<button type="button" onClick={() => navigate('/system/repositories')}>
									<i className="fas fa-fw fa-network-wired" />
									{i18next.t('WELCOME_PAGE.REPOSITORY')}
								</button>
								<ul>
									{repositories.map(repository => {
										return (
											<li
												key={repository.Name}
												className={repository.Enabled ? '' : 'disabled'}
												onClick={() => navigate(`/system/repositories/${repository.Name}`)}
											>
												<i
													className={`fas fa-fw ${
														repository.Online ? ' fa-globe' : 'fa-laptop'
													}`}
												/>
												<span>{repository.Name}</span>
											</li>
										);
									})}
								</ul>
							</blockquote>
						</article>
					</section>

					<section className="feed-panel">
						<header>
							<p>{catchphrase}</p>
						</header>
						<div>
							{news.map(article => {
								return <WelcomePageArticle key={article.date} article={article} />;
							})}
						</div>
					</section>
				</main>
			</div>
		</div>
	);
}

export default WelcomePage;
