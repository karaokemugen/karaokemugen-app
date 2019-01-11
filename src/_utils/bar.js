import cliProgress from 'cli-progress';
import {emitWS} from '../_webapp/frontend';

export default class Bar {

	constructor(options, total) {
		this.options = options;
		this.total = total;
		this.start = 0;
		this.value = 0;
		this.format = `${options.message} {bar} {percentage}% - ETA {eta_formatted}`;
		this.bar = new cliProgress.Bar({
			format: this.format,
			stopOnComplete: true
		}, cliProgress.Presets.shades_classic);
		this.bar.start(total, this.start);
		if (options.event) emitWS(options.event, {
			value: this.start,
			total: total,
			text: this.format.substr(0, this.format.indexOf('{'))
		});
	}

	stop = () => {
		this.bar.stop();
		if (this.options.event) emitWS(this.options.event, {
			value: this.total,
			total: this.total
		});
	}

	incr = () => {
		this.bar.increment();
		if (this.options.event) emitWS(this.options.event, {
			value: this.value,
			total: this.total
		});
	}
}