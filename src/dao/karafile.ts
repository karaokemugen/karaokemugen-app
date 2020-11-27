import { DBTag } from '../lib/types/database/tag';
import { KaraList } from '../lib/types/kara';
import { tagTypes } from '../lib/utils/constants';
import logger from '../lib/utils/logger';
import { editKara } from '../services/kara_creation';

export async function replaceTagInKaras(oldTID1: string, oldTID2: string, newTID: string, karas: KaraList): Promise<string[]> {
	logger.info(`Replacing tag ${oldTID1} and ${oldTID2} by ${newTID} in .kara.json files`, {service: 'Kara'});
	const modifiedKaras: string[] = [];
	for (const kara of karas.content) {
		let modifiedKara = false;
		kara.modified_at = new Date();
		for (const type of Object.keys(tagTypes)) {
			if (kara[type]?.find((t: DBTag) => t.tid === oldTID1) || kara[type]?.find((t: DBTag) => t.tid === oldTID2)) {
				kara[type] = kara[type].filter((t: any) => t.tid !== oldTID1 && t.tid !== oldTID2);
				kara[type].push({tid: newTID});
				modifiedKara = true;
			}
		}
		if (modifiedKara) {
			await editKara(kara, false);
		}
	}
	return modifiedKaras;
}
