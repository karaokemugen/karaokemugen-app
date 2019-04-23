import cliProgress from 'cli-progress';
import {emitWS} from '../_webapp/frontend';
import { BarOptions } from '../_types/bar';

export default class Bar {

	options: {
		event?: string
	};
	total: number;
	start: number;
	value: number;
	format: string;
	bar: cliProgress.Bar;

	constructor(options: BarOptions, total: number) {
		this.options = options;
		this.total = total;
		this.start = 0;
		this.value = 0;
		this.format = `${options.message} {bar} {percentage}%`;
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
	};

	incr = () => {
		this.bar.increment(1);
		if (this.options.event) emitWS(this.options.event, {
			value: this.value,
			total: this.total
		});
	};
}