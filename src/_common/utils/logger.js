const clc = require('cli-color');

module.exports = {
	SOURCE : 'Unknown',
	success:function(message)
	{
		console.log(clc.greenBright('SUCCESS :: '+module.exports.SOURCE+' :: '+message));
	},
	notice:function(message)
	{
		console.log(clc.white('NOTICE :: '+module.exports.SOURCE+' :: '+message));
	},
	warning:function(message)
	{
		console.log(clc.yellowBright('WARNING :: '+module.exports.SOURCE+' :: '+message));
	},
	error:function(message)
	{
		console.log(clc.redBright('ERROR :: '+module.exports.SOURCE+' :: '+message));
	},
}