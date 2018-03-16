import localtunnel from 'localtunnel';
import randomstring from 'randomstring';
import {setConfig, getConfig} from '../_common/utils/config';
import logger from 'winston';
import {promisify} from 'util';
const lt = promisify(localtunnel);

export async function openTunnel() {
	const conf = getConfig();
	const opts = {
		subdomain: randomstring.generate({
			length: 4,
			charset: 'alphabetic',
			capitalization: 'lowercase'
		}),
		host: 'http://kara.moe',
		port: 80
	};
	let tunnel;
	try {
		tunnel = await lt(conf.appFrontendPort, opts);
		// Strip http:// from URL
		setConfig({
			EngineConnectionInfoHost: tunnel.url.replace('http://','')
		});
	} catch(err) {
		logger.error(`[Online] Connection with Shelter failed : ${err}`);
		throw err;
	}
	logger.info(`[Online] Connection established with Shelter (${opts.host}). Your URL is : ${tunnel.url}`);
	tunnel.on('error', (err) => {
		logger.error(`[Online] Connection with ${opts.host} has been lost : ${err}`);
	});	
	return tunnel.url;	
}