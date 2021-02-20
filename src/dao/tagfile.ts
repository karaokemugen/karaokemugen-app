import { DBTag } from '../lib/types/database/tag';
import { KaraList } from '../lib/types/kara';
import { tagTypes } from '../lib/utils/constants';
import logger from '../lib/utils/logger';
import { editKara } from '../services/kara_creation';

export async function removeTagInKaras(tid: string, karas: KaraList) {
	logger.info(`Removing tag ${tid} in kara files`, {service: 'Kara'});
	const karasWithTag = karas.content.filter((k: any) => {
		if (k.tid?.some((t: string) => t && t.startsWith(tid))) return true;
		return false;
	});
	if (karasWithTag.length > 0) logger.info(`Removing in ${karasWithTag.length} files`, {service: 'Kara'});
	for (const karaWithTag of karasWithTag) {
		logger.info(`Removing in ${karaWithTag.karafile}...`, {service: 'Kara'});
		for (const type of Object.keys(tagTypes)) {
			if (karaWithTag[type]) karaWithTag[type] = karaWithTag[type].filter((t: DBTag) => t.tid !== tid);
		}
		karaWithTag.modified_at = new Date();
		await editKara(karaWithTag, false);
	}
}
