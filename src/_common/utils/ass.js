import {parse as assParser} from 'ass-compiler';

export function ASSToLyrics(ass) {
	let lyrics = [];
	let script = assParser(ass);
	script.events.dialogue.forEach( dialogue => lyrics.push(dialogue.Text.combined));
	return lyrics;
}

