import i18next from 'i18next';

import { commandBackend } from '../../../utils/socket';
import useMigration from './Migration';
import { useContext, useState } from 'react';
import { WS_CMD } from '../../../utils/ws.mjs';
import ServersList from '../../pages/setup/ServersList';
import GlobalContext from '../../../store/context';

interface Props {
	onEnd: () => void;
}

export default function DefaultRemote(props: Props) {
	const context = useContext(GlobalContext);
	const [instanceRemoteUsers, setInstanceRemoteUsers] = useState<string>(
		context?.globalState.settings.data.config?.Online.RemoteUsers.DefaultHost
	);
	const [instanceRemoteAccess, setInstanceRemoteAccess] = useState<string>(
		context?.globalState.settings.data.config?.Online.RemoteAccess.Domain
	);

	const end = async () => {
		commandBackend(WS_CMD.UPDATE_SETTINGS, {
			setting: {
				Online: {
					RemoteAccess: {
						Domain: instanceRemoteAccess,
					},
					RemoteUsers: {
						DefaultHost: instanceRemoteUsers,
					},
				},
			},
		});
		props.onEnd();
	};

	const [EndButton] = useMigration('DefaultRemote', end);

	return (
		<div className="limited-width justified">
			<h2>{i18next.t('MIGRATE.DEFAULT_REMOTE.TITLE')}</h2>
			<p>{i18next.t('MIGRATE.DEFAULT_REMOTE.DESCRIPTION')}</p>
			{context?.globalState.settings.data.config?.Online.RemoteUsers.Enabled ? (
				<>
					<h3>{i18next.t('CONFIG.PROPERTIES.ONLINE_REMOTEUSERS_DEFAULTHOST')}</h3>
					<p>{i18next.t('SETUP_PAGE.ONLINE_SERVER.DESCRIPTION')}</p>
					<p>{i18next.t('SETUP_PAGE.ONLINE_SERVER.LIST')}</p>
					<ServersList
						instance={instanceRemoteUsers}
						setInstance={setInstanceRemoteUsers}
						typeLabel="users"
					/>
				</>
			) : null}
			{context?.globalState.settings.data.config?.Online.RemoteAccess.Enabled ? (
				<>
					<h3>{i18next.t('SETUP_PAGE.REMOTE_ACCESS.TITLE')}</h3>
					<p>{i18next.t('SETUP_PAGE.REMOTE_ACCESS.DESCRIPTION')}</p>
					<p>{i18next.t('SETUP_PAGE.REMOTE_ACCESS.DESCRIPTION_GUESTS')}</p>
					<p>{i18next.t('SETUP_PAGE.ONLINE_SERVER.LIST')}</p>
					<ServersList
						instance={instanceRemoteAccess}
						setInstance={setInstanceRemoteAccess}
						typeLabel="remote"
					/>
				</>
			) : null}
			<EndButton />
		</div>
	);
}
