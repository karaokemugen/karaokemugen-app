var assParser = require('ass-parser');

module.exports = {
	ASSToLyrics:function(ass){		
		var lyrics = [];			
					
		var script = assParser(ass, { comments: true });
		var DialogueSection;
		script.forEach(function(ASSSection,index){
			if (ASSSection.section == 'Events') {
				DialogueSection = index;
			}
		});
		script[DialogueSection].body.forEach(function(param){
			if (param.key == 'Dialogue') {
				lyrics.push(param.value.Text.replace(/\{(?:.|\n)*?\}/gm, ''));
			}
		});		
		return lyrics;	
	},	
};