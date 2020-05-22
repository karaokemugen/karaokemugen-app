import React, {Component} from 'react';
import { Button, Form, Input, Checkbox, Alert } from 'antd';
import i18next from 'i18next';
import { Repository } from '../../../../src/lib/types/repo';
import FoldersElement from '../Components/FoldersElement';

interface RepositoriesFormProps {
	repository: Repository;
	form: any;
	save: any;
	consolidate : (consolidatePath:string) => void;
}

interface RepositoriesFormState {
	consolidatePath?: string;
}

class RepositoryForm extends Component<RepositoriesFormProps, RepositoriesFormState> {

	state = {
		consolidatePath: undefined
	};

	handleSubmit = (e) => {
		e.preventDefault();
		this.props.form.validateFields((err, values) => {
			if (!err) {
				this.props.save(values);
			}
		});
	};

	render() {
		const {getFieldDecorator} = this.props.form;
		return (
			<Form
				onSubmit={this.handleSubmit}
				className='repository-form'
			>
				<Form.Item hasFeedback
					label={i18next.t('REPOSITORIES.NAME')}
					labelCol={{ span: 3 }}
					wrapperCol={{ span: 8, offset: 0 }}
				>
					{getFieldDecorator('Name', {
						initialValue: this.props.repository.Name,
						rules: [{
							required: true,
							message: i18next.t('TAGS.NAME_REQUIRED')
						}],
					})(<Input
						placeholder={i18next.t('REPOSITORIES.NAME')}
					/>)}
				</Form.Item>
				<Form.Item
					label={i18next.t('REPOSITORIES.ONLINE')}
					labelCol={{ span: 3 }}
					wrapperCol={{ span: 10, offset: 0 }}
				>
					{getFieldDecorator('Online', {
						valuePropName: "checked",
						initialValue: this.props.repository.Online,
					})(<Checkbox />)}
				</Form.Item>
				<Form.Item
					label={i18next.t('REPOSITORIES.ENABLED')}
					labelCol={{ span: 3 }}
					wrapperCol={{ span: 10, offset: 0 }}
				>
					{getFieldDecorator('Enabled', {
						valuePropName: "checked",
						initialValue: this.props.repository.Enabled,
					})(<Checkbox />)}
				</Form.Item>
				<Form.Item
					label={i18next.t('REPOSITORIES.PATH_KARAS')}
					labelCol={{ span: 3 }}
					wrapperCol={{ span: 10, offset: 0 }}
				>
					{getFieldDecorator('Path.Karas', {
						rules: [{
							required: true,
							message: i18next.t('REPOSITORIES.FOLDERS_REQUIRED', {name: i18next.t('REPOSITORIES.PATH_KARAS')})
						}],
						initialValue: this.props.repository.Path.Karas,
					})(<FoldersElement openDirectory={true} onChange={(value) => this.props.form.setFieldsValue({ 'Path.Karas': value })} />)}
				</Form.Item>
				<Form.Item
					label={i18next.t('REPOSITORIES.PATH_LYRICS')}
					labelCol={{ span: 3 }}
					wrapperCol={{ span: 10, offset: 0 }}
				>
					{getFieldDecorator('Path.Lyrics', {
						rules: [{
							required: true,
							message: i18next.t('REPOSITORIES.FOLDERS_REQUIRED', {name: i18next.t('REPOSITORIES.PATH_LYRICS')})
						}],
						initialValue: this.props.repository.Path.Lyrics,
					})(<FoldersElement openDirectory={true} onChange={(value) => this.props.form.setFieldsValue({ 'Path.Lyrics': value })} />)}
				</Form.Item>
				<Form.Item
					label={i18next.t('REPOSITORIES.PATH_MEDIAS')}
					labelCol={{ span: 3 }}
					wrapperCol={{ span: 10, offset: 0 }}
				>
					{getFieldDecorator('Path.Medias', {
						rules: [{
							required: true,
							message: i18next.t('REPOSITORIES.FOLDERS_REQUIRED', {name: i18next.t('REPOSITORIES.PATH_MEDIAS')})
						}],
						initialValue: this.props.repository.Path.Medias,
					})(<FoldersElement openDirectory={true} onChange={(value) => this.props.form.setFieldsValue({ 'Path.Medias': value })} />)}
				</Form.Item>
				<Form.Item
					label={i18next.t('REPOSITORIES.PATH_SERIES')}
					labelCol={{ span: 3 }}
					wrapperCol={{ span: 10, offset: 0 }}
				>
					{getFieldDecorator('Path.Series', {
						rules: [{
							required: true,
							message: i18next.t('REPOSITORIES.FOLDERS_REQUIRED', {name: i18next.t('REPOSITORIES.PATH_SERIES')})
						}],
						initialValue: this.props.repository.Path.Series,
					})(<FoldersElement openDirectory={true} onChange={(value) => this.props.form.setFieldsValue({ 'Path.Series': value })} />)}
				</Form.Item>
				<Form.Item
					label={i18next.t('REPOSITORIES.PATH_TAGS')}
					labelCol={{ span: 3 }}
					wrapperCol={{ span: 10, offset: 0 }}
				>
					{getFieldDecorator('Path.Tags', {
						rules: [{
							required: true,
							message: i18next.t('REPOSITORIES.FOLDERS_REQUIRED', {name: i18next.t('REPOSITORIES.PATH_TAGS')})
						}],
						initialValue: this.props.repository.Path.Tags,
					})(<FoldersElement openDirectory={true} onChange={(value) => this.props.form.setFieldsValue({ 'Path.Tags': value })} />)}
				</Form.Item>
				<Form.Item wrapperCol={{ span: 8, offset: 3 }} style={{textAlign:"right"}}>
					<Button type='primary' htmlType='submit'>{i18next.t('SUBMIT')}</Button>
				</Form.Item>
			
				{this.props.repository.Name ?
					<React.Fragment>
						<Form.Item hasFeedback
							label={i18next.t('REPOSITORIES.CONSOLIDATE')}
							labelCol={{ span: 3 }}
							wrapperCol={{ span: 8, offset: 0 }}
							>
							<FoldersElement openDirectory={true} onChange={(value) => this.setState({consolidatePath: value[0]})} />
						</Form.Item>

						<Form.Item
							wrapperCol={{ span: 8, offset: 3 }}
							style={{textAlign:"right"}}
							>
							<Button type="danger" onClick={() => this.props.consolidate(this.state.consolidatePath)}>
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

const cmp: any = Form.create()(RepositoryForm);
export default cmp;
