import React, { Component } from "react";
import { Button, Input, InputNumber, message, Select, Tooltip, Upload,Form, Divider } from "antd";
import EditableTagGroup from "../Components/EditableTagGroup";
import { getTagInLocale } from "../../utils/kara";
import i18next from 'i18next';
import { QuestionCircleOutlined, UploadOutlined } from '@ant-design/icons';
import { FormInstance } from "antd/lib/form";
import Axios from 'axios';
import { Kara } from "../../../../src/lib/types/kara";
import { DBTag } from "../../../../src/lib/types/database/tag";

interface KaraFormProps {
	kara: Kara;
	save: any;
	handleCopy: (kid, repo) => void
}

interface KaraFormState {
	serieSingersRequired: boolean;
	subfile: any[];
	mediafile: any[];
	singers: DBTag[];
	authors: DBTag[];
	misc: DBTag[];
	series: DBTag[];
	creators: DBTag[];
	songwriters: DBTag[];
	groups: DBTag[];
	songtypes: DBTag[];
	langs: DBTag[];
	families?: DBTag[];
	genres?: DBTag[];
	platforms?: DBTag[];
	origins?: DBTag[];
	created_at?: Date;
	modified_at?: Date;
	repositoriesValue: string[];
	repoToCopySong: string;
	mediafile_orig: string;
	subfile_orig: string;
}

class KaraForm extends Component<KaraFormProps, KaraFormState> {
	formRef = React.createRef<FormInstance>();

	constructor(props) {
		super(props);
		const kara = this.props.kara;
		this.getRepositories();
		this.state = {
			serieSingersRequired: false,
			subfile: kara?.subfile
				? [
					{
						uid: -1,
						name: kara.subfile,
						status: "done"
					}
				]
				: null,
			mediafile: kara?.mediafile
				? [
					{
						uid: -1,
						name: kara.mediafile,
						status: "done"
					}
				]
				: null,
			singers: this.getTagArray(kara?.singers),
			authors: this.getTagArray(kara?.authors),
			misc: this.getTagArray(kara?.misc),
			series: this.getTagArray(kara?.series),
			creators: this.getTagArray(kara?.creators),
			songwriters: this.getTagArray(kara?.songwriters),
			groups: this.getTagArray(kara?.groups),
			songtypes: this.getTagArray(kara?.songtypes),
			langs: this.getTagArray(kara?.langs),
			families: this.getTagArray(kara?.families),
			platforms: this.getTagArray(kara?.platforms),
			genres: this.getTagArray(kara?.genres),
			origins: this.getTagArray(kara?.origins),
			created_at: kara?.created_at ? kara.created_at : new Date(),
			modified_at: kara?.modified_at ? kara.modified_at : new Date(),
			repositoriesValue: null,
			repoToCopySong: null,
			mediafile_orig: null,
			subfile_orig: null
		};
	}

	componentDidMount() {
		this.formRef.current.validateFields();
		this.onChangeSingersSeries(this.state.series, "singers");
		this.onChangeSingersSeries(this.state.singers, "series");
	}

	getTagArray(value) {
		if (value) {
			return value.map(element => {
				return [element.tid, getTagInLocale(element), element.name]
			});
		} else {
			return [];
		}
	}

	getTagObject(value) {
		if (value) {
			return value.map(element => {
				if (element.length === 3) {
					return { tid: element[0], name: element[2] };
				} else if (element.length === 2) {
					return { tid: element[0], name: element[1] };
				} else {
					return null;
				}
			});
		}
		else {
			return [];
		}
	}

	getRepositories = async () => {
		const res = await Axios.get("/repos");
		await this.setState({ repositoriesValue: res.data.map(repo => repo.Name)});
		this.formRef.current.setFieldsValue({repository: this.props.kara?.repository ? this.props.kara.repository : 
			(this.state.repositoriesValue ? this.state.repositoriesValue[0] : null)});
	};

