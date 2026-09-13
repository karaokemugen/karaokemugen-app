import i18next from 'i18next';
import { useEffect, useState } from 'react';
import { commandBackend } from '../../../utils/socket';
import type { KMServerFull } from '../../../../../src/lib/types/database/servers';
import { WS_CMD } from '../../../utils/ws.mjs';
import { faGlobe } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

interface IProps {
	instance: string;
	setInstance: (instance: string) => void;
	remote?: boolean;
	typeLabel: string;
}

function ServersList(props: IProps) {
	const [servers, setServers] = useState<KMServerFull[]>();
	const [other, setOther] = useState(false);

	useEffect(() => {
		getServersFromUplink();
	}, []);

	const getServersFromUplink = async () => {
		try {
			const serversFromUplink = await commandBackend(WS_CMD.GET_SERVERS_FROM_UPLINK);
			setServers(Array.isArray(serversFromUplink) ? serversFromUplink : []);
		} catch (_err) {
			// Uplink is unreachable
			setServers([]);
		}
	};

	return !servers ? (
		<div className="server-list">
			<div className="server-item">{i18next.t('LOADING')}</div>
		</div>
	) : (
		<div className="server-list">
			{servers.map(server => (
				<div
					className="server-item"
					onClick={() => {
						if (server.online) {
							setOther(false);
							props.setInstance(server.domain);
						}
					}}
					key={server.domain}
				>
					<input
						disabled={!server.online}
						type="radio"
						id={`${props.typeLabel}-${server.domain}-input`}
						name={`${props.typeLabel}-server-item`}
						value={server.domain}
						checked={server.domain === props.instance}
						onChange={() => {
							setOther(false);
							props.setInstance(server.domain);
						}}
					></input>
					<label htmlFor={`${props.typeLabel}-${server.domain}-input`}>
						<div className="domain">
							{i18next.t('SETUP_PAGE.ONLINE_SERVER.INSTANCE', {
								instance: server.domain,
								count: server.stats?.karas || 0,
								songs: server.stats?.karas || '?',
							})}
							<a href={`https://${server.domain}`} title={`https://${server.domain}`}>
								<FontAwesomeIcon icon={faGlobe} />
							</a>
						</div>
						<div className={server.online ? '' : 'offline'}>
							{server.online
								? server.manifest?.description
								: i18next.t('SETUP_PAGE.ONLINE_SERVER.OFFLINE')}
						</div>
					</label>
				</div>
			))}

			<div className="server-item" onClick={() => setOther(true)}>
				<input
					type="radio"
					id={`${props.typeLabel}-other-input`}
					name={`${props.typeLabel}-server-item`}
					value="other"
					checked={other}
					onChange={() => setOther(true)}
				></input>
				<label htmlFor={`${props.typeLabel}-other-input`}>
					<div className="domain">{i18next.t('SETUP_PAGE.ONLINE_SERVER.OTHER')}</div>
				</label>
			</div>
			{other ? (
				<div className="flex-column input-group">
					<div className="input-control">
						<label>{i18next.t('SETUP_PAGE.ONLINE_SERVER.OTHER_INPUT')}</label>
						<input
							className="input-field"
							type="text"
							required
							onChange={event => props.setInstance(event.target.value)}
						/>
					</div>
					{props.instance?.match(/.*\..*/g) === null ? (
						<div className="error">{i18next.t('SETUP_PAGE.ONLINE_SERVER.INSTANCE_FORMAT_ERROR')}</div>
					) : null}
				</div>
			) : null}
			{props.remote ? (
				<div
					className="server-item"
					onClick={() => {
						setOther(false);
						props.setInstance(undefined);
					}}
				>
					<input
						type="radio"
						id={`${props.typeLabel}-not-input`}
						name="server-item"
						value={undefined}
						checked={!props.instance}
						onChange={() => {
							setOther(false);
							props.setInstance(undefined);
						}}
					></input>
					<label htmlFor={`${props.typeLabel}-not-input`}>
						<div className="domain">{i18next.t('SETUP_PAGE.REMOTE_ACCESS.DO_NO_WANT')}</div>
					</label>
				</div>
			) : null}
		</div>
	);
}

export default ServersList;
