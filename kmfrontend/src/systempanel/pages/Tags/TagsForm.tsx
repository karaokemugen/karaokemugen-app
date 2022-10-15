import { QuestionCircleOutlined } from '@ant-design/icons';
import {
	Alert,
	Button,
	Cascader,
	Checkbox,
	Collapse,
	Divider,
	Form,
	FormInstance,
	Input,
	InputNumber,
	message,
	Select,
	Tooltip,
} from 'antd';
import i18next from 'i18next';
import { Component, createRef } from 'react';

import { Tag } from '../../../../../src/lib/types/tag';
import { commandBackend } from '../../../utils/socket';
import { tagTypes } from '../../../utils/tagTypes';
import EditableGroupAlias from '../../components/EditableGroupAlias';
import KaraList from '../../components/KaraList';
import LanguagesList from '../../components/LanguagesList';

interface TagsFormProps {
	tags: Tag[];
	tag: Tag;
	save: (tag: Tag) => void;
	handleCopy: (tid, repo) => void;
	mergeAction: (tid1: string, tid2: string) => void;
}

interface TagsFormState {
	i18n: Record<string, string>;
	description: Record<string, string>;
	selectVisible: boolean;
	mergeSelection: string;
	repositoriesValue: string[];
	repoToCopySong: string;
	displayDescription: boolean;
}

const myanimelistUrlRegexp = /myanimelist.net\/anime\/(\d+)/;
const anilistUrlRegexp = /anilist.co\/anime\/(\d+)/;
const kitsuUrlRegexp = /kitsu.io\/anime\/([a-zA-Z0-9-]+)/;
const validExternalAnimeIdRegexp = /^[1-9]|\d\d+$/; // strictly positive

class TagForm extends Component<TagsFormProps, TagsFormState> {
	formRef = createRef<FormInstance>();

	constructor(props: Readonly<TagsFormProps> | TagsFormProps) {
		super(props);
		this.getRepositories();

		this.state = {
			i18n: this.props.tag?.i18n ? this.props.tag.i18n : { eng: '' },
			description: this.props.tag?.description ? this.props.tag.description : { eng: '' },
			selectVisible: false,
			mergeSelection: '',
			repositoriesValue: null,
			repoToCopySong: null,
			displayDescription: this.props.tag?.description ? true : false,
		};
	}

	getRepositories = async () => {
		const res = await commandBackend('getRepos');
		this.setState({ repositoriesValue: res.map(repo => repo.Name) }, () =>
			this.formRef.current?.setFieldsValue({
				repository: this.props.tag?.repository
					? this.props.tag.repository
					: this.state.repositoriesValue
					? this.state.repositoriesValue[0]
					: null,
			})
		);
	};

	handleSubmit = values => {
		if (Object.keys(this.state.i18n).length > 0) {
			values.i18n = this.state.i18n;
			values.description =
				Object.values(this.state.description).filter(value => value).length > 0
					? this.state.description
					: undefined;
			values.tid = this.props.tag?.tid;
			values.external_database_ids = {
				anilist: +values.anilistID || null,
				kitsu: +values.kitsuID || null,
				myanimelist: +values.malID || null,
			};
			delete values.malID;
			delete values.anilistID;
			delete values.kitsuID;
			this.props.save(values);
		} else {
			message.error(i18next.t('TAGS.LANG_ERROR'));
		}
	};

	handleTagMergeSelection = value => {
		if (value) this.setState({ mergeSelection: value[1] });
	};

	handleTagMerge = e => {
		this.props.mergeAction(this.props.tag.tid, this.state.mergeSelection);
	};

	mergeCascaderOption = () => {
		const options = Object.keys(tagTypes).map(type => {
			const typeID: any = tagTypes[type].type;

			const option = {
				value: typeID,
				label: i18next.t(`TAG_TYPES.${type}_other`),
				children: [],
			};
			for (const tag of this.props.tags) {
				if (tag.tid !== this.props.tag.tid) {
					if (tag.types.length && tag.types.indexOf(typeID) >= 0)
						option.children.push({
							value: tag.tid,
							label: tag.name,
						});
				}
			}
			return option;
		});
		return options;
	};