	handleSubmit = (values) => {
		var kara: Kara = values;
		kara.karafile = this.props.kara?.karafile;
		kara.kid = this.props.kara?.kid;
		kara.mediafile_orig = this.state.mediafile_orig;
		kara.subfile_orig = this.state.subfile_orig;
		kara.series = this.getTagObject(kara.series);
		kara.singers = this.getTagObject(kara.singers);
		kara.authors = this.getTagObject(kara.authors);
		kara.misc = this.getTagObject(kara.misc);
		kara.creators = this.getTagObject(kara.creators);
		kara.songwriters = this.getTagObject(kara.songwriters);
		kara.groups = this.getTagObject(kara.groups);
		kara.langs = this.getTagObject(kara.langs);
		kara.families = this.getTagObject(kara.families);
		kara.platforms = this.getTagObject(kara.platforms);
		kara.genres = this.getTagObject(kara.genres);
		kara.origins = this.getTagObject(kara.origins);
		kara.songtypes = this.getTagObject(kara.songtypes);
		
		this.props.save(kara);
	};

	isMediaFile = filename => {
		return new RegExp("^.+\\.(avi|mkv|mp4|webm|mov|wmv|mpg|ogg|m4a|mp3)$").test(
			filename
		);
	};

	onMediaUploadChange = info => {
		let fileList = info.fileList;
		fileList = fileList.slice(-1);
		this.setState({ mediafile: fileList });
		if (info.file.status === "uploading") {
			this.formRef.current.setFieldsValue({ mediafile: null });
			this.setState({mediafile_orig: null});
		} else if (info.file.status === "done") {
			if (this.isMediaFile(info.file.name)) {
				this.formRef.current.setFieldsValue({mediafile: info.file.response.filename});
				this.setState({mediafile_orig: info.file.response.originalname});
				message.success(i18next.t('KARA.ADD_FILE_SUCCESS', { name: info.file.name }));
			} else {
				this.formRef.current.setFieldsValue({ mediafile: null });
				message.error(i18next.t('KARA.ADD_FILE_MEDIA_ERROR', { name: info.file.name }));
				info.file.status = "error";
				this.setState({ mediafile: [], mediafile_orig: null });
			}
		} else if (info.file.status === "error") {
			this.formRef.current.setFieldsValue({ mediafile: null });
			this.setState({ mediafile: [], mediafile_orig: null });
		}
	};

	onSubUploadChange = info => {
		let fileList = info.fileList;
		fileList = fileList.slice(-1);
		this.setState({ subfile: fileList });
		if (info.file.status === "uploading") {
			this.formRef.current.setFieldsValue({ subfile: null });
			this.setState({subfile_orig: null});
		} else if (info.file.status === "done") {
			if (info.file.name.endsWith(".ass") || info.file.name.endsWith(".txt") || info.file.name.endsWith(".kfn") || info.file.name.endsWith(".kar")) {
				this.formRef.current.setFieldsValue({subfile: info.file.response.filename});
				this.setState({subfile_orig: info.file.response.originalname});
				message.success(i18next.t('KARA.ADD_FILE_SUCCESS', { name: info.file.name }));
			} else {
				this.formRef.current.setFieldsValue({ subfile: null });
				message.error(i18next.t('KARA.ADD_FILE_LYRICS_ERROR', { name: info.file.name }));
				info.file.status = "error";
				this.setState({ subfile: [], subfile_orig: null });
			}
		} else if (info.file.status === "error") {
			this.formRef.current.setFieldsValue({ subfile: null });
			this.setState({ subfile: [], subfile_orig: null });
		}
	};

	onChangeSingersSeries = (tags, type) => {
		this.setState({serieSingersRequired: (!tags || tags.length === 0) &&  this.formRef.current.getFieldValue(type).length === 0}, () => {
			this.formRef.current.validateFields(['series']);
			this.formRef.current.validateFields(['singers']);
		});
	}

