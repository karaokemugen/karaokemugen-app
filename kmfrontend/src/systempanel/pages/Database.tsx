import { Button, Col, Layout, Row } from 'antd';
import i18next from 'i18next';
import { Trans } from 'react-i18next';

import { commandBackend } from '../../utils/socket';
import Title from '../components/Title';

function Database() {
	const dbregen = async () => {
		commandBackend('generateDatabase', undefined, false, 300000).catch(() => {});
	};

	const dbvalidateFiles = async () => {
		commandBackend('validateFiles', undefined, false, 300000).catch(() => {});
	};

	const dbdump = async () => {
		commandBackend('dumpDatabase', undefined, true, 300000).catch(() => {});
	};

	const dbrestore = async () => {
		commandBackend('restoreDatabase', undefined, true, 300000).catch(() => {});
	};

	return (
		<>
			<Title
				title={i18next.t('HEADERS.DATABASE.TITLE')}
				description={i18next.t('HEADERS.DATABASE.DESCRIPTION')}
			/>
			<Layout.Content style={{ padding: '25px' }}>
				<Row justify="space-between" style={{ flexWrap: 'nowrap' }}>
					<Col flex="22em">
						<Button type="primary" onClick={dbregen} style={{ width: '19em' }}>
							{i18next.t('DATABASE.REGENERATE_DB')}
						</Button>
					</Col>
					<Col flex="auto">
						<Trans
							i18nKey="DATABASE.REGENERATE_DB_DESCRIPTION"
							components={{
								1: <p />,
								3: <li />,
								4: <li />,
							}}
						/>
					</Col>
				</Row>
				<Row justify="space-between" style={{ marginTop: '1.5em', flexWrap: 'nowrap' }}>
					<Col flex="22em">
						<Button type="primary" onClick={dbvalidateFiles} style={{ width: '19em' }}>
							{i18next.t('DATABASE.VALIDATE_FILES')}
						</Button>
					</Col>
					<Col flex="auto">{i18next.t('DATABASE.VALIDATE_FILES_DESCRIPTION')}</Col>
				</Row>
				<Row justify="space-between" style={{ marginTop: '1.5em', flexWrap: 'nowrap' }}>
					<Col flex="22em">
						<Button type="primary" onClick={dbdump} style={{ width: '19em' }}>
							{i18next.t('DATABASE.DUMP_DATABASE')}
						</Button>
					</Col>
					<Col flex="auto">{i18next.t('DATABASE.DUMP_DATABASE_DESCRIPTION')}</Col>
				</Row>
				<Row justify="space-between" style={{ marginTop: '1.5em', flexWrap: 'nowrap' }}>
					<Col flex="22em">
						<Button type="primary" onClick={dbrestore} style={{ width: '19em' }}>
							{i18next.t('DATABASE.RESTORE_DATABASE')}
						</Button>
					</Col>
					<Col flex="auto">
						<Trans
							i18nKey="DATABASE.RESTORE_DATABASE_DESCRIPTION"
							components={{
								2: <p style={{ fontWeight: 'bold' }} />,
							}}
						/>
					</Col>
				</Row>
			</Layout.Content>
		</>
	);
}

export default Database;
