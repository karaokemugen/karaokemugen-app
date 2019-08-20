import {parse as assParser} from 'ass-compiler';

/** Parse ASS data and return lyrics */
export function ASSToLyrics(ass: string): string[] {
	const script = assParser(ass);
	return script.events.dialogue.map(dialogue => dialogue.Text.combined);
}

