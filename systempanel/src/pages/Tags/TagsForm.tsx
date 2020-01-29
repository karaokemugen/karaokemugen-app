import React, { Component } from 'react';
import { Alert, Button, Form, Icon, Input, message, Select, Tag, Tooltip, Cascader } from 'antd';
import EditableTagGroup from '../Components/EditableTagGroup';
import {getListLanguagesInLocale, getLanguagesInLocaleFromCode } from '../../isoLanguages';
import i18next from 'i18next';
import { tagTypes } from '../../utils/tagTypes';
import axios from 'axios/index';

interface TagsFormProps {
	tags: any,
	tag: any,
	form: any
	save: any,
	mergeAction: any,
}

interface TagsFormState {
	i18n: any[],
	languages: any[],
	selectVisible: boolean,
	mergeSelection: string,
	repositoriesValue: string[]
}

class TagForm extends Component<TagsFormProps, TagsFormState> {

	select: any;

	constructor(props) {
		super(props);
		this.getRepositories();
		this.state = {
			i18n: [],
			languages: getListLanguagesInLocale(),
			selectVisible: false,
			mergeSelection: '',
			repositoriesValue: null
		};
		
		Object.keys(this.props.tag.i18n).forEach(lang => {
			var name = this.props.tag.i18n[lang];
			this.state.i18n.push(lang);
			this.state[`lang_${lang}`] = name;
		});
	}

	componentDidMount() {
		// For some stupid reason the list of languages won't be filled up, even with initialValue.
		// So we're filling the form here.
		for (const lang of this.state.i18n) {
			const obj = {};
			obj[`lang_${lang}`] = this.props.tag.i18n[lang];
			this.props.form.setFieldsValue(obj);
		}
	}

	getRepositories = async () => {
		const res = await axios.get("/api/repos");
		this.setState({ repositoriesValue: res.data.map(repo => repo.Name)});
	};

	showSelect = () => {
		this.setState({ selectVisible: true }, () => this.select.focus());
	};

	handleSubmit = (e) => {
		e.preventDefault();
		if (this.state.i18n.length > 0) {
			this.props.form.validateFields((err, values) => {
				if (!err) {
					const i18nField = {};
					this.state.i18n.forEach((lang) => {
						i18nField[lang] = values[`lang_${lang}`];
						delete values[`lang_${lang}`];
					});
					values.i18n = i18nField;
					this.props.save(values);
				}
			});
		} else {
			message.error(i18next.t('TAGS.LANG_ERROR'));
		}
	};

	handleTagMergeSelection = (value) => {
		this.setState({mergeSelection:value[1]})
	}
	handleTagMerge = (e) => {
		this.props.mergeAction(this.props.tag.tid,this.state.mergeSelection)
	}

	// i18n dynamic management
	addLang = (lang) => {
		if (!this.state.i18n.includes(lang)) {
			const newI18n = this.state.i18n.concat([lang]);
			this.setState({ i18n: newI18n });
		}
		this.setState({
			selectVisible: false
		});
	};

	removeLang = (lang) => {
		if (this.state.i18n.includes(lang)) {
			const newI18n = this.state.i18n.filter(e => e !== lang);
			this.setState({ i18n: newI18n });
		}
	};

	mergeCascaderOption = () => {
		let options = Object.keys(tagTypes).map(type => {
			const typeID = tagTypes[type];
			
			let option = {
				value:typeID,
				label:i18next.t(`TAG_TYPES.${type}`),
				children: []
			}
			this.props.tags.forEach(tag => {
				if(tag.tid!==this.props.tag.tid)
				{
					if(tag.types.length && tag.types.indexOf(typeID)>=0)
						option.children.push({
							value:tag.tid,
							label:tag.name,
						})
				}
			})
			return option;
		})
		return options;
	}

	mergeCascaderFilter = function(inputValue, path) {
	  return path.some(option => option.label.toLowerCase().indexOf(inputValue.toLowerCase()) > -1);
	}

