import i18next from 'i18next';

import { commandBackend } from '../../../utils/socket';

export default function useMigration(name: string, onEnd: () => void): [() => JSX.Element, () => void] {
	const EndButton = () => (
		<button className="continue-btn" onClick={saveMigration}>
			{i18next.t('MIGRATE.CONTINUE')}
		</button>
	);

	function saveMigration() {
		commandBackend('setMigrationsFrontend', { mig: { name, flag_done: true } }).then(onEnd);
	}

	return [EndButton, saveMigration];
}
