import React from 'react';
import { AutoComplete, Button, Checkbox, Col, Row, Tag, Tooltip, Form, Input } from 'antd';
import { getTagInLocale } from "../../utils/kara";

import i18next from 'i18next';
import { PlusOutlined } from '@ant-design/icons';
import Axios from 'axios';
interface EditableTagGroupProps {
	search: 'tag' | 'aliases',
	onChange: any,
	checkboxes?: boolean,
	tagType?: number,
	value?: any[]
}

interface EditableTagGroupState {
	DS: any,
	value: any[],
	inputVisible: boolean,
	currentVal: any
}

let timer:any[] = [];
export default class EditableTagGroup extends React.Component<EditableTagGroupProps, EditableTagGroupState> {

	input: any;

	constructor(props) {
		super(props);
		if (this.props.checkboxes) this.search();
	}

	state = {
		value: this.props.value || [],
		inputVisible: false,
		DS: [],
		currentVal: undefined
	};

	showInput = () => {
		this.setState({ inputVisible: true }, () => this.input.focus());
	};


	handleInputConfirmAlias = (val) => {
		let tags = this.state.value;
		if (val && tags.indexOf(val) === -1) {
			tags = [...tags, val];
		}
		this.setState({
			value: tags,
			inputVisible: false
		});
		this.props.onChange && this.props.onChange(tags);
	};

	handleCloseAlias = (removedTag) => {
		const tags = this.state.value.filter(tag => tag !== removedTag);
		this.setState({ value: tags });
		this.props.onChange && this.props.onChange(tags);
	};

	handleClose = (removedTag) => {
		const tags = this.state.value.filter(tag => tag[1] !== removedTag[1]);
		this.setState({ value: tags });
		this.props.onChange && this.props.onChange(tags);
	};

	handleInputConfirm = (val) => {
		let tags = this.state.value;
		var tag = this.state.DS.filter(tag => val === tag.value);
		if (tags.filter(tag => val === tag.tid).length === 0) {
			if (tag.length > 0) {
				tags.push([tag[0].value, tag[0].text, tag[0].name]);
			} else {
				tags.push([null, val]);
			}
		}
		this.setState({
			value: tags,
			inputVisible: false,
			currentVal: undefined
		});
		this.props.onChange && this.props.onChange(tags);
	};

	getTags = async (filter, type) => {
		if (filter === '') {
			return ({data: []});
		}
		return Axios.get('/tags', {
			params: {
				type: type,
				filter: filter
			}
		});
	};

	search = (val?: any) => {
		if (this.props.search === 'tag') this.searchTags(val);
	};

	searchTags = (val?: any) => {
		if (timer[this.props.tagType]) clearTimeout(timer[this.props.tagType]);
		timer[this.props.tagType] = setTimeout(() => {
		this.getTags(val, this.props.tagType).then(tags => {
			let result = (tags.data.content && tags.data.content.map(tag => {
				return { value: tag.tid, text: getTagInLocale(tag), name:tag.name };
			})) || [];
			result = this.sortByProp(result, 'text');
			this.setState({ DS: result });
		})}, 1000);
	};

	onCheck = (val) => {
		var tags = []
		val.forEach(element => {
			var tag = this.state.DS.filter(tag => element === tag.value);
			tags.push([tag[0].value, tag[0].text, tag[0].name]);
		});
		this.setState({value: tags})
		this.props.onChange && this.props.onChange(tags);
	};

	sortByProp = (array, val) => {
		return array.sort((a,b) => {
			return (a[val] > b[val]) ? 1 : (a[val] < b[val]) ? -1 : 0;
		});
	}

	render() {
		const { value, inputVisible } = this.state;
		if (this.props.checkboxes) {
			var tids = this.state.value.map(objectTag => {return objectTag[0]});
			return (
				<div>

					<Checkbox.Group value={tids} style={{ width: '100%' }} onChange={this.onCheck}>
						<Row>
							{
								this.state.DS.map((tag) => {
									return (
										<Col span={8} key={tag.value}>
											<Checkbox value={tag.value}>{tag.text}
											</Checkbox>
										</Col>
									);
								})
							}
						</Row>
					</Checkbox.Group>
				</div>
			);
		} else if (this.props.search === 'aliases') {
			return (
                <div>
					{value.map((tag) => <Tag style={{marginBottom: '8px'}} key={tag} closable={true} 
						onClose={() => this.handleCloseAlias(tag)}>{tag}</Tag>)}
					{inputVisible && (
						<Form.Item
							wrapperCol={{ span: 10 }}
						>
							<Input
								ref={input => this.input = input}
								onChange={ e => this.setState({currentVal: e.target.value})}
							/>
							<Button style={{marginTop: '10px'}} type='primary' onClick={() => this.handleInputConfirmAlias(this.state.currentVal)}
								className='login-form-button'>
								{i18next.t('ADD')}
							</Button>
						</Form.Item>
					)}
					{!inputVisible && (
						<Tag
							onClick={this.showInput}
							style={{ borderStyle: 'dashed' }}
						>
							<PlusOutlined /> {i18next.t('ADD')}
						</Tag>
					)}
				</div>
            );
		} else {
			return (
                <div>
					{value.map((tag) => <Tag style={{marginBottom: '8px'}} key={tag} closable={true} 
						onClose={() => this.handleClose(tag)}>{tag[1]}</Tag>)}
					{inputVisible && (
						<Form.Item
							wrapperCol={{ span: 10 }}
						>
							<AutoComplete
								ref={input => this.input = input}
								onSearch={ this.search }
								onChange={ val => this.setState({currentVal: val}) }
								options={this.state.DS.map(tag => {return {value:tag.value, label:tag.text}})}
								value={this.state.DS.filter(tag => tag.value === this.state.currentVal).length > 0 &&
									this.state.DS.filter(tag => tag.value === this.state.currentVal)[0].value ? this.state.DS.filter(tag => tag.value === this.state.currentVal)[0].text
								: this.state.currentVal}
							/>
							<Button type='primary' onClick={() => this.handleInputConfirm(this.state.currentVal)}
								className='login-form-button'>
						{i18next.t('ADD')}
							</Button>
						</Form.Item>
					)}
					{!inputVisible && (
						<Tag
							onClick={this.showInput}
							style={{ borderStyle: 'dashed' }}
						>
							<PlusOutlined /> {i18next.t('ADD')}
						</Tag>
					)}
				</div>
            );
		}

	}
}
