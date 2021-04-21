import { Button, Col,Layout, Modal, Row } from 'antd';
import i18next from 'i18next';
import React, { Component } from 'react';

import { commandBackend } from '../../utils/socket';

interface DatabaseState {
	updateModal: boolean,
	renameModal: boolean
}

class Database extends Component<unknown, DatabaseState> {

	constructor(props) {
		super(props);
		this.state = {
			updateModal: false,
			renameModal: false
		};
	}

	dbregen = async () => {
		commandBackend('generateDatabase', undefined, true, 300000).catch(() => {});
	}

	dbvalidateFiles = async () => {
		commandBackend('validateFiles', undefined, true, 300000).catch(() => {});
	}

	dbupdate =  async () => {
		commandBackend('updateAllMedias', undefined, true, 300000).catch(() => {});
	}

	dbdump = async () => {
		commandBackend('dumpDatabase', undefined, true, 300000).catch(() => {});
	}

	dbrestore = async () => {
		commandBackend('restoreDatabase', undefined, true, 300000).catch(() => {});
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
						<Col flex="300px">
							<Button
								type='primary'
								onClick={this.dbregen}
							>
								{i18next.t('DATABASE.REGENERATE_DB')}
							</Button>
						</Col>
						<Col flex="auto" dangerouslySetInnerHTML={{__html: i18next.t('DATABASE.REGENERATE_DB_DESCRIPTION')}}>
						</Col>
					</Row>
					<Row justify="space-between" style={{ marginTop: '20px', flexWrap: 'nowrap' }}>
						<Col flex="300px">
							<Button
								type='primary'
								onClick={this.dbvalidateFiles}
							>
								{i18next.t('DATABASE.VALIDATE_FILES')}
							</Button>
						</Col>
						<Col flex="auto" dangerouslySetInnerHTML={{__html: i18next.t('DATABASE.VALIDATE_FILES_DESCRIPTION')}}>
						</Col>
					</Row>
					<Row justify="space-between" style={{ marginTop: '20px', flexWrap: 'nowrap' }}>
						<Col flex="300px">
							<Button
								type='primary'
								onClick={
									() => this.setState({ updateModal: true })
								}
							>
								{i18next.t('DATABASE.UPDATE_MEDIA')}
							</Button>
						</Col>
						<Col flex="auto" dangerouslySetInnerHTML={{__html: i18next.t('DATABASE.UPDATE_MEDIA_DESCRIPTION')}}>
						</Col>
					</Row>
					<Row justify="space-between" style={{ marginTop: '10px', flexWrap: 'nowrap' }}>
						<Col flex="300px">
							<Button
								type='primary'
								onClick={this.dbdump}
							>
								{i18next.t('DATABASE.DUMP_DATABASE')}
							</Button>
						</Col>
						<Col flex="auto" dangerouslySetInnerHTML={{__html: i18next.t('DATABASE.DUMP_DATABASE_DESCRIPTION')}}>
						</Col>
					</Row>

					<Row justify="space-between" style={{ marginTop: '20px', flexWrap: 'nowrap' }}>
						<Col flex="300px">

							<Button
								type='primary'
								onClick={this.dbrestore}
							>
								{i18next.t('DATABASE.RESTORE_DATABASE')}
							</Button>
						</Col>
						<Col flex="auto" dangerouslySetInnerHTML={{__html: i18next.t('DATABASE.RESTORE_DATABASE_DESCRIPTION')}}>
						</Col>
					</Row>
					<Modal
						title={i18next.t('DATABASE.CONFIRM_UPDATE')}
						visible={this.state.updateModal}
						onOk={() => {
							this.dbupdate();
							this.setState({ updateModal: false });
						}}
						onCancel={() => this.setState({ updateModal: false })}
						okText={i18next.t('YES')}
						cancelText={i18next.t('NO')}
					>
						<p>{i18next.t('DATABASE.UPDATE_MESSAGE_WARNING')} <b>{i18next.t('DATABASE.UPDATE_MESSAGE_FILES')}</b>.</p>
						<p>{i18next.t('DATABASE.UPDATE_MESSAGE_DELETED')}</p>
						<p>{i18next.t('CONFIRM_SURE')}</p>
					</Modal>
				</Layout.Content>
			</>
		);
	}
}

export default Database;
