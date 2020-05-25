import React, { Component } from 'react';
import { Modal, Button, Layout, Row, Col } from 'antd';
import i18next from 'i18next';
import Axios from 'axios';
import { getAxiosInstance } from '../axiosInterceptor';

interface DatabaseState {
	updateModal: boolean,
	renameModal: boolean
}

class Database extends Component<{}, DatabaseState> {

	constructor(props) {
		super(props);
		this.state = {
			updateModal: false,
			renameModal: false
		};
	}

	dbregen = async () => {
		getAxiosInstance().post('/db/generate');
	}

	dbvalidateFiles = async () => {
		getAxiosInstance().post('/db/validate');
	}

	dbupdate =  async () => {
		Axios.post('/downloads/updateMedias');
	}

	dbdump = async () => {
		getAxiosInstance().get('/db');
	}

	dbrestore = async () => {
		getAxiosInstance().post('/db');
	}

	render() {
		return (
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
					<Col flex="auto"dangerouslySetInnerHTML={{__html: i18next.t('DATABASE.REGENERATE_DB_DESCRIPTION')}}>
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
		);
	}
}

export default Database;
