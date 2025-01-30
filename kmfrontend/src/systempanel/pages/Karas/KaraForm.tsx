import './KaraForm.scss';

import {
	CloseOutlined,
	DeleteOutlined,
	DoubleRightOutlined,
	MinusOutlined,
	PlusOutlined,
	QuestionCircleOutlined,
	SyncOutlined,
	UploadOutlined,
} from '@ant-design/icons';
import {
	Alert,
	Button,
	Card,
	Checkbox,
	Col,
	Collapse,
	Divider,
	Form,
	Image,
	Input,
	InputNumber,
	message,
	Modal,
	Radio,
	Row,
	Select,
	Space,
	Tag,
	Tooltip,
	Typography,
	Upload,
	UploadFile,
} from 'antd';
import { useForm } from 'antd/es/form/Form';
import { Flex, Spin } from 'antd/lib';
import { DefaultOptionType, SelectValue } from 'antd/lib/select';
import { filesize } from 'filesize';
import i18next from 'i18next';
import { useContext, useEffect, useRef, useState } from 'react';
import { v4 as UUIDv4 } from 'uuid';

import { PositionX, PositionY } from '../../../../../src/lib/types';
import { DBKara } from '../../../../../src/lib/types/database/kara';
import { KaraFileV4, MediaInfo, MediaInfoValidationResult } from '../../../../../src/lib/types/kara';
import type { RepositoryManifestV2 } from '../../../../../src/lib/types/repo';
import { blobToBase64 } from '../../../../../src/lib/utils/filesCommon';
import GlobalContext from '../../../store/context';
import { buildKaraTitle, getPreviewLink, getPreviewPath, getTagInLocale } from '../../../utils/kara';
import { commandBackend } from '../../../utils/socket';
import { getTagTypeName, tagTypes, tagTypesKaraFileV4Order } from '../../../utils/tagTypes';
import { secondsTimeSpanToHMS } from '../../../utils/tools';
import EditableGroupAlias from '../../components/EditableGroupAlias';
import EditableTagGroup from '../../components/EditableTagGroup';
import LanguagesList from '../../components/LanguagesList';
import OpenLyricsFileButton from '../../components/OpenLyricsFileButton';
import TaskProgress from '../../components/TaskProgressBar';
import dayjs from 'dayjs';
import { TagType } from '../../../../../src/lib/types/tag';

const { Paragraph } = Typography;
const { Panel } = Collapse;

interface KaraFormProps {
	kara?: DBKara;
	save: any;
	handleCopy?: (kid: string, repo: string) => void;
	handleDelete?: (kid: string) => void;
}

