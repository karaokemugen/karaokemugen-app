import { expect, describe, it, vi } from 'vitest';
import { TestScheduler } from 'rxjs/testing';

import Mpv from '../../../../src/utils/mpvIPC.js';
import { MpvState } from '../../../../src/components/mpv/mpvState';

describe('MpvState', () => {
	it.each([{ running: true }, { running: false }])(
		'playbackTimes behaves correctly when isRunning $running',
		({ running }) => {
			const testScheduler = new TestScheduler((a, e) => expect(a).toEqual(e));
			const mpv = { on: vi.fn(), observeProperty: vi.fn(), unobserveProperty: vi.fn(), isRunning: running };
			const state = new MpvState(mpv as unknown as Mpv);
			const propertyChange = mpv.on.mock.calls[0][1];
			testScheduler.run(({ hot, expectObservable }) => {
				const values = { u: undefined, n: null, m: -2, 0: 0, 1: 1, 2: 2, 3: 3, 4: 4 };
				const times = hot('unm1---23-4|', values);
				const expected = ' 0001---23-4|';
				const sub2 = '     -------^-!';
				const expected2 = '-------23';
				const playbackTime$ = state.playbackTime$;
				times.subscribe({
					next: t => propertyChange({ name: 'playback-time', data: t }),
					complete: () => state[Symbol.dispose](),
				});
				expectObservable(playbackTime$).toBe(expected, values);
				expectObservable(playbackTime$, sub2).toBe(expected2, values);
			});
			if (running) {
				expect(mpv.observeProperty).toHaveBeenCalledOnce();
				expect(mpv.unobserveProperty).toHaveBeenCalledOnce();
				expect(mpv.observeProperty).toHaveBeenCalledWith('playback-time');
				expect(mpv.unobserveProperty).toHaveBeenCalledWith('playback-time');
			} else {
				expect(mpv.observeProperty).toHaveBeenCalledTimes(0);
				expect(mpv.unobserveProperty).toHaveBeenCalledTimes(0);
			}
		}
	);
});
