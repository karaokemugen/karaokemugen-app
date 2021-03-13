// These routes are only available in --test mode

import { getConfig } from '../../lib/utils/config';
import { SocketIOApp } from '../../lib/utils/ws';
import { getState } from '../../utils/state';

export default function testController(router: SocketIOApp) {
	router.route('getState', async (_socket: any, _req: any) => {
		return getState();
	});
	router.route('getFullConfig', async (_socket: any, _req: any) => {
		return getConfig();
	});
}