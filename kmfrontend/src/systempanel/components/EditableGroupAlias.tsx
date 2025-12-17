import { PlusOutlined } from '@ant-design/icons';
import { Button, Form, Input, InputRef, Tag } from 'antd';
import i18next from 'i18next';
import { useEffect, useRef, useState } from 'react';
interface EditableGroupProps {
	onChange: (e: string[]) => void;
	value?: string[];
}

export default function EditableGroupAlias(props: EditableGroupProps) {
	const input = useRef<InputRef>();

	const [value, setValue] = useState(props.value || []);
	const [inputVisible, setInputVisible] = useState(false);
	const [currentVal, setCurrentVal] = useState<string>();

	useEffect(() => {
		if (inputVisible && input.current) input.current.focus();
	}, [inputVisible]);

	const handleInputConfirmAlias = val => {
		let tags = value;
		if (val && tags.indexOf(val) === -1) {
			tags = [...tags, val];
		}
		setValue(tags);
		setInputVisible(false);
		if (props.onChange) props.onChange(tags);
	};

	const handleCloseAlias = removedTag => {
		const tags = value.filter(tag => tag !== removedTag);
		setValue(tags);
		if (props.onChange) props.onChange(tags);
	};

	const submitHandler = e => {
		if (e.key === 'Enter') {
			e.preventDefault();
			handleInputConfirmAlias(currentVal);
		}
	};

	return (
		<div>
			{value.map(tag => (
				<Tag style={{ marginBottom: '8px' }} key={tag} closable={true} onClose={() => handleCloseAlias(tag)}>
					{tag}
				</Tag>
			))}
			{inputVisible && (
				<Form.Item wrapperCol={{ span: 10 }}>
					<Input ref={input} onChange={e => setCurrentVal(e.target.value)} onKeyDown={submitHandler} />
					<Button
						style={{ marginTop: '10px' }}
						type="primary"
						onClick={() => handleInputConfirmAlias(currentVal)}
					>
						{i18next.t('ADD')}
					</Button>
				</Form.Item>
			)}
			{!inputVisible && (
				<Tag onClick={() => setInputVisible(true)} style={{ borderStyle: 'dashed' }}>
					<PlusOutlined /> {i18next.t('ADD')}
				</Tag>
			)}
		</div>
	);
}
