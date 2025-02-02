import { EventEmitter } from 'events';
import { Observable, Subscriber } from 'rxjs';

import Mpv from './mpvIPC.js';

const PLAYBACK_TIME = 'playback-time';

export class MpvState extends EventEmitter implements Disposable {
	private readonly playbackTimesSubs: Set<Subscriber<number>>;
	readonly playbackTime$: Observable<number>;

	constructor(private mpv: Mpv) {
		super();
		this.playbackTimesSubs = new Set<Subscriber<number>>();
		this.mpv.on('property-change', status => this.onPropertyChange(status));
		this.playbackTime$ = this.createObservable(this.playbackTimesSubs, PLAYBACK_TIME);
	}

	private onPropertyChange(status: any) {
		const name = status.name;
		if (name === PLAYBACK_TIME)
			this.next(this.playbackTimesSubs, (status.data || 0) <= 0 ? 0 : (status.data as number));
		else this.emit(status.event, status);
	}

	private createObservable<T>(set: Set<Subscriber<T>>, property: string) {
		return new Observable<T>(sub => {
			//no await so there's a tiny chance of missing first few events(but most likely there will be other command awaits before any events)
			if (set.size === 0 && this.mpv.isRunning) this.mpv.observeProperty(property);
			set.add(sub);
			return () => {
				set.delete(sub);
				if (set.size === 0 && this.mpv.isRunning) this.mpv.unobserveProperty(property);
			};
		});
	}

	private next<T>(subs: Set<Subscriber<T>>, data: T) {
		for (const sub of subs) sub.next(data);
	}

	private complete<T>(subs: Set<Subscriber<T>>) {
		for (const sub of subs) sub.complete();
	}

	[Symbol.dispose](): void {
		this.complete(this.playbackTimesSubs);
	}
}
