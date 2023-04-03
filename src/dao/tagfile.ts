import { formatKaraV4 } from '../lib/dao/karafile.js';
import { DBKara } from '../lib/types/database/kara.js';
import { DBTag } from '../lib/types/database/tag.js';
import { tagTypes } from '../lib/utils/constants.js';
import logger from '../lib/utils/logger.js';
import Task from '../lib/utils/taskManager.js';
import { editKara } from '../services/karaCreation.js';

const service = 'DBTag';

export async function removeTagInKaras(tag: DBTag, karasWithTag: DBKara[]) {
	if (karasWithTag.length === 0) return;
	logger.info(`Removing tag ${tag.tid} in kara files`, { service });
	const task = new Task({
		text: 'DELETING_TAG_IN_PROGRESS',
		subtext: tag.name,
	});
	try {
		logger.info(`Removing in ${karasWithTag.length} files`, { service });
		for (const karaWithTag of karasWithTag) {
			logger.info(`Removing in ${karaWithTag.karafile}...`, { service });
			for (const type of Object.keys(tagTypes)) {
				if (karaWithTag[type]) karaWithTag[type] = karaWithTag[type].filter((t: DBTag) => t.tid !== tag.tid);
			}
			karaWithTag.modified_at = new Date();
			await editKara({
				kara: formatKaraV4(karaWithTag),
			});
		}
	} catch (err) {
		throw err;
	} finally {
		task.end();
	}
}
