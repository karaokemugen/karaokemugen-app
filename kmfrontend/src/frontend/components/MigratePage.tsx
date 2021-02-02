import i18next from 'i18next';
import React, { Fragment, useEffect, useState } from 'react';
import { useHistory } from 'react-router';

import { MigrationsFrontend } from '../../../../src/types/database/migrationsFrontend';
import logo from '../../assets/Logo-final-fond-transparent.png';
import { commandBackend } from '../../utils/socket';
import PrivacyPolicy from './migrations/PrivacyPolicy';

export default function MigratePage() {

	const components = {
		privacyPolicy: PrivacyPolicy
	};

	const history = useHistory();

	const [migrations, setMigrations] = useState<MigrationsFrontend[]>([]);

	const getMigrations = () => {
		commandBackend('getMigrationsFrontend').then(res => {
			const migrationsToDo: MigrationsFrontend[] = res.filter(el => !el.flag_done);
			if (migrationsToDo.length === 0) {
				history.push('/welcome');
			} else {
				setMigrations(migrationsToDo);
			}
		});
	};

	useEffect(getMigrations, []);

	const MigrationComponent = components[migrations[0]?.name] || (() => <Fragment/>);

	return <div id="setupPage">
		<div className="setupPage--wrapper">
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
								{i18next.t('WLCM_CONTACT')}
							</a>
						</li>
						<li>
							<a href="http://mugen.karaokes.moe/">
								<i className="fas fa-link" />
								{i18next.t('WLCM_SITE')}
							</a>
						</li>
					</ul>
				</nav>
			</div>
			<div className="main">
				<MigrationComponent onEnd={getMigrations} />
			</div>
		</div>
	</div>;
}
