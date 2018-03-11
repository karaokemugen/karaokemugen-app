// récupère le chemin absolu vers l'applicatif lancé
// permet de résoudre le problème du finder MacOS qui execute dans l'environnement du dossier utilisateur
const os = require('os');
const fs = require('fs');
const path = require('path');

module.exports = function(testfile, callerDirname, paths){
	if(!testfile) {
		return path.join(callerDirname,paths);
	}

	callerDirname = callerDirname ? callerDirname : __dirname;
	paths = paths ? paths : ['./'];

	// try native node path vars callerDirname first
	for(var i in paths) {
		if(fs.existsSync(path.join(callerDirname,paths[i],testfile))) {
			return path.join(callerDirname,paths[i]);
		}
	}

	var basepath = process.argv[0];
	if(os.platform()=='win32') {
		basepath = basepath.split('\\');
		basepath = basepath.slice(0, basepath.length-1).join('\\')+'\\';
	} else {
		basepath = basepath.split('/');
		basepath = basepath.slice(0, basepath.length-1).join('/')+'/';
	}

	for(var j in paths) {
		if(fs.existsSync(path.join(basepath,paths[j])))
			return path.join(basepath,paths[j]);
	}

	console.log('utils/resolveSyspath Fail : Can not locate '+testfile);
	return false;
};