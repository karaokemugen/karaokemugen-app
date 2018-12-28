import cliProgress from 'cli-progress';
import {emitWS} from '../_webapp/frontend';

export default class Bar {

	constructor(options, total) {
		this.options = options;
		this.total = total;
		this.start = 0;
		this.value = 0;
		this.bar = new cliProgress.Bar({
			format: `${options.message} {bar} {percentage}% - ETA {eta_formatted}`,
			stopOnComplete: true
		}, cliProgress.Presets.shades_classic);
		this.bar.start(total, this.start);
		emitWS(options.event, {
			value: this.start,
			total: total,
			text: options.format.substr(0, options.format.indexOf('{'))
		});
	}

	stop = () => {
		this.bar.stop();
		emitWS(this.options.message, {
			value: this.total,
			total: this.total
		});
	}

	incr = () => {
		this.bar.increment();
		emitWS(this.options.message, {
			value: this.value,
			total: this.total
		});
	}
}