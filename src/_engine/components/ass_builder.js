var path = require('path');

module.exports = function(subfile, videofile, output_folder, title, requester){
	// construit un ass temporaire à partir de subfile
	// si subfile n'existe pas on test si video file n'est pas un mkv (si c'est le cas on extrait la piste de sous titre pour la traiter)
	// le fichier de sortie sera stocké dans output_folder (chemin systme complet fournit à l'appel)

	// ici pour la démo le fichier n'est pas modifier on renvoi directement le chemin d'origine
	return new Promise(function(resolve, reject){
		if(true) // tout vas bien
			resolve(subfile);
		else
			reject('hu ho!');
	});
}