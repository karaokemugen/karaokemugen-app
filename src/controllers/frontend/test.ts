// These routes are only available in --test mode

import { WS_CMD } from '../../../kmfrontend/src/utils/ws.js';
import { getConfig } from '../../lib/utils/config.js';
import { SocketIOApp } from '../../lib/utils/ws.js';
import { getState } from '../../utils/state.js';

export default function testController(router: SocketIOApp) {
	router.route(WS_CMD.GET_STATE, async (_socket, _req) => {
		return getState();
	});
	router.route(WS_CMD.GET_FULL_CONFIG, async (_socket, _req) => {
		return getConfig();
	});
}
