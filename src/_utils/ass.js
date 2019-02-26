import {parse as assParser} from 'ass-compiler';

export function ASSToLyrics(ass) {
	const script = assParser(ass);
	const lyrics = script.events.dialogue.map(dialogue => dialogue.Text.combined);
	return lyrics;
}

