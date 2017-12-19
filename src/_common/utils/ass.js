import assParser from 'ass-parser';

export function ASSToLyrics(ass) {
	let lyrics = [];			
	let script = assParser(ass, { comments: true });
	let DialogueSection;
	script.forEach(function(ASSSection,index){
		if (ASSSection.section == 'Events') DialogueSection = index;
	});
	script[DialogueSection].body.forEach(function(param){
		if (param.key == 'Dialogue') lyrics.push(param.value.Text.replace(/\{(?:.|\n)*?\}/gm, ''));
	});		
	return lyrics;	
}

