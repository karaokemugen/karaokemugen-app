const argv = require('minimist')(process.argv.slice(2));

const tsFormat = () => (new Date()).toLocaleTimeString();
const winston = require('winston');

const logger = new (winston.Logger)({
	transports: [
		new (winston.transports.Console)({ timestamp: tsFormat, level: 'info', colorize: true }),
		new (winston.transports.File)({ timestap: tsFormat, filename: 'karaokemugen.log', level: 'debug', handleExceptions: true })
	]
});

if (argv.debug) {
	logger.configure({
		transports: [
			new (winston.transports.Console)({ timestamp: tsFormat, level: 'debug', colorize: true }),
			new (winston.transports.File)({ timestap: tsFormat, filename: 'karaokemugen.log', level: 'debug', handleExceptions: true })
		]		
	});
	
}

module.exports = logger;