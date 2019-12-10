import React, {Component} from 'react';
import {Button, Form, Icon, Input, message, Select, Tag, Tooltip} from 'antd';
import EditableTagGroup from '../Components/EditableTagGroup';
import {getListLanguagesInLocale, getLanguagesInLocaleFromCode } from '../../isoLanguages';
import i18next from 'i18next';

interface SeriesFormProps {
	serie: any,
	form: any
	save: any,
}

interface SeriesFormState {
	i18n: any[],
	languages: any[],
	selectVisible: boolean,
}

class SerieForm extends Component<SeriesFormProps, SeriesFormState> {

	select: any;

	constructor(props) {
		super(props);
		this.state = {
			i18n: [],
			languages: getListLanguagesInLocale(),
			selectVisible: false
		};
		if (Array.isArray(this.props.serie.i18n)) {
			this.props.serie.i18n.forEach(i18n => {
				this.state.i18n.push(i18n.lang);
				this.state[`lang_${i18n.lang}`] = i18n.name;
			});
		}
	}

	componentDidMount() {
	}

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
			message.error(i18next.t('SERIES.LANG_ERROR'));
		}
	};

	// i18n dynamic management
	addLang = (lang) => {
		if (!this.state.i18n.includes(lang)) {
			const newI18n = this.state.i18n.concat([lang]);
			this.setState({ i18n: newI18n});
		}
		this.setState({
			selectVisible: false
		});
	};

	removeLang = (lang) => {
		if (this.state.i18n.includes(lang)) {
			const newI18n = this.state.i18n.filter(e => e !== lang);
			this.setState({ i18n: newI18n});
		}
	};

	render() {
		const {getFieldDecorator} = this.props.form;
		const { selectVisible } = this.state;
		return (
			<Form
				onSubmit={this.handleSubmit}
				className='serie-form'
			>
				<Form.Item hasFeedback
					label={(
						<span>{i18next.t('TAGS.NAME')}&nbsp;
							<Tooltip title={i18next.t('SERIES.NAME_TOOLTIP')}>
								<Icon type="question-circle-o" />
							</Tooltip>
						</span>
					)}
					labelCol={{ span: 3 }}
					wrapperCol={{ span: 8, offset: 0 }}
				>
					{getFieldDecorator('name', {
						initialValue: this.props.serie.name,
						rules: [{
							required: true,
							message: i18next.t('TAGS.NAME_REQUIRED')
						}],
					})(<Input
						placeholder={i18next.t('TAGS.NAME')}
					/>)}
				</Form.Item>
				<Form.Item
					label={(
						<span>{i18next.t('TAGS.ALIASES')}&nbsp;
							<Tooltip title={i18next.t('SERIES.ALIASES_TOOLTIP')}>
								<Icon type="question-circle-o" />
							</Tooltip>
						</span>
					)}
					labelCol={{ span: 3 }}
					wrapperCol={{ span: 10, offset: 0 }}
				>
					{getFieldDecorator('aliases', {
						initialValue: this.props.serie.aliases,
					})(<EditableTagGroup
						search={'aliases'}
						onChange={ (tags) => this.props.form.setFieldsValue({ aliases: tags.join(',') }) }
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
				{ this.state.i18n.map(langKey => (
						<Form.Item
							hasFeedback
							label={(
								<span>
									{getLanguagesInLocaleFromCode(langKey)+" "}
									{Object.keys(this.state.i18n).length > 1 ? (
										<Tooltip title={i18next.t('TAGS.I18N_DELETE')}>
											<Icon
												className="dynamic-delete-button"
												type="minus-circle-o"
												onClick={() => this.removeLang(langKey)}
										/></Tooltip>
									) : null}
								</span>
							)}
							labelCol={{ span: 3 }}
							wrapperCol={{ span: 10, offset: 0 }}
						>
							{getFieldDecorator('lang_' + langKey, {
								initialValue: this.state[`lang_${langKey}`],
								rules: [{
									required: true,
									message: i18next.t('TAGS.I18N_ERROR')
								}],
							})(
								<Input placeholder={i18next.t('TAGS.I18N_NAME')} />
							)}
						</Form.Item>
				))}
				{selectVisible && (
					<Form.Item
						label={i18next.t('TAGS.I18N_SELECT')}
						labelCol={{ span: 3 }}
						wrapperCol={{ span: 4, offset: 0 }}
					>
						<Select
							showSearch
							optionFilterProp="children"
							ref={select => this.select = select}
							onChange={value => this.addLang(value)}>
							{ this.state.languages.map(lang => (
							<Select.Option value={lang.value}>
								{lang.text} ({lang.value.toUpperCase()})
							</Select.Option>)) }
						</Select>
					</Form.Item>
				)}
				{!selectVisible && (
					<Tag
						onClick={this.showSelect}
						style={{ borderStyle: 'dashed' }}
					>
						<Icon type="plus" />{i18next.t('ADD')}
					</Tag>
				)}
				<Form.Item
					wrapperCol={{ span: 4, offset: 2 }}
				>
					<Button type='primary' htmlType='submit'
						className='series-form-button'>{i18next.t('SUBMIT')}</Button>
				</Form.Item>
				<Form.Item>
					{getFieldDecorator('i18n', {
						initialValue: this.props.serie.i18n
					})(<Input type="hidden" />)}
				</Form.Item>
				<Form.Item>
					{getFieldDecorator('sid', {
						initialValue: this.props.serie.sid
					})(<Input type="hidden" />)}
				</Form.Item>
			</Form>
		);
	}
}

const cmp: any = Form.create()(SerieForm);
export default cmp;
