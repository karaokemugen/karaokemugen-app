import { PlusOutlined } from '@ant-design/icons';
import { AutoComplete, Button, Checkbox, Col, Form, FormInstance, Row, Tag } from 'antd';
import i18next from 'i18next';
import { Component } from 'react';

import { DBKaraTag } from '../../../../src/lib/types/database/kara';
import GlobalContext from '../../store/context';
import { getTagInLocale } from '../../utils/kara';
import { commandBackend } from '../../utils/socket';
import { CreateTagModal } from './CreateTagModal';
import './EditableTagGroup.scss';

interface EditableTagGroupProps {
	onChange: any;
	checkboxes?: boolean;
	tagType?: number;
	value?: any[];
	form?: FormInstance;
}

interface EditableTagGroupState {
	tags: DBKaraTag[];
	value: string[];
	inputVisible: boolean;
	currentVal: any;
	createModal: boolean;
}

const timer: NodeJS.Timeout[] = [];
export default class EditableTagGroup extends Component<EditableTagGroupProps, EditableTagGroupState> {
	static contextType = GlobalContext;
	context: React.ContextType<typeof GlobalContext>;
	input: any;

	constructor(props) {
		super(props);
		if (this.props.checkboxes) this.search();
	}

	state = {
		value: this.props.value || [],
		inputVisible: false,
		tags: [],
		currentVal: undefined,
		createModal: false,
	};

	showInput = () => {
		this.setState({ inputVisible: true }, () => this.input.focus());
	};

	handleClose = removedTag => {
		const tags = this.state.value.filter(tag => tag.tid !== removedTag.tid || tag.name !== removedTag.name);
		this.setState({ value: tags });
		this.props.onChange && this.props.onChange(tags);
	};

	handleInputConfirm = val => {
		if (val) {
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
				currentVal: undefined,
			});
			this.props.onChange && this.props.onChange(tags);
		}
	};

	getTags = async (filter: string, type: number) => {
		if (filter === '') {
			return { data: [] };
		}
		const tags = await commandBackend('getTags', {
			type: type,
			filter: filter,
		});
		return tags?.content || [];
	};

	search = (val?: string) => {
		if (timer[this.props.tagType]) clearTimeout(timer[this.props.tagType]);
		timer[this.props.tagType] = setTimeout(() => {
			this.getTags(val, this.props.tagType).then(tags => {
				this.setState({ tags: this.sortByProp(tags, 'text') });
			});
		}, 1000);
	};

	onCheck = val => {
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
				return a[val] > b[val] ? 1 : a[val] < b[val] ? -1 : 0;
			});
		} else {
			return [];
		}
	};

	onKeyEnter = e => {
		if (e.keyCode === 13 && this.state.tags.length === 0) this.setState({ createModal: true });
	};

	getCurrentValue = () => {
		const tags = this.state.tags.filter(tag => tag.tid === this.state.currentVal);
		if (tags.length > 0 && tags[0].tid) {
			return this.getTagLabel(tags[0]);
		} else {
			return this.state.currentVal;
		}
	};

	getTagLabel = (tag: DBKaraTag) => {
		const labelI18n = getTagInLocale(this.context?.globalState.settings.data, tag).i18n;
		return `${labelI18n}${labelI18n !== tag.name ? ` (${tag.name})` : ''}`;
	};

	render() {
		if (this.props.checkboxes) {
			const tids = this.state.value.map(tag => tag.tid);
			return (
				<Checkbox.Group value={tids} style={{ width: '100%' }} onChange={this.onCheck}>
					<Row>
						{this.state.tags.map((tag: DBKaraTag) => {
							const tagi18n = getTagInLocale(this.context?.globalState.settings.data, tag);
							const desc = tagi18n.description || '';
							return (
								<Col span={8} key={tag.tid || tag.name} title={tag.aliases?.join(', ')}>
									<Checkbox value={tag.tid} style={{ height: '100%', paddingBottom: '0.3em' }}>
										<div>{tagi18n.i18n}</div>
										{desc ? <span style={{ fontSize: 11 }}>{desc}</span> : null}
									</Checkbox>
								</Col>
							);
						})}
					</Row>
				</Checkbox.Group>
			);
		} else {
			return (
				<div>
					{this.state.value.map((tag: DBKaraTag) => (
						<Tag
							style={{ marginBottom: '8px' }}
							key={tag.tid || tag.name}
							closable={true}
							title={tag.aliases?.join(', ')}
							onClose={() => this.handleClose(tag)}
						>
							{this.getTagLabel(tag)}
						</Tag>
					))}
					{this.state.inputVisible && (
						<Form.Item wrapperCol={{ span: 14 }}>
							<AutoComplete
								ref={input => (this.input = input)}
								onSearch={this.search}
								onChange={val => this.setState({ currentVal: val })}
								onSelect={val => this.handleInputConfirm(val)}
								options={this.state.tags.map((tag: DBKaraTag) => {
									return {
										value: tag.tid,
										label: this.getTagLabel(tag),
									};
								})}
								onInputKeyDown={this.onKeyEnter}
								value={this.getCurrentValue()}
							/>
							<Button
								style={{ marginTop: '10px' }}
								type="primary"
								onClick={() => {
									this.setState({ createModal: true });
								}}
							>
								{i18next.t('MODAL.CREATE_TAG.OPEN')}
							</Button>
						</Form.Item>
					)}
					{!this.state.inputVisible && (
						<Tag onClick={this.showInput} style={{ borderStyle: 'dashed' }}>
							<PlusOutlined /> {i18next.t('ADD')}
						</Tag>
					)}
					{this.state.createModal ? (
						<CreateTagModal
							initialTagTypes={[this.props.tagType]}
							initialName={this.getCurrentValue()}
							onClose={() => {
								this.setState({ createModal: false });
							}}
							onCreate={tag => {
								this.setState({ tags: [...this.state.tags, tag as unknown as DBKaraTag] });
								this.handleInputConfirm(tag.tid);
							}}
							repo={this.props.form.getFieldValue('repository')}
						/>
					) : null}
				</div>
			);
		}
	}
}
