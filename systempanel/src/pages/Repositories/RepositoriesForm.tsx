import React, {Component} from 'react';
import { Button, Form, Input, Checkbox } from 'antd';
import i18next from 'i18next';
import { Repository } from '../../../../src/lib/types/repo';
import FoldersElement from '../Components/FoldersElement';

interface RepositoriesFormProps {
	repository: Repository;
	form: any;
	save: any;
}

class RepositoryForm extends Component<RepositoriesFormProps, {}> {

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
					})(<FoldersElement onChange={(value) => this.props.form.setFieldsValue({ 'Path.Karas': value })} />)}
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
					})(<FoldersElement onChange={(value) => this.props.form.setFieldsValue({ 'Path.Lyrics': value })} />)}
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
					})(<FoldersElement onChange={(value) => this.props.form.setFieldsValue({ 'Path.Medias': value })} />)}
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
					})(<FoldersElement onChange={(value) => this.props.form.setFieldsValue({ 'Path.Series': value })} />)}
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
					})(<FoldersElement onChange={(value) => this.props.form.setFieldsValue({ 'Path.Tags': value })} />)}
				</Form.Item>
				<Form.Item
					wrapperCol={{ span: 4, offset: 2 }}
				>
					<Button type='primary' htmlType='submit'>{i18next.t('SUBMIT')}</Button>
				</Form.Item>
			</Form>
		);
	}
}

const cmp: any = Form.create()(RepositoryForm);
export default cmp;
