import { techTip } from "../electron/electronLogger";
import i18n from 'i18next';
import shuffle from 'lodash.shuffle';
import { TipsAndTricks, TipType } from '../types/tips';

let interval: NodeJS.Timeout;
let tips: TipsAndTricks;
let index = 0;

function tipLoop(type: TipType) {
    let tip = tips[type][index];
    let words = tip.split(" ").length;
    techTip(tip);
    index++;
    // Restart from the beginning if it reaches the end
    if (tips[type][index] === undefined) {
        index = 0;
    }
    // Calculate the estimated time for reading
    // Based from https://marketingland.com/estimated-reading-times-increase-engagement-79830:
    // The average human reads 200 words in a minute <=> 3 words per seconds
    let duration = Math.round(words/3) * 1000;
    // Add 1.5 second to let the user start read
    interval = setTimeout(tipLoop, duration + 1500, type);
}

function initTable() {
    if (!tips) {
        tips = {
            normal: shuffle(i18n.t('TIPS.NORMAL', {returnObjects: true})),
            errors: shuffle(i18n.t('TIPS.ERRORS', {returnObjects: true}))
        }
    }
}

export function startTipLoop(type: TipType = 'normal') {
    initTable();
    clearTimeout(interval); // Clear any existing timeout
    index = 0; // Reset the index
    tipLoop(type); // First tip loop
}

export function stopTipLoop() {
    clearTimeout(interval);
}