// récupère le chemin absolu vers l'applicatif lancé
// permet de résoudre le problème du finder MacOS qui execute dans l'environnement du dossier utilisateur
const os = require('os')
const fs = require('fs')
const path = require('path')
const logger = require('winston');

module.exports = function(testfile, callerDirname, paths){

	if(!testfile)
	{
		console.log('utils/resolveSyspath Fail : Unable to locate Syspath without target test file');
		return false;
	}

	callerDirname = callerDirname ? callerDirname : __dirname;
	paths = paths ? paths : ['./'];

	// try native node path vars callerDirname first
	for(var i in paths)
	{
		if(fs.existsSync(path.join(callerDirname,paths[i],testfile)))
		{
			return path.join(callerDirname,paths[i]);
		}
	}

	basepath = process.argv[0];
	if(os.platform()=='win32')
	{
	    basepath = basepath.split('\\');
	    basepath = basepath.slice(0, basepath.length-1).join('\\')+'\\';
	}
	else
	{
	    basepath = basepath.split('/');
	    basepath = basepath.slice(0, basepath.length-1).join('/')+'/';
	}

	for(var i in paths)
	{
		if(fs.existsSync(path.join(basepath,paths[i])))
			return path.join(basepath,paths[i]);
	}

	logger.error('utils/resolveSyspath Fail : Can not locate '+testfile);
	return false;
}