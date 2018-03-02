
import {on} from '../_common/utils/pubsub';
import {getConfig} from '../_common/utils/config';
import {addPollChoices, closePoll, addPoll} from '../_dao/poll';
import {isAllKarasInPlaylist, isACurrentPlaylist, isAPublicPlaylist, getPlaylistContents} from '../_services/playlist';
import {sampleSize} from 'lodash';

let state = {};

on('engineStatusChange', (newstate) => {
	state.engine = newstate[0];	
});

export async function startPoll() {
	const conf = getConfig();
	await closePoll();
	// Create new poll
	const [publicPlaylist_id, currentPlaylist_id] = await Promise.all([		
		isAPublicPlaylist(),
		isACurrentPlaylist(),
	]);	
	const poll_id = await addPoll();	
	// Get a list of karaokes to add to the poll
	const [pubpl, curpl] = await Promise.all([
		getPlaylistContents(publicPlaylist_id),
		getPlaylistContents(currentPlaylist_id)
	]);
	const availableKaras = isAllKarasInPlaylist(pubpl, curpl);
	let pollChoices = conf.EngineSongPollChoices;
	if (availableKaras.length < pollChoices) pollChoices = availableKaras.length;
	const karasInPoll = sampleSize(availableKaras,pollChoices);
	await addPollChoices(karasInPoll,poll_id);	
}
