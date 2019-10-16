import { getConfig } from '../lib/utils/config';
import { gitlabPostNewIssue } from '../lib/services/gitlab';
import logger from '../lib/utils/logger';
import { findUserByName } from './user';

export async function postSuggestionToKaraBase(karaName: string, username: string): Promise<string> {
	const conf = getConfig().Gitlab.IssueTemplate;
	let title = conf && conf.Suggestion && conf.Suggestion.Title
		? conf.Suggestion.Title
		: 'New kara suggestion: $kara';
	title = title.replace('$kara', karaName);
	let desc = conf && conf.Suggestion && conf.Suggestion.Description
		? conf.Suggestion.Description
		: 'From $username : it would be nice if someone could time this!';
	const user = await findUserByName(username);
	desc = desc.replace('$username', user.nickname)
	try {
		return await gitlabPostNewIssue(title, desc, conf.Suggestion.Labels);
	} catch(err) {
		logger.error(`[Gitlab] Call to Gitlab API failed : ${err}`);
	}
}