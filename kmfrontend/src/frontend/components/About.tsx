import './About.scss';

import i18n from 'i18next';
import { shuffle } from 'lodash';
import { useContext, useEffect, useState } from 'react';
import { Trans } from 'react-i18next';
import TextTransition, { presets } from 'react-text-transition';

import imgMugenFullLogo from '../../assets/Logo-final-fond-transparent.png';
import GlobalContext from '../../store/context';
import { commandBackend } from '../../utils/socket';

export default function About() {
	const context = useContext(GlobalContext);
	const [donators, setDonators] = useState<string[]>(['...']);
	const [allDonators, setAllDonators] = useState(true);
	const [versions, setVersions] = useState<Record<string, string>>({});
	const [contributors, setContributors] = useState<string[]>(['...']);
	const [index, setIndex] = useState(0);

	useEffect(() => {
		fetch('https://mugen.karaokes.moe/downloads/donators.json').then(async d => {
			const donators = await d.json();
			donators.push(
				...(await fetch('https://mugen.karaokes.moe/downloads/hall_of_fame.json').then(r => r.json())).map(
					n => n.name
				)
			);
			setDonators(shuffle(donators));
		});
		commandBackend('getTags', { type: 6 }).then(res => {
			setContributors(shuffle(res.content.map(c => c.name)));
		});
		commandBackend('getElectronVersions').then(setVersions);
		const intervalId = setInterval(
			() => setIndex(index => index + 1),
			4000 // every 4 seconds
		);
		return () => clearTimeout(intervalId);
	}, []);

	return (
		<div className="about-page">
			<div className="app-presentation">
				<img src={imgMugenFullLogo} alt="Karaoke Mugen logo" />
				<p>{i18n.t('ABOUT.DESCRIPTION')}</p>
				<p>{i18n.t('ABOUT.LICENSE')}</p>
			</div>
			<p className="version">
				v{context.globalState.settings.data.version.number}{' '}
				<em>
					({context.globalState.settings.data.version.name}, {context.globalState.settings.data.version.sha})
				</em>
			</p>
			<div className="technical-stuff">
				{['electron', 'chrome', 'v8', 'node'].map(program => {
					if (versions[program]) {
						return (
							<div key={program} className="version">
								<div>{program}</div>
								<div className="separator">:</div>
								<div>{versions[program]}</div>
							</div>
						);
					} else {
						return null;
					}
				})}
			</div>
			<p className="contributors">
				<Trans
					i18nKey="ABOUT.CONTRIBUTORS"
					values={{ contributors: contributors[index % contributors.length] }}
					components={{
						1: (
							<TextTransition
								springConfig={presets.slow}
								className="awesome-person"
								inline={true}
								children={''}
							/>
						),
					}}
				/>
			</p>
			<p
				className="donators"
				onContextMenu={e => {
					e.preventDefault();
					setAllDonators(ad => !ad);
				}}
			>
				<Trans
					i18nKey="ABOUT.DONATORS"
					values={{ donators: allDonators ? '' : donators[index % donators.length] }}
					components={{
						1: allDonators ? (
							<>
								{donators.map((d, i) => (
									<span key={i}>
										{i === donators.length - 1 ? ` ${i18n.t('AND')} ` : ''}
										<span className="awesome-person">{d}</span>
										{i >= donators.length - 2 ? '' : ', '}
									</span>
								))}
							</>
						) : (
							<TextTransition
								springConfig={presets.slow}
								className="awesome-person"
								inline={true}
								children={''}
							/>
						),
					}}
				/>{' '}
				<i className="fas fa-heart fa-fw" />
			</p>
		</div>
	);
}
