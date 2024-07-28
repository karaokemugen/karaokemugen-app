import { QuestionCircleOutlined } from '@ant-design/icons';
import {
	Alert,
	Button,
	Cascader,
	Checkbox,
	Collapse,
	Divider,
	Form,
	Input,
	InputNumber,
	message,
	Select,
	Tooltip,
} from 'antd';
import i18next from 'i18next';
import { useEffect, useState } from 'react';
import type { Tag, TagTypeNum } from '../../../../../src/lib/types/tag';
import { commandBackend } from '../../../utils/socket';
import { tagTypes } from '../../../utils/tagTypes';
import EditableGroupAlias from '../../components/EditableGroupAlias';
import KaraList from '../../components/KaraList';
import LanguagesList from '../../components/LanguagesList';
import { useForm } from 'antd/es/form/Form';

interface TagsFormProps {
	tags: Tag[];
	tag: Tag;
	save: (tag: Tag) => void;
	handleCopy: (tid, repo) => void;
	mergeAction: (tid1: string, tid2: string) => void;
	deleteAction: (tid: string) => void;
}

interface TagForForm extends Tag {
	malID: string;
	anilistID: string;
	kitsuID: string;
}

const myanimelistUrlRegexp = /myanimelist.net\/anime\/(\d+)/;
const anilistUrlRegexp = /anilist.co\/anime\/(\d+)/;
const kitsuUrlRegexp = /kitsu.io\/anime\/([a-zA-Z0-9-&(%20)]+)/;
const validExternalAnimeIdRegexp = /^(?:[1-9]|\d\d+)$/; // strictly positive

