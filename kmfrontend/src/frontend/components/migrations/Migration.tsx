import React from 'react';

import { commandBackend } from '../../../utils/socket';

export default function useMigration(name: string, onEnd: () => void): [() => JSX.Element, () => void] {
	const EndButton = () => <button onClick={saveMigration}>Continuer.</button>;

	function saveMigration() {
		commandBackend('setMigrationsFrontend', {mig: {name, flag_done: true}});
		onEnd();
	}

	return [EndButton, saveMigration];
}
