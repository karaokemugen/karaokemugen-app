import '../styles/start/Start.scss';
import '../styles/start/MigratePage.scss';

import i18next from 'i18next';
import { Fragment, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { MigrationsFrontend } from '../../../../src/types/database/migrationsFrontend';
import logo from '../../assets/Logo-final-fond-transparent.png';
import { commandBackend } from '../../utils/socket';
import BulldozerVideos from './migrations/BulldozerVideos';
import KMOnline from './migrations/KMOnline';
import PrivacyPolicy from './migrations/PrivacyPolicy';

export default function MigratePage() {
	const components = {
		privacyPolicy: PrivacyPolicy,
		KMOnline,
		BulldozerVideos,
	};

	const navigate = useNavigate();

	const [migrations, setMigrations] = useState<MigrationsFrontend[]>([]);

	const getMigrations = () => {
		try {
			commandBackend('getMigrationsFrontend').then(res => {
				const migrationsToDo: MigrationsFrontend[] = res.filter(el => !el.flag_done);
				if (migrationsToDo.length === 0) {
					navigate('/welcome');
				} else {
					setMigrations(migrationsToDo);
				}
			});
		} catch (e) {
			navigate('/welcome');
		}
	};

	useEffect(getMigrations, []);

	const MigrationComponent = components[migrations[0]?.name] || (() => <Fragment />);

	return (
		<div className="start-page">
			<div className="wrapper migrate">
				<div className="logo">
					<img src={logo} alt="Logo Karaoke Mugen" />
				</div>
				<div className="title">{i18next.t('MIGRATE.TITLE')}</div>
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
					<MigrationComponent onEnd={getMigrations} />
				</div>
			</div>
		</div>
	);
}
