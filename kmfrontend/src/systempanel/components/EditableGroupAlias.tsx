import { PlusOutlined } from '@ant-design/icons';
import { Button, Form, Input, Tag } from 'antd';
import i18next from 'i18next';
import { Component } from 'react';
interface EditableGroupProps {
	onChange: any;
	value?: any[];
}

interface EditableGroupState {
	DS: string[];
	value: any[];
	inputVisible: boolean;
	currentVal: any;
}
export default class EditableGroupAlias extends Component<EditableGroupProps, EditableGroupState> {
	input: any;

	state = {
		value: this.props.value || [],
		inputVisible: false,
		DS: [],
		currentVal: undefined,
	};

	showInput = () => {
		this.setState({ inputVisible: true }, () => this.input.focus());
	};

	handleInputConfirmAlias = val => {
		let tags = this.state.value;
		if (val && tags.indexOf(val) === -1) {
			tags = [...tags, val];
		}
		this.setState({
			value: tags,
			inputVisible: false,
		});
		this.props.onChange && this.props.onChange(tags);
	};

	handleCloseAlias = removedTag => {
		const tags = this.state.value.filter(tag => tag !== removedTag);
		this.setState({ value: tags });
		this.props.onChange && this.props.onChange(tags);
	};

	render() {
		const { value, inputVisible } = this.state;
		return (
			<div>
				{value.map(tag => (
					<Tag
						style={{ marginBottom: '8px' }}
						key={tag}
						closable={true}
						onClose={() => this.handleCloseAlias(tag)}
					>
						{tag}
					</Tag>
				))}
				{inputVisible && (
					<Form.Item wrapperCol={{ span: 10 }}>
						<Input
							ref={input => (this.input = input)}
							onChange={e => this.setState({ currentVal: e.target.value })}
						/>
						<Button
							style={{ marginTop: '10px' }}
							type="primary"
							onClick={() => this.handleInputConfirmAlias(this.state.currentVal)}
						>
							{i18next.t('ADD')}
						</Button>
					</Form.Item>
				)}
				{!inputVisible && (
					<Tag onClick={this.showInput} style={{ borderStyle: 'dashed' }}>
						<PlusOutlined /> {i18next.t('ADD')}
					</Tag>
				)}
			</div>
		);
	}
}
