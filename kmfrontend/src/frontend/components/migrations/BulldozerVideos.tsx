import i18next from 'i18next';
import React from 'react';

import { commandBackend } from '../../../utils/socket';
import useMigration from './Migration';

interface Props {
	onEnd: () => void;
}

export default function BulldozerVideos(props: Props) {
	const end = async () => {
		await commandBackend('createProblematicSmartPlaylist');
		props.onEnd();
	};

	const [EndButton] = useMigration('BulldozerVideos', end);

	return (
		<div className="limited-width justified">
			<h2>{i18next.t('BULLDOZER_VIDEOS.TITLE')}</h2>
			<p>{i18next.t('BULLDOZER_VIDEOS.P1')}</p>
			<p>{i18next.t('BULLDOZER_VIDEOS.P2')}</p>
			<p>{i18next.t('BULLDOZER_VIDEOS.P3')}</p>
			<h3>{i18next.t('BULLDOZER_VIDEOS.T1')}</h3>
			<p>
				{i18next.t('BULLDOZER_VIDEOS.P4')} <b>{i18next.t('BULLDOZER_VIDEOS.P5')}</b>
			</p>
			<ul>
				<li>{i18next.t('BULLDOZER_VIDEOS.L1')}</li>
				<li>{i18next.t('BULLDOZER_VIDEOS.L2')}</li>
			</ul>
			<h3>{i18next.t('BULLDOZER_VIDEOS.T2')}</h3>
			<p>{i18next.t('BULLDOZER_VIDEOS.P6')}</p>
			<ul>
				<li>{i18next.t('BULLDOZER_VIDEOS.L3')}</li>
				<li>{i18next.t('BULLDOZER_VIDEOS.L4')}</li>
			</ul>
			<h3>{i18next.t('BULLDOZER_VIDEOS.T3')}</h3>
			<p>{i18next.t('BULLDOZER_VIDEOS.P7')}</p>
			<h3>{i18next.t('BULLDOZER_VIDEOS.T4')}</h3>
			<p>{i18next.t('BULLDOZER_VIDEOS.P8')}</p>
			<p>{i18next.t('BULLDOZER_VIDEOS.P9')}</p>
			<h3>{i18next.t('BULLDOZER_VIDEOS.T5')}</h3>
			<p>{i18next.t('BULLDOZER_VIDEOS.P10')}</p>
			<p>{i18next.t('BULLDOZER_VIDEOS.P11')}</p>
			<EndButton />
		</div>
	);
}
