import {setState} from './utils/state';
import logger, { enableProfiling } from './lib/utils/logger';
import { CommandLine } from 'electron';
import { exit } from './services/engine';

const help = `Usage :

karaokemugen [options]

Options :
--help                          Displays this message
--version                       Displays version info
--cli                           Do not open the GUI
--debug                         Displays additional debug messages
--sql                           Traces SQL query at the debug log level
--generate                      Generates a new database then quits
--validate                      Validates kara files and modify them if needed (no generation)
--strict                        Generation/validation only. Strict mode, returns an error if kara files had to be modified.
--profiling                     Displays profiling information for some functions
--test                          Launches in test mode (for running unit tests)
--reset                         Reset user data (WARNING! Backup your base first!)
--demo                          Launches in demo mode (no system panel, no password changes)
--config file                   Specify a config file to use (default is config.yml)
--updateBase                    Update karaoke base files
--updateMedias                  Update karaoke media files only (no other data files)
--noBaseCheck                   Disable data file checking on startup
--noBrowser                     Do not open a browser window upon launch
--noMedia                       (generation only) Do not try to fetch data from media files
--noPlayer                      Do not open player on startup
--forceAdminPassword <password> Set admin account's password
`;

export async function parseCommandLineArgs(argv: any, cmdline: CommandLine) {
	if ((cmdline && cmdline.hasSwitch('help')) || argv.help) {
		console.log(help);
		process.exit(0);
	}
	if ((cmdline && cmdline.hasSwitch('sql')) || argv.sql) {
		logger.info('[Launcher] SQL queries will be logged');
		setState({opt: {sql: true}});
	}
	if ((cmdline && cmdline.hasSwitch('debug')) || argv.debug) {
		logger.info('[Launcher] Debug messages enabled on console');
		setState({opt: {debug: true}});
		process.env['NODE_ENV'] = 'development';
	}
	if ((cmdline && cmdline.hasSwitch('validate')) || argv.validate) {
		logger.info('[Launcher] Validation (no generation) requested');
		setState({opt: {validate: true}});
	}
	if ((cmdline && cmdline.hasSwitch('reset')) || argv.reset) {
		logger.warn('[Launcher] USER DATA IS GOING TO BE RESET');
		setState({opt: {reset: true}});
	}
	if ((cmdline && cmdline.hasSwitch('version')) || argv.version) {
		// Version number is already displayed so we exit here.
		exit(0);
	}
	if ((cmdline && cmdline.hasSwitch('profiling')) || argv.profiling) {
		logger.info('[Launcher] Profiling enabled');
		enableProfiling();
	}
	if ((cmdline && cmdline.hasSwitch('generate')) || argv.generate) {
		logger.info('[Launcher] Database generation requested');
		setState({opt: {generateDB: true}});
	}
	if ((cmdline && cmdline.hasSwitch('noMedia')) || argv.noMedia) {
		logger.info('[Launcher] Medias will not be read during generation');
		setState({opt: {noMedia: true}});
	}
	if ((cmdline && cmdline.hasSwitch('noBaseCheck')) || argv.noBaseCheck) {
		logger.info('[Launcher] Data files will not be checked. ENABLED AT YOUR OWN RISK');
		setState({opt: {noBaseCheck: true}});
	}
	if ((cmdline && cmdline.hasSwitch('noPlayer')) || argv.noPlayer) {
		logger.info('[Launcher] Player will not start.');
		setState({opt: {noPlayer: true}});
	}
	if ((cmdline && cmdline.hasSwitch('strict')) || argv.strict) {
		logger.info('[Launcher] Strict mode enabled. KARAOKE MUGEN DOES NOT FORGIVE. EVER.');
		setState({opt: {strict: true}});
	}
	if ((cmdline && cmdline.hasSwitch('updateBase')) || argv.updateBase) {
		logger.info('[Launcher] Base update requested');
		setState({opt: {baseUpdate: true}});
	}
	if ((cmdline && cmdline.hasSwitch('updateMedias')) || argv.updateMedias) {
		logger.info('[Launcher] Media update requested');
		setState({opt: {mediaUpdate: true}});
	}
	if ((cmdline && cmdline.hasSwitch('test')) || argv.test) {
		logger.info('[Launcher] TEST MODE ENABLED. DO NOT DO THIS AT HOME.');
		setState({isTest: true});
	}
	if ((cmdline && cmdline.hasSwitch('demo')) || argv.demo) {
		logger.info('[Launcher] Demo mode enabled');
		setState({isDemo: true});
	}
	if ((cmdline && cmdline.hasSwitch('noBrowser')) || argv.noBrowser) setState({opt: {noBrowser: true}});
	if ((cmdline && cmdline.getSwitchValue('forceAdminpassword')) || argv.forceAdminPassword) setState({opt: {forceAdminPassword: argv.forceAdminPassword || cmdline.getSwitchValue('forceAdminPassword')}});
	if ((cmdline && cmdline.hasSwitch('dumpDB')) || argv.dumpDB) setState({opt: {dumpDB: true}});
	if ((cmdline && cmdline.hasSwitch('restoreDB')) || argv.restoreDB) setState({opt: {restoreDB: true}});
}