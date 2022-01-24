import { graphics } from 'systeminformation';

import logger from '../lib/utils/logger';

/** Get list of displays connected to the computer */
export async function getDisplays() {
	// Get list of monitors to allow users to select one for the player
	const data = await graphics();
	logger.debug('Displays detected', { service: 'Webapp', obj: data });
	return data.displays
		.filter(d => d.resolutionX > 0)
		.map(d => {
			d.model = d.model.replaceAll('�', 'e');
			return d;
		});
}
