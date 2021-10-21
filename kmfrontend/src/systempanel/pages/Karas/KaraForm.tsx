import { QuestionCircleOutlined, UploadOutlined } from '@ant-design/icons';
import {
	Button,
	Checkbox,
	Divider,
	Form,
	Input,
	InputNumber,
	message,
	Modal,
	Select,
	Tooltip,
	Upload
} from 'antd';
import { FormInstance } from 'antd/lib/form';
import { SelectValue } from 'antd/lib/select';
import i18next from 'i18next';
import { Component, createRef } from 'react';

import { DBKara } from '../../../../../src/lib/types/database/kara';
import { Kara } from '../../../../../src/lib/types/kara';
import GlobalContext from '../../../store/context';
import { buildKaraTitle, getTagInLocale } from '../../../utils/kara';
import { commandBackend } from '../../../utils/socket';
import { getTagTypeName } from '../../../utils/tagTypes';
import EditableTagGroup from '../../components/EditableTagGroup';
import LanguagesList from '../../components/LanguagesList';
import OpenLyricsFileButton from '../../components/OpenLyricsFileButton';

interface KaraFormProps {
	kara: Kara | Record<string, never>;
	save: any;
	handleCopy: (kid, repo) => void;
}

interface KaraFormState {
	titles: Record<string, string>;
	titlesIsTouched: boolean;
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
	karaSearch: { label: string, value: string }[];
	parentKara: Kara;
}

class KaraForm extends Component<KaraFormProps, KaraFormState> {
	formRef = createRef<FormInstance>();
	static contextType = GlobalContext
	context: React.ContextType<typeof GlobalContext>
	timer: NodeJS.Timeout

	constructor(props) {
		super(props);
		const kara = this.props.kara || {};
		this.getRepositories();
		this.state = {
			titles: kara?.titles ? kara.titles : { 'eng': '' },
			titlesIsTouched: false,
			serieSingersRequired: false,
			subfile: kara.subfile
				? [
					{
						uid: -1,
						name: kara.subfile,
						status: 'done'
					}
				]
				: [],
			mediafile: kara.mediafile
				? [
					{
						uid: -1,
						name: kara.mediafile,
						status: 'done'
					}
				]
				: [],
			created_at: kara.created_at || new Date(),
			modified_at: kara.modified_at || new Date(),
			repositoriesValue: null,
			repoToCopySong: null,
			mediafile_orig: null,
			subfile_orig: null,
			comment: kara.comment,
			karaSearch: [],
			parentKara: null
		};
	}

	componentDidMount() {
		this.formRef.current.validateFields();
	}

	getRepositories = async () => {
		const res = await commandBackend('getRepos');
		this.setState(
			{ repositoriesValue: res.map(repo => repo.Name) },
			() => this.formRef.current.setFieldsValue({
				repository: this.props.kara.repository || (this.state.repositoriesValue ? this.state.repositoriesValue[0] : null)
			})
		);
	};

	previewHooks = async () => {
		const data = await commandBackend('previewHooks', this.getKaraToSend(this.formRef.current.getFieldsValue()), false, 300000);
		Modal.info({
			title: i18next.t('KARA.PREVIEW_HOOKS_MODAL'),
			content: <ul>{data?.map(tag => <li key={tag.tid} title={tag.tagfile}>
				{getTagInLocale(this.context?.globalState.settings.data, tag)} ({i18next.t(`TAG_TYPES.${getTagTypeName(tag.types[0])}_other`)})
			</li>)}</ul>
		});
	}

	handleSubmit = (values) => {
		if (!this.state.titles || Object.keys(this.state.titles).length === 0) {
			message.error(i18next.t('KARA.TITLE_REQUIRED'));
		} else if (!this.state.titles.eng) {
			message.error(i18next.t('KARA.TITLE_ENG_REQUIRED'));
		} else {
			this.props.save(this.getKaraToSend(values));
		}
	};

	getKaraToSend = (values) => {
		const kara: Kara = values;
		kara.karafile = this.props.kara.karafile;
		kara.kid = this.props.kara.kid;
		kara.mediafile_orig = this.state.mediafile_orig;
		kara.subfile_orig = this.state.subfile_orig;
		kara.titles = this.state.titles;
		return kara;
	};

	isMediaFile = (filename: string): boolean => {
		return new RegExp(`^.+\\.(${this.context.globalState.settings.data.state?.supportedMedias.join('|')})$`)
			.test(filename);
	};

