import logger from 'winston';
import dailyRotateFile from  'winston-daily-rotate-file';
import {asyncCheckOrMkdir} from './files';
import {resolve} from 'path';
import {time} from './date';
import {getConfig} from './config';

export async function configureLogger(appPath, debug) {
	const consoleLogLevel = debug ? 'debug' : 'info';
	const logDir = resolve(appPath, 'logs');
	await asyncCheckOrMkdir(logDir);

	logger.add(
		new logger.transports.Console({
			level: consoleLogLevel,
			colorize: true,
			format: logger.format.combine(
				logger.format.colorize(),
				logger.format.printf(info => {
					let duration = '';
					if (info.durationMs) duration = `duration: ${info.durationMs} ms`;
					return `${time()} - ${info.level}: ${info.message} ${duration}`;
				})
			)
		})
	);
	logger.add(
		new dailyRotateFile({
			filename: 'karaokemugen-%DATE%.log',
			dirname: logDir,
			zippedArchive: true,
			level: 'debug',
			handleExceptions: true,
			format: logger.format.combine(
				logger.format.printf(info => {
					let duration = '';
					if (info.durationMs) duration = `duration: ${info.durationMs} ms`;
					return `${time()} - ${info.level}: ${info.message} ${duration}`;
				})
			)
		})
	);
}

export function profile(func) {
	if (getConfig().optProfiling) logger.profile(`[Profiling] ${func}`);
}
