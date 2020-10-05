import { deleteDownloadBLC, insertDownloadBLC, selectDownloadBLC } from '../dao/download';
import { uuidRegexp } from '../lib/utils/constants';
import { KaraDownloadBLC } from '../types/download';

export function addDownloadBLC(blc: KaraDownloadBLC) {
	if (blc.type < 0 && blc.type > 1006) throw {code: 400, msg: `Incorrect BLC type (${blc.type})`};
	if ((blc.type <= 1001) && !new RegExp(uuidRegexp).test(blc.value)) throw {code: 400, msg: `Blacklist criteria value mismatch : type ${blc.type} must have UUID value`};
	if ((blc.type >= 1002) && isNaN(blc.value)) throw {code: 400, msg: `Blacklist criteria type mismatch : type ${blc.type} must have a numeric value!`};
	return insertDownloadBLC(blc);
}

export async function removeDownloadBLC(id: number) {
	const dlBLC = await selectDownloadBLC();
	if (!dlBLC.some(e => e.dlblc_id === id )) throw {code: 404, msg: 'DL BLC ID does not exist'};
	return deleteDownloadBLC(id);
}

export function getDownloadBLC() {
	return selectDownloadBLC();
}