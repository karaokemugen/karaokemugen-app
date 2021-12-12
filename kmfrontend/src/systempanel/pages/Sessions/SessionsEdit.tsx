import { Layout } from 'antd';
import i18next from 'i18next';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { Session } from '../../../../../src/types/session';
import { commandBackend } from '../../../utils/socket';
import SessionForm from './SessionsForm';

const newsession: Session = {
	name: null,
	seid: null,
	started_at: new Date(),
	ended_at: null,
};

function SessionEdit() {
	const navigate = useNavigate();
	const { seid } = useParams();

	const [session, setSession] = useState<Session>();
	const [sessions, setSessions] = useState<Session[]>([]);

	const saveNew = async (session: Session) => {
		await commandBackend('createSession', session, true);
		navigate('/system/sessions');
	};

	const saveUpdate = async (session: Session) => {
		await commandBackend('editSession', session, true);
		navigate('/system/sessions');
	};

	const handleSessionMerge = async (seid1: string, seid2: string) => {
		await commandBackend('mergeSessions', { seid1: seid1, seid2: seid2 }, true);
		navigate('/system/sessions/');
	};

	const loadsession = async () => {
		if (seid) {
			const res = await commandBackend('getSessions');
			const actualSession = res.filter(session => session.seid === seid);
			setSessions(res);
			setSession(actualSession[0]);
		} else {
			setSession({ ...newsession });
		}
	};

	useEffect(() => {
		loadsession();
	}, []);

	return (
		<>
			<Layout.Header>
				<div className="title">
					{i18next.t(seid ? 'HEADERS.SESSIONS_EDIT.TITLE' : 'HEADERS.SESSIONS_NEW.TITLE')}
				</div>
				<div className="description">
					{i18next.t(seid ? 'HEADERS.SESSIONS_EDIT.DESCRIPTION' : 'HEADERS.SESSIONS_NEW.DESCRIPTION')}
				</div>
			</Layout.Header>
			<Layout.Content>
				{session && (
					<SessionForm
						session={session}
						sessions={sessions}
						save={seid ? saveUpdate : saveNew}
						mergeAction={handleSessionMerge}
					/>
				)}
			</Layout.Content>
		</>
	);
}

export default SessionEdit;
