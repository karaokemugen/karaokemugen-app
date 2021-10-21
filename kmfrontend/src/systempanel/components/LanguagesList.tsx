import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons';
import { Col, Form, Input, Row, Select, Tag, Tooltip } from 'antd';
import i18next from 'i18next';
import { useState } from 'react';
import { useEffect } from 'react';

import { getLanguagesInLocaleFromCode, getListLanguagesInLocale } from '../../utils/isoLanguages';

interface IProps {
	value: Record<string, string>,
	onChange: (i18n: Record<string, string>) => void
	onFieldIsTouched?: (boolean) => void
}

export default function LanguagesList(props: IProps) {
	const [selectVisible, setSelectVisible] = useState<boolean>(false);
	const [i18n, setI18n] = useState<Record<string, string>>(props.value);
	const [inputToFocus, setInputToFocus] = useState<string>();
	const [isFieldsTouched, setIsFieldsTouched] = useState<boolean>();
	const languages = getListLanguagesInLocale();

	useEffect(() => {
		// Update all language fields if nothing has been touched yet
		if (props.value && !isFieldsTouched) {
		  setI18n(props.value);
		}
	  }, [props.value]);


	function showSelect() {
		setSelectVisible(true);
	}

	function addLang(lang) {
		const newI18n = i18n;
		newI18n[lang] = '';
		setI18n(newI18n);
		setSelectVisible(false);
		setInputToFocus(lang);
	}

	function removeLang(lang) {
		const newI18n = Object.assign({}, i18n);
		delete newI18n[lang];
		setI18n(newI18n);
		props.onChange(newI18n);
	}

	function setValueLanguage(value: string, langKey: string) {
		const newI18n = Object.assign({}, i18n);
		newI18n[langKey] = value;
		setI18n(newI18n);
		props.onChange(newI18n);
		setIsFieldsTouched(true);
	}
	return <>
		{Object.keys(i18n).map(langKey => (
			<Row key={langKey} style={{ maxWidth: '65%', minWidth: '150px' }}>
				<Col style={{ width: '80%' }}>
					<Form.Item
						label={getLanguagesInLocaleFromCode(langKey)}
						labelCol={{ flex: '0 1 300px' }}
						rules={[{
							required: true,
							message: i18next.t('TAGS.I18N_ERROR')
						}]}
					>
						<Input
							autoFocus={inputToFocus === langKey}
							value={i18n[langKey]}
							placeholder={i18next.t('TAGS.I18N_NAME')}
							onChange={(event) => setValueLanguage(event.target.value, langKey)}
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
		<Form.Item
			label={i18next.t('TAGS.I18N_SELECT')}
			labelCol={{ flex: '0 1 300px' }}
		>
			{selectVisible ?
				<Select style={{ maxWidth: '40%', minWidth: '150px' }}
					showSearch
					optionFilterProp="children"
					autoFocus={selectVisible}
					onChange={value => addLang(value)}>
					{languages.map(lang => (
						<Select.Option key={lang.value} value={lang.value}>
							{lang.label} ({lang.value.toUpperCase()})
						</Select.Option>))}
				</Select> :
				<Tag
					onClick={showSelect}
					style={{ borderStyle: 'dashed' }}
				>
					<PlusOutlined />{i18next.t('ADD')}
				</Tag>
			}
		</Form.Item>
	</>;
}
