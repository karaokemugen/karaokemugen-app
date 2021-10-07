import { PlusOutlined } from '@ant-design/icons';
import { AutoComplete, Button, Checkbox, Col, Form, Row, Tag } from 'antd';
import i18next from 'i18next';
import React from 'react';

import { DBKaraTag } from '../../../../src/lib/types/database/kara';
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
	tags: DBKaraTag[],
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
		const tags = this.state.value.filter(tag => tag.tid !== removedTag.tid || tag.name !== removedTag.name);
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
		if (Array.isArray(array)) {
			return array.sort((a, b) => {
				return (a[val] > b[val]) ? 1 : (a[val] < b[val]) ? -1 : 0;
			});
		} else {
			return [];
		}
	}

	onKeyEnter = (e) => {
		if (e.keyCode === 13)
			this.handleInputConfirm(this.state.currentVal);
	}

	getCurrentValue = () => {
		const tags = this.state.tags.filter(tag => tag.tid === this.state.currentVal);
		if (tags.length > 0 && tags[0].tid) {
			return this.getTagLabel(tags[0]);
		} else {
			return this.state.currentVal;
		}
	}

	getTagLabel = (tag) => {
		const labelI18n = getTagInLocale(this.context?.globalState.settings.data, tag);
		return `${labelI18n}${labelI18n !== tag.name ? ` (${tag.name})` : ''}`;

	}

	render() {
		if (this.props.checkboxes) {
			const tids = this.state.value.map(tag => tag.tid);
			return (
				<Checkbox.Group value={tids} style={{ width: '100%' }} onChange={this.onCheck}>
					<Row>
						{
							this.state.tags.map((tag: DBKaraTag) => {
								return (
									<Col span={8} key={tag.tid || tag.name} title={tag.aliases?.join(', ')}>
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
					{this.state.value.map((tag: DBKaraTag) => <Tag
						style={{ marginBottom: '8px' }}
						key={tag.tid || tag.name}
						closable={true}
						title={tag.aliases?.join(', ')}
						onClose={() => this.handleClose(tag)}>{this.getTagLabel(tag)}</Tag>
					)}
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
										value: tag.tid, label: this.getTagLabel(tag)
									};
								})}
								onInputKeyDown={this.onKeyEnter}
								value={this.getCurrentValue()}
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
