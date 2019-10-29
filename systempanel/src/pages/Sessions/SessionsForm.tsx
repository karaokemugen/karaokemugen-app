import React, {Component} from 'react';
import { Button, Form, Icon, Input, Table, Tooltip, Cascader } from 'antd';
import axios from 'axios/index';
import { buildKaraTitle } from '../../utils/kara';
import { message } from 'antd';
interface SessionsFormProps {
	sessions: any
	session: any,
	form: any
	save: any,
	mergeAction: any
}

interface SessionsFormState {
	mergeSelection: string,
	sessionPlayed: any,
	sessionRequested : any
}

class SessionForm extends Component<SessionsFormProps, SessionsFormState> {

	constructor(props) {
		super(props);
		this.state = {
			mergeSelection: '',
			sessionPlayed: [],
			sessionRequested: []
		};
	}

	async componentDidMount() {
		var played = await axios.get(`/api/public/karas/?searchType=sessionPlayed&searchValue=${this.props.session.seid}`)
		var requested = await axios.get(`/api/public/karas/?searchType=sessionRequested&searchValue=${this.props.session.seid}`)
		this.setState({sessionPlayed: played.data.data.content, sessionRequested: requested.data.data.content});
	}

	handleSubmit = (e) => {
		e.preventDefault();
		this.props.form.validateFields((err, values) => {
			if (!err) {
				this.props.save(values);
			}
		});
	};

	handleSessionMergeSelection = (value) => {
		this.setState({mergeSelection:value[0]})
	}
	handleSessionMerge = (e) => {
		this.props.mergeAction(this.props.session.seid,this.state.mergeSelection)
	}
	mergeCascaderOption = () => {
		return this.props.sessions.map(session => {
			return {
				value:session.seid,
				label:session.name,
			};
		})
	}

	mergeCascaderFilter = function(inputValue, path) {
	  return path.some(option => option.label.toLowerCase().indexOf(inputValue.toLowerCase()) > -1);
	}

	exportSession() {
		axios.get(`/api/system/sessions/${this.props.session.seid}/export`)
		.then(res => {
			message.success("Session data exported in application folder");
		})
		.catch(err => {
			message.error(`${err.response.status}: ${err.response.statusText}. ${err.response.data}`);
		});
	}

	render() {
		const {getFieldDecorator} = this.props.form;
		return (
			<Form
				onSubmit={this.handleSubmit}
				className='session-form'
			>
				{this.props.session.seid ?
					<Form.Item
						wrapperCol={{ span: 4, offset: 3 }}
					>
						<Button type='default' icon='file-excel' onClick={this.exportSession.bind(this)}>
						Export data as CSV
						</Button>
					</Form.Item> : null
				}
				<Form.Item hasFeedback
					label={(
						<span>Name&nbsp;
						</span>
					)}
					labelCol={{ span: 3 }}
					wrapperCol={{ span: 8, offset: 0 }}
				>
					{getFieldDecorator('name', {
						initialValue: this.props.session.name,
						rules: [{
							required: true,
							message: 'Please enter a name'
						}],
					})(<Input
						placeholder='session name'
					/>)}
				</Form.Item>
				<Form.Item
					label={(
						<span>Date(s)&nbsp;
						</span>
					)}
					labelCol={{ span: 3 }}
					wrapperCol={{ span: 10, offset: 0 }}
				>
					{getFieldDecorator('started_at', {
						initialValue: this.props.session.started_at,
					})(<Input/>)}
				</Form.Item>
				<Form.Item
					wrapperCol={{ span: 4, offset: 2 }}
				>
					<Button type='primary' htmlType='submit'>
						Save session
					</Button>
				</Form.Item>
				<Form.Item hasFeedback
					label={(
						<span>Merge with&nbsp;
							<Tooltip title="Merge the current session with another one">
								<Icon type="question-circle-o" />
							</Tooltip>
						</span>
					)}
					labelCol={{ span: 3 }}
					wrapperCol={{ span: 8, offset: 0 }}
					>
					<Cascader options={this.mergeCascaderOption()} showSearch={{filter:this.mergeCascaderFilter}} onChange={this.handleSessionMergeSelection.bind(this)} placeholder="Please select" />
				</Form.Item>

				<Form.Item
					wrapperCol={{ span: 8, offset: 3 }}
					style={{textAlign:"right"}}
					>
					<Button type="danger" onClick={this.handleSessionMerge.bind(this)}>
						Merge !
					</Button>
				</Form.Item>
				<Form.Item>
					{getFieldDecorator('seid', {
						initialValue: this.props.session.seid
					})(<Input type="hidden" />)}
				</Form.Item>
				<h1>Karas Played</h1>
				<Table
							dataSource={this.state.sessionPlayed}
							columns={this.columns}
							rowKey='kid'
				/>
				<h1>Karas Requested</h1>
				<Table
							dataSource={this.state.sessionRequested}
							columns={this.columns}
							rowKey='kid'
				/>
			</Form>
		);
	}

	columns = [{
		title: 'Last played at',
		dataIndex: 'lastplayed_at',
		key: 'lastplayed_at',
		render: (text, kara) => new Date(text).toLocaleString()
	}, {
		title: 'Last requested at',
		dataIndex: 'lastrequested_at',
		key: 'lastrequested_at',
		render: (text, kara) => new Date(text).toLocaleString()
	}, {
		title: 'Title',
		dataIndex: 'title',
		key: 'title',
		render: (text, kara) => buildKaraTitle(kara)
	}];

}

const cmp: any = Form.create()(SessionForm);
export default cmp;
