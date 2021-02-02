import React from 'react';

import useMigration from './Migration';

interface Props {
	onEnd: () => void
}

export default function PrivacyPolicy(props: Props) {
	const [EndButton] = useMigration('privacyPolicy', props.onEnd);

	return <div>
		Brouillon Vie Privée
		<EndButton />
	</div>;
}
