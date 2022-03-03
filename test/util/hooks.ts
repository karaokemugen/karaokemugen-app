import { disconnectSocket } from './util';

export const mochaHooks = {
	afterAll(done: any) {
		disconnectSocket();
		done();
	},
};
