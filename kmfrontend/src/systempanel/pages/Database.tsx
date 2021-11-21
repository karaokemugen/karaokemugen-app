import { Button, Col,Layout, Row } from 'antd';
import i18next from 'i18next';
import { Component } from 'react';
import { Trans } from 'react-i18next';

import { commandBackend } from '../../utils/socket';
import { displayMessage } from '../../utils/tools';

class Database extends Component<unknown, unknown> {

	dbregen = async () => {
		commandBackend('generateDatabase', undefined, true, 300000).catch(() => {});
	}

	dbvalidateFiles = async () => {
		commandBackend('validateFiles', undefined, true, 300000).catch(() => {});
	}

	dbdump = async () => {
		commandBackend('dumpDatabase', undefined, true, 300000).catch(() => {});
	}

	dbrestore = async () => {
		commandBackend('restoreDatabase', undefined, true, 300000).catch(() => {});
	}

	updateRepos = async () => {
		commandBackend('updateAllRepos').then(() => displayMessage('success', i18next.t('DATABASE.UPDATING_REPOS'))).catch(() => {});
	}

	getCommits = async () => {
		commandBackend('getCommits', {repoName: 'kara.moe'});
	}

	render() {
		return (
			<>
				<Layout.Header>
					<div className='title'>{i18next.t('HEADERS.DATABASE.TITLE')}</div>
					<div className='description'>{i18next.t('HEADERS.DATABASE.DESCRIPTION')}</div>
				</Layout.Header>
				<Layout.Content style={{ padding: '25px'}}>
					<Row justify="space-between" style={{ flexWrap: 'nowrap' }}>
						<Col flex="22em">
							<Button
								type='primary' onClick={this.dbregen} style={{ width: '19em' }}>
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
							<Button
								type='primary' onClick={this.updateRepos} style={{ width: '19em' }}>
								{i18next.t('DATABASE.UPDATE_REPOS')}
							</Button>
						</Col>
						<Col flex="auto">{i18next.t('DATABASE.UPDATE_REPOS_DESCRIPTION')}
						</Col>
					</Row>
					<Row justify="space-between" style={{ marginTop: '1.5em', flexWrap: 'nowrap' }}>
						<Col flex="22em">
							<Button
								type='primary' onClick={this.getCommits} style={{ width: '19em' }}>
								Get commits
							</Button>
						</Col>
						<Col flex="auto">
							See console for output
						</Col>
					</Row>
					<Row justify="space-between" style={{ marginTop: '1.5em', flexWrap: 'nowrap' }}>
						<Col flex="22em">
							<Button
								type='primary' onClick={this.dbvalidateFiles} style={{ width: '19em' }}>
								{i18next.t('DATABASE.VALIDATE_FILES')}
							</Button>
						</Col>
						<Col flex="auto">{i18next.t('DATABASE.VALIDATE_FILES_DESCRIPTION')}
						</Col>
					</Row>
					<Row justify="space-between" style={{ marginTop: '1.5em', flexWrap: 'nowrap' }}>
						<Col flex="22em">
							<Button
								type='primary' onClick={this.dbdump} style={{ width: '19em' }}>
								{i18next.t('DATABASE.DUMP_DATABASE')}
							</Button>
						</Col>
						<Col flex="auto">{i18next.t('DATABASE.DUMP_DATABASE_DESCRIPTION')}
						</Col>
					</Row>
					<Row justify="space-between" style={{ marginTop: '1.5em', flexWrap: 'nowrap' }}>
						<Col flex="22em">

							<Button
								type='primary' onClick={this.dbrestore} style={{ width: '19em' }}>
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
}

export default Database;
