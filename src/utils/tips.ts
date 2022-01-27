import i18n from 'i18next';
import shuffle from 'lodash.shuffle';

import { TipsAndTricks, TipType } from '../types/tips';

let tips: TipsAndTricks;
let index = 0;
let activeTipType: TipType = 'normal';

export function tip() {
	if (!tips) initTable();
	const oneTip = tips[activeTipType][index];
	if (!oneTip) return { tip: '', duration: 2000, title: i18n.t(`TIPS.TITLES.${activeTipType.toUpperCase()}`) };
	const words = oneTip.split(' ').length;
	// Calculate the estimated time for reading
	// Based from https://marketingland.com/estimated-reading-times-increase-engagement-79830:
	// The average human reads 200 words in a minute <=> 3 words per seconds
	// Add 2 second to let the user start reading
	const duration = Math.round(words / 3) * 1000 + 2000;
	const ret = {
		tip: tips[activeTipType][index],
		duration,
		title: i18n.t(`TIPS.TITLES.${activeTipType.toUpperCase()}`),
	};
	index += 1;
	// Restart from the beginning if it reaches the end
	if (tips[activeTipType][index] === undefined) {
		index = 0;
	}
	return ret;
}

function initTable() {
	tips = {
		normal: shuffle(i18n.t('TIPS.NORMAL', { returnObjects: true })),
		errors: shuffle(i18n.t('TIPS.ERRORS', { returnObjects: true })),
	};
}

export function setTipLoop(type: TipType = 'normal') {
	activeTipType = type;
}
