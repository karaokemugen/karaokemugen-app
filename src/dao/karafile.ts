import { DBKara } from '../lib/types/database/kara';
import logger from '../lib/utils/logger';
import Task from '../lib/utils/taskManager';
import { editKara } from '../services/karaCreation';

export async function removeParentInKaras(kid: string, karasWithParent: DBKara[]) {
	if (karasWithParent.length === 0) return;
	logger.info(`Removing parent ${kid} in kara files`, { service: 'Kara' });
	const task = new Task({
		text: 'DELETING_PARENT_IN_PROGRESS',
	});
	try {
		logger.info(`Removing in ${karasWithParent.length} files`, { service: 'Kara' });
		for (const kara of karasWithParent) {
			logger.info(`Removing in ${kara.karafile}...`, { service: 'Kara' });
			if (kara.parents) {
				kara.parents = kara.parents.filter((p) => p !== kid);
				if (kara.parents.length === 0) kara.parents = undefined;
				kara.modified_at = new Date();
				await editKara(kara, false);
			}
		}
	} catch (err) {
		throw err;
	} finally {
		task.end();
	}
}
