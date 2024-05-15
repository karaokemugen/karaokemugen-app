import { FileExcelOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import {
	Button,
	Cascader,
	Checkbox,
	DatePicker,
	Divider,
	Form,
	FormInstance,
	FormProps,
	Input,
	Modal,
	Table,
	Tooltip,
} from 'antd';
import dayjs from 'dayjs';
import i18next from 'i18next';
import { Component, createRef } from 'react';

import { DBKara } from '../../../../../src/lib/types/database/kara';
import { Session, SessionExports } from '../../../../../src/types/session';
import GlobalContext from '../../../store/context';
import { buildKaraTitle } from '../../../utils/kara';
import { commandBackend } from '../../../utils/socket';

interface SessionsFormProps extends FormProps {
	sessions: Session[];
	session: Session;
	save: any;
	mergeAction: (seid1: string, seid2: string) => void;
}

interface KaraList {
	content: DBKara[];
	avatars: any;
	i18n?: any;
	infos: {
		count: number;
		from: number;
		to: number;
	};
}

interface SessionsFormState {
	mergeSelection: string;
	sessionPlayed: KaraList;
	sessionRequested: KaraList;
	started_at: Date;
	ended_at: Date;
}

const { RangePicker } = DatePicker;

class SessionForm extends Component<SessionsFormProps, SessionsFormState> {
	formRef = createRef<FormInstance>();
	static contextType = GlobalContext;
	context: React.ContextType<typeof GlobalContext>;

	constructor(props) {
		super(props);
		this.state = {
			mergeSelection: '',
			sessionPlayed: undefined,
			sessionRequested: undefined,
			started_at: this.props.session?.started_at,
			ended_at: this.props.session?.ended_at,
		};
	}

	async componentDidMount() {
		if (this.props.session.seid) {
			const played = await commandBackend('getKaras', {
				order: 'sessionPlayed',
				q: `seid:${this.props.session.seid}`,
				ignoreCollections: true,
			});
			const requested = await commandBackend('getKaras', {
				order: 'sessionRequested',
				q: `seid:${this.props.session.seid}`,
				ignoreCollections: true,
			});
			this.setState({ sessionPlayed: played, sessionRequested: requested });
		}
	}

	handleSessionMergeSelection = value => {
		this.setState({ mergeSelection: value[0] });
	};

	handleSessionMerge = () => {
		if (this.state.mergeSelection) {
			this.props.mergeAction(this.props.session.seid, this.state.mergeSelection);
		}
	};

	mergeCascaderOption = () => {
		return this.props.sessions.map(session => {
			return {
				value: session.seid,
				label: session.name,
			};
		});
	};

	mergeCascaderFilter = function (inputValue, path) {
		return path.some(option => option.label.toLowerCase().indexOf(inputValue.toLowerCase()) > -1);
	};

	exportSession = async () => {
		const exportSession: SessionExports = await commandBackend('exportSession', { seid: this.props.session.seid });
		Modal.info({
			title: i18next.t('SESSIONS.SESSION_EXPORTED_TITLE'),
			content: (
				<div>
					<div>{i18next.t('SESSIONS.SESSION_EXPORTED_DESC')}</div>
					<ul>
						<li>
							<a href={`/sessionExports/${exportSession.played}`}>
								{i18next.t('SESSIONS.SESSION_EXPORT_PLAYED')}
							</a>
						</li>
						<li>
							<a href={`/sessionExports/${exportSession.playedCount}`}>
								{i18next.t('SESSIONS.SESSION_EXPORT_PLAYED_COUNT')}
							</a>
						</li>
						<li>
							<a href={`/sessionExports/${exportSession.requested}`}>
								{i18next.t('SESSIONS.SESSION_EXPORT_REQUESTED')}
							</a>
						</li>
						<li>
							<a href={`/sessionExports/${exportSession.requestedCount}`}>
								{i18next.t('SESSIONS.SESSION_EXPORT_REQUESTED_COUNT')}
							</a>
						</li>
					</ul>
				</div>
			),
		});
	};

	onSessionDateChange = async dates => {
		this.setState({
			started_at: dates && dates[0] ? dates[0].format() : null,
			ended_at: dates && dates[1] ? dates[1].format() : null,
		});
		this.formRef.current?.validateFields();
	};

	dateValidator = () => {
		if (!this.state.started_at) {
			return Promise.reject(i18next.t('SESSIONS.START_DATE_REQUIRED'));
		} else {
			return Promise.resolve();
		}
	};

	handleSubmit = values => {
		delete values.dates;
		const session: Session = values;
		session.seid = this.props.session?.seid;
		session.started_at = this.state.started_at;
		session.ended_at = this.state.ended_at;
		this.props.save(session);
	};

	render() {
		return (
			<Form
				ref={this.formRef}
				onFinish={this.handleSubmit}
				className="session-form"
				initialValues={this.props.session}
			>
				<Form.Item
					hasFeedback
					label={i18next.t('SESSIONS.NAME')}
					labelCol={{ flex: '0 1 200px' }}
					wrapperCol={{ span: 8 }}
					rules={[
						{
							required: true,
							message: i18next.t('TAGS.NAME_REQUIRED'),
						},
					]}
					name="name"
				>
					<Input placeholder={i18next.t('SESSIONS.NAME')} />
				</Form.Item>
				<Form.Item
					label={i18next.t('SESSIONS.START_AND_END_DATES')}
					labelCol={{ flex: '0 1 200px' }}
					wrapperCol={{ span: 10 }}
					rules={[{ validator: this.dateValidator }]}
					name="dates"
				>
					<RangePicker
						defaultValue={[
							dayjs(this.props.session.started_at),
							this.props.session.ended_at ? dayjs(this.props.session.ended_at) : null,
						]}
						showTime={{ format: 'HH:mm' }}
						onChange={this.onSessionDateChange}
						format="YYYY-MM-DD HH:mm"
						allowEmpty={[false, true]}
					/>
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
				<Form.Item wrapperCol={{ span: 4, offset: 2 }}>
					<Button type="primary" htmlType="submit">
						{i18next.t('SUBMIT')}
					</Button>
				</Form.Item>
				{this.props.session.seid ? (
					<>
						<Divider>{i18next.t('SESSIONS.EXPORT')}</Divider>
						<Form.Item wrapperCol={{ span: 4, offset: 3 }}>
							<Button type="default" icon={<FileExcelOutlined />} onClick={this.exportSession}>
								{i18next.t('SESSIONS.SESSION_EXPORTED_BUTTON')}
							</Button>
						</Form.Item>
						<Divider>{i18next.t('SESSIONS.MERGE_SESSIONS')}</Divider>
						<Form.Item
							hasFeedback
							label={
								<span>
									{i18next.t('SESSIONS.MERGE_WITH')}&nbsp;
									<Tooltip title={i18next.t('SESSIONS.MERGE_WITH_TOOLTIP')}>
										<QuestionCircleOutlined />
									</Tooltip>
								</span>
							}
							labelCol={{ flex: '0 1 200px' }}
							wrapperCol={{ span: 8 }}
						>
							<Cascader
								options={this.mergeCascaderOption()}
								showSearch={{ filter: this.mergeCascaderFilter }}
								onChange={this.handleSessionMergeSelection}
								placeholder={i18next.t('SESSIONS.MERGE_WITH_SELECT')}
							/>
						</Form.Item>

						<Form.Item wrapperCol={{ span: 8, offset: 3 }} style={{ textAlign: 'right' }}>
							<Button type="primary" danger onClick={this.handleSessionMerge}>
								{i18next.t('SESSIONS.MERGE_WITH_BUTTON')}
							</Button>
						</Form.Item>

						<h1>{i18next.t('SESSIONS.KARA_PLAYED')}</h1>
						<Table
							dataSource={this.state.sessionPlayed?.content}
							columns={[
								{
									title: i18next.t('SESSIONS.LAST_PLAYED_AT'),
									dataIndex: 'lastplayed_at',
									render: text => (text ? new Date(text).toLocaleString() : null),
								},
								{
									title: i18next.t('SESSIONS.LAST_REQUESTED_AT'),
									dataIndex: 'lastrequested_at',
									render: text => (text ? new Date(text).toLocaleString() : null),
								},
								{
									title: i18next.t('SESSIONS.TITLE'),
									dataIndex: 'title',
									render: (text_, kara) =>
										buildKaraTitle(
											this.context.globalState.settings.data,
											kara,
											true,
											this.state.sessionPlayed.i18n
										),
								},
							]}
							rowKey="lastplayed_at"
							scroll={{
								x: true,
							}}
							expandable={{
								showExpandColumn: false,
							}}
						/>
						<h1>{i18next.t('SESSIONS.KARA_REQUESTED')}</h1>
						<Table
							dataSource={this.state.sessionRequested?.content}
							columns={[
								{
									title: i18next.t('SESSIONS.LAST_PLAYED_AT'),
									dataIndex: 'lastplayed_at',
									render: text => (text ? new Date(text).toLocaleString() : null),
								},
								{
									title: i18next.t('SESSIONS.LAST_REQUESTED_AT'),
									dataIndex: 'lastrequested_at',
									render: text => (text ? new Date(text).toLocaleString() : null),
								},
								{
									title: i18next.t('SESSIONS.TITLE'),
									dataIndex: 'title',
									render: (text_, kara) =>
										buildKaraTitle(
											this.context.globalState.settings.data,
											kara,
											true,
											this.state.sessionRequested.i18n
										),
								},
							]}
							rowKey="lastplayed_at"
							scroll={{
								x: true,
							}}
							expandable={{
								showExpandColumn: false,
							}}
						/>
					</>
				) : null}
			</Form>
		);
	}
}

export default SessionForm;
