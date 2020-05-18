import React, {Component} from 'react';
import { Button, Form, Icon, Input, Table, Tooltip, Cascader, Checkbox } from 'antd';
import axios from 'axios/index';
import { buildKaraTitle } from '../../utils/kara';
import { message } from 'antd';
import i18next from 'i18next';
import { Session } from '../../../../src/types/session';

interface SessionsFormProps {
	sessions: Array<Session>;
	session: Session;
	form: any;
	save: any;
	mergeAction: any;
}

interface SessionsFormState {
	mergeSelection: string;
	sessionPlayed: any;
	sessionRequested : any;
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
		var played = await axios.get(`/api/karas/?searchType=sessionPlayed&searchValue=${this.props.session.seid}`)
		var requested = await axios.get(`/api/karas/?searchType=sessionRequested&searchValue=${this.props.session.seid}`)
		this.setState({sessionPlayed: played.data.content, sessionRequested: requested.data.content});
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
		axios.get(`/api/sessions/${this.props.session.seid}/export`)
		.then(res => {
			message.success(i18next.t('SESSIONS.SESSION_EXPORTED'));
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
							{i18next.t('SESSIONS.SESSION_EXPORTED_BUTTON')}
						</Button>
					</Form.Item> : null
				}
				<Form.Item hasFeedback
					label={i18next.t('SESSIONS.NAME')}
					labelCol={{ span: 3 }}
					wrapperCol={{ span: 8, offset: 0 }}
				>
					{getFieldDecorator('name', {
						initialValue: this.props.session.name,
						rules: [{
							required: true,
							message: i18next.t('TAGS.NAME_REQUIRED')
						}],
					})(<Input
						placeholder={i18next.t('SESSIONS.NAME')}
					/>)}
				</Form.Item>
				<Form.Item
					label={i18next.t('SESSIONS.STARTED_AT')}
					labelCol={{ span: 3 }}
					wrapperCol={{ span: 10, offset: 0 }}
				>
					{getFieldDecorator('started_at', {
						initialValue: this.props.session.started_at,
					})(<Input/>)}
				</Form.Item>
				<Form.Item
					label={i18next.t('SESSIONS.ACTIVE')}
					labelCol={{ span: 3 }}
					wrapperCol={{ span: 10, offset: 0 }}
				>
					{getFieldDecorator('active', {
						valuePropName: "checked",
						initialValue: this.props.session.active,
					})(<Checkbox />)}
				</Form.Item>
				<Form.Item
					label={i18next.t('SESSIONS.PRIVATE')}
					labelCol={{ span: 3 }}
					wrapperCol={{ span: 10, offset: 0 }}
				>
					{getFieldDecorator('private', {
						valuePropName: "checked",
						initialValue: this.props.session.private,
					})(<Checkbox />)}
				</Form.Item>
				<Form.Item
					wrapperCol={{ span: 4, offset: 2 }}
				>
					<Button type='primary' htmlType='submit'>{i18next.t('SUBMIT')}</Button>
				</Form.Item>
				<Form.Item hasFeedback
					label={(
						<span>{i18next.t('SESSIONS.MERGE_WITH')}&nbsp;
							<Tooltip title={i18next.t('SESSIONS.MERGE_WITH_TOOLTIP')}>
								<Icon type="question-circle-o" />
							</Tooltip>
						</span>
					)}
					labelCol={{ span: 3 }}
					wrapperCol={{ span: 8, offset: 0 }}
					>
					<Cascader options={this.mergeCascaderOption()} showSearch={{filter:this.mergeCascaderFilter}} 
						onChange={this.handleSessionMergeSelection.bind(this)} placeholder={i18next.t('SESSIONS.MERGE_WITH_SELECT')} />
				</Form.Item>

				<Form.Item
					wrapperCol={{ span: 8, offset: 3 }}
					style={{textAlign:"right"}}
					>
					<Button type="danger" onClick={this.handleSessionMerge.bind(this)}>{i18next.t('SESSIONS.MERGE_WITH_BUTTON')}</Button>
				</Form.Item>
				<Form.Item>
					{getFieldDecorator('seid', {
						initialValue: this.props.session.seid
					})(<Input type="hidden" />)}
				</Form.Item>
				<h1>{i18next.t('SESSIONS.KARA_PLAYED')}</h1>
				<Table
							dataSource={this.state.sessionPlayed}
							columns={this.columns}
							rowKey='kid'
				/>
				<h1>{i18next.t('SESSIONS.KARA_REQUESTED')}</h1>
				<Table
							dataSource={this.state.sessionRequested}
							columns={this.columns}
							rowKey='kid'
				/>
			</Form>
		);
	}

	columns = [{
		title: i18next.t('SESSIONS.LAST_PLAYED_AT'),
		dataIndex: 'lastplayed_at',
		key: 'lastplayed_at',
		render: (text, kara) => text ? new Date(text).toLocaleString() : null
	}, {
		title: i18next.t('SESSIONS.LAST_REQUESTED_AT'),
		dataIndex: 'lastrequested_at',
		key: 'lastrequested_at',
		render: (text, kara) => text ? new Date(text).toLocaleString() : null
	}, {
		title: i18next.t('SESSIONS.TITLE'),
		dataIndex: 'title',
		key: 'title',
		render: (text, kara) => buildKaraTitle(kara)
	}];

}

const cmp: any = Form.create()(SessionForm);
export default cmp;
