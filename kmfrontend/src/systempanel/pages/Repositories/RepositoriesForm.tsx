import { QuestionCircleOutlined } from '@ant-design/icons';
import { Alert, Button, Checkbox, Divider, Form, Input, Select, Tooltip } from 'antd';
import { FormInstance } from 'antd/lib/form';
import i18next from 'i18next';
import React, { Component } from 'react';

import { Repository } from '../../../../../src/lib/types/repo';
import { commandBackend } from '../../../utils/socket';
import FoldersElement from '../../components/FoldersElement';

interface RepositoriesFormProps {
	repository: Repository;
	save: any;
	consolidate: (consolidatePath: string) => void;
	compareLyrics: (repo: string) => void;
	copyLyrics: (report: string) => void;
}

interface RepositoriesFormState {
	consolidatePath?: string;
	compareRepo?: string;
	repositoriesValue: string[];
}

class RepositoryForm extends Component<RepositoriesFormProps, RepositoriesFormState> {
	formRef = React.createRef<FormInstance>();

	constructor(props) {
		super(props);
		if (props.repository) {
			this.getRepositories();
		}

		this.state = {
			consolidatePath: undefined,
			repositoriesValue: null
		};
	}

	getRepositories = async () => {
		const res = await commandBackend('getRepos');
		this.setState({ repositoriesValue: res.filter(repo => repo.Name !== this.props.repository.Name).map(repo => repo.Name) });
	};

	handleSubmit = (values) => {
		const repository: Repository = {
			Name: values.Name,
			Online: values.Online,
			Enabled: values.Enabled,
			Path: {
				Karas: values.PathKaras,
				Lyrics: values.PathLyrics,
				Medias: values.PathMedias,
				Tags: values.PathTags
			}
		};
		this.props.save(repository);
	};

	setDefaultFolders = (): void => {
		if (!this.props.repository.Name) {
			const folders: { PathKaras?: string[]; PathLyrics?: string[]; PathMedias?: string[]; PathTags?: string[] } = {};
			if (this.formRef.current?.getFieldValue('PathKaras').length === 0) folders.PathKaras = [`repo/${this.formRef.current?.getFieldValue('Name')}/karaokes`];
			if (this.formRef.current?.getFieldValue('PathLyrics').length === 0) folders.PathLyrics = [`repo/${this.formRef.current?.getFieldValue('Name')}/lyrics`];
			if (this.formRef.current?.getFieldValue('PathMedias').length === 0) folders.PathMedias = [`repo/${this.formRef.current?.getFieldValue('Name')}/medias`];
			if (this.formRef.current?.getFieldValue('PathTags').length === 0) folders.PathTags = [`repo/${this.formRef.current?.getFieldValue('Name')}/tags`];
			this.formRef.current?.setFieldsValue(folders);
		}
	}

