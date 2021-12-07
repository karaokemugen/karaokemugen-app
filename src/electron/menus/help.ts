import i18next from 'i18next';

import { MenuItemBuilderFunction } from '../../types/electron';
import { getState } from '../../utils/state';
import { displayAbout, urls } from './';

const builder: MenuItemBuilderFunction = (options) => {
	const { isMac } = options;
	return {
		label: i18next.t('MENU_HELP'),
		role: 'help',
		submenu: [
			{
				label: i18next.t('MENU_HELP_GUIDE'),
				click: urls.helpGuide,
			},
			{
				label: i18next.t('MENU_HELP_WEBSITE'),
				click: urls.website,
			},
			{
				label: i18next.t('MENU_HELP_TWITTER'),
				click: urls.twitter,
			},
			{
				label: i18next.t('MENU_HELP_DISCORD'),
				click: urls.discord,
			},
			{
				label: i18next.t('MENU_HELP_GITLAB'),
				click: urls.gitlab,
			},
			{ type: 'separator' },
			{
				label: i18next.t('MENU_HELP_CHANGELOG'),
				click: urls.changelog,
			},
			{ type: 'separator' },
			{
				label: i18next.t('MENU_HELP_CONTRIB_DOC'),
				click: urls.contribDoc,
			},
			{
				label: i18next.t('MENU_HELP_SEND_KARAOKE'),
				click: urls.sendKaraoke,
			},
			{ type: 'separator' },
			{
				label: i18next.t('MENU_HELP_REPORT_BUG'),
				click: urls.reportBug,
			},
			{
				label: i18next.t('MENU_HELP_DONATIONS'),
				click: getState().defaultLocale === 'fr' ? urls.donations.fr : urls.donations.en,
			},
			{
				label: i18next.t('MENU_HELP_ABOUT'),
				click: displayAbout,
				visible: !isMac,
			},
		],
	};
};

export default builder;
