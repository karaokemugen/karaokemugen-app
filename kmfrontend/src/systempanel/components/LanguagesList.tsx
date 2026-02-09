import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons';
import { Alert, Col, Form, Input, Row, Select, Tag, Tooltip } from 'antd';
import i18next from 'i18next';
import { useContext, useEffect, useState } from 'react';

import GlobalContext from '../../store/context';
import { getLanguagesInLocaleFromCode, getListLanguagesInLocale, langWithRomanization } from '../../utils/isoLanguages';

interface IProps {
	value: Record<string, string>;
	onChange: (i18n: Record<string, string>) => void;
	defaultLanguage?: string;
	onDefaultLanguageSelect?: (name: string) => void;
}

export default function LanguagesList(props: IProps) {
	const [selectVisible, setSelectVisible] = useState<boolean>(Object.keys(props.value)?.length === 0);
	const [i18n, setI18n] = useState<Record<string, string>>(props.value);
	const [inputToFocus, setInputToFocus] = useState<string>();
	const [isFieldsTouched, setIsFieldsTouched] = useState<boolean>();
	const context = useContext(GlobalContext);
	const languages = getListLanguagesInLocale(context.globalState.settings.data.user.language);

	const romanizationLanguage = 'qro';

	useEffect(() => {
		// Update all language fields if nothing has been touched yet
		if (props.value && !isFieldsTouched) {
			setI18n(props.value);
		}
	}, [props.value]);

	function showSelect() {
		setSelectVisible(true);
	}

	function addLang(lang: string) {
		if (
			typeof props.onDefaultLanguageSelect === 'function' &&
			(Object.keys(i18n).length === 0 || lang === romanizationLanguage)
		) {
			props.onDefaultLanguageSelect(lang);
		}
		const newI18n = i18n;
		newI18n[lang] = '';
		setI18n(newI18n);
		setSelectVisible(false);
		setInputToFocus(lang);
	}

	function removeLang(lang: string) {
		const newI18n = Object.assign({}, i18n);
		delete newI18n[lang];
		setI18n(newI18n);
		props.onChange(newI18n);
		if (Object.keys(newI18n).length > 0 && lang === props.defaultLanguage) {
			props.onDefaultLanguageSelect(Object.keys(newI18n)[0]);
		}
	}

	function setValueLanguage(value: string, langKey: string) {
		const newI18n = Object.assign({}, i18n);
		newI18n[langKey] = value;
		setI18n(newI18n);
		props.onChange(newI18n);
		setIsFieldsTouched(true);
	}
	return (
		<>
			{Object.keys(i18n).map(langKey => (
				<Row key={langKey} style={{ maxWidth: '65%', minWidth: '150px' }}>
					<Col style={{ width: '80%' }}>
						<Form.Item
							label={getLanguagesInLocaleFromCode(
								langKey,
								context.globalState.settings.data.user.language
							)}
							labelCol={{ flex: '0 1 300px' }}
							rules={[
								{
									required: true,
									message: i18next.t('TAGS.I18N_ERROR'),
								},
							]}
						>
							<Input
								autoFocus={inputToFocus === langKey}
								value={i18n[langKey]}
								placeholder={i18next.t('TAGS.I18N_NAME')}
								onChange={event => setValueLanguage(event.target.value, langKey)}
							/>
						</Form.Item>
					</Col>
					<Col style={{ marginLeft: '10px' }}>
						{Object.keys(i18n).length > 1 ? (
							<Tooltip title={i18next.t('TAGS.I18N_DELETE')}>
								<MinusCircleOutlined
									className="dynamic-delete-button"
									onClick={() => removeLang(langKey)}
								/>
							</Tooltip>
						) : null}
					</Col>
				</Row>
			))}
			{!Object.keys(i18n).includes(romanizationLanguage) &&
			langWithRomanization.some(v => Object.keys(i18n).includes(v)) ? (
				<Form.Item wrapperCol={{ span: 8, offset: 4 }} style={{ textAlign: 'right' }}>
					<Alert
						style={{ textAlign: 'left', marginTop: '20px' }}
						description={i18next.t('TAGS.ROMANIZATION_WARNING')}
						type="warning"
					/>
				</Form.Item>
			) : null}
			<Form.Item label={i18next.t('TAGS.I18N_SELECT')} labelCol={{ flex: '0 1 300px' }}>
				{selectVisible ? (
					<Select
						style={{ maxWidth: '40%', minWidth: '150px' }}
						showSearch
						optionFilterProp="children"
						autoFocus={selectVisible}
						onChange={value => addLang(value)}
					>
						{languages
							.filter(value => !Object.keys(i18n).includes(value.value))
							.map(lang => (
								<Select.Option key={lang.value} value={lang.value}>
									{lang.label} ({lang.value.toUpperCase()})
								</Select.Option>
							))}
					</Select>
				) : (
					<Tag onClick={showSelect} style={{ borderStyle: 'dashed' }}>
						<PlusOutlined />
						{i18next.t('ADD')}
					</Tag>
				)}
			</Form.Item>
			{props.onDefaultLanguageSelect && Object.keys(i18n).length > 0 ? (
				<Form.Item label={i18next.t('KARA.DEFAULT_LANGUAGE')} labelCol={{ flex: '0 1 300px' }}>
					<Select
						style={{ maxWidth: '40%', minWidth: '150px' }}
						value={props.defaultLanguage}
						onChange={props.onDefaultLanguageSelect}
					>
						{languages
							.filter(value => Object.keys(i18n).includes(value.value))
							.map(lang => (
								<Select.Option key={lang.value} value={lang.value}>
									{lang.label} ({lang.value.toUpperCase()})
								</Select.Option>
							))}
					</Select>
				</Form.Item>
			) : null}
		</>
	);
}
