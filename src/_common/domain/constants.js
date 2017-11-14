/**
 * Référentiel de KM (tags, langs, types, etc.).
 */

export const karaTypes = Object.freeze({
	OP: 'OP',
	ED: 'ED',
	IN: 'IN',
	MV: 'MV',
	PV: 'PV',
	CM: 'CM',
	OT: 'OT',
	AMV: 'AMV',
	LIVE: 'LIVE'
});

export const karaTypesArray = Object.freeze(Object.keys(karaTypes));

export function getType(types) {
	return types.split(/\s+/).find(t => karaTypesArray.includes(t));
}
