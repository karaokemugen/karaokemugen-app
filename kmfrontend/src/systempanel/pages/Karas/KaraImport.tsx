import { QuestionCircleOutlined } from '@ant-design/icons';
import { Alert, Button, Col, Divider, Form, Input, Layout, Row, Select, Table, Tooltip } from 'antd';
import { useEffect, useState } from 'react';
import Title from '../../components/Title';

import i18next from 'i18next';
import { ImportBaseFile } from '../../../../../src/types/repo';
import { commandBackend } from '../../../utils/socket';
import FoldersElement from '../../components/FoldersElement';
import { tagTypes } from '../../../utils/tagTypes';
import { useForm } from 'antd/es/form/Form';
import { useSearchParams } from 'react-router-dom';
import { WS_CMD } from '../../../utils/ws';
import { Repository } from '../../../../../src/lib/types/repo';

type TemplateOption = { value?: string; type?: string; label?: string };

function KaraImport() {
	const [form] = useForm();
	const [searchParams] = useSearchParams();
	const [sourceDir, setSourceDir] = useState('');
	const [fileNameTemplate, setFileNameTemplate] = useState<string>('{singers} - {title}');
	const [fileNameTemplateError, setFileNameTemplateError] = useState<string>();
	const [filesToImport, setFilesToImport] = useState<ImportBaseFile[]>([]);
	const [repositories, setRepositories] = useState<string[]>([]);
	const [destinationRepository, setDestinationRepository] = useState<string>(searchParams.get('repository'));
	const [columns, setColumns] = useState<unknown[]>([
		{
			title: i18next.t('KARAOKE_IMPORT.SOURCE'),
			dataIndex: 'oldFile',
			sorter: (a, b) => a.oldFile.localeCompare(b.oldFile),
			defaultSortOrder: 'ascend' as const,
		},
		{
			title: i18next.t('KARA.TITLE'),
			dataIndex: 'title',
		},
	]);
	const [importInProgress, setImportInProgress] = useState(false);

	const templateOptions: TemplateOption[] = [
		{ value: '{title}', label: 'KARA.TITLE' },
		{ value: '{year}', label: 'DETAILS.YEAR' },
	].concat(
		Object.entries(tagTypes).map(([key, value]) => {
			return { value: `{${value.karajson}}`, label: `TAG_TYPES.${key}_other` };
		})
	);
	const authorizedValuesInTemplate = templateOptions.map(e => e.value);

	const findFilesToImport = async () => {
		try {
			const res: ImportBaseFile[] = await commandBackend(
				WS_CMD.FIND_FILES_TO_IMPORT,
				{
					dirname: sourceDir,
					template: fileNameTemplate,
				},
				false,
				120000,
				true
			);
			setFilesToImport(res.map(r => ({ ...r.newFile, ...r })));
			setFileNameTemplateError(undefined);
		} catch (e) {
			setFileNameTemplateError((e as Error).message);
		}
	};

	const startImportBase = async () => {
		const options: { source: string; template: string; repoDest: string } = {
			repoDest: destinationRepository,
			source: sourceDir,
			template: fileNameTemplate,
		};
		setImportInProgress(true);
		try {
			await commandBackend(WS_CMD.IMPORT_BASE, options);
		} catch (_) {
			setImportInProgress(false);
		}
	};

	const getRepos = async () => {
		const res = (await commandBackend(WS_CMD.GET_REPOS)).filter(r => (r as Repository).MaintainerMode || !r.Online);
		if (res.length > 0) {
			setRepositories(res.map(value => value.Name));
			if (!searchParams.get('repository')) setDestinationRepository(res[0].Name);
		}
	};

	useEffect(() => {
		form.validateFields();
	}, [fileNameTemplateError]);

	useEffect(() => {
		getRepos();
	}, []);

	useEffect(() => {
		if (sourceDir && fileNameTemplate) {
			findFilesToImport();
			const newColumns: unknown[] = [
				{
					title: 'Source',
					dataIndex: 'oldFile',
					sorter: (a, b) => a.oldFile.localeCompare(b.oldFile),
					defaultSortOrder: 'ascend' as const,
					render: (oldFile: string) => {
						let newOldFile = oldFile.replace(sourceDir.replaceAll('/', '\\'), '');
						if (newOldFile.startsWith('/') || newOldFile.startsWith('\\')) newOldFile = newOldFile.slice(1);
						return newOldFile;
					},
				},
			];
			if (fileNameTemplate.match(/{[a-zA-Z]*}/g)?.length > 0) {
				fileNameTemplate.match(/{[a-zA-Z]*}/g).forEach(value => {
					if (authorizedValuesInTemplate.includes(value)) {
						const updatedValue = value.substring(1, value.length - 1);
						newColumns.push({
							title:
								updatedValue === 'title'
									? i18next.t('KARA.TITLE')
									: updatedValue === 'year'
										? i18next.t('KARA.YEAR')
										: i18next.t(`TAG_TYPES.${updatedValue.toUpperCase()}_other`),
							dataIndex: updatedValue,
						});
					}
				});
			}
			setColumns(newColumns);
		}
	}, [sourceDir, fileNameTemplate]);

	return (
		<>
			<Title
				title={i18next.t('HEADERS.KARAOKE_IMPORT.TITLE')}
				description={i18next.t('HEADERS.KARAOKE_IMPORT.DESCRIPTION')}
			/>
			<Divider orientation="left">{i18next.t('KARAOKE_IMPORT.CONFIGURATION')}</Divider>
			<Layout.Content style={{ paddingRight: '5em', paddingLeft: '110px' }}>
				{repositories?.length > 0 ? (
					<Form form={form} initialValues={{ sourceDir, destinationRepository, fileNameTemplate }}>
						<div style={{ fontSize: 17, marginBottom: '0.5em' }}>
							{i18next.t('KARAOKE_IMPORT.SOURCE_DIR_DESC')}
						</div>
						<Form.Item
							label={
								<span>
									{i18next.t('KARAOKE_IMPORT.SOURCE_DIR')}
									&nbsp;
									<Tooltip title={i18next.t('KARAOKE_IMPORT.SOURCE_DIR_TOOLTIP')}>
										<QuestionCircleOutlined />
									</Tooltip>
								</span>
							}
							required
							style={{ maxWidth: '900px' }}
							name="sourceDir"
						>
							<FoldersElement openDirectory={true} onChange={setSourceDir} />
						</Form.Item>

						<Form.Item
							label={
								<span>
									{i18next.t('KARAOKE_IMPORT.DESTINATION_REPOSITORY')}
									&nbsp;
									<Tooltip title={i18next.t('KARAOKE_IMPORT.DESTINATION_REPOSITORY_TOOLTIP')}>
										<QuestionCircleOutlined />
									</Tooltip>
								</span>
							}
							required
							name="destinationRepository"
						>
							<Select
								style={{ width: 150 }}
								disabled={!!searchParams.get('repository')}
								onChange={setDestinationRepository}
							>
								{repositories.map(repo => {
									return (
										<Select.Option key={repo} value={repo}>
											{repo}
										</Select.Option>
									);
								})}
							</Select>
						</Form.Item>
						<Alert
							style={{ marginBottom: '0.5em' }}
							message={i18next.t('KARAOKE_IMPORT.WARNING_IMPORT_TITLE')}
							description={
								<>
									<div>{i18next.t('KARAOKE_IMPORT.WARNING_IMPORT')}</div>
									<br />
									<div>{i18next.t('KARAOKE_IMPORT.WARNING_IMPORT_LIST')}</div>
									<ul>
										<li>- {i18next.t('KARAOKE_IMPORT.WARNING_IMPORT_LYRICS')}</li>
										<li>- {i18next.t('KARAOKE_IMPORT.WARNING_IMPORT_MEDIA')}</li>
									</ul>
								</>
							}
							type="warning"
						/>
						{sourceDir ? (
							<>
								<div style={{ fontSize: 17, marginBottom: '0.5em', marginTop: '2em' }}>
									{i18next.t('KARAOKE_IMPORT.FILENAME_TEMPLATE_DESC')}
								</div>
								<Form.Item
									label={i18next.t('KARAOKE_IMPORT.FILENAME_TEMPLATE')}
									required
									name="fileNameTemplate"
									rules={[
										{
											required: true,
											message: i18next.t('KARAOKE_IMPORT.FILENAME_TEMPLATE_ERROR'),
										},
										{
											validator: () =>
												fileNameTemplateError ? Promise.reject() : Promise.resolve(),
											message: i18next.t(`ERROR_CODES.${fileNameTemplateError}`),
										},
									]}
								>
									<Input
										onChange={event => {
											setFileNameTemplate(event.target.value);
											form.validateFields(['fileNameTemplate']);
										}}
									/>
								</Form.Item>
								<Alert
									style={{ marginBottom: '1em', marginTop: '0.5em' }}
									message={
										<>
											<div>{i18next.t('KARAOKE_IMPORT.FILENAME_TEMPLATE_TOOLTIP')}</div>
											<br />
											<div>{i18next.t('KARAOKE_IMPORT.ADD_TAG_TEMPLATE_DESC')}</div>
										</>
									}
									type="info"
									showIcon
								/>
								<Form.Item label={i18next.t('KARAOKE_IMPORT.ADD_TAG_TEMPLATE')}>
									<Select
										value={null}
										style={{ width: 250 }}
										onSelect={value => {
											setFileNameTemplate(fileNameTemplate.concat(value));
											form.setFieldValue('fileNameTemplate', fileNameTemplate.concat(value));
										}}
										options={templateOptions.filter(
											option => !fileNameTemplate.match(/{[a-zA-Z]*}/g)?.includes(option.value)
										)}
										placeholder={i18next.t('KARAOKE_IMPORT.ADD_TAG_TEMPLATE')}
										labelRender={option => i18next.t(option.label as string)}
										optionRender={option => i18next.t(option.label as string)}
									></Select>
								</Form.Item>
							</>
						) : null}
					</Form>
				) : null}
			</Layout.Content>
			{sourceDir ? (
				<>
					<Divider orientation="left">{i18next.t('KARAOKE_IMPORT.MEDIA_FILES')}</Divider>
					<Layout.Content style={{ paddingRight: '5em', paddingLeft: '110px' }}>
						<Row>
							<Col>
								<Table dataSource={filesToImport} columns={columns} rowKey="oldFile" />
							</Col>
						</Row>
					</Layout.Content>
					<Layout.Content style={{ paddingRight: '5em', display: 'flex', justifyContent: 'flex-end' }}>
						<Row>
							<Col>
								<Button
									type="primary"
									disabled={
										!sourceDir ||
										form.getFieldsError().some(({ errors }) => errors.length) ||
										importInProgress
									}
									onClick={startImportBase}
								>
									{i18next.t('KARAOKE_IMPORT.IMPORT_START')}
								</Button>
							</Col>
						</Row>
					</Layout.Content>
				</>
			) : null}
		</>
	);
}

export default KaraImport;