	render() {
		return (
            <Form ref={this.formRef} onFinish={this.handleSubmit} className="kara-form"
				initialValues={{title: this.props.kara?.title, series: this.state.series,
				songtypes: this.state.songtypes, songorder: this.props.kara?.songorder,
				langs: this.state.langs, year: this.props.kara?.year || 2010,
				singers: this.state.singers, songwriters: this.state.songwriters,
				creators: this.state.creators, authors: this.state.authors,
				families: this.state.families, platforms: this.state.platforms,
				genres: this.state.genres, origins: this.state.origins,
				misc: this.state.misc, groups: this.state.groups,
				repository: this.props.kara?.repository ? this.props.kara.repository : null,
				created_at: this.state.created_at, modified_at: this.state.modified_at,
				mediafile: this.props.kara?.mediafile, subfile: this.props.kara?.subfile}}>
				<Form.Item
					label={
						<span>{i18next.t('KARA.MEDIA_FILE')}&nbsp;
							<Tooltip title={i18next.t('KARA.MEDIA_FILE_TOOLTIP')}>
								<QuestionCircleOutlined />
							</Tooltip>
						</span>
					}
					labelCol={{ flex: '0 1 200px' }}
					wrapperCol={{ span: 6 }}
					name="mediafile"
				>
					<Upload
						headers={{
							authorization: localStorage.getItem('kmToken'),
							onlineAuthorization: localStorage.getItem('kmOnlineToken')
						}}
						action="/api/karas/importfile"
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
							<Tooltip title={i18next.t('KARA.LYRICS_FILE_TOOLTIP')}>
								<QuestionCircleOutlined />
							</Tooltip>
						</span>
					}
					labelCol={{ flex: '0 1 200px' }}
					wrapperCol={{ span: 6 }}
					name="subfile"
				>
					<Upload
						headers={{
							authorization: localStorage.getItem('kmToken'),
							onlineAuthorization: localStorage.getItem('kmOnlineToken')
						}}
						action="/api/karas/importfile"
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
					labelCol={{ flex: '0 1 200px' }}
					wrapperCol={{ span: 8 }}
					rules={[{
						required: true,
						message: i18next.t('KARA.TITLE_REQUIRED')
					}]}
					name="title"
				>
					<Input placeholder={i18next.t('KARA.TITLE')}	/>
				</Form.Item>

				<Form.Item
					label={
						<span>{i18next.t('KARA.SERIES')}&nbsp;
							<Tooltip title={i18next.t('KARA.SERIES_TOOLTIP')}>
								<QuestionCircleOutlined />
							</Tooltip>
						</span>
					}
					labelCol={{ flex: '0 1 200px' }}
					wrapperCol={{ span: 14 }}
					rules={[{
						required: this.state.serieSingersRequired,
						message: i18next.t('KARA.SERIES_SINGERS_REQUIRED')
					}]}
					name="series"
				>
					<EditableTagGroup
						tagType={1}
						search={"tag"}
						onChange={tags => {
							this.formRef.current.setFieldsValue({ series: tags });
							this.onChangeSingersSeries(tags, "singers");
						}
						}
					/>
				</Form.Item>
				<Form.Item
					label={i18next.t('KARA.SONGTYPES')}
					labelCol={{ flex: '0 1 200px' }}
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
						search={'tag'}
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
					labelCol={{ flex: '0 1 200px' }}
					wrapperCol={{ span: 1 }}
					name="songorder"
				>
					<InputNumber
						min={0}
						style={{ width: '100%' }}
					/>
				</Form.Item>
				<Form.Item
					label={i18next.t('KARA.LANGUAGES')}
					labelCol={{ flex: '0 1 200px' }}
					wrapperCol={{ span: 6 }}
					rules={[{
						required: true,
						message: i18next.t('KARA.LANGUAGES_REQUIRED')
					}]}
					name="langs"
				>
					<EditableTagGroup
						tagType={5}
						search={'tag'}
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
					labelCol={{ flex: '0 1 200px' }}
					wrapperCol={{ span: 2 }}
					name="year"
				>
					<InputNumber required={true}
						min={0}
						placeholder='Year'
						style={{ width: '100%' }}
					/>
				</Form.Item>
				<Form.Item
					label={i18next.t('KARA.SINGERS')}
					labelCol={{ flex: '0 1 200px' }}
					wrapperCol={{ span: 6 }}
					rules={[{
						required: this.state.serieSingersRequired,
						message: i18next.t('KARA.SERIES_SINGERS_REQUIRED')
					}]}
					name="singers"
				>
					<EditableTagGroup
						tagType={2}
						search={'tag'}
						onChange={(tags) => {
							this.formRef.current.setFieldsValue({ singer: tags });
							this.onChangeSingersSeries(tags, "series");
						}
						}
					/>
				</Form.Item>
				<Form.Item
					label={(
						<span>{i18next.t('KARA.SONGWRITERS')}&nbsp;
							<Tooltip title={i18next.t('KARA.SONGWRITERS_TOOLTIP')}>
								<QuestionCircleOutlined />
							</Tooltip>
						</span>
					)}
					labelCol={{ flex: '0 1 200px' }}
					wrapperCol={{ span: 6 }}
					name="songwriters"
				>
					<EditableTagGroup
						tagType={8}
						search={'tag'}
						onChange={(tags) => this.formRef.current.setFieldsValue({ songwriters: tags })}
					/>
				</Form.Item>
				<Form.Item
					label={(
						<span>{i18next.t('KARA.CREATORS')}&nbsp;
							<Tooltip title={i18next.t('KARA.CREATORS_TOOLTIP')}>
								<QuestionCircleOutlined />
							</Tooltip>
						</span>
					)}
					labelCol={{ flex: '0 1 200px' }}
					wrapperCol={{ span: 6 }}
					name="creators"
				>
					<EditableTagGroup
						tagType={4}
						search={'tag'}
						onChange={(tags) => this.formRef.current.setFieldsValue({ creators: tags })}
					/>
				</Form.Item>
				<Form.Item
					label={(
						<span>{i18next.t('KARA.KARA_AUTHORS')}&nbsp;
							<Tooltip title={i18next.t('KARA.KARA_AUTHORS_TOOLTIP')}>
								<QuestionCircleOutlined />
							</Tooltip>
						</span>
					)}
					labelCol={{ flex: '0 1 200px' }}
					wrapperCol={{ span: 6 }}
					rules={[{
						required: true,
						message: i18next.t('KARA.KARA_AUTHORS_REQUIRED')
					}]}
					name="authors"
				>
					<EditableTagGroup
						tagType={6}
						search={'tag'}
						onChange={(tags) => this.formRef.current.setFieldsValue({ author: tags })}
					/>
				</Form.Item>
				<Form.Item
					label={i18next.t('KARA.FAMILIES')}
					labelCol={{ flex: '0 1 200px' }}
					wrapperCol={{ span: 10 }}
					name="families"
				>
					<EditableTagGroup
						tagType={10}
						checkboxes={true}
						search={'tag'}
						onChange={(tags) => this.formRef.current.setFieldsValue({ families: tags })}
					/>
				</Form.Item>
				<Form.Item
					label={i18next.t('KARA.PLATFORMS')}
					labelCol={{ flex: '0 1 200px' }}
					wrapperCol={{ span: 10 }}
					name="platforms"
				>
					<EditableTagGroup
						tagType={13}
						checkboxes={true}
						search={'tag'}
						onChange={(tags) => this.formRef.current.setFieldsValue({ platforms: tags })}
					/>
				</Form.Item>
				<Form.Item
					label={i18next.t('KARA.GENRES')}
					labelCol={{ flex: '0 1 200px' }}
					wrapperCol={{ span: 10 }}
					name="genres"
				>
					<EditableTagGroup
						tagType={12}
						checkboxes={true}
						search={'tag'}
						onChange={(tags) => this.formRef.current.setFieldsValue({ genres: tags })}
					/>
				</Form.Item>
				<Form.Item
					label={i18next.t('KARA.ORIGINS')}
					labelCol={{ flex: '0 1 200px' }}
					wrapperCol={{ span: 10 }}
					name="origins"
				>
					<EditableTagGroup
						tagType={11}
						checkboxes={true}
						search={'tag'}
						onChange={(tags) => this.formRef.current.setFieldsValue({ origins: tags })}
					/>
				</Form.Item>
				<Form.Item
					label={i18next.t('KARA.MISC')}
					labelCol={{ flex: '0 1 200px' }}
					wrapperCol={{ span: 10 }}
					name="misc"
				>
					<EditableTagGroup
						tagType={7}
						checkboxes={true}
						search={'tag'}
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
					labelCol={{ flex: '0 1 200px' }}
					wrapperCol={{ span: 10 }}
					name="groups"
				>
					<EditableTagGroup
						tagType={9}
						checkboxes={true}
						search={'tag'}
						onChange={(tags) => this.formRef.current.setFieldsValue({ groups: tags })}
					/>
				</Form.Item>
				{this.state.repositoriesValue ?
					<Form.Item
						label={i18next.t('KARA.REPOSITORY')}
						labelCol={{ flex: '0 1 200px' }}
						wrapperCol={{ span: 3 }}
						rules={[{
							required: true,
							message: i18next.t('KARA.REPOSITORY_REQUIRED')
						}]}
						name="repository"
					>
						<Select disabled={this.props.kara?.repository !== undefined} placeholder={i18next.t('KARA.REPOSITORY')}>
							{this.state.repositoriesValue.map(repo => {
								return <Select.Option key={repo} value={repo}>{repo}</Select.Option>
							})
							}
						</Select>
					</Form.Item> : null
				}
				<Form.Item
					label={i18next.t('KARA.CREATED_AT')}
					labelCol={{ flex: '0 1 200px' }}
					wrapperCol={{ span: 8 }}
					name="created_at"
				>
					<label>{this.props.kara?.created_at ? new Date(this.props.kara.created_at).toLocaleString() : null}</label>
				</Form.Item>
				<Form.Item
					label={i18next.t('KARA.MODIFIED_AT')}
					labelCol={{ flex: '0 1 200px' }}
					wrapperCol={{ span: 8 }}
					name="modified_at"
				>
					<label>{this.props.kara?.modified_at ? new Date(this.props.kara.modified_at).toLocaleString() : null}</label>
				</Form.Item>
				<Form.Item
					wrapperCol={{ span: 8, offset: 5 }}
				>
					<Button type='primary' htmlType='submit' className='login-form-button'>{i18next.t('SUBMIT')}</Button>
				</Form.Item>
				<Divider/>
				{this.state.repositoriesValue && this.props.kara?.repository ?
					<React.Fragment>
						<Form.Item hasFeedback
							label={i18next.t('KARA.REPOSITORY')}
							labelCol={{ flex: '0 1 200px' }}
							wrapperCol={{ span: 8 }}
							>
							<Select placeholder={i18next.t('KARA.REPOSITORY')} onChange={(value:string) => this.setState({repoToCopySong: value})}>
								{this.state.repositoriesValue.filter(value => value !== this.props.kara.repository).map(repo => {
									return <Select.Option key={repo} value={repo}>{repo}</Select.Option>
								})
								}
							</Select>
						</Form.Item>

						<Form.Item
							wrapperCol={{ span: 8, offset: 3 }}
							style={{textAlign:"right"}}
							>
							<Button disabled={!this.state.repoToCopySong} type="primary" danger 
								onClick={() => this.props.handleCopy(this.props.kara.kid, this.state.repoToCopySong)}>
								{i18next.t('KARA.MOVE_SONG')}
							</Button>
						</Form.Item>
					</React.Fragment> : null
				}
			</Form>
        );
	}
}

export default KaraForm;
