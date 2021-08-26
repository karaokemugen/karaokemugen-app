import { QuestionCircleOutlined, UploadOutlined } from '@ant-design/icons';
import { Button, Checkbox, Divider, Form, Input, InputNumber, message, Modal, Select, Tooltip, Upload } from 'antd';
import { FormInstance } from 'antd/lib/form';
import i18next from 'i18next';
import React, { Component } from 'react';

import { Kara } from '../../../../../src/lib/types/kara';
import GlobalContext from '../../../store/context';
import { getTagInLocale } from '../../../utils/kara';
import { commandBackend } from '../../../utils/socket';
import { getTagTypeName } from '../../../utils/tagTypes';
import EditableTagGroup from '../../components/EditableTagGroup';
import LanguagesList from '../../components/LanguagesList';

interface KaraFormProps {
	kara: Kara;
	save: any;
	handleCopy: (kid, repo) => void;
}

interface KaraFormState {
	titles: Record<string, string>;
	serieSingersRequired: boolean;
	subfile: any[];
	mediafile: any[];
	created_at?: Date;
	modified_at?: Date;
	repositoriesValue: string[];
	repoToCopySong: string;
	mediafile_orig: string;
	subfile_orig: string;
	comment?: string;
}

class KaraForm extends Component<KaraFormProps, KaraFormState> {
	formRef = React.createRef<FormInstance>();
	static contextType = GlobalContext
	context: React.ContextType<typeof GlobalContext>

	constructor(props) {
		super(props);
		const kara = this.props.kara;
		this.getRepositories();
		this.state = {
			titles: kara?.titles ? kara.titles : {'eng':''},
			serieSingersRequired: false,
			subfile: kara?.subfile
				? [
					{
						uid: -1,
						name: kara.subfile,
						status: 'done'
					}
				]
				: [],
			mediafile: kara?.mediafile
				? [
					{
						uid: -1,
						name: kara.mediafile,
						status: 'done'
					}
				]
				: [],
			created_at: kara?.created_at ? kara.created_at : new Date(),
			modified_at: kara?.modified_at ? kara.modified_at : new Date(),
			repositoriesValue: null,
			repoToCopySong: null,
			mediafile_orig: null,
			subfile_orig: null,
			comment: kara?.comment ? kara.comment : undefined
		};
	}

	componentDidMount() {
		this.formRef.current.validateFields();
	}

	getRepositories = async () => {
		const res = await commandBackend('getRepos');
		this.setState({ repositoriesValue: res.map(repo => repo.Name) }, () =>
			this.formRef.current.setFieldsValue({
				repository: this.props.kara?.repository ? this.props.kara.repository :
					(this.state.repositoriesValue ? this.state.repositoriesValue[0] : null)
			})
		);
	};

	previewHooks = async () => {
		const kara: Kara = this.formRef.current.getFieldsValue();
		kara.karafile = this.props.kara?.karafile;
		kara.kid = this.props.kara?.kid;
		kara.mediafile_orig = this.state.mediafile_orig;
		kara.subfile_orig = this.state.subfile_orig;
		const data = await commandBackend('previewHooks', kara);
		Modal.info({
			title: i18next.t('KARA.PREVIEW_HOOKS_MODAL'),
			content: <ul>{data?.map(tag => <li key={tag.tid} title={tag.tagfile}>
				{getTagInLocale(this.context?.globalState.settings.data, tag)} ({i18next.t(`TAG_TYPES.${getTagTypeName(tag.types[0])}`)})
			</li>)}</ul>
		});
	}

	handleSubmit = (values) => {
		if (!this.state.titles || Object.keys(this.state.titles).length === 0) {
			message.error(i18next.t('KARA.TITLE_REQUIRED'));
		} else if (!this.state.titles.eng) {
			message.error(i18next.t('KARA.TITLE_ENG_REQUIRED'));
		} else {
			const kara: Kara = values;
			kara.karafile = this.props.kara?.karafile;
			kara.kid = this.props.kara?.kid;
			kara.mediafile_orig = this.state.mediafile_orig;
			kara.subfile_orig = this.state.subfile_orig;
			kara.titles = this.state.titles;
			this.props.save(kara);
		}
	};

