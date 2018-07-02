import React, {Component} from 'react';
import {Select, Tooltip, Button, Form, Icon, Input} from 'antd';
import PropTypes from 'prop-types';
import EditableTagGroup from '../Components/EditableTagGroup';

class SerieForm extends Component {

	constructor(props) {
		super(props);		
		this.state = {
			i18n: []
		};
		if (this.props.serie.i18n) {
			Object.keys(this.props.serie.i18n).forEach(lang => {
				this.state.i18n.push({
					value: lang,
					text: this.props.serie.i18n[lang]
				});
			});
		}
	}

	componentDidMount() {
		this.props.form.validateFields();
	}

	handleSubmit = (e) => {
		e.preventDefault();
		this.props.form.validateFields((err, values) => {
			if (!err) {
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
	};

	render() {
		const {getFieldDecorator} = this.props.form;
		
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
						rules: [{
							required: true,
							message: 'Please enter a name'
						}],
					})(<Input
						placeholder='Series name'
						label='Series name'
					/>)}
				</Form.Item>
				<Form.Item hasFeedback
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
						label={langKey}
						labelCol={{ span: 3 }}
						wrapperCol={{ span: 21, offset: 0 }}
					>
						{getFieldDecorator('lang_' + langKey)(
							<Input
								placeholder='Traduction'
								label={langKey}
							/>
						)}
					</Form.Item>
				))}
				<Select onChange={value => this.addLang(value)}>
					<Select.Option value="fre">Français</Select.Option>
					<Select.Option value="jpn">Japanese</Select.Option>
					<Select.Option value="eng">English</Select.Option>
				</Select>
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