	render() {
		return (
			<Form
				ref={this.formRef}
				onFinish={this.handleSubmit}
				className='repository-form'
				initialValues={{
					Name: this.props.repository?.Name,
					Online: this.props.repository?.Online,
					Enabled: this.props.repository?.Enabled,
					PathKaras: this.props.repository?.Path.Karas,
					PathLyrics: this.props.repository?.Path.Lyrics,
					PathMedias: this.props.repository?.Path.Medias,
					PathTags: this.props.repository?.Path.Tags
				}}
				style={{ maxWidth: '900px' }}
			>
				<Form.Item hasFeedback
					label={
						<span>{i18next.t(this.formRef.current?.getFieldValue('Online') ?
							'REPOSITORIES.ONLINE_NAME' : 'REPOSITORIES.NAME')}&nbsp;
						<Tooltip title={i18next.t('REPOSITORIES.TOOLTIP_NAME')}>
							<QuestionCircleOutlined />
						</Tooltip>
						</span>
					}
					labelCol={{ flex: '0 1 200px' }}
					rules={[{
						required: true,
						message: i18next.t('TAGS.NAME_REQUIRED')
					}]}
					name="Name"
				>
					<Input
						placeholder={i18next.t('REPOSITORIES.NAME')}
						onBlur={this.setDefaultFolders}
					/>
				</Form.Item>
				<Form.Item
					label={i18next.t('REPOSITORIES.ONLINE')}
					labelCol={{ flex: '0 1 200px' }}
					valuePropName="checked"
					name="Online"
				>
					<Checkbox />
				</Form.Item>
				<Form.Item
					label={i18next.t('REPOSITORIES.ENABLED')}
					labelCol={{ flex: '0 1 200px' }}
					valuePropName="checked"
					name="Enabled"
				>
					<Checkbox />
				</Form.Item>
				<Form.Item
					label={i18next.t('REPOSITORIES.PATH_KARAS')}
					labelCol={{ flex: '0 1 200px' }}
					rules={[{
						required: true,
						message: i18next.t('REPOSITORIES.FOLDERS_REQUIRED', { name: i18next.t('REPOSITORIES.PATH_KARAS') })
					}]}
					name="PathKaras"
				>
					<FoldersElement openDirectory={true} onChange={(value) => this.formRef.current.setFieldsValue({ 'PathKaras': value })} />
				</Form.Item>
				<Form.Item
					label={i18next.t('REPOSITORIES.PATH_LYRICS')}
					labelCol={{ flex: '0 1 200px' }}
					rules={[{
						required: true,
						message: i18next.t('REPOSITORIES.FOLDERS_REQUIRED', { name: i18next.t('REPOSITORIES.PATH_LYRICS') })
					}]}
					name="PathLyrics"
				>
					<FoldersElement openDirectory={true} onChange={(value) => this.formRef.current.setFieldsValue({ 'PathLyrics': value })} />
				</Form.Item>
				<Form.Item
					label={i18next.t('REPOSITORIES.PATH_MEDIAS')}
					labelCol={{ flex: '0 1 200px' }}
					rules={[{
						required: true,
						message: i18next.t('REPOSITORIES.FOLDERS_REQUIRED', { name: i18next.t('REPOSITORIES.PATH_MEDIAS') })
					}]}
					name="PathMedias"
				>
					<FoldersElement openDirectory={true} onChange={(value) => this.formRef.current.setFieldsValue({ 'PathMedias': value })} />
				</Form.Item>
				<Form.Item
					label={i18next.t('REPOSITORIES.PATH_TAGS')}
					labelCol={{ flex: '0 1 200px' }}
					rules={[{
						required: true,
						message: i18next.t('REPOSITORIES.FOLDERS_REQUIRED', { name: i18next.t('REPOSITORIES.PATH_TAGS') })
					}]}
					name="PathTags"
				>
					<FoldersElement openDirectory={true} onChange={(value) => this.formRef.current.setFieldsValue({ 'PathTags': value })} />
				</Form.Item>
				<Form.Item style={{ textAlign: 'right' }}>
					<Button type='primary' htmlType='submit'>{i18next.t('SUBMIT')}</Button>
				</Form.Item>
				{this.props.repository.Name ?
					<React.Fragment>
						<Divider orientation="left">{i18next.t('REPOSITORIES.COMPARE_LYRICS')}</Divider>
						<Alert style={{ textAlign: 'left', marginBottom: '10px' }}
							message={i18next.t('REPOSITORIES.COMPARE_ABOUT_MESSAGE')}
							type="info"
						/>
						{this.state.repositoriesValue ?
							<React.Fragment>
								<Form.Item
									label={i18next.t('REPOSITORIES.COMPARE_LYRICS_CHOOSE_REPOSITORY')}
									labelCol={{ flex: '0 1 200px' }}
								>

									<Select style={{ maxWidth: '50%', minWidth: '150px' }} placeholder={i18next.t('TAGS.REPOSITORY')}
										onChange={value => this.setState({ compareRepo: value.toString() })}>
										{this.state.repositoriesValue.map(repo => {
											return <Select.Option key={repo} value={repo}>{repo}</Select.Option>;
										})
										}
									</Select>
								</Form.Item>
								<Form.Item
									labelCol={{ flex: '0 1 200px' }}
									style={{ textAlign: 'right' }}>
									<div>
										<Button type='primary' onClick={() => this.props.compareLyrics(this.state.compareRepo)}>
											{i18next.t('REPOSITORIES.COMPARE_BUTTON')}
										</Button>
									</div>
								</Form.Item>
							</React.Fragment>
							: null
						}
						<Divider orientation="left">{i18next.t('REPOSITORIES.CONSOLIDATE_PANEL')}</Divider>

						<Form.Item hasFeedback
							label={i18next.t('REPOSITORIES.CONSOLIDATE')}
							labelCol={{ flex: '0 1 200px' }}
						>
							<FoldersElement openDirectory={true} onChange={(value) => this.setState({ consolidatePath: value[0] })} />
						</Form.Item>
						<Form.Item
							style={{ textAlign: 'right' }}
						>
							<Button type="primary" danger onClick={() => this.props.consolidate(this.state.consolidatePath)}>
								{i18next.t('REPOSITORIES.CONSOLIDATE_BUTTON')}
							</Button>
							<Alert style={{ textAlign: 'left', marginTop: '10px' }}
								message={i18next.t('REPOSITORIES.WARNING')}
								description={i18next.t('REPOSITORIES.CONSOLIDATE_ABOUT_MESSAGE')}
								type="warning"
							/>

						</Form.Item>
					</React.Fragment> : null
				}
			</Form>
		);
	}
}

export default RepositoryForm;
