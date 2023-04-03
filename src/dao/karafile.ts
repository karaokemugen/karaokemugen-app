import { formatKaraV4 } from '../lib/dao/karafile.js';
import { DBKara } from '../lib/types/database/kara.js';
import logger from '../lib/utils/logger.js';
import Task from '../lib/utils/taskManager.js';
import { editKara } from '../services/karaCreation.js';

const service = 'DBKara';

export async function removeParentInKaras(kid: string, karasWithParent: DBKara[]) {
	if (karasWithParent.length === 0) return;
	logger.info(`Removing parent ${kid} in kara files`, { service });
	const task = new Task({
		text: 'DELETING_PARENT_IN_PROGRESS',
	});
	try {
		logger.info(`Removing in ${karasWithParent.length} files`, { service });
		for (const kara of karasWithParent) {
			logger.info(`Removing in ${kara.karafile}...`, { service });
			if (kara.parents) {
				kara.parents = kara.parents.filter(p => p !== kid);
				if (kara.parents.length === 0) kara.parents = undefined;
				kara.modified_at = new Date();
				await editKara({
					kara: formatKaraV4(kara),
				});
			}
		}
	} catch (err) {
		throw err;
	} finally {
		task.end();
	}
}
