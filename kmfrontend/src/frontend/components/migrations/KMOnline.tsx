import i18next from 'i18next';
import { useContext, useEffect, useState } from 'react';

import GlobalContext from '../../../store/context';
import { commandBackend } from '../../../utils/socket';
import RemoteStatus from '../options/RemoteStatus';
import useMigration from './Migration';

interface Props {
	onEnd: () => void;
}

export default function KMOnline(props: Props) {
	const [EndButton] = useMigration('KMOnline', props.onEnd);

	const [remote, setRemote] = useState(false);

	const context = useContext(GlobalContext);

	useEffect(() => {
		if (remote !== context.globalState.settings.data.config.Online.Remote) {
			commandBackend('updateSettings', { setting: { Online: { Remote: remote } } }).catch(() => {});
		}
	}, [remote]);

	return (
		<div className="limited-width justified">
			<h2>{i18next.t('ONLINE.TITLE')}</h2>
			<p>{i18next.t('ONLINE.P1')}</p>
			<div className="wrapper setup" style={{ padding: 0 }}>
				<section className="step step-choice">
					<div className="input-group">
						<div className="actions">
							<button
								className={remote === true ? 'on' : undefined}
								onClick={() => setRemote(true)}
								type="button"
							>
								{i18next.t('YES')}
							</button>
							<button
								className={remote === false ? 'off' : undefined}
								onClick={() => setRemote(false)}
								type="button"
							>
								{i18next.t('NO')}
							</button>
						</div>
					</div>
				</section>
			</div>
			{remote === true ? <RemoteStatus /> : null}
			<EndButton />
		</div>
	);
}
