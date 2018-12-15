export function timer(callback, delay) {
	let id, started, remaining = delay, running;

	this.start = () => {
		running = true;
		started = new Date();
		id = setTimeout(callback, remaining);
	};

	this.pause = () => {
		running = false;
		clearTimeout(id);
		remaining -= new Date() - started;
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
