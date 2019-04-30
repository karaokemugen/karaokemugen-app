export function timer(callback: any, delay: number) {
	let id: any, started: Date, remaining: number = delay, running : boolean;

	this.start = () => {
		running = true;
		started = new Date();
		id = setTimeout(callback, remaining);
	};

	this.pause = () => {
		running = false;
		clearTimeout(id);
		remaining -= new Date().getTime() - started.getTime();
	};

	this.getTimeLeft = () => {
		if (running) {
			this.pause();
			this.start();
		}
		return remaining;
	};

	this.getStateRunning = () => {
		return running;
	};

	this.start();
}
