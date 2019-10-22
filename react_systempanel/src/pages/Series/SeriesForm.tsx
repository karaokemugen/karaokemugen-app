import React, {Component} from 'react';
import {Button, Col, Form, Icon, Input, message, Row, Select, Tag, Tooltip} from 'antd';
import EditableTagGroup from '../Components/EditableTagGroup';
import langs from 'langs';

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
			languages: [],
			selectVisible: false
		};
		langs.all().forEach(lang => this.state.languages.push({value: lang['2B'], text: lang.name}));
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
			message.error('A series must have at least one name by language');
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
						<span>Original Name&nbsp;
							<Tooltip title="This is the internal name used to reference the series in Karaoke Mugen's database">
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
							message: 'Please enter a name'
						}],
					})(<Input
						placeholder='Series name'
					/>)}
				</Form.Item>
				<Form.Item
					label={(
						<span>Aliase(s)&nbsp;
							<Tooltip title="Short names or alternative names a series could be searched. Example : DB for Dragon Ball, or FMA for Full Metal Alchemist, or AnoHana for that series which makes you cry everytime you watch it.">
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
				<div>
					Names by language&nbsp;
					<Tooltip title="There must be at least one name in any language (enter the original name by default)">
						<Icon type="question-circle-o" />
					</Tooltip>
				</div>
				{ this.state.i18n.map(langKey => (
						<Form.Item
							hasFeedback
							label={(
								<span>
									{langs.where('2B', langKey).name+" "}
									{Object.keys(this.state.i18n).length > 1 ? (
										<Tooltip title="Remove name">
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
									message: 'Please enter a translation'
								}],
							})(
								<Input placeholder='Name in that language' />
							)}
						</Form.Item>
				))}
				{selectVisible && (
					<Form.Item
						label="Select a language"
						labelCol={{ span: 3 }}
						wrapperCol={{ span: 4, offset: 0 }}
					>
						<Select
							showSearch
							ref={select => this.select = select}
							onChange={value => this.addLang(value)}>
							{ this.state.languages.map(lang => (<Select.Option value={lang.value}>"{lang.text} ({lang.value.toUpperCase()})"</Select.Option>)) }
						</Select>
					</Form.Item>
				)}
				{!selectVisible && (
					<Tag
						onClick={this.showSelect}
						style={{ borderStyle: 'dashed' }}
					>
						<Icon type="plus" /> Add
					</Tag>
				)}
				<Form.Item
					wrapperCol={{ span: 4, offset: 2 }}
				>
					<Button type='primary' htmlType='submit' className='series-form-button'>
						Save series
					</Button>
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
