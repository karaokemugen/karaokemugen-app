import React, {Component} from 'react';
import { Button, Input, Checkbox, Alert, Form } from 'antd';
import i18next from 'i18next';
import { Repository } from '../../../../src/lib/types/repo';
import FoldersElement from '../Components/FoldersElement';
import { FormInstance } from 'antd/lib/form';

interface RepositoriesFormProps {
	repository: Repository;
	save: any;
	consolidate : (consolidatePath:string) => void;
}

interface RepositoriesFormState {
	consolidatePath?: string;
}

class RepositoryForm extends Component<RepositoriesFormProps, RepositoriesFormState> {
	formRef = React.createRef<FormInstance>();

	state = {
		consolidatePath: undefined
	};

	render() {
		return (
			<Form
				ref={this.formRef}
				onFinish={this.props.save}
				className='repository-form'
				initialValues={this.props.repository}
			>
				<Form.Item hasFeedback
					label={i18next.t('REPOSITORIES.NAME')}
					labelCol={{ flex: '0 1 200px' }}
					wrapperCol={{ span: 8 }}
					rules={[{
						required: true,
						message: i18next.t('TAGS.NAME_REQUIRED')
					}]}
				>
					<Input
						placeholder={i18next.t('REPOSITORIES.NAME')}
					/>
				</Form.Item>
				<Form.Item
					label={i18next.t('REPOSITORIES.ONLINE')}
					labelCol={{ flex: '0 1 200px' }}
					wrapperCol={{ span: 10 }}
					valuePropName="checked"
				>
					<Checkbox />
				</Form.Item>
				<Form.Item
					label={i18next.t('REPOSITORIES.ENABLED')}
					labelCol={{ flex: '0 1 200px' }}
					wrapperCol={{ span: 10 }}
					valuePropName="checked"
				>
					<Checkbox />
				</Form.Item>
				<Form.Item
					label={i18next.t('REPOSITORIES.PATH_KARAS')}
					labelCol={{ flex: '0 1 200px' }}
					wrapperCol={{ span: 10 }}
					rules={[{
						required: true,
						message: i18next.t('REPOSITORIES.FOLDERS_REQUIRED', {name: i18next.t('REPOSITORIES.PATH_KARAS')})
					}]}
				>
					<FoldersElement onChange={(value) => this.formRef.current.setFieldsValue({ 'Path.Karas': value })} />
				</Form.Item>
				<Form.Item
					label={i18next.t('REPOSITORIES.PATH_LYRICS')}
					labelCol={{ flex: '0 1 200px' }}
					wrapperCol={{ span: 10 }}
					rules={[{
						required: true,
						message: i18next.t('REPOSITORIES.FOLDERS_REQUIRED', {name: i18next.t('REPOSITORIES.PATH_LYRICS')})
					}]}
				>
					<FoldersElement onChange={(value) => this.formRef.current.setFieldsValue({ 'Path.Lyrics': value })} />
				</Form.Item>
				<Form.Item
					label={i18next.t('REPOSITORIES.PATH_MEDIAS')}
					labelCol={{ flex: '0 1 200px' }}
					wrapperCol={{ span: 10 }}
					rules={[{
						required: true,
						message: i18next.t('REPOSITORIES.FOLDERS_REQUIRED', {name: i18next.t('REPOSITORIES.PATH_MEDIAS')})
					}]}
				>
					<FoldersElement onChange={(value) => this.formRef.current.setFieldsValue({ 'Path.Medias': value })} />
				</Form.Item>
				<Form.Item
					label={i18next.t('REPOSITORIES.PATH_SERIES')}
					labelCol={{ flex: '0 1 200px' }}
					wrapperCol={{ span: 10 }}
					rules={[{
						required: true,
						message: i18next.t('REPOSITORIES.FOLDERS_REQUIRED', {name: i18next.t('REPOSITORIES.PATH_SERIES')})
					}]}
				>
					<FoldersElement onChange={(value) => this.formRef.current.setFieldsValue({ 'Path.Series': value })} />
				</Form.Item>
				<Form.Item
					label={i18next.t('REPOSITORIES.PATH_TAGS')}
					labelCol={{ flex: '0 1 200px' }}
					wrapperCol={{ span: 10 }}
					rules={[{
						required: true,
						message: i18next.t('REPOSITORIES.FOLDERS_REQUIRED', {name: i18next.t('REPOSITORIES.PATH_TAGS')})
					}]}
				>
					<FoldersElement onChange={(value) => this.formRef.current.setFieldsValue({ 'Path.Tags': value })} />
				</Form.Item>
				<Form.Item wrapperCol={{ span: 8, offset: 3 }} style={{textAlign:"right"}}>
					<Button type='primary' htmlType='submit'>{i18next.t('SUBMIT')}</Button>
				</Form.Item>
			
				{this.props.repository.Name ?
					<React.Fragment>
						<Form.Item hasFeedback
							label={i18next.t('REPOSITORIES.CONSOLIDATE')}
							labelCol={{ flex: '0 1 200px' }}
							wrapperCol={{ span: 8 }}
							>
							<FoldersElement openDirectory={true} onChange={(value) => this.setState({consolidatePath: value[0]})} />
						</Form.Item>

						<Form.Item
							wrapperCol={{ span: 8, offset: 3 }}
							style={{textAlign:"right"}}
							>
							<Button type="primary" danger onClick={() => this.props.consolidate(this.state.consolidatePath)}>
								{i18next.t('REPOSITORIES.CONSOLIDATE_BUTTON')}
							</Button>
							<Alert style={{textAlign:"left", marginTop: '10px'}}
								message={i18next.t('REPOSITORIES.CONSOLIDATE_ABOUT')}
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