	isMediaFile = (filename: string): boolean => {
		return new RegExp(`^.+\\.(${this.context.globalState.settings.data.state?.supportedMedias.join('|')})$`).test(
			filename
		);
	};

	isSubFile = (filename: string): boolean => {
		return new RegExp(`^.+\\.(${this.context.globalState.settings.data.state?.supportedLyrics.join('|')})$`).test(
			filename
		);
	};

	onMediaUploadChange = info => {
		let fileList = info.fileList;
		fileList = fileList.slice(-1);
		this.setState({ mediafile: fileList });
		if (info.file.status === 'uploading') {
			this.formRef.current.setFieldsValue({ mediafile: null });
			this.setState({ mediafile_orig: null });
		} else if (info.file.status === 'done') {
			if (this.isMediaFile(info.file.name)) {
				this.formRef.current.setFieldsValue({ mediafile: info.file.response.filename });
				this.setState({ mediafile_orig: info.file.response.originalname });
				message.success(i18next.t('KARA.ADD_FILE_SUCCESS', { name: info.file.name }));
			} else {
				this.formRef.current.setFieldsValue({ mediafile: null });
				message.error(i18next.t('KARA.ADD_FILE_MEDIA_ERROR', { name: info.file.name }));
				info.file.status = 'error';
				this.setState({ mediafile: [], mediafile_orig: null });
			}
		} else if (info.file.status === 'error' || info.file.status === 'removed') {
			this.formRef.current.setFieldsValue({ mediafile: null });
			this.setState({ mediafile: [], mediafile_orig: null });
		}
		this.formRef.current.validateFields();
	};

	onSubUploadChange = info => {
		let fileList = info.fileList;
		fileList = fileList.slice(-1);
		this.setState({ subfile: fileList });
		if (info.file.status === 'uploading') {
			this.formRef.current.setFieldsValue({ subfile: null });
			this.setState({ subfile_orig: null });
		} else if (info.file.status === 'done') {
			if (this.isSubFile(info.file.name)) {
				this.formRef.current.setFieldsValue({ subfile: info.file.response.filename });
				this.setState({ subfile_orig: info.file.response.originalname });
				message.success(i18next.t('KARA.ADD_FILE_SUCCESS', { name: info.file.name }));
			} else {
				this.formRef.current.setFieldsValue({ subfile: null });
				message.error(i18next.t('KARA.ADD_FILE_LYRICS_ERROR', { name: info.file.name }));
				info.file.status = 'error';
				this.setState({ subfile: [], subfile_orig: null });
			}
		} else if (info.file.status === 'error' || info.file.status === 'removed') {
			this.formRef.current.setFieldsValue({ subfile: null });
			this.setState({ subfile: [], subfile_orig: null });
		}
	};

	onChangeSingersSeries = () => {
		this.setState({
			serieSingersRequired: this.formRef.current.getFieldValue('singers')?.length === 0
				&& this.formRef.current.getFieldValue('series')?.length === 0
		}, () => {
			this.formRef.current.validateFields(['series']);
			this.formRef.current.validateFields(['singers']);
		});
	}

	submitHandler(e) {
		e.key === 'Enter' && e.preventDefault();
	}

