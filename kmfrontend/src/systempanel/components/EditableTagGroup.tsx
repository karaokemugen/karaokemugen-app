import { PlusOutlined } from '@ant-design/icons';
import { AutoComplete, Button, Checkbox, Col, Form, Row, Tag } from 'antd';
import i18next from 'i18next';
import React from 'react';

import { DBTag } from '../../../../src/lib/types/database/tag';
import GlobalContext from '../../store/context';
import { getTagInLocale } from '../../utils/kara';
import { commandBackend } from '../../utils/socket';
interface EditableTagGroupProps {
	onChange: any,
	checkboxes?: boolean,
	tagType?: number,
	value?: any[]
}

interface EditableTagGroupState {
	tags: DBTag[],
	value: string[],
	inputVisible: boolean,
	currentVal: any
}

const timer: any[] = [];
export default class EditableTagGroup extends React.Component<EditableTagGroupProps, EditableTagGroupState> {
	static contextType = GlobalContext;
	context: React.ContextType<typeof GlobalContext>
	input: any;

	constructor(props) {
		super(props);
		if (this.props.checkboxes) this.search();
	}

	state = {
		value: this.props.value || [],
		inputVisible: false,
		tags: [],
		currentVal: undefined
	};

	showInput = () => {
		this.setState({ inputVisible: true }, () => this.input.focus());
	};

	handleClose = (removedTag) => {
		const tags = this.state.value.filter(tag => tag.tid !== removedTag.tid);
		this.setState({ value: tags });
		this.props.onChange && this.props.onChange(tags);
	};

	handleInputConfirm = (val) => {
		const tags = this.state.value;
		const tag = this.state.tags.filter(tag => val === tag.tid)[0];
		if (tags.filter(tag => val === tag.tid).length === 0) {
			if (tag?.tid) {
				tags.push(tag);
			} else {
				tags.push({ name: val });
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
			return ({ data: [] });
		}
		const tags = await commandBackend('getTags', {
			type: type,
			filter: filter
		});
		return tags?.content || [];
	};

	search = (val?: any) => {
		if (timer[this.props.tagType]) clearTimeout(timer[this.props.tagType]);
		timer[this.props.tagType] = setTimeout(() => {
			this.getTags(val, this.props.tagType).then(tags => {
				this.setState({ tags: this.sortByProp(tags, 'text') });
			});
		}, 1000);
	};

	onCheck = (val) => {
		const tags = [];
		for (const element of val) {
			const tag = this.state.tags.filter(tag => element === tag.tid)[0];
			tags.push(tag);
		}
		this.setState({ value: tags });
		this.props.onChange && this.props.onChange(tags);
	};

	sortByProp = (array, val) => {
		return array.sort((a, b) => {
			return (a[val] > b[val]) ? 1 : (a[val] < b[val]) ? -1 : 0;
		});
	}

	onKeyEnter = (e) => {
		if (e.keyCode === 13)
			this.handleInputConfirm(this.state.currentVal);
	}

	render() {
		if (this.props.checkboxes) {
			const tids = this.state.value.map(tag => tag.tid);
			return (
				<Checkbox.Group value={tids} style={{ width: '100%' }} onChange={this.onCheck}>
					<Row>
						{
							this.state.tags.map((tag) => {
								return (
									<Col span={8} key={tag.tid}>
										<Checkbox value={tag.tid}>{getTagInLocale(this.context?.globalState.settings.data, tag)}
										</Checkbox>
									</Col>
								);
							})
						}
					</Row>
				</Checkbox.Group>
			);
		} else {
			return (
				<div>
					{this.state.value.map((tag) => <Tag style={{ marginBottom: '8px' }} key={tag.tid} closable={true}
						onClose={() => this.handleClose(tag)}>{
							`${getTagInLocale(this.context?.globalState.settings.data, tag)} (${tag.name})`}</Tag>)}
					{this.state.inputVisible && (
						<Form.Item
							wrapperCol={{ span: 14 }}
						>
							<AutoComplete
								ref={input => this.input = input}
								onSearch={this.search}
								onChange={val => this.setState({ currentVal: val })}
								options={this.state.tags.map(tag => {
									return {
										value: tag.tid, label: `${getTagInLocale(this.context?.globalState.settings.data, tag)} (${tag.name})`
									};
								})}
								onInputKeyDown={this.onKeyEnter}
								value={this.state.tags.filter(tag => tag.tid === this.state.currentVal).length > 0 &&
									this.state.tags.filter(tag => tag.tid === this.state.currentVal)[0].tid ?
									`${getTagInLocale(this.context?.globalState.settings.data,
										this.state.tags.filter(tag => tag.tid === this.state.currentVal)[0])} (${this.state.tags.filter(tag => tag.tid === this.state.currentVal)[0].name})`
									: this.state.currentVal}
							/>
							<Button
								style={{ marginTop: '10px' }}
								type='primary'
								onClick={() => this.handleInputConfirm(this.state.currentVal)}
							>
								{i18next.t('ADD')}
							</Button>
						</Form.Item>
					)}
					{!this.state.inputVisible && (
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