function KaraForm(props: KaraFormProps) {
	const [form] = useForm();
	const context = useContext(GlobalContext);

	// State
	const [titles, setTitles] = useState(props.kara?.titles ? props.kara.titles : {});
	const [defaultLanguage, setDefaultLanguage] = useState(props.kara?.titles_default_language || null);
	const [titlesIsTouched, setTitlesIsTouched] = useState(false);
	const [subfile, setSubfile] = useState(
		props.kara?.lyrics_infos?.[0]
			? [
					{
						uid: -1,
						name: props.kara.lyrics_infos[0].filename,
						status: 'done',
					},
				]
			: []
	);
	const [mediafile, setMediafile] = useState(
		props.kara?.mediafile
			? [
					{
						uid: -1,
						name: props.kara.mediafile,
						status: 'done',
					},
				]
			: []
	);
	const [mediafileIsTouched, setMediafileIsTouched] = useState(false);
	const [subfileIsTouched, setSubfileIsTouched] = useState(false);
	const [mediaInfo, setMediaInfo] = useState<MediaInfo>(null);
	const [mediaInfoValidationResults, setMediaInfoValidationResults] = useState<MediaInfoValidationResult[]>([]);
	const [isEncodingMedia, setIsEncodingMedia] = useState(false);
	const [encodeMediaOptions, setEncodeMediaOptions] = useState<{ trim: boolean }>({ trim: false });
	const [repositoriesValue, setRepositoriesValue] = useState<string[]>(null);
	const [repositoryManifest, setRepositoryManifest] = useState<RepositoryManifestV2>();
	const [repoToCopySong, setRepoToCopySong] = useState<string>(null);
	const [karaSearch, setKaraSearch] = useState<{ label: string; value: string }[]>([]);
	const [parentKara, setParentKara] = useState<DBKara>(null);
	const [errors, setErrors] = useState<string[]>([]);
	const [displayTypeOptions, setDisplayTypeOptions] = useState<DefaultOptionType[]>();

	const [coverImageEmbedRunning, setCoverImageEmbedRunning] = useState<boolean>(false);
	const [coverImagePreviewOpen, setCoverImagePreviewOpen] = useState(false);
	const [coverImagePreviewUri, setCoverImagePreviewUri] = useState('');

	const [mediaEditLocked, setMediaEditLocked] = useState<boolean>(false);

	const [announcePosition, setAnnouncePosition] = useState(
		(props.kara?.lyrics_infos?.[0]?.announce_position_x &&
			props.kara?.lyrics_infos?.[0]?.announce_position_y &&
			`${props.kara.lyrics_infos[0].announce_position_x},${props.kara.lyrics_infos[0].announce_position_y}`) ||
			undefined
	);

	// Need a ref because state will become stale on unmount
	const isEncodingMediaRef = useRef(false);

	useEffect(() => {
		isEncodingMediaRef.current = isEncodingMedia;
	}, [isEncodingMedia]);

	useEffect(() => {
		setMediaEditLocked(isEncodingMedia || coverImageEmbedRunning);
	}, [isEncodingMedia, coverImageEmbedRunning]);

	useEffect(() => {
		getRepositories();
		form.validateFields();
		updateDisplayTypeOptions();
		getParents();
		loadMediaInfo();
		return () => {
			if (isEncodingMediaRef.current) abortEncoding();
		};
	}, []);

	useEffect(() => {
		const repository = props.kara?.repository || (repositoriesValue ? repositoriesValue[0] : null);
		form.setFieldsValue({
			repository,
		});
		getRepoManifest(repository);
	}, [repositoriesValue]);

	useEffect(() => {
		form.validateFields([]);
	}, [repositoryManifest]);

	useEffect(() => {
		validateMediaRules();
	}, [mediaInfo]);

	useEffect(() => {
		const oldFormFields = form.getFieldsValue(['mediafile', 'lyrics_infos']); // Fields to take over to the applied kara
		form.resetFields();
		form.setFieldsValue(oldFormFields); // Re-sets media and lyrics file, if already uploaded
	}, [parentKara]);

	const getRepoManifest = async (repository: string) => {
		if (repository) {
			const res = await commandBackend('getRepoManifest', { name: repository });
			setRepositoryManifest(res);
		}
	};

	const getParents = async () => {
		if (form.getFieldValue('parents') !== null) {
			const parents: string[] = form.getFieldValue('parents');
			if (parents.length > 0) {
				const res = await commandBackend('getKaras', { q: `k:${parents.join()}`, ignoreCollections: true });
				const karaSearch = res.content.map(kara => {
					return {
						label: buildKaraTitle(context.globalState.settings.data, kara, true, res.i18n),
						value: kara.kid,
					};
				});
				setKaraSearch(karaSearch);
			}
		}
	};

	const loadMediaInfo = async () => {
		if (props.kara?.kid && props.kara?.download_status === 'DOWNLOADED') {
			const mediaInfo: MediaInfo = await commandBackend(
				'getKaraMediaInfo',
				{ kid: props.kara.kid },
				false,
				60000
			);
			if (!props.kara.mediafile || mediaInfo.filename === form.getFieldValue('mediafile'))
				// Avoid showing wrong mediaInfo when mediafile is changed too quickly
				setMediaInfo(mediaInfo);
		}
	};

	const validateMediaRules = async () => {
		const repo: string = form?.getFieldValue('repository');
		if (mediaInfo && repo) {
			const mediaInfoValidationResults: MediaInfoValidationResult[] = await commandBackend(
				'validateMediaInfo',
				{ mediaInfo: mediaInfo, repository: repo },
				false,
				60000
			);
			setMediaInfoValidationResults(mediaInfoValidationResults);
		}
	};

	const encodeMediaEnabled = () =>
		mediaInfoValidationResults?.filter(r => r.resolvableByTranscoding).length > 0 &&
		(!props.kara?.kid || props.kara?.download_status === 'DOWNLOADED' || mediafileIsTouched);

	const encodeMedia = async () => {
		if (encodeMediaEnabled()) {
			try {
				setIsEncodingMedia(true);
				const newMediaInfo: MediaInfo = await commandBackend(
					'encodeMediaFileToRepoDefaults',
					{
						kid: props.kara?.kid,
						filename: mediafileIsTouched && mediaInfo?.filename,
						repo: form.getFieldValue('repository'),
						encodeOptions: encodeMediaOptions,
					},
					false,
					7_200_000 // 120 min
				);
				setMediaInfo(newMediaInfo);
				setIsEncodingMedia(false);
				setMediafileIsTouched(true);
				form.setFieldsValue({ mediafile: newMediaInfo.filename });
				form.validateFields();
			} catch (e) {
				setIsEncodingMedia(false);
				throw e;
			}
		}
	};

	const abortEncoding = async () => {
		await commandBackend('abortMediaEncoding');
	};

	const renderMediaInfo = (mediaInfo: MediaInfo, mediaInfoValidationResults: MediaInfoValidationResult[]) => {
		const propertiesToDisplay: Array<{
			name: keyof MediaInfo;
			title: string;
			format?: (value: any) => string;
			formatSuggestedValue?: (value: any) => string;
		}> = [
			{ name: 'fileExtension', title: 'KARA.MEDIA_FILE_INFO.FILE_FORMAT' },
			{
				name: 'duration',
				title: 'KARA.MEDIA_FILE_INFO.DURATION',
				format: (value: number) => value && `${secondsTimeSpanToHMS(value, 'mm:ss')}`,
			},
			{
				name: 'size',
				title: 'KARA.MEDIA_FILE_INFO.FILE_SIZE',
				format: value => value && filesize(value).toString(),
				formatSuggestedValue: value => value && 'max. ' + filesize(value).toString(),
			},
			{
				name: 'overallBitrate',
				title: 'KARA.MEDIA_FILE_INFO.OVERALL_BITRATE',
				// Convert from MB/s to kb/s
				format: (value: number) => value && `${Math.round((8 * value) / 1000)} kb/s`,
				formatSuggestedValue: value => value && `max. ${Math.round((8 * value) / 1000)} kb/s`,
			},
			{ name: 'videoCodec', title: 'KARA.MEDIA_FILE_INFO.VIDEO_CODEC' },
			{ name: 'videoColorspace', title: 'KARA.MEDIA_FILE_INFO.VIDEO_COLORSPACE' },
			{
				name: 'videoAspectRatio',
				title: 'KARA.MEDIA_FILE_INFO.VIDEO_ASPECT_RATIO',
				format: (value: any) =>
					value?.pixelAspectRatio || value?.displayAspectRatio
						? `SAR ${value?.pixelAspectRatio} DAR ${value?.displayAspectRatio}`
						: '-',
			},
			{
				name: 'videoResolution',
				title: 'KARA.MEDIA_FILE_INFO.VIDEO_RESOLUTION',
				format: (value: any) => value.formatted,
			},
			{
				name: 'videoFramerate',
				title: 'KARA.MEDIA_FILE_INFO.VIDEO_FRAMERATE',
				format: (value: number) => `${value} fps`,
			},
			{ name: 'audioCodec', title: 'KARA.MEDIA_FILE_INFO.AUDIO_CODEC' },
			{ name: 'audioChannelLayout', title: 'KARA.MEDIA_FILE_INFO.AUDIO_CHANNEL_LAYOUT' },
			{
				name: 'audioSampleRate',
				title: 'KARA.MEDIA_FILE_INFO.AUDIO_SAMPLE_RATE',
				format: (value: number) => `${value} Hz`,
			},
			mediaInfo?.mediaType === 'audio' &&
				({
					name: 'hasCoverArt',
					title: 'KARA.MEDIA_FILE_INFO.AUDIO_COVER_ART',
				} as any),
		].filter(i => !!i);

		const rows = propertiesToDisplay
			.map(property => ({
				...property,
				valueFormatted:
					mediaInfo &&
					typeof mediaInfo[property.name] !== 'undefined' &&
					((property.format && property.format(mediaInfo[property.name])) ||
						String(mediaInfo[property.name])),
				validationResult: mediaInfoValidationResults?.find(r => r.name === property.name),
			}))
			.map(property => ({
				...property,
				suggestedValueFormatted:
					property.validationResult?.suggestedValue &&
					((property.formatSuggestedValue &&
						property.formatSuggestedValue(property.validationResult?.suggestedValue)) ||
						(property.format && property.format(property.validationResult?.suggestedValue)) ||
						String(property.validationResult?.suggestedValue)),
				className:
					property.validationResult?.mandatory === true
						? 'unmet-required'
						: property.validationResult
							? 'unmet-warning'
							: '',
			}));

		return (
			<>
				<table style={{ borderSpacing: '0 10px' }}>
					<tbody className="media-info">
						{rows.map(r => (
							<tr className={r.className} key={r.name}>
								<td>{i18next.t(r.title)}</td>
								<td>{r.valueFormatted || '-'}</td>
								{r.suggestedValueFormatted && (
									<td>
										<DoubleRightOutlined /> {r.suggestedValueFormatted}
									</td>
								)}
							</tr>
						))}
					</tbody>
				</table>
				{mediaInfo?.warnings?.length > 0 && (
					<div className="media-info warnings">
						{mediaInfo.warnings.map((w, i) => (
							<div key={i} className="unmet-warning ">
								{i18next.t('KARA.MEDIA_FILE_INFO.WARNINGS.' + w)}{' '}
							</div>
						))}
					</div>
				)}
			</>
		);
	};

	const renderCoverArtUpload = () => (
		<>
			<Upload
				headers={{
					authorization: localStorage.getItem('kmToken'),
					onlineAuthorization: localStorage.getItem('kmOnlineToken'),
				}}
				action="/api/importFile"
				accept=".jpg,.jpeg"
				multiple={false}
				maxCount={1}
				onChange={onAudioCoverUploadChange}
				onPreview={onCoverImagePreview}
				listType="picture"
				showUploadList={{
					showRemoveIcon: false,
					showPreviewIcon: false,
					showDownloadIcon: false,
				}}
				defaultFileList={
					mediaInfo.hasCoverArt
						? [
								{
									uid: '1',
									name: 'Embedded cover',
									status: 'done',
									thumbUrl:
										!mediafileIsTouched && props.kara
											? getPreviewLink(props.kara, context)
											: mediaInfo
												? getPreviewPath({
														contentid: mediaInfo.filename,
														mediasize: mediaInfo.size,
													})
												: null,
								},
							]
						: []
				}
			>
				<Button disabled={mediaEditLocked}>
					{i18next.t(mediaInfo.hasCoverArt ? 'KARA.AUDIO_COVER.REPLACE' : 'KARA.AUDIO_COVER.UPLOAD')}
					<Tooltip title={i18next.t('KARA.AUDIO_COVER.UPLOAD_TOOLTIP')}>
						<QuestionCircleOutlined />
					</Tooltip>
				</Button>
				{coverImageEmbedRunning ? <Spin style={{ margin: '0 10px' }} /> : null}
			</Upload>
			<Image
				wrapperStyle={{ display: 'none' }}
				preview={{
					visible: coverImagePreviewOpen,
					onVisibleChange: visible => setCoverImagePreviewOpen(visible),
					afterOpenChange: visible => !visible && setCoverImagePreviewUri(''),
				}}
				src={coverImagePreviewUri}
			/>
		</>
	);

	const openChildrenModal = async (event, kid: string) => {
		event.stopPropagation();
		event.preventDefault();
		const parent: DBKara = await commandBackend('getKara', { kid });
		if (parent.children.length > 0) {
			const childrens = await commandBackend('getKaras', {
				q: `k:${parent.children.join()}`,
				ignoreCollections: true,
			});
			Modal.info({
				title: i18next.t('KARA.CHILDRENS', {
					parent: buildKaraTitle(context.globalState.settings.data, parent, true),
				}),
				content: (
					<ul>
						{childrens.content?.map(kara => (
							<a href={`/system/karas/${kara.kid}`} key={kara.kid}>
								<li key={kara.kid}>
									{buildKaraTitle(context.globalState.settings.data, kara, true, childrens.i18n)}
								</li>
							</a>
						))}
					</ul>
				),
			});
		}
	};

	const getRepositories = async () => {
		const res = await commandBackend('getRepos');
		setRepositoriesValue(res.filter(repo => repo.MaintainerMode || !repo.Online).map(repo => repo.Name));
	};

	const previewHooks = async () => {
		if (!defaultLanguage || !titles || Object.keys(titles).length === 0 || !titles[defaultLanguage]) {
			message.error(i18next.t('KARA.TITLE_REQUIRED'));
		} else {
			const data = await commandBackend('previewHooks', getKaraToSend(form.getFieldsValue()), false, 300000);
			Modal.info({
				title: i18next.t('KARA.PREVIEW_HOOKS_MODAL'),
				content: (
					<ul>
						{data.addedTags?.map(tag => (
							<div key={tag.tid} title={tag.tagfile}>
								<PlusOutlined style={{ marginRight: '2px' }} />
								{getTagInLocale(context?.globalState.settings.data, tag).i18n} (
								{i18next.t(`TAG_TYPES.${getTagTypeName(tag.types[0])}_other`)})
							</div>
						))}
						{data.removedTags?.map(tag => (
							<div key={tag.tid} title={tag.tagfile}>
								<MinusOutlined style={{ marginRight: '2px' }} />
								{getTagInLocale(context?.globalState.settings.data, tag).i18n} (
								{i18next.t(`TAG_TYPES.${getTagTypeName(tag.types[0])}_other`)})
							</div>
						))}
						{data.fromDisplayTypeChange ? (
							<div title={data.fromDisplayTypeChange}>
								{`${i18next.t('KARA.FROM_DISPLAY_TYPE')} : ${i18next.t(
									`TAG_TYPES.${getTagTypeName(data.fromDisplayTypeChange)}_one`
								)}`}
							</div>
						) : null}
					</ul>
				),
			});
		}
	};

	const handleSubmit = values => {
		setErrors([]);
		if ((mediafileIsTouched && !mediaInfo?.loudnorm) || coverImageEmbedRunning) {
			message.error(i18next.t('KARA.MEDIA_IN_PROCESS'));
		} else if (
			mediafileIsTouched &&
			(!mediaInfoValidationResults || mediaInfoValidationResults?.some(r => r.mandatory))
		) {
			message.error(i18next.t('KARA.MEDIA_REPOSITORY_RULES_UNMET'));
		} else if (!defaultLanguage || !titles || Object.keys(titles).length === 0 || !titles[defaultLanguage]) {
			message.error(i18next.t('KARA.TITLE_REQUIRED'));
		} else {
			props.save(getKaraToSend(values));
		}
	};

	const handleDelete = () => props.handleDelete(props.kara.kid);

	const getKaraToSend = values => {
		const kara: DBKara = values;
		const mediaVersionArr = titles[defaultLanguage].split(' ~ ');
		const mediaVersion =
			mediaVersionArr.length > 1 ? mediaVersionArr[mediaVersionArr.length - 1].replace(' Vers', '') : 'Default';
		const [announcePositionX, announcePositionY] = announcePosition?.split(',') || [undefined, undefined];
		// Convert Kara to KaraFileV4
		const karaFile: KaraFileV4 = {
			header: {
				version: 4,
				description: 'Karaoke Mugen Karaoke Data File',
			},
			medias: [
				{
					default: true,
					duration: mediaInfo?.duration ?? props.kara?.duration,
					filename: mediaInfo?.filename ?? props.kara?.mediafile,
					filesize: mediaInfo?.size ?? props.kara?.mediasize,
					loudnorm: mediaInfo?.loudnorm ?? props.kara?.loudnorm,
					lyrics:
						kara.lyrics_infos?.[0]?.filename || announcePositionX
							? [
									{
										announce_position_x: announcePositionX as PositionX,
										announce_position_y: announcePositionY as PositionY,
										default: true,
										filename: kara.lyrics_infos?.[0]?.filename,
										version: 'Default',
									},
								]
							: [],
					version: mediaVersion,
				},
			],
			data: {
				comment: kara.comment || undefined,
				created_at: props.kara?.created_at
					? new Date(props.kara?.created_at).toISOString()
					: new Date().toISOString(),
				ignoreHooks: kara.ignore_hooks,
				kid: props.kara?.kid || UUIDv4(),
				modified_at: new Date().toISOString(),
				parents:
					kara.parents?.length > 0
						? kara.parents.filter((e, pos) => kara.parents.indexOf(e) === pos)
						: undefined,
				repository: kara.repository,
				songorder: kara.songorder ? kara.songorder : undefined,
				tags: Object.fromEntries(
					tagTypesKaraFileV4Order // Get tagtypes
						.map(t => tagTypes[t].karajson) // Iterate through them to get the good value
						.map(t => {
							// Find the good things
							if (kara[t] instanceof Array && kara[t].length > 0) {
								return [t, kara[t].map(t2 => t2.tid)];
							} else {
								return [t, undefined];
							}
						})
				) as unknown as any,
				from_display_type: kara.from_display_type,
				titles: titles,
				titles_default_language: defaultLanguage,
				titles_aliases: kara.titles_aliases?.length > 0 ? kara.titles_aliases : undefined,
				year: kara.year,
			},
			meta: {},
		};
		return {
			kara: karaFile,
			modifiedLyrics: subfileIsTouched,
			modifiedMedia: mediafileIsTouched,
		};
	};

	const handleSubmitFailed = ({ values, errorFields }) => {
		setErrors(errorFields.map(value => value.errors).reduce((acc, val) => acc.concat(val), []));
	};

	const isMediaFile = (filename: string): boolean => {
		return new RegExp(`^.+\\.(${context.globalState.settings.data.state?.supportedMedias.join('|')})$`).test(
			filename
		);
	};

	const isSubFile = (filename: string): boolean => {
		return new RegExp(`^.+\\.(${context.globalState.settings.data.state?.supportedLyrics.join('|')})$`).test(
			filename
		);
	};

	const onMediaUploadChange = async info => {
		const fileList = info.fileList.slice(-1);
		setMediafile(fileList);
		if (info.file.status === 'uploading') {
			form.setFieldsValue({ mediafile: null });
			setMediaInfo(null);
			setMediaInfoValidationResults([]);
		} else if (info.file.status === 'done') {
			if (isMediaFile(info.file.name)) {
				setMediafileIsTouched(true);
				const mediaInfo: MediaInfo = await commandBackend(
					'processUploadedMedia',
					{
						origFilename: info.file.response.originalname,
						filename: info.file.response.filename,
					},
					false,
					60000
				);
				setMediaInfo(mediaInfo);
				form.setFieldsValue({ mediafile: mediaInfo.filename });
				message.success(i18next.t('KARA.ADD_FILE_SUCCESS', { name: info.file.name }));
			} else {
				form.setFieldsValue({ mediafile: null });
				message.error(i18next.t('KARA.ADD_FILE_MEDIA_ERROR', { name: info.file.name }));
				info.file.status = 'error';
				setMediafile([]);
			}
		} else if (info.file.status === 'error' || info.file.status === 'removed') {
			form.setFieldsValue({ mediafile: null });
			setMediafile([]);
		}
		form.validateFields();
	};

	const onSubUploadChange = info => {
		const fileList = info.fileList.slice(-1);
		setSubfile(fileList);
		if (info.file.status === 'uploading') {
			form.setFieldsValue({ lyrics_infos: [] });
		} else if (info.file.status === 'done') {
			if (isSubFile(info.file.name)) {
				setSubfileIsTouched(true);
				form.setFieldsValue({ lyrics_infos: [{ filename: info.file.response.filename }] });
				message.success(i18next.t('KARA.ADD_FILE_SUCCESS', { name: info.file.name }));
			} else {
				form.setFieldsValue({ lyrics_infos: [] });
				message.error(i18next.t('KARA.ADD_FILE_LYRICS_ERROR', { name: info.file.name }));
				info.file.status = 'error';
				setSubfile([]);
			}
		} else if (info.file.status === 'error' || info.file.status === 'removed') {
			form.setFieldsValue({ lyrics_infos: [] });
			setSubfile([]);
		}
	};

	const onAudioCoverUploadChange = async info => {
		try {
			if (info.file.status === 'uploading') {
				setCoverImageEmbedRunning(true);
			} else if (info.file.status === 'done') {
				setMediafileIsTouched(true);
				const mediaInfoAfterEmbed: MediaInfo = await commandBackend(
					'embedAudioFileCoverArt',
					{
						kid: props.kara?.kid,
						tempFilename: mediafileIsTouched && mediaInfo?.filename,
						coverPictureFilename: info.file.response.filename,
					},
					false,
					60000
				);
				if (mediaInfoAfterEmbed.error) throw new Error('Error in mediaInfo');
				// Handle cover embeds like a new media file upload
				setMediaInfo(mediaInfoAfterEmbed);
				setMediafileIsTouched(true);
				form.setFieldsValue({ mediafile: mediaInfoAfterEmbed.filename });
				form.validateFields();

				message.success(i18next.t('KARA.AUDIO_COVER.EMBED_COVER_SUCCESS'));
				setCoverImageEmbedRunning(false);
			} else if (info.file.status === 'error' || info.file.status === 'removed') {
				setCoverImageEmbedRunning(false);
				throw new Error('Upload error');
			}
		} catch (_) {
			message.error(i18next.t('KARA.AUDIO_COVER.EMBED_COVER_ERROR'));
			setCoverImageEmbedRunning(false);
		}
	};

	const onCoverImagePreview = async (file: UploadFile) => {
		const existingUrl = file.url || file.thumbUrl;
		if (!existingUrl && !file.preview) {
			file.preview = await blobToBase64(file.originFileObj);
		}

		setCoverImagePreviewUri(existingUrl || (file.preview as string));
		setCoverImagePreviewOpen(true);
	};

	const getRules = (field: string) => {
		const rules = [
			{
				required: repositoryManifest?.rules?.karaFile?.requiredTagTypes?.includes(field as TagType) || false,
				message: i18next.t(`KARA.KARA_FIELD_REQUIRED`, {
					field: i18next.t(`TAG_TYPES.${field.toUpperCase()}_other`),
				}),
			},
		];

		repositoryManifest?.rules?.karaFile?.requiredTagTypesGroup?.forEach(group => {
			if (group.includes(field as TagType)) {
				rules.push({
					required: group.every(elem => !form.getFieldValue(elem) || form.getFieldValue(elem).length === 0),
					message: i18next.t('KARA.KARA_GROUP_FIELD_REQUIRED', {
						fields: group.map(elem => i18next.t(`TAG_TYPES.${elem.toUpperCase()}_other`)).join(', '),
					}),
				});
			}
		});
		return rules;
	};

	const search = value => {
		setTimeout(async () => {
			const karas = await commandBackend('getKaras', {
				filter: value,
				size: 50,
				ignoreCollections: true,
			}).catch(() => {
				return { content: [] };
			});
			if (karas.content) {
				setKaraSearch(
					karas.content
						.filter((k: DBKara) => k.kid !== props.kara?.kid)
						.filter((k: DBKara) => !k.parents.includes(props.kara?.kid))
						.filter(
							(k: DBKara) =>
								k.parents.length === 0 ||
								!repositoryManifest?.rules?.karaFile?.maxParentDepth ||
								repositoryManifest.rules.karaFile.maxParentDepth !== 1
						)
						.map((k: DBKara) => {
							return {
								label: buildKaraTitle(context.globalState.settings.data, k, true, karas.i18n),
								value: k.kid,
							};
						})
				);
			}
		}, 1000);
	};

	const onParentKaraChange = async (event: SelectValue) => {
		if (event && event[0] && !event[1]) {
			await applyFieldsFromKara(event[0] as string);
		}
	};

	const applyFieldsFromKara = async (kid: string) => {
		const parentKara = await commandBackend('getKara', { kid });
		// Check if user has already started doing input, or if it's an edit of existing kara
		if (
			!props.kara?.kid &&
			titlesIsTouched !== true &&
			form.isFieldsTouched([
				'versions',
				'series',
				'language',
				'songtypes',
				'singers',
				'singergroups',
				'authors',
			]) !== true
		) {
			setTitles(parentKara.titles);
			setDefaultLanguage(parentKara.titles_default_language);
			setParentKara(parentKara);
			onChangeSingersSeries();
		}
	};

	const submitHandler = e => {
		e.key === 'Enter' && e.preventDefault();
	};

	const updateDisplayTypeOptions = () => {
		setDisplayTypeOptions(
			Object.keys(tagTypes)
				.filter(tagType => form.getFieldValue(tagType.toLowerCase())?.length > 0)
				.concat('')
				.map(tagType => {
					return {
						label: i18next.t(tagType ? `TAG_TYPES.${tagType}_one` : 'TAG_TYPES.DEFAULT'),
						value: tagType.toLowerCase(),
					};
				})
		);
	};

	const mapRepoToSelectOption = (repo: string) => (
		<Select.Option key={repo} value={repo}>
			{repo}
		</Select.Option>
	);

	const tagRender = ({ label, value, closable, onClose }) => {
		return (
			<Tag closable={closable} onClose={onClose} style={{ whiteSpace: 'normal' }}>
				<label style={{ cursor: 'pointer' }} onMouseDown={event => openChildrenModal(event, value)}>
					{label}
				</label>
			</Tag>
		);
	};

	return (
		<Form
			form={form}
			onFinish={handleSubmit}
			onFinishFailed={handleSubmitFailed}
			onValuesChange={updateDisplayTypeOptions}
			className="kara-form"
			initialValues={{
				series: props.kara?.series || parentKara?.series,
				songtypes: props.kara?.songtypes || parentKara?.songtypes,
				songorder: props.kara?.songorder || parentKara?.songorder,
				langs: props.kara?.langs || parentKara?.langs,
				from_display_type: props.kara?.from_display_type || parentKara?.from_display_type || '',
				year: props.kara?.year || parentKara?.year || new Date().getFullYear(),
				singers: props.kara?.singers || parentKara?.singers,
				singergroups: props.kara?.singergroups || parentKara?.singergroups,
				songwriters: props.kara?.songwriters || parentKara?.songwriters,
				creators: props.kara?.creators || parentKara?.creators,
				authors: props.kara?.authors || parentKara?.authors,
				families: props.kara?.families || parentKara?.families,
				platforms: props.kara?.platforms || parentKara?.platforms,
				franchises: props.kara?.franchises || parentKara?.franchises,
				genres: props.kara?.genres || parentKara?.genres,
				origins: props.kara?.origins || parentKara?.origins,
				misc: props.kara?.misc || parentKara?.misc,
				warnings: props.kara?.warnings || parentKara?.warnings,
				groups: props.kara?.groups || parentKara?.groups,
				versions: props.kara?.versions || parentKara?.versions,
				comment: props.kara?.comment || '',
				ignore_hooks: props.kara?.ignore_hooks || false,
				repository:
					props.kara?.repository ||
					// Check if repo from parent is in the allowed list or take the default one
					(repositoriesValue &&
						((repositoriesValue?.includes(parentKara?.repository) && parentKara?.repository) ||
							repositoriesValue[0])) ||
					null,
				mediafile: props.kara?.mediafile,
				lyrics_infos: props.kara?.lyrics_infos,
				parents: props.kara?.parents || (parentKara && [parentKara?.kid]) || [],
				titles_aliases: props.kara?.titles_aliases || parentKara?.titles_aliases,
				collections: props.kara?.collections || parentKara?.collections,
			}}
		>
			{repositoryManifest?.docsURL && (
				<Button type="link" style={{ fontWeight: 'bold', fontSize: 17 }} href={repositoryManifest.docsURL}>
					{i18next.t('KARA.REPOSITORY_DOCUMENTATION', { instance: repositoryManifest.name })}
				</Button>
			)}
			<Divider orientation="left">{i18next.t('KARA.SECTIONS.FILES')}</Divider>
			<Form.Item
				label={
					<span>
						{i18next.t('KARA.MEDIA_FILE')}&nbsp;
						<Tooltip
							title={i18next.t('KARA.MEDIA_FILE_TOOLTIP', {
								formats: context.globalState.settings.data.state?.supportedMedias?.join(', '),
							})}
						>
							<QuestionCircleOutlined />
						</Tooltip>
					</span>
				}
				labelCol={{ flex: '0 1 220px' }}
				wrapperCol={{ span: 20 }}
			>
				<Row>
					<Col>
						<Form.Item
							name="mediafile"
							rules={[
								{
									required: true,
									message: i18next.t('KARA.MEDIA_REQUIRED'),
								},
							]}
							style={{ marginRight: '20px' }}
						>
							<Upload
								headers={{
									authorization: localStorage.getItem('kmToken'),
									onlineAuthorization: localStorage.getItem('kmOnlineToken'),
								}}
								action="/api/importFile"
								accept="video/*,audio/*,.mkv,.aac,.m2ts,.mka"
								multiple={false}
								onChange={onMediaUploadChange}
								fileList={mediafile as any[]}
							>
								<Button disabled={mediaEditLocked}>
									<UploadOutlined />
									{i18next.t('KARA.MEDIA_FILE')}
								</Button>
							</Upload>
						</Form.Item>
					</Col>
					{props.kara?.download_status === 'DOWNLOADED' || mediaInfo?.size ? (
						<Card style={{ minWidth: '400px', maxWidth: '700px' }}>
							{!mediaInfo?.overallBitrate ? (
								<Flex
									gap="small"
									vertical
									style={{
										position: 'absolute',
										left: '0',
										right: '0',
										bottom: '0',
										top: '0',
										justifyContent: 'center',
										alignContent: 'center',
									}}
								>
									<Spin />
								</Flex>
							) : (
								''
							)}
							{renderMediaInfo(mediaInfo, mediaInfoValidationResults)}
							{mediaInfo?.mediaType === 'audio' && (
								<>
									<Divider></Divider>
									{renderCoverArtUpload()}
								</>
							)}
							{encodeMediaEnabled() ? (
								<>
									<Divider></Divider>
									<Space
										style={{ width: '100%' }} // Shoud be block={true} but seems not supported
										direction="vertical"
									>
										<Flex gap={'5px'}>
											<Button
												block={true}
												type="primary"
												icon={
													<SyncOutlined
														spin={isEncodingMedia}
														style={{ lineHeight: 0 }} // Spinning icon fix
													/>
												}
												disabled={
													!mediaInfo?.overallBitrate || isEncodingMedia || mediaEditLocked
												}
												onClick={encodeMedia}
											>
												{i18next.t('KARA.MEDIA_ENCODE.LABEL')}
											</Button>
											<Button
												icon={<CloseOutlined />}
												disabled={!isEncodingMedia}
												onClick={abortEncoding}
												danger
											></Button>
										</Flex>
										<TaskProgress
											taskTextTypes={['CALCULATING_MEDIA_ENCODING_PARAMETERS', 'ENCODING_MEDIA']}
										></TaskProgress>
										<Checkbox
											disabled={isEncodingMedia}
											defaultChecked={encodeMediaOptions?.trim || false}
											onChange={e =>
												setEncodeMediaOptions({
													...encodeMediaOptions,
													trim: e.target.checked,
												})
											}
										>
											{i18next.t('KARA.MEDIA_ENCODE.OPTIONS.TRIM_MEDIA')}&nbsp;
											<Tooltip title={i18next.t('KARA.MEDIA_ENCODE.OPTIONS.TRIM_MEDIA_TOOLTIP')}>
												<QuestionCircleOutlined />
											</Tooltip>
										</Checkbox>

										{encodeMediaOptions?.trim ? (
											<Alert
												style={{ textAlign: 'left', marginBottom: '20px' }}
												description={i18next.t('KARA.MEDIA_ENCODE.TIMING_CHANGE_WARNING')}
												type="warning"
											/>
										) : (
											''
										)}
									</Space>
								</>
							) : null}
						</Card>
					) : null}
				</Row>
			</Form.Item>
			<Form.Item
				label={
					<span>
						{i18next.t('KARA.LYRICS_FILE')}&nbsp;
						<Tooltip
							title={i18next.t('KARA.LYRICS_FILE_TOOLTIP', {
								formats: context.globalState.settings.data.state?.supportedLyrics?.join(', '),
							})}
						>
							<QuestionCircleOutlined />
						</Tooltip>
					</span>
				}
				labelCol={{ flex: '0 1 220px' }}
				wrapperCol={{ span: 12 }}
			>
				<Row gutter={32}>
					<Col>
						<Form.Item name="lyrics_infos" style={{ marginBottom: '0' }}>
							<Upload
								headers={{
									authorization: localStorage.getItem('kmToken'),
									onlineAuthorization: localStorage.getItem('kmOnlineToken'),
								}}
								action="/api/importFile"
								accept={context.globalState.settings.data.state?.supportedLyrics
									.map(e => `.${e}`)
									.join(',')}
								multiple={false}
								onChange={onSubUploadChange}
								fileList={subfile as any[]}
							>
								<Button>
									<UploadOutlined />
									{i18next.t('KARA.LYRICS_FILE')}
								</Button>
							</Upload>
						</Form.Item>

						{subfile?.length > 0 && props.kara?.kid && !mediafileIsTouched && (
							<div style={{ marginTop: '1em' }}>
								<OpenLyricsFileButton kara={props.kara} />
							</div>
						)}
					</Col>
				</Row>
			</Form.Item>
			<Divider orientation="left">{i18next.t('KARA.SECTIONS.PARENTS')}</Divider>
			<Paragraph style={{ marginLeft: '200px' }}>{i18next.t('KARA.DESC.PARENTS')}</Paragraph>
			<Paragraph style={{ marginLeft: '200px' }}>{i18next.t('KARA.DESC.PARENTS_PUBLIC')}</Paragraph>
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
				wrapperCol={{ span: 12 }}
				name="parents"
			>
				<Select
					showSearch
					mode="multiple"
					onSearch={search}
					onChange={onParentKaraChange}
					showArrow={false}
					filterOption={false}
					options={karaSearch}
					tagRender={tagRender}
				/>
			</Form.Item>
			<Divider orientation="left">{i18next.t('KARA.SECTIONS.TITLES')}</Divider>
			<Paragraph style={{ marginLeft: '200px' }}>{i18next.t('KARA.DESC.TITLES')}</Paragraph>
			<Paragraph style={{ marginLeft: '200px' }}>{i18next.t('KARA.DESC.TITLES_DEFAULT_LANGUAGE')}</Paragraph>
			<Form.Item
				hasFeedback
				label={
					<span>
						{i18next.t('KARA.TITLE')}&nbsp;
						<Tooltip title={i18next.t('KARA.TITLE_TOOLTIP')}>
							<QuestionCircleOutlined />
						</Tooltip>
					</span>
				}
				labelCol={{ flex: '0 1 220px' }}
				rules={[
					{
						required: !titles || Object.keys(titles).length === 0,
						message: i18next.t('KARA.TITLE_REQUIRED'),
					},
				]}
				name="titles"
			></Form.Item>
			<LanguagesList
				value={titles}
				onFieldIsTouched={isFieldTouched => titlesIsTouched !== true && setTitlesIsTouched(isFieldTouched)}
				onChange={titles => {
					setTitles(titles);
					form.validateFields(['titles']);
				}}
				defaultLanguage={defaultLanguage}
				onDefaultLanguageSelect={setDefaultLanguage}
			/>
			<Paragraph style={{ marginLeft: '200px' }}>{i18next.t('KARA.DESC.ALIASES')}</Paragraph>
			<Form.Item
				label={
					<span>
						{i18next.t('KARA.ALIASES')}&nbsp;
						<Tooltip title={i18next.t('KARA.ALIASES_TOOLTIP')}>
							<QuestionCircleOutlined />
						</Tooltip>
					</span>
				}
				labelCol={{ flex: '0 1 220px' }}
				name="titles_aliases"
			>
				<EditableGroupAlias onChange={aliases => form?.setFieldsValue({ titles_aliases: aliases })} />
			</Form.Item>
			<Divider orientation="left">{i18next.t('KARA.SECTIONS.IDENTITY')}</Divider>
			<Form.Item
				label={i18next.t('TAG_TYPES.LANGS_other')}
				labelCol={{ flex: '0 1 220px' }}
				wrapperCol={{ span: 7 }}
				rules={getRules('langs')}
				name="langs"
			>
				<EditableTagGroup form={form} tagType={5} onChange={tags => form.setFieldsValue({ langs: tags })} />
			</Form.Item>
			<Form.Item
				label={
					<span>
						{i18next.t('TAG_TYPES.SERIES_other')}&nbsp;
						<Tooltip title={i18next.t('KARA.SERIES_TOOLTIP')}>
							<QuestionCircleOutlined />
						</Tooltip>
					</span>
				}
				labelCol={{ flex: '0 1 220px' }}
				wrapperCol={{ span: 14 }}
				rules={getRules('series')}
				name="series"
			>
				<EditableTagGroup form={form} tagType={1} onChange={tags => form.setFieldsValue({ series: tags })} />
			</Form.Item>
			<Form.Item
				label={
					<span>
						{i18next.t('TAG_TYPES.FRANCHISES_other')}&nbsp;
						<Tooltip title={i18next.t('KARA.FRANCHISES_TOOLTIP')}>
							<QuestionCircleOutlined />
						</Tooltip>
					</span>
				}
				labelCol={{ flex: '0 1 220px' }}
				wrapperCol={{ span: 14 }}
				rules={getRules('franchises')}
				name="franchises"
			>
				<EditableTagGroup
					form={form}
					tagType={18}
					onChange={tags => form.setFieldsValue({ franchises: tags })}
				/>
			</Form.Item>
			<Form.Item
				label={i18next.t('TAG_TYPES.SONGTYPES_other')}
				labelCol={{ flex: '0 1 220px' }}
				wrapperCol={{ span: 10, offset: 0 }}
				rules={getRules('songtypes')}
				name="songtypes"
			>
				<EditableTagGroup
					form={form}
					tagType={3}
					checkboxes={true}
					onChange={tags => form.setFieldsValue({ songtypes: tags })}
				/>
			</Form.Item>
			<Form.Item
				label={
					<span>
						{i18next.t('KARA.ORDER')}&nbsp;
						<Tooltip title={i18next.t('KARA.ORDER_TOOLTIP')}>
							<QuestionCircleOutlined />
						</Tooltip>
					</span>
				}
				labelCol={{ flex: '0 1 220px' }}
				wrapperCol={{ flex: '0 1 70px' }}
				name="songorder"
			>
				<InputNumber min={0} style={{ width: '100%' }} onPressEnter={submitHandler} />
			</Form.Item>
			<Form.Item
				label={
					<span>
						{i18next.t('TAG_TYPES.VERSIONS_other')}&nbsp;
						<Tooltip title={i18next.t('KARA.VERSIONS_TOOLTIP')}>
							<QuestionCircleOutlined />
						</Tooltip>
					</span>
				}
				labelCol={{ flex: '0 1 220px' }}
				wrapperCol={{ span: 10 }}
				rules={getRules('versions')}
				name="versions"
			>
				<EditableTagGroup
					form={form}
					tagType={14}
					checkboxes={true}
					onChange={tags => form.setFieldsValue({ versions: tags })}
				/>
			</Form.Item>
			<Form.Item
				label={i18next.t('KARA.SINGERS_BY')}
				labelCol={{ flex: '0 1 220px' }}
				wrapperCol={{ span: 7 }}
				rules={getRules('singers')}
				name="singers"
			>
				<EditableTagGroup form={form} tagType={2} onChange={tags => form.setFieldsValue({ singers: tags })} />
			</Form.Item>
			<Form.Item
				label={i18next.t('KARA.SINGERGROUPS_BY')}
				labelCol={{ flex: '0 1 220px' }}
				wrapperCol={{ span: 7 }}
				rules={getRules('singergroups')}
				name="singergroups"
			>
				<EditableTagGroup
					form={form}
					tagType={17}
					onChange={tags => form.setFieldsValue({ singergroups: tags })}
				/>
			</Form.Item>
			<Form.Item
				label={
					<span>
						{i18next.t('KARA.SONGWRITERS_BY')}&nbsp;
						<Tooltip title={i18next.t('KARA.SONGWRITERS_TOOLTIP')}>
							<QuestionCircleOutlined />
						</Tooltip>
					</span>
				}
				labelCol={{ flex: '0 1 220px' }}
				wrapperCol={{ span: 7 }}
				rules={getRules('songwriters')}
				name="songwriters"
			>
				<EditableTagGroup
					form={form}
					tagType={8}
					onChange={tags => form.setFieldsValue({ songwriters: tags })}
				/>
			</Form.Item>
			<Form.Item
				label={
					<span>
						{i18next.t('KARA.CREATORS_BY')}&nbsp;
						<Tooltip title={i18next.t('KARA.CREATORS_TOOLTIP')}>
							<QuestionCircleOutlined />
						</Tooltip>
					</span>
				}
				labelCol={{ flex: '0 1 220px' }}
				wrapperCol={{ span: 7 }}
				rules={getRules('creators')}
				name="creators"
			>
				<EditableTagGroup form={form} tagType={4} onChange={tags => form.setFieldsValue({ creators: tags })} />
			</Form.Item>
			<Form.Item
				hasFeedback
				label={
					<span>
						{i18next.t('KARA.YEAR')}&nbsp;
						<Tooltip title={i18next.t('KARA.YEAR_TOOLTIP')}>
							<QuestionCircleOutlined />
						</Tooltip>
					</span>
				}
				labelCol={{ flex: '0 1 220px' }}
				wrapperCol={{ span: 2 }}
				name="year"
			>
				<InputNumber
					required={true}
					min={0}
					max={new Date().getFullYear()}
					placeholder="Year"
					style={{ width: '100%' }}
					onPressEnter={submitHandler}
				/>
			</Form.Item>
			<Divider orientation="left">{i18next.t('KARA.SECTIONS.CATEGORIZATION')}</Divider>
			<Form.Item
				label={
					<span>
						{i18next.t('TAG_TYPES.COLLECTIONS_other')}&nbsp;
						<Tooltip title={i18next.t('KARA.COLLECTIONS_TOOLTIP')}>
							<QuestionCircleOutlined />
						</Tooltip>
					</span>
				}
				labelCol={{ flex: '0 1 220px' }}
				wrapperCol={{ span: 10, offset: 0 }}
				rules={getRules('collections')}
				name="collections"
			>
				<EditableTagGroup
					form={form}
					tagType={16}
					checkboxes={true}
					onChange={tags => form.setFieldsValue({ collections: tags })}
				/>
			</Form.Item>

			<Form.Item
				label={
					<span>
						{i18next.t('TAG_TYPES.FAMILIES_other')}&nbsp;
						<Tooltip title={i18next.t('KARA.FAMILIES_TOOLTIP')}>
							<QuestionCircleOutlined />
						</Tooltip>
					</span>
				}
				labelCol={{ flex: '0 1 220px' }}
				wrapperCol={{ span: 10 }}
				rules={getRules('families')}
				name="families"
			>
				<EditableTagGroup
					form={form}
					tagType={10}
					checkboxes={true}
					onChange={tags => form.setFieldsValue({ families: tags })}
				/>
			</Form.Item>
			<Form.Item
				label={i18next.t('TAG_TYPES.PLATFORMS_other')}
				labelCol={{ flex: '0 1 220px' }}
				wrapperCol={{ span: 10 }}
				rules={getRules('platforms')}
				name="platforms"
			>
				<Collapse
					bordered={false}
					defaultActiveKey={props.kara?.platforms.length > 0 || parentKara?.platforms.length > 0 ? ['1'] : []}
				>
					<Panel header={i18next.t('SHOW-HIDE')} key="1" forceRender={true}>
						<EditableTagGroup
							value={props.kara?.platforms || parentKara?.platforms}
							form={form}
							tagType={13}
							checkboxes={true}
							onChange={tags => form.setFieldsValue({ platforms: tags })}
						/>
					</Panel>
				</Collapse>
			</Form.Item>
			<Form.Item
				label={i18next.t('TAG_TYPES.GENRES_other')}
				labelCol={{ flex: '0 1 220px' }}
				wrapperCol={{ span: 10 }}
				rules={getRules('genres')}
				name="genres"
			>
				<EditableTagGroup
					form={form}
					tagType={12}
					checkboxes={true}
					onChange={tags => form.setFieldsValue({ genres: tags })}
				/>
			</Form.Item>
			<Form.Item
				label={i18next.t('TAG_TYPES.ORIGINS_other')}
				labelCol={{ flex: '0 1 220px' }}
				wrapperCol={{ span: 10 }}
				rules={getRules('origins')}
				name="origins"
			>
				<EditableTagGroup
					form={form}
					tagType={11}
					checkboxes={true}
					onChange={tags => form.setFieldsValue({ origins: tags })}
				/>
			</Form.Item>
			<Form.Item
				label={i18next.t('TAG_TYPES.MISC_other')}
				labelCol={{ flex: '0 1 220px' }}
				wrapperCol={{ span: 10 }}
				rules={getRules('misc')}
				name="misc"
			>
				<EditableTagGroup
					form={form}
					tagType={7}
					checkboxes={true}
					onChange={tags => form.setFieldsValue({ misc: tags })}
				/>
			</Form.Item>
			<Form.Item
				label={i18next.t('TAG_TYPES.WARNINGS_other')}
				labelCol={{ flex: '0 1 220px' }}
				wrapperCol={{ span: 10 }}
				rules={getRules('warnings')}
				name="warnings"
			>
				<EditableTagGroup
					form={form}
					tagType={15}
					checkboxes={true}
					onChange={tags => form.setFieldsValue({ warnings: tags })}
				/>
			</Form.Item>
			<Form.Item
				label={
					<span>
						{i18next.t('TAG_TYPES.GROUPS_other')}&nbsp;
						<Tooltip title={i18next.t('KARA.GROUPS_TOOLTIP')}>
							<QuestionCircleOutlined />
						</Tooltip>
					</span>
				}
				labelCol={{ flex: '0 1 220px' }}
				wrapperCol={{ span: 10 }}
				rules={getRules('groups')}
				name="groups"
			>
				<EditableTagGroup
					form={form}
					tagType={9}
					checkboxes={true}
					onChange={tags => form.setFieldsValue({ groups: tags })}
				/>
			</Form.Item>
			<Divider orientation="left">{i18next.t('KARA.SECTIONS.META')}</Divider>
			<Form.Item
				className="wrap-label"
				label={
					<span>
						{i18next.t('KARA.FROM_DISPLAY_TYPE')}&nbsp;
						<Tooltip title={i18next.t('KARA.FROM_DISPLAY_TYPE_TOOLTIP')}>
							<QuestionCircleOutlined />
						</Tooltip>
					</span>
				}
				labelCol={{ flex: '0 1 220px' }}
				wrapperCol={{ span: 7 }}
				name="from_display_type"
			>
				<Select options={displayTypeOptions} />
			</Form.Item>
			<Form.Item
				className="wrap-label"
				label={
					<span>
						{i18next.t('KARA.ANNOUNCE_POSITION')}&nbsp;
						<Tooltip title={i18next.t('KARA.ANNOUNCE_POSITION_TOOLTIP')}>
							<QuestionCircleOutlined />
						</Tooltip>
					</span>
				}
				labelCol={{ flex: '0 1 220px' }}
				wrapperCol={{ span: 7 }}
			>
				{typeof announcePosition !== 'undefined' ? (
					<div>
						<Row>
							<Card title="Karaoke Mugen Player" size="small" style={{ width: '200px' }}>
								<Radio.Group
									name="announce_position"
									value={announcePosition}
									onChange={e => setAnnouncePosition(e.target.value)}
									style={{ width: '100%' }}
								>
									<Row style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
										<Radio value="Left,Top" />
										<Radio value="Center,Top" />
										<Radio value="Right,Top" />
									</Row>
									<Row style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
										<Radio value="Left,Center" />
										<Radio value="Center,Center" />
										<Radio value="Right,Center" />
									</Row>
									<Row style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
										<Radio value="Left,Bottom" />
										<Radio value="Center,Bottom" />
										<Radio value="Right,Bottom" />
									</Row>
								</Radio.Group>
							</Card>
						</Row>
						<br />
						<Row>
							<Button onClick={() => setAnnouncePosition(undefined)}>
								<DeleteOutlined />
								{i18next.t('KARA.ANNOUNCE_POSITION_SELECTION.UNSET')}
							</Button>
						</Row>
					</div>
				) : (
					<Button onClick={() => setAnnouncePosition(null)}>
						{i18next.t('KARA.ANNOUNCE_POSITION_SELECTION.SET')}
					</Button>
				)}
			</Form.Item>
			<Form.Item
				label={
					<span>
						{i18next.t('KARA.AUTHORS_BY')}&nbsp;
						<Tooltip title={i18next.t('KARA.KARA_AUTHORS_TOOLTIP')}>
							<QuestionCircleOutlined />
						</Tooltip>
					</span>
				}
				labelCol={{ flex: '0 1 220px' }}
				wrapperCol={{ span: 7 }}
				rules={getRules('authors')}
				name="authors"
			>
				<EditableTagGroup form={form} tagType={6} onChange={tags => form.setFieldsValue({ author: tags })} />
			</Form.Item>
			<Form.Item
				hasFeedback
				label={
					<span>
						{i18next.t('KARA.COMMENT')}&nbsp;
						<Tooltip title={i18next.t('KARA.COMMENT_TOOLTIP')}>
							<QuestionCircleOutlined />
						</Tooltip>
					</span>
				}
				labelCol={{ flex: '0 1 220px' }}
				wrapperCol={{ span: 8 }}
				rules={[
					{
						required: false,
					},
				]}
				name="comment"
			>
				<Input.TextArea autoSize placeholder={i18next.t('KARA.COMMENT')} onKeyPress={submitHandler} />
			</Form.Item>
			<Form.Item
				label={
					<span>
						{i18next.t('KARA.IGNOREHOOKS')}&nbsp;
						<Tooltip title={i18next.t('KARA.IGNOREHOOKS_TOOLTIP')}>
							<QuestionCircleOutlined />
						</Tooltip>
					</span>
				}
				valuePropName="checked"
				labelCol={{ flex: '0 1 220px' }}
				wrapperCol={{ span: 8 }}
				rules={[
					{
						required: false,
					},
				]}
				name="ignore_hooks"
			>
				<Checkbox />
			</Form.Item>
			{repositoriesValue ? (
				<Form.Item
					label={i18next.t('KARA.REPOSITORY')}
					labelCol={{ flex: '0 1 220px' }}
					wrapperCol={{ span: 3 }}
					rules={[
						{
							required: true,
							message: i18next.t('KARA.REPOSITORY_REQUIRED'),
						},
					]}
					name="repository"
				>
					<Select
						disabled={props.kara?.repository !== undefined}
						placeholder={i18next.t('KARA.REPOSITORY')}
						onChange={value => getRepoManifest(value)}
					>
						{repositoriesValue.map(mapRepoToSelectOption)}
					</Select>
				</Form.Item>
			) : null}
			<Form.Item
				label={i18next.t('KARA.CREATED_AT')}
				labelCol={{ flex: '0 1 220px' }}
				wrapperCol={{ span: 8 }}
				name="created_at"
			>
				<label>{props.kara?.created_at ? dayjs(props.kara?.created_at).format('L LTS') : null}</label>
			</Form.Item>
			<Form.Item
				label={i18next.t('KARA.MODIFIED_AT')}
				labelCol={{ flex: '0 1 220px' }}
				wrapperCol={{ span: 8 }}
				name="modified_at"
			>
				<label>{props.kara?.modified_at ? dayjs(props.kara?.modified_at).format('L LTS') : null}</label>
			</Form.Item>
			<div style={{ marginLeft: '220px', marginBottom: '1em' }}>
				{errors.map(error => (
					<div key={error}>
						<label className="ant-form-item-explain-error">{error}</label>
					</div>
				))}
			</div>
			<Form.Item>
				<Button style={{ marginLeft: '14em', marginRight: '9em' }} onClick={previewHooks}>
					{i18next.t('KARA.PREVIEW_HOOKS')}
				</Button>
				<Button type="primary" htmlType="submit">
					{i18next.t('SUBMIT')}
				</Button>
			</Form.Item>
			{repositoriesValue && props.kara?.repository ? (
				<>
					<Divider orientation="left">{i18next.t('KARA.COPY_SONG')}</Divider>
					<Form.Item
						hasFeedback
						label={i18next.t('KARA.REPOSITORY')}
						labelCol={{ flex: '0 1 220px' }}
						wrapperCol={{ span: 8 }}
					>
						<Select placeholder={i18next.t('KARA.REPOSITORY')} onChange={setRepoToCopySong}>
							{repositoriesValue
								.filter(value => value !== props.kara?.repository)
								.map(mapRepoToSelectOption)}
						</Select>
					</Form.Item>

					<Form.Item wrapperCol={{ span: 8, offset: 3 }} style={{ textAlign: 'right' }}>
						<Button
							disabled={!repoToCopySong}
							type="primary"
							danger
							onClick={() => props.handleCopy(props.kara?.kid, repoToCopySong)}
						>
							{i18next.t('KARA.COPY_SONG')}
						</Button>
					</Form.Item>

					<Divider orientation="left">{i18next.t('KARA.DELETE_KARA')}</Divider>
					<Form.Item wrapperCol={{ span: 8, offset: 3 }} style={{ textAlign: 'center' }}>
						<Alert
							style={{ textAlign: 'left', marginBottom: '20px' }}
							message={i18next.t('WARNING')}
							description={i18next.t('CONFIRM_SURE')}
							type="warning"
						/>

						<Button type="primary" danger onClick={handleDelete}>
							{i18next.t('KARA.DELETE_KARA')}
						</Button>
					</Form.Item>
				</>
			) : null}
		</Form>
	);
}

export default KaraForm;
