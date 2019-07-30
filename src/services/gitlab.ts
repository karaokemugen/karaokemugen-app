import { getConfig } from '../lib/utils/config';
import { gitlabPostNewIssue } from '../lib/services/gitlab';
import logger from '../lib/utils/logger';
import { findUserByName } from './user';

export async function postSuggestionToKaraBase(karaName: string, username: string): Promise<string> {
	const conf = getConfig();
	let title = conf.Gitlab.IssueTemplate && conf.Gitlab.IssueTemplate.Suggestion && conf.Gitlab.IssueTemplate.Suggestion.Title ? conf.Gitlab.IssueTemplate.Suggestion.Title : 'New kara suggestion: $kara';
	title = title.replace('$kara', karaName);
	let desc = conf.Gitlab.IssueTemplate && conf.Gitlab.IssueTemplate.Suggestion && conf.Gitlab.IssueTemplate.Suggestion.Description ? conf.Gitlab.IssueTemplate.Suggestion.Description : '';
	const user = await findUserByName(username);
	desc = desc.replace('$username', user.nickname)
	try {
		return await gitlabPostNewIssue(title, desc, conf.Gitlab.IssueTemplate.Suggestion.Labels);
	} catch(err) {
		logger.error(`[Gitlab] Call to Gitlab API failed : ${err}`);
	}
}