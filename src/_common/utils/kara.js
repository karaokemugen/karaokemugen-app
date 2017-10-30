/**
 * Outils de manipulation des fichiers kara : lecture, extraction d'infos, etc.
 * Les outils de ce fichier ne s'occupent pas de résoudre les chemins. On suppose donc que les paramètres
 * sont déjà résolus.
 */

import {parse} from 'path';
import {parse as parseini} from 'ini';
import {asyncReadFile} from './files';

export function karaFilenameInfos(karaFile) {
	const karaFileName = parse(karaFile).name;
	const infos = karaFileName.split(/\s+-\s+/); // LANGUE - SERIE - NUMERO - TITRE

	if (infos.length < 3) {
		throw 'Kara filename \'' + karaFileName + '\' does not respect naming convention';
	}
	// On ajoute en 5ème position le numéro extrait du champ type.
	const orderInfos = infos[2].match(/^([a-zA-Z0-9 ]{2,30}?)(\d*)$/);
	infos.push(orderInfos[2] ? +orderInfos[2] : 0);

	// On renvoie un objet avec les champs explicitement nommés.
	return {
		lang: infos[0],
		serie: infos[1],
		type: orderInfos[1],
		songorder: orderInfos[2] ? +orderInfos[2] : 0,
		title: infos[3] || ''
	};
}

export async function parseKara(karaFile) {
	const data = await asyncReadFile(karaFile, 'utf-8');
	return parseini(data);
}

export function verifyRequiredInfos(karaData) {
	if (!karaData.videofile || karaData.videofile.trim() === '') {
		throw 'Karaoke video file empty!';
	}
	if (!karaData.subfile || karaData.subfile.trim() === '') {
		throw 'Karaoke sub file file empty!';
	}
}