import './EditableTagGroup.scss';

import { PlusOutlined } from '@ant-design/icons';
import { AutoComplete, Button, Checkbox, Col, Form, FormInstance, InputRef, Row, Tag } from 'antd';
import i18next from 'i18next';
import { useContext, useEffect, useRef, useState } from 'react';

import type { DBKaraTag } from '../../../../src/lib/types/database/kara';
import GlobalContext from '../../store/context';
import { getTagInLocale } from '../../utils/kara';
import { commandBackend } from '../../utils/socket';
import { CreateTagModal } from './CreateTagModal';

interface EditableTagGroupProps {
	onChange: (e: unknown[]) => void;
	checkboxes?: boolean;
	tagType?: number;
	value?: DBKaraTag[];
	form?: FormInstance;
}

export default function EditableTagGroup(props: EditableTagGroupProps) {
	const context = useContext(GlobalContext);
	const timer: NodeJS.Timeout[] = [];

	const input = useRef();

	const [value, setValue] = useState(props.value || []);
	const [inputVisible, setInputVisible] = useState(false);
	const [currentVal, setCurrentVal] = useState<string>();
	const [tags, setTags] = useState<DBKaraTag[]>([]);
	const [createModal, setCreateModal] = useState(false);

	useEffect(() => {
		if (props.checkboxes) search();
	}, []);

	useEffect(() => {
		if (inputVisible && input.current) (input.current as InputRef).focus();
	}, [inputVisible]);

	const handleClose = removedTag => {
		const tags = value.filter(tag => tag.tid !== removedTag.tid || tag.name !== removedTag.name);
		setTags(value);
		if (props.onChange) props.onChange(tags);
	};

	const handleInputConfirm = val => {
		if (val) {
			const tags = value;
			const tag = tags.filter(tag => val === tag.tid)[0];
			if (tags.filter(tag => val === tag.tid).length === 0) {
				if (tag?.tid) {
					tags.push(tag);
				} else {
					tags.push({ name: val } as DBKaraTag);
				}
			}
			setValue(tags);
			setInputVisible(false);
			setCurrentVal(undefined);
			if (props.onChange) props.onChange(tags);
		}
	};

	const handleConfirmCreate = (val: DBKaraTag) => {
		setTags([...tags, val]);
		setValue([...value, val]);
		setCurrentVal(undefined);
		if (props.onChange) props.onChange([...value, val]);
	};

	const getTags = async (filter: string, type: number) => {
		if (filter === '') {
			return { data: [] };
		}
		const tags = await commandBackend('getTags', {
			type: [type],
			filter: filter,
		});
		return tags?.content || [];
	};

	const search = (val?: string) => {
		if (timer[props.tagType]) clearTimeout(timer[props.tagType]);
		timer[props.tagType] = setTimeout(() => {
			getTags(val, props.tagType).then(tags => setTags(sortByProp(tags, 'text')));
		}, 1000);
	};

	const onCheck = val => {
		const tags = [];
		for (const element of val) {
			const tag = tags.filter(tag => element === tag.tid)[0];
			tags.push(tag);
		}
		setValue(tags);
		if (props.onChange) props.onChange(tags);
	};

	const sortByProp = (array, val) => {
		if (Array.isArray(array)) {
			return array.sort((a, b) => {
				return a[val] > b[val] ? 1 : a[val] < b[val] ? -1 : 0;
			});
		} else {
			return [];
		}
	};

	const onKeyEnter = e => {
		if (e.keyCode === 13 && tags.length === 0) setCreateModal(true);
	};

	const getCurrentValue = () => {
		const updateTags = tags.filter(tag => tag.tid === currentVal);
		if (updateTags.length > 0 && updateTags[0].tid) {
			return getTagLabel(updateTags[0]);
		} else {
			return currentVal;
		}
	};

	const getTagLabel = (tag: DBKaraTag) => {
		const labelI18n = getTagInLocale(context?.globalState.settings.data, tag).i18n;
		return `${labelI18n}${labelI18n !== tag.name ? ` (${tag.name})` : ''}`;
	};

	if (props.checkboxes) {
		const tids = value.map(tag => tag.tid);
		return (
			<Checkbox.Group
				className="editable-tag-group-checkbox"
				value={tids}
				style={{ width: '100%' }}
				onChange={onCheck}
			>
				<Row>
					{tags.map((tag: DBKaraTag) => {
						const tagi18n = getTagInLocale(context?.globalState.settings.data, tag);
						const desc = tagi18n.description || '';
						return (
							<Col
								xs={{ span: 10 }}
								sm={{ span: 10 }}
								md={{ span: 8 }}
								xl={{ span: 6 }}
								key={tag.tid || tag.name}
								title={tag.aliases?.join(', ')}
							>
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
				{value.map((tag: DBKaraTag) => (
					<Tag
						style={{ marginBottom: '8px' }}
						key={tag.tid || tag.name}
						closable={true}
						title={tag.aliases?.join(', ')}
						onClose={() => handleClose(tag)}
					>
						{getTagLabel(tag)}
					</Tag>
				))}
				{inputVisible && (
					<Form.Item wrapperCol={{ span: 14 }}>
						<AutoComplete
							ref={input}
							onSearch={search}
							onChange={setCurrentVal}
							onSelect={val => handleInputConfirm(val)}
							options={tags.map((tag: DBKaraTag) => {
								return {
									value: tag.tid,
									label: getTagLabel(tag),
								};
							})}
							onInputKeyDown={onKeyEnter}
							value={getCurrentValue()}
						/>
						<Button style={{ marginTop: '10px' }} type="primary" onClick={() => setCreateModal(true)}>
							{i18next.t('MODAL.CREATE_TAG.OPEN')}
						</Button>
					</Form.Item>
				)}
				{!inputVisible && (
					<Tag onClick={() => setInputVisible(true)} style={{ borderStyle: 'dashed' }}>
						<PlusOutlined /> {i18next.t('ADD')}
					</Tag>
				)}
				{createModal ? (
					<CreateTagModal
						initialTagTypes={[props.tagType]}
						initialName={getCurrentValue()}
						onClose={() => setCreateModal(false)}
						onCreate={handleConfirmCreate}
						repo={props.form.getFieldValue('repository')}
					/>
				) : null}
			</div>
		);
	}
}