	mergeCascaderFilter = function (inputValue, path) {
		return path.some(option => option.label.toLowerCase().indexOf(inputValue.toLowerCase()) > -1);
	};

	buildTagFilter = () => {
		const tagArray = [];
		for (const type of this.props.tag.types) {
			tagArray.push(`${this.props.tag.tid}~${type}`);
		}
		return `t:${tagArray.join(',')}`;
	};

	render() {
		return (
			<Form
				ref={this.formRef}
				onFinish={this.handleSubmit}
				className="tag-form"
				initialValues={{
					name: this.props.tag?.name,
					short: this.props.tag?.short,
					types: this.props.tag?.types ? this.props.tag.types : [],
					repository: this.props.tag?.repository
						? this.props.tag.repository
						: this.state.repositoriesValue
						? this.state.repositoriesValue[0]
						: null,
					aliases: this.props.tag?.aliases,
					noLiveDownload: this.props.tag?.noLiveDownload,
					priority: this.props.tag?.priority ? this.props.tag?.priority : 10,
					karafile_tag: this.props.tag?.karafile_tag,
					malID: this.props.tag?.external_database_ids?.myanimelist?.toString(),
					anilistID: this.props.tag?.external_database_ids?.anilist?.toString(),
					kitsuID: this.props.tag?.external_database_ids?.kitsu?.toString(),
				}}
			>
				<Form.Item
					label={
						<span>
							{i18next.t('TAGS.NAME')}&nbsp;
							<Tooltip title={i18next.t('TAGS.NAME_TOOLTIP')}>
								<QuestionCircleOutlined />
							</Tooltip>
						</span>
					}
					labelCol={{ flex: '0 1 300px' }}
					name="name"
					rules={[
						{
							required: true,
							message: i18next.t('TAGS.NAME_REQUIRED'),
						},
					]}
				>
					<Input style={{ maxWidth: '40%', minWidth: '150px' }} placeholder={i18next.t('TAGS.NAME')} />
				</Form.Item>
				<Form.Item
					label={
						<span>
							{i18next.t('TAGS.DESCRIPTION')}&nbsp;
							<Tooltip title={i18next.t('TAGS.DESCRIPTION_TOOLTIP')}>
								<QuestionCircleOutlined />
							</Tooltip>
						</span>
					}
					labelCol={{ flex: '0 1 300px' }}
				>
					{this.state.displayDescription ? null : (
						<Button onClick={() => this.setState({ displayDescription: true })}>
							{i18next.t('TAGS.ADD_DESCRIPTION')}
						</Button>
					)}
				</Form.Item>
				{this.state.displayDescription ? (
					<div style={{ marginLeft: '3em', marginRight: '6em' }}>
						<LanguagesList
							value={this.state.description}
							onChange={description => this.setState({ description })}
						/>
					</div>
				) : null}
				<Form.Item
					label={
						<span>
							{i18next.t('TAGS.SHORT_NAME')}&nbsp;
							<Tooltip title={i18next.t('TAGS.SHORT_NAME_TOOLTIP')}>
								<QuestionCircleOutlined />
							</Tooltip>
						</span>
					}
					labelCol={{ flex: '0 1 300px' }}
					name="short"
				>
					<Input style={{ maxWidth: '40%', minWidth: '150px' }} placeholder={i18next.t('TAGS.SHORT_NAME')} />
				</Form.Item>
				<Form.Item
					label={
						<span>
							{i18next.t('TAGS.KARAFILETAG')}&nbsp;
							<Tooltip title={i18next.t('TAGS.KARAFILETAG_TOOLTIP')}>
								<QuestionCircleOutlined />
							</Tooltip>
						</span>
					}
					labelCol={{ flex: '0 1 300px' }}
					name="karafile_tag"
				>
					<Input style={{ maxWidth: '40%', minWidth: '150px' }} placeholder={i18next.t('TAGS.KARAFILETAG')} />
				</Form.Item>
				<Form.Item
					label={
						<span>
							{i18next.t('TAGS.TYPES')}&nbsp;
							<Tooltip title={i18next.t('TAGS.TYPES_TOOLTIP')}>
								<QuestionCircleOutlined />
							</Tooltip>
						</span>
					}
					labelCol={{ flex: '0 1 300px' }}
					name="types"
					required={true}
				>
					<Select
						style={{ maxWidth: '40%', minWidth: '150px' }}
						mode="multiple"
						placeholder={i18next.t('TAGS.TYPES')}
						showSearch={false}
					>
						{Object.keys(tagTypes).map(type => {
							const value = tagTypes[type].type;
							return (
								<Select.Option key={value} value={value}>
									{i18next.t(`TAG_TYPES.${type}_other`)}
								</Select.Option>
							);
						})}
					</Select>
				</Form.Item>
				{this.state.repositoriesValue ? (
					<Form.Item
						label={i18next.t('TAGS.REPOSITORY')}
						labelCol={{ flex: '0 1 300px' }}
						rules={[
							{
								required: true,
								message: i18next.t('TAGS.REPOSITORY_REQUIRED'),
							},
						]}
						name="repository"
					>
						<Select
							disabled={this.props.tag?.repository !== undefined}
							style={{ maxWidth: '20%', minWidth: '150px' }}
							placeholder={i18next.t('TAGS.REPOSITORY')}
						>
							{this.state.repositoriesValue.map(repo => {
								return (
									<Select.Option key={repo} value={repo}>
										{repo}
									</Select.Option>
								);
							})}
						</Select>
					</Form.Item>
				) : null}
				<Form.Item
					label={
						<span>
							{i18next.t('TAGS.ALIASES')}&nbsp;
							<Tooltip title={i18next.t('TAGS.ALIASES_TOOLTIP')}>
								<QuestionCircleOutlined />
							</Tooltip>
						</span>
					}
					labelCol={{ flex: '0 1 300px' }}
					name="aliases"
				>
					<EditableGroupAlias onChange={tags => this.formRef.current?.setFieldsValue({ aliases: tags })} />
				</Form.Item>
				<Form.Item
					labelCol={{ flex: '0 1 300px' }}
					label={
						<span>
							{i18next.t('TAGS.I18N')}&nbsp;
							<Tooltip title={i18next.t('TAGS.I18N_TOOLTIP')}>
								<QuestionCircleOutlined />
							</Tooltip>
						</span>
					}
				></Form.Item>
				<div style={{ marginLeft: '3em', marginRight: '8em' }}>
					<LanguagesList value={this.state.i18n} onChange={i18n => this.setState({ i18n })} />
				</div>
				<Form.Item
					hasFeedback
					label={
						<span>
							{i18next.t('TAGS.PRIORITY')}&nbsp;
							<Tooltip title={i18next.t('TAGS.PRIORITY_TOOLTIP')}>
								<QuestionCircleOutlined />
							</Tooltip>
						</span>
					}
					labelCol={{ flex: '0 1 300px' }}
					wrapperCol={{ span: 2 }}
					name="priority"
				>
					<InputNumber required={true} min={-2} placeholder="0" style={{ width: '100%' }} />
				</Form.Item>
				<Form.Item
					label={
						<span>
							{i18next.t('TAGS.NOLIVEDOWNLOAD')}&nbsp;
							<Tooltip title={i18next.t('TAGS.NOLIVEDOWNLOAD_TOOLTIP')}>
								<QuestionCircleOutlined />
							</Tooltip>
						</span>
					}
					labelCol={{ flex: '0 1 300px' }}
					valuePropName="checked"
					name="noLiveDownload"
				>
					<Checkbox />
				</Form.Item>
				<Form.Item
					label={
						<span>
							{i18next.t('TAGS.MAL_ID')}&nbsp;
							<Tooltip title={i18next.t('TAGS.MAL_ID_TOOLTIP')}>
								<QuestionCircleOutlined />
							</Tooltip>
						</span>
					}
					labelCol={{ flex: '0 1 300px' }}
					wrapperCol={{ span: 2 }}
					name="malID"
					getValueFromEvent={this.transformMalId.bind(this)}
					rules={[
						{
							validator: this.externalAnimeIdValidator.bind(this),
							required: false,
						},
					]}
				>
					<Input placeholder={i18next.t('TAGS.MAL_ID')} style={{ width: '100%' }} />
				</Form.Item>
				<Form.Item
					label={
						<span>
							{i18next.t('TAGS.ANILIST_ID')}&nbsp;
							<Tooltip title={i18next.t('TAGS.ANILIST_ID_TOOLTIP')}>
								<QuestionCircleOutlined />
							</Tooltip>
						</span>
					}
					labelCol={{ flex: '0 1 300px' }}
					wrapperCol={{ span: 2 }}
					name="anilistID"
					getValueFromEvent={this.transformAnilistId.bind(this)}
					rules={[
						{
							validator: this.externalAnimeIdValidator.bind(this),
						},
					]}
				>
					<Input placeholder={i18next.t('TAGS.ANILIST_ID')} style={{ width: '100%' }} />
				</Form.Item>
				<Form.Item
					label={
						<span>
							{i18next.t('TAGS.KITSU_ID')}&nbsp;
							<Tooltip title={i18next.t('TAGS.KITSU_ID_TOOLTIP')}>
								<QuestionCircleOutlined />
							</Tooltip>
						</span>
					}
					labelCol={{ flex: '0 1 300px' }}
					wrapperCol={{ span: 2 }}
					name="kitsuID"
					getValueFromEvent={this.transformKitsuId.bind(this)}
					rules={[
						{
							validator: this.externalAnimeIdValidator.bind(this),
						},
					]}
				>
					<Input placeholder={i18next.t('TAGS.KITSU_ID')} style={{ width: '100%' }} />
				</Form.Item>
				<Form.Item wrapperCol={{ flex: '45%' }} style={{ textAlign: 'right' }}>
					<Button type="primary" htmlType="submit" className="tags-form-button">
						{i18next.t('SUBMIT')}
					</Button>
				</Form.Item>
				{this.props.tag?.tid && (
					<Collapse>
						<Collapse.Panel header={i18next.t('TAGS.KARAOKES_WITH_TAGS')} key="1">
							<KaraList tagFilter={this.buildTagFilter()} tagFilterType={'OR'} />
						</Collapse.Panel>
					</Collapse>
				)}
				{this.props.tag ? (
					<>
						<Divider />
						<Form.Item
							label={
								<span>
									{i18next.t('TAGS.MERGE_WITH')}&nbsp;
									<Tooltip title={i18next.t('TAGS.MERGE_WITH_TOOLTIP')}>
										<QuestionCircleOutlined />
									</Tooltip>
								</span>
							}
							labelCol={{ flex: '0 1 300px' }}
						>
							<Cascader
								style={{ maxWidth: '40%', minWidth: '150px' }}
								options={this.mergeCascaderOption()}
								showSearch={{ filter: this.mergeCascaderFilter }}
								onChange={this.handleTagMergeSelection}
								placeholder={i18next.t('TAGS.MERGE_WITH_SELECT')}
							/>
						</Form.Item>

						<Form.Item wrapperCol={{ span: 8, offset: 3 }} style={{ textAlign: 'right' }}>
							<Button type="primary" danger onClick={this.handleTagMerge}>
								{i18next.t('TAGS.MERGE_WITH_BUTTON')}
							</Button>
							<Alert
								style={{ textAlign: 'left', marginTop: '20px' }}
								message={i18next.t('TAGS.MERGE_ABOUT')}
								description={i18next.t('TAGS.MERGE_ABOUT_MESSAGE')}
								type="warning"
							/>
						</Form.Item>
					</>
				) : null}
				<Divider />
				{this.state.repositoriesValue && this.props.tag?.repository ? (
					<>
						<Form.Item
							hasFeedback
							label={i18next.t('TAGS.REPOSITORY')}
							labelCol={{ flex: '0 1 200px' }}
							wrapperCol={{ span: 8 }}
						>
							<Select
								placeholder={i18next.t('TAGS.REPOSITORY')}
								onChange={(value: string) => this.setState({ repoToCopySong: value })}
							>
								{this.state.repositoriesValue
									.filter(value => value !== this.props.tag.repository)
									.map(repo => {
										return (
											<Select.Option key={repo} value={repo}>
												{repo}
											</Select.Option>
										);
									})}
							</Select>
						</Form.Item>

						<Form.Item wrapperCol={{ span: 8, offset: 3 }} style={{ textAlign: 'right' }}>
							<Button
								disabled={!this.state.repoToCopySong}
								type="primary"
								danger
								onClick={() => this.props.handleCopy(this.props.tag.tid, this.state.repoToCopySong)}
							>
								{i18next.t('TAGS.COPY_TAG')}
							</Button>
						</Form.Item>
					</>
				) : null}
			</Form>
		);
	}

