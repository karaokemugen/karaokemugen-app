import React, {Component} from 'react';
import { Button, Input, Table, Tooltip, Cascader, Checkbox,Form } from 'antd';
import { buildKaraTitle } from '../../utils/kara';
import i18next from 'i18next';
import { Session } from '../../../../src/types/session';
import { FormProps } from 'antd/lib/form';
import { QuestionCircleOutlined, FileExcelOutlined } from '@ant-design/icons';
import Axios from 'axios';
import { DBKara } from '../../../../src/lib/types/database/kara';

interface SessionsFormProps extends FormProps {
	sessions: Array<Session>;
	session: Session;
	save: any;
	mergeAction: (seid1:string, seid2:string) => void;
}

interface SessionsFormState {
	mergeSelection: string;
	sessionPlayed: Array<DBKara>;
	sessionRequested : Array<DBKara>;
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
		if (this.props.session.seid) {
			var played = await Axios.get(`/karas/?searchType=sessionPlayed&searchValue=${this.props.session.seid}`)
			var requested = await Axios.get(`/karas/?searchType=sessionRequested&searchValue=${this.props.session.seid}`)
			this.setState({sessionPlayed: played.data.content, sessionRequested: requested.data.content});
		}
	}

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

	exportSession = async () => {
		await Axios.get(`/sessions/${this.props.session.seid}/export`)
	}

	render() {
		return (
            <Form
				onFinish={this.props.save}
				className='session-form'
				initialValues={this.props.session}
			>
				{this.props.session.seid ?
					<Form.Item
						wrapperCol={{ span: 4, offset: 3 }}
					>
						<Button type='default' icon={<FileExcelOutlined />} onClick={this.exportSession}>
							{i18next.t('SESSIONS.SESSION_EXPORTED_BUTTON')}
						</Button>
					</Form.Item> : null
				}
				<Form.Item hasFeedback
					label={i18next.t('SESSIONS.NAME')}
					labelCol={{ flex: '0 1 200px' }}
					wrapperCol={{ span: 8 }}
					rules={[{
						required: true,
						message: i18next.t('TAGS.NAME_REQUIRED')
					}]}
					name="name"
				>
					<Input placeholder={i18next.t('SESSIONS.NAME')}/>
				</Form.Item>
				<Form.Item
					label={i18next.t('SESSIONS.STARTED_AT')}
					labelCol={{ flex: '0 1 200px' }}
					wrapperCol={{ span: 10 }}
					name="started_at"
				>
					<Input/>
				</Form.Item>
				<Form.Item
					label={i18next.t('SESSIONS.ACTIVE')}
					labelCol={{ flex: '0 1 200px' }}
					wrapperCol={{ span: 10 }}
					valuePropName="checked"
					name="active"
				>
					<Checkbox />
				</Form.Item>
				<Form.Item
					label={i18next.t('SESSIONS.PRIVATE')}
					labelCol={{ flex: '0 1 200px' }}
					wrapperCol={{ span: 10 }}
					valuePropName="checked"
					name="private"
				>
					<Checkbox />
				</Form.Item>
				<Form.Item
					wrapperCol={{ span: 4, offset: 2 }}
				>
					<Button type='primary' htmlType='submit'>{i18next.t('SUBMIT')}</Button>
				</Form.Item>
				{this.props.session.seid ?
					<React.Fragment>
						<Form.Item hasFeedback
						label={(
							<span>{i18next.t('SESSIONS.MERGE_WITH')}&nbsp;
								<Tooltip title={i18next.t('SESSIONS.MERGE_WITH_TOOLTIP')}>
									<QuestionCircleOutlined />
								</Tooltip>
							</span>
						)}
						labelCol={{ flex: '0 1 200px' }}
						wrapperCol={{ span: 8 }}
						>
							<Cascader options={this.mergeCascaderOption()} showSearch={{filter:this.mergeCascaderFilter}} 
								onChange={this.handleSessionMergeSelection} placeholder={i18next.t('SESSIONS.MERGE_WITH_SELECT')} />
						</Form.Item>
					
						<Form.Item
							wrapperCol={{ span: 8, offset: 3 }}
							style={{textAlign:"right"}}
							>
							<Button type="primary" danger onClick={this.handleSessionMerge}>
								{i18next.t('SESSIONS.MERGE_WITH_BUTTON')}
							</Button>
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
					</React.Fragment> : null
				}
			</Form>
        );
	}

	columns = [{
		title: i18next.t('SESSIONS.LAST_PLAYED_AT'),
		dataIndex: 'lastplayed_at',
		render: (text, kara) => text ? new Date(text).toLocaleString() : null
	}, {
		title: i18next.t('SESSIONS.LAST_REQUESTED_AT'),
		dataIndex: 'lastrequested_at',
		render: (text, kara) => text ? new Date(text).toLocaleString() : null
	}, {
		title: i18next.t('SESSIONS.TITLE'),
		dataIndex: 'title',
		render: (text, kara) => buildKaraTitle(kara)
	}];

}

export default SessionForm;