	isSubFile = (filename: string): boolean => {
		return new RegExp(`^.+\\.(${this.context.globalState.settings.data.state?.supportedLyrics.join('|')})$`)
			.test(filename);
	};

	onMediaUploadChange = info => {
		const fileList = (info.fileList).slice(-1);
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
		const fileList = (info.fileList).slice(-1);
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

	search = (value) => {
		if (this.timer) clearTimeout(this.timer);
		this.timer = setTimeout(async () => {
			const karas = await commandBackend('getKaras', {
				q: this.formRef.current.getFieldValue('repository') ?
					`r:${this.formRef.current.getFieldValue('repository')}` : '',
				filter: value,
				size: 50
			}).catch(() => {
				return { content: [] };
			});
			if (karas.content) {
				this.setState({
					karaSearch: karas.content.map(k => {
						return { label: buildKaraTitle(this.context.globalState.settings.data, k, true, karas.i18n), value: k.kid };
					})
				});
			}
		}, 1000);
	}

	onParentKaraChange = async (event: SelectValue) => {
		if (event && event[0] && !event[1]) {
			await this.applyFieldsFromKara(event[0] as string);
		}
	}

	applyFieldsFromKara = async (kid: string) => {
		const karas = await commandBackend('getKaras', {
			q: (this.formRef.current.getFieldValue('repository') ?
				`r:${this.formRef.current.getFieldValue('repository')}!` : '!') + 'k:' + kid,
			size: 1
		});
		const parentKara = karas && karas.content[0] as DBKara;
		if (parentKara && parentKara.kid === kid) {
			// Check if user has already started doing input, or if it's an edit of existing kara
			if (!this.props.kara.kid && this.state.titlesIsTouched !== true && this.formRef.current.isFieldsTouched(['versions', 'series', 'language']) !== true) {
				this.setState({ titles: parentKara.titles, parentKara });
				this.formRef.current.resetFields();
			}
		}
	}

	submitHandler(e) {
		e.key === 'Enter' && e.preventDefault();
	}

	mapRepoToSelectOption = (repo: string) => <Select.Option key={repo} value={repo}>{repo}</Select.Option>

	render() {
		return (
			<Form
				ref={this.formRef}
				onFinish={this.handleSubmit}
				className="kara-form"
				initialValues={{
					series: this.props.kara.series || this.state.parentKara?.series,
					songtypes: this.props.kara.songtypes || this.state.parentKara?.songtypes,
					songorder: this.props.kara.songorder || this.state.parentKara?.songorder,
					langs: this.props.kara.langs || this.state.parentKara?.langs,
					year: this.props.kara.year || this.state.parentKara?.year || (new Date()).getFullYear(),
					singers: this.props.kara.singers || this.state.parentKara?.singers,
					songwriters: this.props.kara.songwriters || this.state.parentKara?.songwriters,
					creators: this.props.kara.creators || this.state.parentKara?.creators,
					authors: this.props.kara.authors || this.state.parentKara?.authors,
					families: this.props.kara.families || this.state.parentKara?.families,
					platforms: this.props.kara.platforms || this.state.parentKara?.platforms,
					genres: this.props.kara.genres || this.state.parentKara?.genres,
					origins: this.props.kara.origins || this.state.parentKara?.origins,
					misc: this.props.kara.misc || this.state.parentKara?.misc,
					groups: this.props.kara.groups || this.state.parentKara?.groups,
					versions: this.props.kara.versions || this.state.parentKara?.versions,
					comment: this.props.kara.comment || null,
					ignoreHooks: this.props.kara.ignoreHooks || false,
					repository: this.props.kara.repository || this.state.parentKara?.repository || null,
					created_at: this.state.created_at,
					modified_at: this.state.modified_at,
					mediafile: this.props.kara.mediafile,
					subfile: this.props.kara.subfile,
					parents: this.props.kara.parents || this.state.parentKara && [this.state.parentKara?.kid] || []
				}}>
				<Form.Item
					label={
						<span>{i18next.t('KARA.MEDIA_FILE')}&nbsp;
							<Tooltip
								title={i18next.t(
									'KARA.MEDIA_FILE_TOOLTIP',
									{ formats: this.context.globalState.settings.data.state?.supportedMedias?.join(', ') }
								)}
							>
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
						action="/api/importFile"
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
								title={i18next.t(
									'KARA.LYRICS_FILE_TOOLTIP',
									{ formats: this.context.globalState.settings.data.state?.supportedLyrics?.join(', ') }
								)}
							>
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
						action="/api/importFile"
						multiple={false}
						onChange={this.onSubUploadChange}
						fileList={this.state.subfile}
					>
						<Button>
							<UploadOutlined />{i18next.t('KARA.LYRICS_FILE')}
						</Button>
					</Upload>
					<div style={{ marginTop: '1em' }}>
						<OpenLyricsFileButton kara={this.props.kara} />
					</div>
				</Form.Item>
				<Form.Item
					label={
						<span>
							{i18next.t('KARA.PARENTS')}&nbsp;
							<Tooltip title={i18next.t('KARA.PARENTS_TOOLTIP')}>
								<QuestionCircleOutlined />
							</Tooltip>
						</span>
					}
					labelCol={{ flex: '0 1 220px' }}
					wrapperCol={{ span: 8 }}
					name="parents"
				>
					<Select
						showSearch
						mode="multiple"
						onSearch={this.search}
						onChange={this.onParentKaraChange}
						showArrow={false}
						filterOption={false}
						options={this.state.karaSearch}
					/>
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
					onFieldIsTouched={(isFieldTouched) => this.state.titlesIsTouched !== true && this.setState({ titlesIsTouched: isFieldTouched })}
					onChange={(titles) => this.setState({ titles: this.state.parentKara.titles })}
				/>
				<Form.Item
					label={(
						<span>{i18next.t('TAG_TYPES.VERSIONS_other')}&nbsp;
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
						<span>{i18next.t('TAG_TYPES.SERIES_other')}&nbsp;
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
						}}
					/>
				</Form.Item>
				<Form.Item
					label={i18next.t('TAG_TYPES.SONGTYPES_other')}
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

				<Form.Item
					hasFeedback
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
					label={i18next.t('TAG_TYPES.LANGS_other')}
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
				<Form.Item
					hasFeedback
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
					<InputNumber
						required={true}
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
					label={i18next.t('TAG_TYPES.FAMILIES_other')}
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
					label={i18next.t('TAG_TYPES.PLATFORMS_other')}
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
					label={i18next.t('TAG_TYPES.GENRES_other')}
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
					label={i18next.t('TAG_TYPES.ORIGINS_other')}
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
					label={i18next.t('TAG_TYPES.MISC_other')}
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
						<span>{i18next.t('TAG_TYPES.GROUPS_other')}&nbsp;
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
						<Select
							disabled={this.props.kara?.repository !== undefined}
							placeholder={i18next.t('KARA.REPOSITORY')}
						>
							{this.state.repositoriesValue.map(this.mapRepoToSelectOption)}
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
					<label>{this.props.kara.created_at ? new Date(this.props.kara.created_at).toLocaleString() : null}</label>
				</Form.Item>
				<Form.Item
					label={i18next.t('KARA.MODIFIED_AT')}
					labelCol={{ flex: '0 1 220px' }}
					wrapperCol={{ span: 8 }}
					name="modified_at"
				>
					<label>{this.props.kara.modified_at ? new Date(this.props.kara.modified_at).toLocaleString() : null}</label>
				</Form.Item>
				<Form.Item>
					<Button style={{ marginLeft: '14em', marginRight: '9em' }} onClick={this.previewHooks}>
						{i18next.t('KARA.PREVIEW_HOOKS')}
					</Button>
					<Button type='primary' htmlType='submit'>{i18next.t('SUBMIT')}</Button>
				</Form.Item>
				<Divider />
				{this.state.repositoriesValue && this.props.kara.repository ?
					<>
						<Form.Item
							hasFeedback
							label={i18next.t('KARA.REPOSITORY')}
							labelCol={{ flex: '0 1 220px' }}
							wrapperCol={{ span: 8 }}
						>
							<Select
								placeholder={i18next.t('KARA.REPOSITORY')}
								onChange={(value: string) => this.setState({ repoToCopySong: value })}
							>
								{
									this.state.repositoriesValue
										.filter(value => value !== this.props.kara.repository)
										.map(this.mapRepoToSelectOption)
								}
							</Select>
						</Form.Item>

						<Form.Item
							wrapperCol={{ span: 8, offset: 3 }}
							style={{ textAlign: 'right' }}
						>
							<Button
								disabled={!this.state.repoToCopySong}
								type="primary"
								danger
								onClick={() => this.props.handleCopy(
									this.props.kara.kid,
									this.state.repoToCopySong
								)}
							>
								{i18next.t('KARA.COPY_SONG')}
							</Button>
						</Form.Item>
					</> : null
				}
			</Form>
		);
	}
}

export default KaraForm;
