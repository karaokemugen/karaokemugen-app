import React, { Component } from 'react';
import { Button, Form, Icon, Input, message, Select, Tag, Tooltip, Cascader } from 'antd';
import EditableTagGroup from '../Components/EditableTagGroup';
import langs from 'langs';

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
	mergeSelection: string
}

export const tagTypes = Object.freeze({
	Singers: 2,
	Songtypes: 3,
	Creators: 4,
	Langs: 5,
	Authors: 6,
	Misc: 7,
	Songwriters: 8,
	Groups: 9,
	Families: 10,
	Origins: 11,
	Genres: 12,
	Platforms: 13
});

class TagForm extends Component<TagsFormProps, TagsFormState> {

	select: any;

	constructor(props) {
		super(props);
		this.state = {
			i18n: [],
			languages: [],
			selectVisible: false,
			mergeSelection: ''
		};
		langs.all().forEach(lang => this.state.languages.push({ value: lang['2B'], text: lang.name }));
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
			message.error('A tags must have at least one name by language');
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
				label:type,
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
						<span>Original Name&nbsp;
							<Tooltip title="This is the internal name used to reference the tags in Karaoke Mugen's database">
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
							message: 'Please enter a name'
						}],
					})(<Input
						placeholder='Tags name'
					/>)}
				</Form.Item>
				<Form.Item hasFeedback
					label={(
						<span>Short Name&nbsp;
							<Tooltip title="This is the short name used to reference the tags in Karaoke Mugen's database">
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
						placeholder='short name'
					/>)}
				</Form.Item>
				<Form.Item hasFeedback
					label={(
						<span>Tag type&nbsp;
								<Tooltip title="This is the type of the tag in Karaoke Mugen's database">
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
						<Select mode="multiple" placeholder={"Tag type"}>
							{Object.keys(tagTypes).map(type => {
								const value = tagTypes[type];
								return <Select.Option key={value} value={value}>{type}</Select.Option>
							})
							}
						</Select>
					)}
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
					label={(<span>Names by language&nbsp;
						<Tooltip title="There must be at least one name in any language (enter the original name by default)">
							<Icon type="question-circle-o" />
						</Tooltip>
					</span>)}
					>
				</Form.Item>

				{this.state.i18n.map(langKey => (
					<Form.Item
						key={langKey}
						hasFeedback
						label={langs.where('2B', langKey).name}
						labelCol={{ span: 3 }}
						wrapperCol={{ span: 8, offset: 0 }}
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
								/>
							)}

							{Object.keys(this.state.i18n).length > 1 ? (
								<span style={{position:'absolute'}}><Tooltip title="Remove name">
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
						label="Select a language"
						labelCol={{ span: 3 }}
						wrapperCol={{ span: 8, offset: 0 }}
					>
						<Select
							showSearch
							ref={select => this.select = select}
							onChange={value => this.addLang(value)}>
							{this.state.languages.map(lang => (<Select.Option key={lang.value} value={lang.value}>"{lang.text} ({lang.value.toUpperCase()})"</Select.Option>))}
						</Select>
					</Form.Item>
				)}
				{!selectVisible && (
					<Form.Item
						label="Select a language"
						labelCol={{ span: 3 }}
						wrapperCol={{ span: 8, offset: 0 }}
					>
						<Tag
							onClick={this.showSelect}
							style={{ borderStyle: 'dashed' }}
							>
							<Icon type="plus" /> Add
						</Tag>
					</Form.Item>
				)}
				<Form.Item wrapperCol={{ span: 8, offset: 3 }} style={{textAlign:"right"}}>
					<Button type='primary' htmlType='submit' className='tags-form-button'>
						Save tags
					</Button>
				</Form.Item>
				
				<Form.Item hasFeedback
					label={(
						<span>Merge with&nbsp;
							<Tooltip title="Merge the current tag with another one">
								<Icon type="question-circle-o" />
							</Tooltip>
						</span>
					)}
					labelCol={{ span: 3 }}
					wrapperCol={{ span: 8, offset: 0 }}
					>
					<Cascader options={this.mergeCascaderOption()} showSearch={{filter:this.mergeCascaderFilter}} onChange={this.handleTagMergeSelection.bind(this)} placeholder="Please select" />
				</Form.Item>

				<Form.Item
					wrapperCol={{ span: 8, offset: 3 }}
					style={{textAlign:"right"}}
					>
					<Button type="danger" onClick={this.handleTagMerge.bind(this)}>
						Merge !
					</Button>
					<p style={{color:'#fff',background:'tomato',textAlign:'left',padding:'1em',lineHeight:'1.4em'}}>
						About "Merging process" :
						<br />Resulting tags will have the current Name and Shortname.
						<br />Types, Aliases and translation will be merged and the resulting tags will contain all the information from Current and targeted tags
					</p>
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
