import {getConfig} from '../../lib/utils/config';
import {decode} from 'jwt-simple';
import { APIMessage } from '../common';

export const requireWebappLimitedNoAuth = (_req: any, res: any, next: any) => {
	+getConfig().Frontend.Mode > 0
		? next()
		: res.status(503).json(APIMessage('WEBAPPMODE_CLOSED_API_MESSAGE'));
};

export const requireWebappLimited = (req: any, res: any, next: any) => {
	const token = decode(req.get('authorization'), getConfig().App.JwtSecret);
	+getConfig().Frontend.Mode > 0 || token.role === 'admin'
		? next()
		: res.status(503).json(APIMessage('WEBAPPMODE_CLOSED_API_MESSAGE'));
};

export const requireWebappOpen = (req: any, res: any, next: any) => {
	const token = decode(req.get('authorization'), getConfig().App.JwtSecret);
	+getConfig().Frontend.Mode > 1 || token.role === 'admin'
		? next()
		: res.status(503).json(APIMessage('WEBAPPMODE_CLOSED_API_MESSAGE'));
};