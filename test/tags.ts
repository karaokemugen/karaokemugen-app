import {expect} from 'chai';

import { DBTag } from '../src/lib/types/database/tag';
import { getToken, request, testTag } from './util/util';

describe('Tags', () => {
	let token: string;
	before(async () => {
		token = await getToken();
	});
	it('Get tag list', async () => {
		return request
			.get('/api/tags')
			.set('Accept', 'application/json')
			.set('Authorization', token)
			.expect('Content-Type', /json/)
			.expect(200)
			.then(res => {
				expect(res.body.content.length).to.be.at.least(1);
				expect(res.body.infos.count).to.be.at.least(1);
				const tags: DBTag[] = res.body.content;
				for (const tag of tags) {
					testTag(tag, 'tag');
				}
			});
	});
});

