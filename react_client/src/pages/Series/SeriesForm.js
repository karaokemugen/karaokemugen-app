import React, {Component} from 'react';
import {Tag, Select, Tooltip, Button, Form, Icon, Input} from 'antd';
import PropTypes from 'prop-types';
import EditableTagGroup from '../Components/EditableTagGroup';
import langs from 'langs';

class SerieForm extends Component {

	constructor(props) {
		super(props);		
		this.state = {
			i18n: [],
			languages: [],
			selectVisible: false
		};
		langs.all().forEach(lang => this.state.languages.push({value: lang['2B'], text: lang.name}));
		this.state.languages.push({value: 'und', text: 'Undefined Language'});			
		if (this.props.serie.i18n) {
			Object.keys(this.props.serie.i18n).forEach(lang => {
				this.state.i18n.push(lang);
				this.state[`lang_${lang}`] = this.props.serie.i18n[lang];				
			});
		}		
	}

	componentDidMount() {		
		this.props.form.validateFields();
	}

	showSelect = () => {
		this.setState({ selectVisible: true }, () => this.select.focus());
	};

	handleSubmit = (e) => {
		e.preventDefault();
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
	}

	render() {
		const {getFieldDecorator} = this.props.form;
		const { selectVisible } = this.state;
		return (
			<Form
				onSubmit={this.handleSubmit}
				className='serie-form'
			>
				<Form.Item>
					{getFieldDecorator('serie_id', {
						initialValue: this.props.serie.serie_id
					})(<Input type="hidden" />)}
				</Form.Item>
				<Form.Item>
					{getFieldDecorator('i18n', {
						initialValue: this.props.serie.i18n
					})(<Input type="hidden" />)}
				</Form.Item>
				<Form.Item hasFeedback
					label={(
						<span>Original Name&nbsp;
							<Tooltip title="This is the internal name used to reference the series in Karaoke Mugen's database">
								<Icon type="question-circle-o" />
							</Tooltip>
						</span>
					)}
					labelCol={{ span: 3 }}
					wrapperCol={{ span: 21, offset: 0 }}
				>
					{getFieldDecorator('name', {
						initialValue: this.props.serie.name,
						rules: [{
							required: true,
							message: 'Please enter a name'
						}],
					})(<Input
						placeholder='Series name'
						label='Series name'
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
					wrapperCol={{ span: 21, offset: 0 }}
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
						label={langs.where('2B', langKey).name}
						labelCol={{ span: 3 }}
						wrapperCol={{ span: 21, offset: 0 }}
					>
						{getFieldDecorator('lang_' + langKey, {
							initialValue: this.state[`lang_${langKey}`],
							rules: [{
								required: true,
								message: 'Please enter a translation'
							}],
						})(
							<Input
								placeholder='Name in that language'
								label={langKey}								
							/>
						)}
						 {Object.keys(this.state.i18n).length > 1 ? (
							<Icon
								className="dynamic-delete-button"
								type="minus-circle-o"
								disabled={this.state.i18n.length === 1}
								onClick={() => this.removeLang(langKey)}
							/>
						) : null}
					</Form.Item>
				))}
				{selectVisible && (			
					<Select 
						ref={select => this.select = select}
						onChange={value => this.addLang(value)}>
						{ this.state.languages.map(lang => (<Select.Option value={lang.value}>{lang.text}</Select.Option>)) }
					</Select>
				)}
				{!selectVisible && (
					<Tag
						onClick={this.showSelect}
						style={{ background: '#fff', borderStyle: 'dashed' }}
					>
						<Icon type="plus" /> Add
					</Tag>
				)}
				<Form.Item>
					<Button type='primary' htmlType='submit' className='series-form-button'>
						Save series
					</Button>
				</Form.Item>
			</Form>
		);
	}	
}

SerieForm.propTypes = {
	serie: PropTypes.object.isRequired,
	save: PropTypes.func.isRequired
};

export default Form.create()(SerieForm);