	render() {
		return (
			<Form ref={this.formRef} onFinish={this.handleSubmit} className="kara-form"
				initialValues={{
					series: this.props.kara?.series,
					songtypes: this.props.kara?.songtypes, songorder: this.props.kara?.songorder,
					langs: this.props.kara?.langs, year: this.props.kara?.year || 2010,
					singers: this.props.kara?.singers, songwriters: this.props.kara?.songwriters,
					creators: this.props.kara?.creators, authors: this.props.kara?.authors,
					families: this.props.kara?.families, platforms: this.props.kara?.platforms,
					genres: this.props.kara?.genres, origins: this.props.kara?.origins,
					misc: this.props.kara?.misc, groups: this.props.kara?.groups, versions: this.props.kara?.versions,
					comment: this.props.kara?.comment ? this.props.kara.comment : null,
					ignoreHooks: this.props.kara?.ignoreHooks ? this.props.kara.ignoreHooks : false,
					repository: this.props.kara?.repository ? this.props.kara.repository : null,
					created_at: this.state.created_at, modified_at: this.state.modified_at,
					mediafile: this.props.kara?.mediafile, subfile: this.props.kara?.subfile
				}}>
				<Form.Item
					label={
						<span>{i18next.t('KARA.MEDIA_FILE')}&nbsp;
							<Tooltip
								title={i18next.t('KARA.MEDIA_FILE_TOOLTIP',
									{ formats: this.context.globalState.settings.data.state?.supportedMedias?.join(', ') })}>
								<QuestionCircleOutlined />
							</Tooltip>
						</span>
					}
					labelCol={{ flex: '0 1 220px' }}
					wrapperCol={{ span: 12 }}
					name="mediafile"
					rules={[{
						required: true,
						message: i18next.t('KARA.MEDIA_REQUIRED')
					}]}
				>
					<Upload
						headers={{
							authorization: localStorage.getItem('kmToken'),
							onlineAuthorization: localStorage.getItem('kmOnlineToken')
						}}
						action="/api/importfile"
						accept="video/*,audio/*,.mkv"
						multiple={false}
						onChange={this.onMediaUploadChange}
						fileList={this.state.mediafile}
					>
						<Button>
							<UploadOutlined />{i18next.t('KARA.MEDIA_FILE')}
						</Button>
					</Upload>
				</Form.Item>
				<Form.Item
					label={
						<span>{i18next.t('KARA.LYRICS_FILE')}&nbsp;
							<Tooltip
								title={i18next.t('KARA.LYRICS_FILE_TOOLTIP',
									{ formats: this.context.globalState.settings.data.state?.supportedLyrics?.join(', ') })}>
								<QuestionCircleOutlined />
							</Tooltip>
						</span>
					}
					labelCol={{ flex: '0 1 220px' }}
					wrapperCol={{ span: 12 }}
					name="subfile"
				>
					<Upload
						headers={{
							authorization: localStorage.getItem('kmToken'),
							onlineAuthorization: localStorage.getItem('kmOnlineToken')
						}}
						action="/api/importfile"
						multiple={false}
						onChange={this.onSubUploadChange}
						fileList={this.state.subfile}
					>
						<Button>
							<UploadOutlined />{i18next.t('KARA.LYRICS_FILE')}
						</Button>
					</Upload>
				</Form.Item>
				<Form.Item
					hasFeedback
					label={
						<span>{i18next.t('KARA.TITLE')}&nbsp;
							<Tooltip title={i18next.t('KARA.TITLE_TOOLTIP')}>
								<QuestionCircleOutlined />
							</Tooltip>
						</span>
					}
					labelCol={{ flex: '0 1 220px' }}
				>
				</Form.Item>
				<LanguagesList
					value={this.state.titles}
					onChange={(titles) => this.setState({ titles })}
				/>
				<Form.Item
					label={(
						<span>{i18next.t('TAG_TYPES.VERSIONS', { count: 2 })}&nbsp;
							<Tooltip title={i18next.t('KARA.VERSIONS_TOOLTIP')}>
								<QuestionCircleOutlined />
							</Tooltip>
						</span>
					)}
					labelCol={{ flex: '0 1 220px' }}
					wrapperCol={{ span: 10 }}
					name="versions"
				>
					<EditableTagGroup
						tagType={14}
						checkboxes={true}
						onChange={(tags) => this.formRef.current.setFieldsValue({ versions: tags })}
					/>
				</Form.Item>
				<Form.Item
					label={
						<span>{i18next.t('KARA.SERIES')}&nbsp;
							<Tooltip title={i18next.t('KARA.SERIES_TOOLTIP')}>
								<QuestionCircleOutlined />
							</Tooltip>
						</span>
					}
					labelCol={{ flex: '0 1 220px' }}
					wrapperCol={{ span: 14 }}
					rules={[{
						required: this.state.serieSingersRequired,
						message: i18next.t('KARA.SERIES_SINGERS_REQUIRED')
					}]}
					name="series"
				>
					<EditableTagGroup
						tagType={1}
						onChange={tags => {
							this.formRef.current.setFieldsValue({ series: tags });
							this.onChangeSingersSeries();
						}
						}
					/>
				</Form.Item>
				<Form.Item
					label={i18next.t('KARA.SONGTYPES')}
					labelCol={{ flex: '0 1 220px' }}
					wrapperCol={{ span: 10, offset: 0 }}
					name="songtypes"
					rules={[{
						required: true,
						message: i18next.t('KARA.TYPE_REQUIRED')
					}]}
				>
					<EditableTagGroup
						tagType={3}
						checkboxes={true}
						onChange={(tags) => this.formRef.current.setFieldsValue({ songtypes: tags })}
					/>
				</Form.Item>

				<Form.Item hasFeedback
					label={(
						<span>{i18next.t('KARA.ORDER')}&nbsp;
							<Tooltip title={i18next.t('KARA.ORDER_TOOLTIP')}>
								<QuestionCircleOutlined />
							</Tooltip>
						</span>
					)}
					labelCol={{ flex: '0 1 220px' }}
					wrapperCol={{ span: 1 }}
					name="songorder"
				>
					<InputNumber
						min={0}
						style={{ width: '100%' }}
						onPressEnter={this.submitHandler}
					/>
				</Form.Item>
				<Form.Item
					label={i18next.t('KARA.LANGUAGES')}
					labelCol={{ flex: '0 1 220px' }}
					wrapperCol={{ span: 6 }}
					rules={[{
						required: true,
						message: i18next.t('KARA.LANGUAGES_REQUIRED')
					}]}
					name="langs"
				>
					<EditableTagGroup
						tagType={5}
						onChange={(tags) => this.formRef.current.setFieldsValue({ langs: tags })}
					/>
				</Form.Item>
				<Form.Item hasFeedback
					label={(
						<span>{i18next.t('KARA.YEAR')}&nbsp;
							<Tooltip title={i18next.t('KARA.YEAR_TOOLTIP')}>
								<QuestionCircleOutlined />
							</Tooltip>
						</span>
					)}
					labelCol={{ flex: '0 1 220px' }}
					wrapperCol={{ span: 2 }}
					name="year"
				>
					<InputNumber required={true}
						min={0}
						placeholder='Year'
						style={{ width: '100%' }}
						onPressEnter={this.submitHandler}
					/>
				</Form.Item>
				<Form.Item
					label={i18next.t('KARA.SINGERS_BY')}
					labelCol={{ flex: '0 1 220px' }}
					wrapperCol={{ span: 6 }}
					rules={[{
						required: this.state.serieSingersRequired,
						message: i18next.t('KARA.SERIES_SINGERS_REQUIRED')
					}]}
					name="singers"
				>
					<EditableTagGroup
						tagType={2}
						onChange={(tags) => {
							this.formRef.current.setFieldsValue({ singer: tags });
							this.onChangeSingersSeries();
						}
						}
					/>
				</Form.Item>
				<Form.Item
					label={(
						<span>{i18next.t('KARA.SONGWRITERS_BY')}&nbsp;
							<Tooltip title={i18next.t('KARA.SONGWRITERS_TOOLTIP')}>
								<QuestionCircleOutlined />
							</Tooltip>
						</span>
					)}
					labelCol={{ flex: '0 1 220px' }}
					wrapperCol={{ span: 6 }}
					name="songwriters"
				>
					<EditableTagGroup
						tagType={8}
						onChange={(tags) => this.formRef.current.setFieldsValue({ songwriters: tags })}
					/>
				</Form.Item>
				<Form.Item
					label={(
						<span>{i18next.t('KARA.CREATORS_BY')}&nbsp;
							<Tooltip title={i18next.t('KARA.CREATORS_TOOLTIP')}>
								<QuestionCircleOutlined />
							</Tooltip>
						</span>
					)}
					labelCol={{ flex: '0 1 220px' }}
					wrapperCol={{ span: 6 }}
					name="creators"
				>
					<EditableTagGroup
						tagType={4}
						onChange={(tags) => this.formRef.current.setFieldsValue({ creators: tags })}
					/>
				</Form.Item>
				<Form.Item
					label={(
						<span>{i18next.t('KARA.AUTHORS_BY')}&nbsp;
							<Tooltip title={i18next.t('KARA.KARA_AUTHORS_TOOLTIP')}>
								<QuestionCircleOutlined />
							</Tooltip>
						</span>
					)}
					labelCol={{ flex: '0 1 220px' }}
					wrapperCol={{ span: 6 }}
					rules={[{
						required: true,
						message: i18next.t('KARA.KARA_AUTHORS_REQUIRED')
					}]}
					name="authors"
				>
					<EditableTagGroup
						tagType={6}
						onChange={(tags) => this.formRef.current.setFieldsValue({ author: tags })}
					/>
				</Form.Item>
				<Form.Item
					label={i18next.t('KARA.FAMILIES')}
					labelCol={{ flex: '0 1 220px' }}
					wrapperCol={{ span: 10 }}
					name="families"
				>
					<EditableTagGroup
						tagType={10}
						checkboxes={true}
						onChange={(tags) => this.formRef.current.setFieldsValue({ families: tags })}
					/>
				</Form.Item>
				<Form.Item
					label={i18next.t('KARA.PLATFORMS')}
					labelCol={{ flex: '0 1 220px' }}
					wrapperCol={{ span: 10 }}
					name="platforms"
				>
					<EditableTagGroup
						tagType={13}
						checkboxes={true}
						onChange={(tags) => this.formRef.current.setFieldsValue({ platforms: tags })}
					/>
				</Form.Item>
				<Form.Item
					label={i18next.t('KARA.GENRES')}
					labelCol={{ flex: '0 1 220px' }}
					wrapperCol={{ span: 10 }}
					name="genres"
				>
					<EditableTagGroup
						tagType={12}
						checkboxes={true}
						onChange={(tags) => this.formRef.current.setFieldsValue({ genres: tags })}
					/>
				</Form.Item>
				<Form.Item
					label={i18next.t('KARA.ORIGINS')}
					labelCol={{ flex: '0 1 220px' }}
					wrapperCol={{ span: 10 }}
					name="origins"
				>
					<EditableTagGroup
						tagType={11}
						checkboxes={true}
						onChange={(tags) => this.formRef.current.setFieldsValue({ origins: tags })}
					/>
				</Form.Item>
				<Form.Item
					label={i18next.t('KARA.MISC')}
					labelCol={{ flex: '0 1 220px' }}
					wrapperCol={{ span: 10 }}
					name="misc"
				>
					<EditableTagGroup
						tagType={7}
						checkboxes={true}
						onChange={(tags) => this.formRef.current.setFieldsValue({ misc: tags })}
					/>
				</Form.Item>
				<Form.Item
					label={(
						<span>{i18next.t('KARA.GROUPS')}&nbsp;
							<Tooltip title={i18next.t('KARA.GROUPS_TOOLTIP')}>
								<QuestionCircleOutlined />
							</Tooltip>
						</span>
					)}
					labelCol={{ flex: '0 1 220px' }}
					wrapperCol={{ span: 10 }}
					name="groups"
				>
					<EditableTagGroup
						tagType={9}
						checkboxes={true}
						onChange={(tags) => this.formRef.current.setFieldsValue({ groups: tags })}
					/>
				</Form.Item>
				{this.state.repositoriesValue ?
					<Form.Item
						label={i18next.t('KARA.REPOSITORY')}
						labelCol={{ flex: '0 1 220px' }}
						wrapperCol={{ span: 3 }}
						rules={[{
							required: true,
							message: i18next.t('KARA.REPOSITORY_REQUIRED')
						}]}
						name="repository"
					>
						<Select disabled={this.props.kara?.repository !== undefined} placeholder={i18next.t('KARA.REPOSITORY')}>
							{this.state.repositoriesValue.map(repo => {
								return <Select.Option key={repo} value={repo}>{repo}</Select.Option>;
							})
							}
						</Select>
					</Form.Item> : null
				}
				<Form.Item
					hasFeedback
					label={
						<span>{i18next.t('KARA.COMMENT')}&nbsp;
							<Tooltip title={i18next.t('KARA.COMMENT_TOOLTIP')}>
								<QuestionCircleOutlined />
							</Tooltip>
						</span>
					}
					labelCol={{ flex: '0 1 220px' }}
					wrapperCol={{ span: 8 }}
					rules={[{
						required: false
					}]}
					name="comment"
				>
					<Input
						placeholder={i18next.t('KARA.COMMENT')}
						onKeyPress={this.submitHandler}
					/>
				</Form.Item>
				<Form.Item
					label={
						<span>{i18next.t('KARA.IGNOREHOOKS')}&nbsp;
							<Tooltip title={i18next.t('KARA.IGNOREHOOKS_TOOLTIP')}>
								<QuestionCircleOutlined />
							</Tooltip>
						</span>
					}
					valuePropName="checked"
					labelCol={{ flex: '0 1 220px' }}
					wrapperCol={{ span: 8 }}
					rules={[{
						required: false
					}]}
					name="ignoreHooks"
				>
					<Checkbox />
				</Form.Item>
				<Form.Item
					label={i18next.t('KARA.CREATED_AT')}
					labelCol={{ flex: '0 1 220px' }}
					wrapperCol={{ span: 8 }}
					name="created_at"
				>
					<label>{this.props.kara?.created_at ? new Date(this.props.kara.created_at).toLocaleString() : null}</label>
				</Form.Item>
				<Form.Item
					label={i18next.t('KARA.MODIFIED_AT')}
					labelCol={{ flex: '0 1 220px' }}
					wrapperCol={{ span: 8 }}
					name="modified_at"
				>
					<label>{this.props.kara?.modified_at ? new Date(this.props.kara.modified_at).toLocaleString() : null}</label>
				</Form.Item>
				<Form.Item>
					<Button style={{ marginLeft: '14em', marginRight: '9em' }} onClick={this.previewHooks}>
						{i18next.t('KARA.PREVIEW_HOOKS')}
					</Button>
					<Button type='primary' htmlType='submit'>{i18next.t('SUBMIT')}</Button>
				</Form.Item>
				<Divider />
				{this.state.repositoriesValue && this.props.kara?.repository ?
					<React.Fragment>
						<Form.Item hasFeedback
							label={i18next.t('KARA.REPOSITORY')}
							labelCol={{ flex: '0 1 220px' }}
							wrapperCol={{ span: 8 }}
						>
							<Select placeholder={i18next.t('KARA.REPOSITORY')} onChange={(value: string) => this.setState({ repoToCopySong: value })}>
								{this.state.repositoriesValue.filter(value => value !== this.props.kara.repository).map(repo => {
									return <Select.Option key={repo} value={repo}>{repo}</Select.Option>;
								})
								}
							</Select>
						</Form.Item>

						<Form.Item
							wrapperCol={{ span: 8, offset: 3 }}
							style={{ textAlign: 'right' }}
						>
							<Button disabled={!this.state.repoToCopySong} type="primary" danger
								onClick={() => this.props.handleCopy(this.props.kara.kid, this.state.repoToCopySong)}>
								{i18next.t('KARA.COPY_SONG')}
							</Button>
						</Form.Item>
					</React.Fragment> : null
				}
			</Form>
		);
	}
}

export default KaraForm;
