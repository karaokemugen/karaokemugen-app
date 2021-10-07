import i18next from 'i18next';
import React, { useState } from 'react';

import useMigration from './Migration';

interface Props {
	onEnd: () => void;
}

export default function PrivacyPolicy(props: Props) {
	const [EndButton] = useMigration('privacyPolicy', props.onEnd);

	const [sentry, setSentry] = useState(false);
	const [stats, setStats] = useState(false);

	return (
		<div className="limited-width justified">
			<h2>{i18next.t('PRIVACY_POLICY.TITLE')}</h2>
			<p>{i18next.t('PRIVACY_POLICY.P1')}</p>
			<p>{i18next.t('PRIVACY_POLICY.P2')}</p>
			<p>{i18next.t('PRIVACY_POLICY.P3')}</p>
			<h3>{i18next.t('PRIVACY_POLICY.T1')}</h3>
			<p>{i18next.t('PRIVACY_POLICY.P4')}</p>
			<ul>
				<li>{i18next.t('PRIVACY_POLICY.L1')}</li>
				<li>{i18next.t('PRIVACY_POLICY.L3')}</li>
				<li>
					{i18next.t('PRIVACY_POLICY.L4')}&nbsp;
					<a href="#stats" onClick={() => setStats(!stats)}>
						{i18next.t('PRIVACY_POLICY.MORE')}
					</a>
					{stats ? (
						<>
							<br />
							<p>{i18next.t('PRIVACY_POLICY.L4_DETAILS')}</p>
						</>
					) : null}
				</li>
				<li>
					{i18next.t('PRIVACY_POLICY.L5')}&nbsp;
					<a href="#sentry" onClick={() => setSentry(!sentry)}>
						{i18next.t('PRIVACY_POLICY.MORE')}
					</a>
					{sentry ? (
						<>
							<br />
							<p>{i18next.t('PRIVACY_POLICY.L5_DETAILS')}</p>
						</>
					) : null}
				</li>
			</ul>
			<h3>{i18next.t('PRIVACY_POLICY.T2')}</h3>
			<p>{i18next.t('PRIVACY_POLICY.P5')}</p>
			<p>{i18next.t('PRIVACY_POLICY.P6')}</p>
			<EndButton />
		</div>
	);
}