	render() {
		const { getFieldDecorator } = this.props.form;
		const { selectVisible } = this.state;
		return (
			<Form
				onSubmit={this.handleSubmit}
				className='tag-form'
			>
				<Form.Item hasFeedback
					label={(
						<span>{i18next.t('TAGS.NAME')}&nbsp;
							<Tooltip title={i18next.t('TAGS.NAME_TOOLTIP')}>
								<Icon type="question-circle-o" />
							</Tooltip>
						</span>
					)}
					labelCol={{ span: 3 }}
					wrapperCol={{ span: 8, offset: 0 }}
				>
					{getFieldDecorator('name', {
						initialValue: this.props.tag.name,
						rules: [{
							required: true,
							message: i18next.t('TAGS.NAME_REQUIRED')
						}],
					})(<Input
						placeholder={i18next.t('TAGS.NAME')}
					/>)}
				</Form.Item>
				<Form.Item hasFeedback
					label={(
						<span>{i18next.t('TAGS.SHORT_NAME')}&nbsp;
							<Tooltip title={i18next.t('TAGS.SHORT_NAME_TOOLTIP')}>
								<Icon type="question-circle-o" />
							</Tooltip>
						</span>
					)}
					labelCol={{ span: 3 }}
					wrapperCol={{ span: 8, offset: 0 }}
				>
					{getFieldDecorator('short', {
						initialValue: this.props.tag.short,
					})(<Input
						placeholder={i18next.t('TAGS.SHORT_NAME')}
					/>)}
				</Form.Item>
				<Form.Item hasFeedback
					label={(
						<span>{i18next.t('TAGS.TYPES')}&nbsp;
								<Tooltip title={i18next.t('TAGS.TYPES_TOOLTIP')}>
								<Icon type="question-circle-o" />
							</Tooltip>
						</span>
					)}
					labelCol={{ span: 3 }}
					wrapperCol={{ span: 8, offset: 0 }}
				>

					{getFieldDecorator("types", {
						rules: [{ required: true }],
						initialValue: this.props.tag.types ? this.props.tag.types : []
					})(
						<Select mode="multiple" placeholder={i18next.t('TAGS.TYPES')}>
							{Object.keys(tagTypes).map(type => {
								const value = tagTypes[type];
								return <Select.Option key={value} value={value}>
										{i18next.t(`TAG_TYPES.${type}`)}
									</Select.Option>
							})
							}
						</Select>
					)}
				</Form.Item>
				{this.state.repositoriesValue ?
					<Form.Item
						label={i18next.t('TAGS.REPOSITORY')}
						labelCol={{ span: 3 }}
						wrapperCol={{ span: 3, offset: 0 }}
					>
						{getFieldDecorator("repository", {
							initialValue: this.props.tag.repository ? this.props.tag.repository : this.state.repositoriesValue[0]
						})(
							<Select placeholder={i18next.t('TAGS.REPOSITORY')}>
								{this.state.repositoriesValue.map(repo => {
									return <Select.Option key={repo} value={repo}>{repo}</Select.Option>
								})
								}
							</Select>
						)}
					</Form.Item> : null
				}
				
				{this.props.tag.repository && this.props.tag.repository !== this.props.form.getFieldValue('repository') ?
					<Form.Item
						wrapperCol={{ span: 8, offset: 3 }}
						style={{textAlign:"right"}}
						>
						<Alert style={{textAlign:"left"}}
							message={i18next.t('TAGS.REPOSITORY_CHANGED')}
							type="error"
						/>
					</Form.Item>: null	
				}
				<Form.Item
					label={(
						<span>{i18next.t('TAGS.ALIASES')}&nbsp;
							<Tooltip title={i18next.t('TAGS.ALIASES_TOOLTIP')}>
								<Icon type="question-circle-o" />
							</Tooltip>
						</span>
					)}
					labelCol={{ span: 3 }}
					wrapperCol={{ span: 8, offset: 0 }}
				>
					{getFieldDecorator('aliases', {
						initialValue: this.props.tag.aliases,
					})(<EditableTagGroup
						search={'aliases'}
						onChange={(tags) => this.props.form.setFieldsValue({ aliases: tags.join(',') })}
					/>)}
				</Form.Item>

				<Form.Item 
					labelCol={{ span: 3 }}
					wrapperCol={{ span: 8, offset: 0 }}
					label={(<span>{i18next.t('TAGS.I18N')}&nbsp;
						<Tooltip title={i18next.t('TAGS.I18N_TOOLTIP')}>
							<Icon type="question-circle-o" />
						</Tooltip>
					</span>)}
					>
				</Form.Item>

				{this.state.i18n.map(langKey => (
					<Form.Item
						key={langKey}
						hasFeedback
						label={getLanguagesInLocaleFromCode(langKey)}
						labelCol={{ span: 3 }}
						wrapperCol={{ span: 8, offset: 0 }}
					>
							{getFieldDecorator('lang_' + langKey, {
								initialValue: this.state[`lang_${langKey}`],
								rules: [{
									required: true,
									message: i18next.t('TAGS.I18N_ERROR')
								}],
							})(
								<Input
									placeholder={i18next.t('TAGS.I18N_NAME')}
								/>
							)}

							{Object.keys(this.state.i18n).length > 1 ? (
								<span style={{position:'absolute'}}>
									<Tooltip title={i18next.t('TAGS.I18N_DELETE')}>
									<Icon
										className="dynamic-delete-button"
										type="minus-circle-o"
										onClick={() => this.removeLang(langKey)}
									/>
								</Tooltip></span>
							) : null}

					</Form.Item>
				))}
				{selectVisible && (
					<Form.Item
						label={i18next.t('TAGS.I18N_SELECT')}
						labelCol={{ span: 3 }}
						wrapperCol={{ span: 8, offset: 0 }}
					>
						<Select
							showSearch
							optionFilterProp="children"
							ref={select => this.select = select}
							onChange={value => this.addLang(value)}>
							{this.state.languages.map(lang => (
								<Select.Option key={lang.value} value={lang.value}>
									{lang.text} ({lang.value.toUpperCase()})
								</Select.Option>))}
						</Select>
					</Form.Item>
				)}
				{!selectVisible && (
					<Form.Item
						label={i18next.t('TAGS.I18N_SELECT')}
						labelCol={{ span: 3 }}
						wrapperCol={{ span: 8, offset: 0 }}
					>
						<Tag
							onClick={this.showSelect}
							style={{ borderStyle: 'dashed' }}
							>
							<Icon type="plus" />{i18next.t('ADD')}
						</Tag>
					</Form.Item>
				)}
				<Form.Item wrapperCol={{ span: 8, offset: 3 }} style={{textAlign:"right"}}>
					<Button type='primary' htmlType='submit' 
						className='tags-form-button'>{i18next.t('SUBMIT')}</Button>
				</Form.Item>
				
				<Form.Item hasFeedback
					label={(
						<span>{i18next.t('TAGS.MERGE_WITH')}&nbsp;
							<Tooltip title={i18next.t('TAGS.MERGE_WITH_TOOLTIP')}>
								<Icon type="question-circle-o" />
							</Tooltip>
						</span>
					)}
					labelCol={{ span: 3 }}
					wrapperCol={{ span: 8, offset: 0 }}
					>
					<Cascader options={this.mergeCascaderOption()} 
						showSearch={{filter:this.mergeCascaderFilter}} 
						onChange={this.handleTagMergeSelection.bind(this)} 
						placeholder={i18next.t('TAGS.MERGE_WITH_SELECT')} />
				</Form.Item>

				<Form.Item
					wrapperCol={{ span: 8, offset: 3 }}
					style={{textAlign:"right"}}
					>
					<Button type="danger" onClick={this.handleTagMerge.bind(this)}>
						{i18next.t('TAGS.MERGE_WITH_BUTTON')}
					</Button>
                    <Alert style={{textAlign:"left"}}
                        message={i18next.t('TAGS.MERGE_ABOUT')}
                        description={i18next.t('TAGS.MERGE_ABOUT_MESSAGE')}
                        type="warning"
                    />
				
				</Form.Item>

				<Form.Item>
					{getFieldDecorator('i18n', {
						initialValue: this.props.tag.i18n
					})(<Input type="hidden" />)}
				</Form.Item>
				<Form.Item>
					{getFieldDecorator('tid', {
						initialValue: this.props.tag.tid
					})(<Input type="hidden" />)}
				</Form.Item>

			</Form>
		);
	}
}

const cmp: any = Form.create()(TagForm);
export default cmp;
