import cli from 'commander';
import { CommandLine } from 'electron';

import logger, { enableProfiling } from '../lib/utils/logger';
import {getState, setState} from './state';

export function parseArgs() {
	const argv = process.argv.filter(e => e !== '--');
	const version = getState().version;
	return cli
		.command('KaraokeMugen')
		.description('Starts Karaoke Mugen Desktop App')
		.version(`${version.number} "${version.name}" (commit ${version.sha})`)
		.option('-b, --updateBase', 'Update karaoke base files')
		.option('-c, --config [file]','Specify a config file to use (default is config.yml)')
		.option('-d, --debug', 'Displays additional debug messages')
		.option('-g, --generate', 'Generates a new database then quits')
		.option('-k, --kill', 'Kill already-running KM app')
		.option('-p, --profiling', 'Displays profiling information for some functions')
		.option('-r, --reset', 'Reset user data (WARNING! Backup your base first!)')
		.option('-s, --strict', 'Generation/validation only. Strict mode, returns an error if kara files had to be modified.')
		.option('-t, --test', 'Launches in test mode (for running unit tests)')
		.option('-m, --updateMedias', 'Update karaoke media files only (no other data files)')
		.option('-v, --validate', 'Validates kara files and modify them if needed (no generation)')
		.option('--cli', 'Start in CLI mode, without Electron')
		.option('--demo', 'Launches in demo mode (no system panel, no password changes)')
		.option('--forceAdminPassword [password]', 'Set admin account\'s password').option('--noBaseCheck', 'Disable data file checking on startup')
		.option('--noBrowser', 'Do not open a browser window upon launch')
		.option('--noMedia', '(generation only) Do not try to fetch data from media files')
		.option('--noPlayer', 'Do not open player on startup')
		.option('--noTestDownloads', 'Do not attempt to download songs during unit tests')
		.option('--noAutoTest', 'Do not attempt to start tests automatically if --test is enabled')
		.option('--sql', 'Traces SQL query at the debug log level')
		.parse(argv);
}

export function setupFromCommandLineArgs(argv: any, cmdline: CommandLine) {
	if (cmdline?.hasSwitch('sql') || argv.sql) {
		logger.info('SQL queries will be logged', {service: 'Launcher'});
		setState({opt: {sql: true}});
	}
	if (cmdline?.hasSwitch('debug') || argv.debug) {
		logger.info('Debug messages enabled on console', {service: 'Launcher'});
		setState({opt: {debug: true}});
		process.env['NODE_ENV'] = 'development';
	}
	if (cmdline?.hasSwitch('validate') || argv.validate) {
		logger.info('Validation (no generation) requested', {service: 'Launcher'});
		setState({opt: {validate: true}});
	}
	if (cmdline?.hasSwitch('reset') || argv.reset) {
		logger.warn('USER DATA IS GOING TO BE RESET', {service: 'Launcher'});
		setState({opt: {reset: true}});
	}
	if (cmdline?.hasSwitch('profiling') || argv.profiling) {
		logger.info('Profiling enabled', {service: 'Launcher'});
		enableProfiling();
	}
	if (cmdline?.hasSwitch('generate') || argv.generate) {
		logger.info('Database generation requested', {service: 'Launcher'});
		setState({opt: {generateDB: true}});
	}
	if (cmdline?.hasSwitch('noMedia') || argv.noMedia) {
		logger.info('Medias will not be read during generation', {service: 'Launcher'});
		setState({opt: {noMedia: true}});
	}
	if (cmdline?.hasSwitch('noBaseCheck') || argv.noBaseCheck) {
		logger.info('Data files will not be checked. ENABLED AT YOUR OWN RISK', {service: 'Launcher'});
		setState({opt: {noBaseCheck: true}});
	}
	if (cmdline?.hasSwitch('noPlayer') || argv.noPlayer) {
		logger.info('Player will not start.', {service: 'Launcher'});
		setState({opt: {noPlayer: true}});
	}
	if (cmdline?.hasSwitch('strict') || argv.strict) {
		logger.info('Strict mode enabled. KARAOKE MUGEN DOES NOT FORGIVE. EVER.', {service: 'Launcher'});
		setState({opt: {strict: true}});
	}
	if (cmdline?.hasSwitch('updateBase') || argv.updateBase) {
		logger.info('Base update requested', {service: 'Launcher'});
		setState({opt: {baseUpdate: true}});
	}
	if (cmdline?.hasSwitch('updateMedias') || argv.updateMedias) {
		logger.info('Media update requested', {service: 'Launcher'});
		setState({opt: {mediaUpdate: true}});
	}
	if (cmdline?.hasSwitch('test') || argv.test) {
		logger.info('TEST MODE ENABLED. DO NOT DO THIS AT HOME.', {service: 'Launcher'});
		if (cmdline?.hasSwitch('noAutoTest') || argv.noAutoTest) setState({noAutoTest: true});
		setState({isTest: true});
	}
	if (cmdline?.hasSwitch('demo') || argv.demo) {
		logger.info('Demo mode enabled', {service: 'Launcher'});
		setState({isDemo: true});
	}
	if (cmdline?.hasSwitch('noBrowser') || argv.noBrowser) setState({opt: {noBrowser: true}});
	if (cmdline?.hasSwitch('noTestDownloads') || argv.noTestDownloads) setState({opt: {noTestDownloads: true}});
	if (cmdline?.hasSwitch('noAutoTest') || argv.noAutoTest) setState({opt: {noAutoTest: true}});
	if ((cmdline?.getSwitchValue('forceAdminpassword')) || argv.forceAdminPassword) setState({opt: {forceAdminPassword: argv.forceAdminPassword || cmdline.getSwitchValue('forceAdminPassword')}});
	if (cmdline?.hasSwitch('dumpDB') || argv.dumpDB) setState({opt: {dumpDB: true}});
	if (cmdline?.hasSwitch('restoreDB') || argv.restoreDB) setState({opt: {restoreDB: true}});
}