function TagForm(props: TagsFormProps) {
	const [form] = useForm();

	const [i18n, setI18n] = useState<Record<string, string>>(props.tag?.i18n ? props.tag.i18n : { eng: '' });
	const [description, setDescription] = useState<Record<string, string>>(
		props.tag?.description ? props.tag.description : { eng: '' }
	);
	const [mergeSelection, setMergeSelection] = useState('');
	const [repositoriesValue, setRepositoriesValue] = useState<string[]>(null);
	const [repoToCopySong, setRepoToCopySong] = useState<string>(null);
	const [displayDescription, setDisplayDescription] = useState(
		props.tag?.description && Object.keys(props.tag?.description).length > 0 ? true : false
	);

	useEffect(() => {
		getRepositories();
	}, []);

	useEffect(() => {
		const repository = props.tag?.repository
			? props.tag.repository
			: repositoriesValue
				? repositoriesValue[0]
				: null;
		form.setFieldsValue({
			repository,
		});
	}, [repositoriesValue]);

	const getRepositories = async () => {
		const res = await commandBackend('getRepos');
		setRepositoriesValue(res.filter(repo => repo.MaintainerMode || !repo.Online).map(repo => repo.Name));
	};

	const handleSubmit = (values: TagForForm) => {
		if (Object.keys(i18n).length > 0 && Object.values(i18n).filter(v => v).length > 0) {
			values.i18n = i18n;
			values.description = Object.values(description).filter(value => value).length > 0 ? description : undefined;
			values.tid = props.tag?.tid;
			values.external_database_ids = {
				anilist: +values.anilistID || null,
				kitsu: +values.kitsuID || null,
				myanimelist: +values.malID || null,
			};
			delete values.malID;
			delete values.anilistID;
			delete values.kitsuID;
			props.save(values);
		} else {
			message.error(i18next.t('TAGS.LANG_ERROR'));
		}
	};

	const handleTagMergeSelection = value => {
		if (value) setMergeSelection(value[1]);
	};

	const handleTagMerge = () => {
		props.mergeAction(props.tag.tid, mergeSelection);
	};

	const handleTagDelete = () => {
		props.deleteAction(props.tag.tid);
	};

	const mergeCascaderOption = () => {
		const options = Object.keys(tagTypes).map(type => {
			const typeID: TagTypeNum = tagTypes[type].type;

			const option = {
				value: typeID,
				label: i18next.t(`TAG_TYPES.${type}_other`),
				children: [],
			};
			for (const tag of props.tags) {
				if (tag.tid !== props.tag.tid) {
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

	const mergeCascaderFilter = function (inputValue, path) {
		return path.some(option => option.label.toLowerCase().indexOf(inputValue.toLowerCase()) > -1);
	};

	/** We're returning at (any tag) here instead of just t (all tags) for the filter */
	const buildTagFilter = () => {
		const tagArray = [];
		for (const type of props.tag.types) {
			tagArray.push(`${props.tag.tid}~${type}`);
		}
		return `at:${tagArray.join(',')}`;
	};

	const transformMalId = (event: any) => {
		if (validExternalAnimeId(event.target.value)) {
			return event.target.value;
		}
		const res = event.target.value?.match(myanimelistUrlRegexp);
		if (res == null) {
			return event.target.value;
		}
		return res[1];
	};

	const transformAnilistId = (event: any) => {
		if (validExternalAnimeId(event.target.value)) {
			return event.target.value;
		}
		const res = event.target.value?.match(anilistUrlRegexp);
		if (res == null) {
			return event.target.value;
		}
		return res[1];
	};

	const transformKitsuId = (event: any) => {
		if (validExternalAnimeId(event.target.value)) {
			return event.target.value;
		}
		const res = event.target.value?.match(kitsuUrlRegexp);
		if (res == null) {
			return event.target.value;
		}
		fetch(
			`https://kitsu.io/api/edge/anime?fields[anime]=id&filter[slug]=${encodeURIComponent(
				decodeURIComponent(res[1])
			)}`
		)
			.then(res => res.json())
			.then(json => {
				if (json?.data == null || json.data[0]?.id == null) {
					setFieldError('kitsuID', i18next.t('TAGS.KITSU_SLUG_ERROR'));
					return;
				}
				form.setFieldValue('kitsuID', json.data[0].id);
				form.validateFields();
			})
			.catch(() => {
				setFieldError('kitsuID', i18next.t('TAGS.KITSU_REQUEST_ERROR'));
			});
		return event.target.value;
	};

	const setFieldError = (name: string, error: string) => {
		form.setFields([
			{
				name: name,
				errors: [error],
			},
		]);
	};

	const externalAnimeIdValidator = (_, value: string) => {
		if (validExternalAnimeId(value)) {
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
	};

	const validExternalAnimeId = (id: string) => {
		return id == null || id === '' || id.match(validExternalAnimeIdRegexp);
	};

	return (
		<Form
			form={form}
			onFinish={handleSubmit}
			className="tag-form"
			initialValues={{
				name: props.tag?.name,
				short: props.tag?.short,
				types: props.tag?.types ? props.tag.types : [],
				repository: props.tag?.repository
					? props.tag.repository
					: repositoriesValue
						? repositoriesValue[0]
						: null,
				aliases: props.tag?.aliases,
				noLiveDownload: props.tag?.noLiveDownload,
				priority: props.tag?.priority ? props.tag?.priority : 10,
				karafile_tag: props.tag?.karafile_tag,
				malID: props.tag?.external_database_ids?.myanimelist?.toString(),
				anilistID: props.tag?.external_database_ids?.anilist?.toString(),
				kitsuID: props.tag?.external_database_ids?.kitsu?.toString(),
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
				{displayDescription ? null : (
					<Button onClick={() => setDisplayDescription(true)}>{i18next.t('TAGS.ADD_DESCRIPTION')}</Button>
				)}
			</Form.Item>
			{displayDescription ? (
				<div style={{ marginLeft: '3em', marginRight: '6em' }}>
					<LanguagesList value={description} onChange={setDescription} />
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
				rules={[
					{
						validator: (_, value: string[]) => (value?.length > 0 ? Promise.resolve() : Promise.reject()),
						required: true,
					},
				]}
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
			{repositoriesValue ? (
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
						disabled={props.tag?.repository !== undefined}
						style={{ maxWidth: '20%', minWidth: '150px' }}
						placeholder={i18next.t('TAGS.REPOSITORY')}
					>
						{repositoriesValue.map(repo => {
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
				<EditableGroupAlias onChange={tags => form?.setFieldsValue({ aliases: tags })} />
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
				required={true}
			></Form.Item>
			<div style={{ marginLeft: '3em', marginRight: '8em' }}>
				<LanguagesList value={i18n} onChange={setI18n} />
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
				getValueFromEvent={transformMalId}
				rules={[
					{
						validator: externalAnimeIdValidator,
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
				getValueFromEvent={transformAnilistId}
				rules={[
					{
						validator: externalAnimeIdValidator,
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
				getValueFromEvent={transformKitsuId}
				rules={[
					{
						validator: externalAnimeIdValidator,
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
			{props.tag?.tid && (
				<Collapse>
					<Collapse.Panel header={i18next.t('TAGS.KARAOKES_WITH_TAGS')} key="1">
						<KaraList tagFilter={buildTagFilter()} tagFilterType={'OR'} />
					</Collapse.Panel>
				</Collapse>
			)}
			{props.tag ? (
				<>
					<Divider orientation="left">{i18next.t('TAGS.DELETE_TAG')}</Divider>
					<Form.Item wrapperCol={{ span: 8, offset: 3 }} style={{ textAlign: 'center' }}>
						<Alert
							style={{ textAlign: 'left', marginBottom: '20px' }}
							message={i18next.t('WARNING')}
							description={i18next.t('TAGS.DELETE_TAG_MESSAGE')}
							type="warning"
						/>

						<Button type="primary" danger onClick={handleTagDelete}>
							{i18next.t('TAGS.DELETE_TAG')}
						</Button>
					</Form.Item>

					<Divider orientation="left">{i18next.t('TAGS.MERGE_TAGS')}</Divider>
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
							options={mergeCascaderOption()}
							showSearch={{ filter: mergeCascaderFilter }}
							onChange={handleTagMergeSelection}
							placeholder={i18next.t('TAGS.MERGE_WITH_SELECT')}
						/>
					</Form.Item>

					<Form.Item wrapperCol={{ span: 8, offset: 3 }} style={{ textAlign: 'right' }}>
						<Button type="primary" danger onClick={handleTagMerge}>
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
			<Divider orientation="left">{i18next.t('TAGS.COPY_TAG')}</Divider>
			{repositoriesValue && props.tag?.repository ? (
				<>
					<Form.Item
						hasFeedback
						label={i18next.t('TAGS.REPOSITORY')}
						labelCol={{ flex: '0 1 200px' }}
						wrapperCol={{ span: 8 }}
					>
						<Select placeholder={i18next.t('TAGS.REPOSITORY')} onChange={setRepoToCopySong}>
							{repositoriesValue
								.filter(value => value !== props.tag.repository)
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
							disabled={!repoToCopySong}
							type="primary"
							danger
							onClick={() => props.handleCopy(props.tag.tid, repoToCopySong)}
						>
							{i18next.t('TAGS.COPY_TAG')}
						</Button>
					</Form.Item>
				</>
			) : null}
		</Form>
	);
}

export default TagForm;
