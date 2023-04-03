// These routes are only available in --test mode

import { getConfig } from '../../lib/utils/config.js';
import { SocketIOApp } from '../../lib/utils/ws.js';
import { getState } from '../../utils/state.js';

export default function testController(router: SocketIOApp) {
	router.route('getState', async (_socket: any, _req: any) => {
		return getState();
	});
	router.route('getFullConfig', async (_socket: any, _req: any) => {
		return getConfig();
	});
}
