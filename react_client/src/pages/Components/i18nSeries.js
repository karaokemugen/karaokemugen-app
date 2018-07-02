import React from 'react';
import PropTypes from 'prop-types';
import { Form, Input, Icon, Button } from 'antd';
import langs from 'langs';

const FormItem = Form.Item;
let uuid = 0;

export default class DynamicFieldSet extends React.Component {
  remove = (k) => {
  	const { form } = this.props;
  	// can use data-binding to get
  	const keys = form.getFieldValue('keys');
  	// We need at least one language
  	if (keys.length === 1) {
  		return;
  	}

  	// can use data-binding to set
  	form.setFieldsValue({
  		keys: keys.filter(key => key !== k),
  	});
  }

  add = () => {
  	const { form } = this.props;
  	// can use data-binding to get
  	const keys = form.getFieldValue('keys');
  	const nextKeys = keys.concat(uuid);
  	uuid++;
  	// can use data-binding to set
  	// important! notify form to detect changes
  	form.setFieldsValue({
  		keys: nextKeys,
  	});
  }

  handleSubmit = (e) => {
  	e.preventDefault();
  	this.props.form.validateFields((err, values) => {
  		if (!err) {
  			console.log('Received values of form: ', values);
  		}
  	});
  }

  render() {
  	const { getFieldDecorator, getFieldValue } = this.props.form;
  	const formItemLayout = {
  		labelCol: {
  			xs: { span: 24 },
  			sm: { span: 4 },
  		},
  		wrapperCol: {
  			xs: { span: 24 },
  			sm: { span: 20 },
  		},
  	};
  	const formItemLayoutWithOutLabel = {
  		wrapperCol: {
  			xs: { span: 24, offset: 0 },
  			sm: { span: 20, offset: 4 },
  		},
  	};
  	getFieldDecorator('keys', { initialValue: [] });
  	const keys = getFieldValue('keys');
  	const formItems = keys.map((k, index) => {
  		return (
  			<FormItem
  				{...(index === 0 ? formItemLayout : formItemLayoutWithOutLabel)}
  				label={index === 0 ? 'Names by language' : ''}
  				required={false}
  				key={k}
  			>
  				{getFieldDecorator(`names[${k}]`, {
  					validateTrigger: ['onChange', 'onBlur'],
  					rules: [{
  						required: true,
  						whitespace: true,
  						message: 'Please input a name and language or delete this field.',
  					}],
  				})(
  					<Input placeholder="series name" style={{ width: '60%', marginRight: 8 }} />
  				)}
  				{keys.length > 1 ? (
  					<Icon
  						className="dynamic-delete-button"
  						type="minus-circle-o"
  						disabled={keys.length === 1}
  						onClick={() => this.remove(k)}
  					/>
  				) : null}
  			</FormItem>
  		);
  	});
  	return (
  		<Form onSubmit={this.handleSubmit}>
  			{formItems}
  			<FormItem {...formItemLayoutWithOutLabel}>
  				<Button type="dashed" onClick={this.add} style={{ width: '60%' }}>
  					<Icon type="plus" /> Add series name by language
  				</Button>
  			</FormItem>        
  		</Form>
  	);
  }
}


DynamicFieldSet.propTypes = {
	onChange: PropTypes.func,
	value: PropTypes.object
};