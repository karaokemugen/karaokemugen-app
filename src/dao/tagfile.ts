import { DBKara } from '../lib/types/database/kara';
import { DBTag, DBTagMini } from '../lib/types/database/tag';
import { tagTypes } from '../lib/utils/constants';
import logger from '../lib/utils/logger';
import Task from '../lib/utils/taskManager';
import { editKara } from '../services/karaCreation';

export async function removeTagInKaras(tag: DBTagMini, karasWithTag: DBKara[]) {
	if (karasWithTag.length === 0) return;
	logger.info(`Removing tag ${tag.tid} in kara files`, { service: 'Kara' });
	const task = new Task({
		text: 'DELETING_TAG_IN_PROGRESS',
		subtext: tag.name,
	});
	try {
		logger.info(`Removing in ${karasWithTag.length} files`, { service: 'Kara' });
		for (const karaWithTag of karasWithTag) {
			logger.info(`Removing in ${karaWithTag.karafile}...`, { service: 'Kara' });
			for (const type of Object.keys(tagTypes)) {
				if (karaWithTag[type]) karaWithTag[type] = karaWithTag[type].filter((t: DBTag) => t.tid !== tag.tid);
			}
			karaWithTag.modified_at = new Date();
			await editKara(karaWithTag, false);
		}
	} catch (err) {
		throw err;
	} finally {
		task.end();
	}
}
