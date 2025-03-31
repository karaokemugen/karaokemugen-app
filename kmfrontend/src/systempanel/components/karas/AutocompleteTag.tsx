import { PlusOutlined } from '@ant-design/icons';
import { AutoComplete, Button, Form, FormInstance, InputRef, Tag } from 'antd';
import i18next from 'i18next';
import { useContext, useEffect, useRef, useState } from 'react';

import type { DBKaraTag } from '../../../../../src/lib/types/database/kara';
import GlobalContext from '../../../store/context';
import { getTagInLocale } from '../../../utils/kara';
import { commandBackend } from '../../../utils/socket';
import { CreateTagModal } from '../CreateTagModal';

interface AutocompleteTagProps {
	onChange: (e: unknown[]) => void;
	tagType?: number;
	value?: DBKaraTag[];
	form?: FormInstance;
}

export default function AutocompleteTag(props: AutocompleteTagProps) {
	const context = useContext(GlobalContext);
	const timer: NodeJS.Timeout[] = [];

	const input = useRef();

	const [value, setValue] = useState(props.value || []);
	const [inputVisible, setInputVisible] = useState(false);
	const [currentVal, setCurrentVal] = useState<string>();
	const [tags, setTags] = useState<DBKaraTag[]>([]);
	const [createModal, setCreateModal] = useState(false);

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
			const updateTags = value;
			const tag = tags.filter(tag => val === tag.tid)[0];
			if (updateTags.filter(tag => val === tag.tid).length === 0) {
				if (tag?.tid) {
					updateTags.push(tag);
				} else {
					updateTags.push({ name: val } as DBKaraTag);
				}
			}
			setValue(updateTags);
			setInputVisible(false);
			setCurrentVal(undefined);
			if (props.onChange) props.onChange(updateTags);
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