	private transformMalId(event: any) {
		if (this.validExternalAnimeId(event.target.value)) {
			return event.target.value;
		}
		const res = event.target.value?.match(myanimelistUrlRegexp);
		if (res == null) {
			return event.target.value;
		}
		return res[1];
	}

	private transformAnilistId(event: any) {
		if (this.validExternalAnimeId(event.target.value)) {
			return event.target.value;
		}
		const res = event.target.value?.match(anilistUrlRegexp);
		if (res == null) {
			return event.target.value;
		}
		return res[1];
	}

	private transformKitsuId(event: any) {
		if (this.validExternalAnimeId(event.target.value)) {
			return event.target.value;
		}
		const res = event.target.value?.match(kitsuUrlRegexp);
		if (res == null) {
			return event.target.value;
		}
		fetch(`https://kitsu.io/api/edge/anime?fields[anime]=id&filter[slug]=${res[1]}`)
			.then(res => res.json())
			.then(json => {
				if (json?.data == null || json.data[0]?.id == null) {
					this.setFieldError('kitsuID', i18next.t('TAGS.KITSU_SLUG_ERROR'));
					return;
				}
				this.formRef.current.setFieldValue('kitsuID', json.data[0].id);
				this.formRef.current.validateFields();
			})
			.catch(e => {
				this.setFieldError('kitsuID', i18next.t('TAGS.KITSU_REQUEST_ERROR'));
			});
		return event.target.value;
	}

	private setFieldError(name: string, error: string) {
		this.formRef.current.setFields([
			{
				name: name,
				errors: [error],
			},
		]);
	}

	private externalAnimeIdValidator(_: any, value: string) {
		if (this.validExternalAnimeId(value)) {
			return Promise.resolve();
		}
		if (value.match(myanimelistUrlRegexp)) {
			return Promise.reject(JSON.stringify(i18next.t('TAGS.NOT_MAL_URL_ERROR')));
		}
		if (value.match(anilistUrlRegexp)) {
			return Promise.reject(JSON.stringify(i18next.t('TAGS.NOT_ANILIST_URL_ERROR')));
		}
		if (value.match(kitsuUrlRegexp)) {
			return Promise.reject(JSON.stringify(i18next.t('TAGS.NOT_KITSU_URL_ERROR')));
		}
		if (value.startsWith('http')) {
			return Promise.reject(JSON.stringify(i18next.t('TAGS.NOT_VALID_URL_ERROR')));
		}
		return Promise.reject(JSON.stringify(i18next.t('TAGS.ANIME_ID_ERROR')));
	}

	private validExternalAnimeId(id: string) {
		return id == null || id === '' || id.match(validExternalAnimeIdRegexp);
	}
}

export default TagForm;
