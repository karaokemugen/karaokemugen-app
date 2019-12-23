import React from 'react';
import deburr from 'lodash.deburr';
import {AutoComplete, Button, Checkbox, Col, Form, Icon, Row, Tag, Tooltip} from 'antd';
import axios from 'axios/index';
import { getTagInLocale } from "../../utils/kara";

import i18next from 'i18next';
interface EditableTagGroupProps {
	search: 'tag' | 'serie' | 'aliases',
	onChange: any,
	checkboxes?: boolean,
	tagType?: number,
	value?: any[]
}

interface EditableTagGroupState {
	DS: any,
	value: any[],
	inputVisible: boolean,
}

export default class EditableTagGroup extends React.Component<EditableTagGroupProps, EditableTagGroupState> {

	input: any;
	currentVal: any;

	constructor(props) {
		super(props);
		if (this.props.checkboxes) this.search();
	}

	state = {
		value: this.props.value || [],
		inputVisible: false,
		DS: []
	};

	showInput = () => {
		this.setState({ inputVisible: true }, () => this.input.focus());
	};


	handleInputConfirmSerie = (val) => {
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

	handleCloseSerie = (removedTag) => {
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
			inputVisible: false
		});
		this.props.onChange && this.props.onChange(tags);
	};

	getTags = async (filter, type) => {
		if (filter === '') {
			return ({data: []});
		}
		return axios.get('/api/tags', {
			params: {
				type: type,
				filter: filter
			}
		});
	};

	getSeries = async (filter) => {
		if (filter === '') {
			return ({data: []});
		}
		return axios.get('/api/series', {
			params: {
				filter: filter
			}
		});
	};

	search = (val?: any) => {
		if (this.props.search === 'tag') this.searchTags(val);
		if (this.props.search === 'serie') this.searchSeries(val);
	};

	searchSeries = (val) => {
		this.getSeries(val).then(series => {
			this.setState({ DS: (series.data.content && series.data.content.map(serie => serie.name)) || [] });
		});
	};

	searchTags = (val?: any) => {
		this.getTags(val, this.props.tagType).then(tags => {
			let result = (tags.data.content && tags.data.content.map(tag => {
				return { value: tag.tid, text: getTagInLocale(tag), name:tag.name };
			})) || [];
			result = this.sortByProp(result, 'text');
			this.setState({ DS: result });
		});
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
		} else if (this.props.search === 'serie' || this.props.search === 'aliases') {
			return (
				<div>
					{
						value.map((tag) => {
							if (!tag) tag = '';
							const isLongTag = tag.length > 20;
							const tagElem = (
								<Tag key={tag} closable={true} onClose={() => this.handleCloseSerie(tag)}>
									{isLongTag ? `${tag.slice(0, 20)}...` : tag}
								</Tag>
							);
							return isLongTag ? <Tooltip title={tag} key={tag}>{tagElem}</Tooltip> : tagElem;
						})}
					{inputVisible && (
						<Form.Item
							wrapperCol={{ span: 10, offset: 0 }}
						>
							<AutoComplete
								ref={input => this.input = input}
								dataSource={this.state.DS}
								onSearch={ this.search }
								onChange={ val => this.currentVal = val }
							>
							</AutoComplete>
							<Button type='primary' onClick={() => this.handleInputConfirmSerie(this.currentVal)}
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
							<Icon type="plus" />{i18next.t('ADD')}
						</Tag>
					)}
				</div>
			);
		} else {
			return (
				<div>
					{
						value.map((tag) => {
							if (!tag) tag = '';
							const isLongTag = tag[1] && tag[1].length > 20;
							const tagElem = (
								<Tag key={tag} closable={true} onClose={() => this.handleClose(tag)}>
									{isLongTag ? `${tag[1].slice(0, 20)}...` : tag[1]}
								</Tag>
							);
							return isLongTag ? <Tooltip title={tag[1]} key={tag}>{tagElem}</Tooltip> : tagElem;
						})}
					{inputVisible && (
						<Form.Item
							wrapperCol={{ span: 10, offset: 0 }}
						>
							<AutoComplete
								ref={input => this.input = input}
								dataSource={this.state.DS}
								onSearch={ this.search }
								onChange={ val => this.currentVal = val }
								filterOption={(inputValue, option) => {
									const s: any = option.props.children;
									return deburr(s.toUpperCase()).indexOf(deburr(inputValue).toUpperCase()) !== -1;
								}}
							>
							</AutoComplete>
							<Button type='primary' onClick={() => this.handleInputConfirm(this.currentVal)}
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
							<Icon type="plus" /> {i18next.t('ADD')}
						</Tag>
					)}
				</div>
			);
		}

	}
}
