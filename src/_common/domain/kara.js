import timestamp from 'unix-timestamp';
import uuidV4 from 'uuid/v4';

/**
 * Génère les informations à écrire dans un fichier kara, à partir d'un objet passé en paramètre, en filtrant les
 * champs non concernés, et en ajoutant les valeurs par défaut au besoin.
 */
export function getKara(karaData) {
	timestamp.round = true;

	return {
		videofile: karaData.videofile || '',
		subfile: karaData.subfile || 'dummy.ass',
		title: karaData.title || '',
		series: karaData.series || '',
		type: karaData.type || '',
		order: karaData.order || 0,
		year: karaData.year || '',
		singer: karaData.singer || '',
		tags: karaData.tags || '',
		songwriter: karaData.songwriter || '',
		creator: karaData.creator || '',
		author: karaData.author || '',
		lang: karaData.lang || '',
		KID: karaData.KID || uuidV4(),
		dateadded: karaData.dateadded || timestamp.now(),
		datemodif: karaData.datemodif || timestamp.now(),
		videosize: karaData.videosize || 0,
		videogain: karaData.videogain || 0,
		videoduration: karaData.videoduration || 0,
		version: karaData.version || 1
	};
}