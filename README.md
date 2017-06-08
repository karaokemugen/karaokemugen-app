# Toyunda Mugen


Bienvenue dans Toyunda Mugen. 

Toyunda Mugen est un système de gestion de playlist de karaoke vidéo. Il se présente sous la forme d'une appli web et d'un daemon. L'appli web permet aux gens d'ajouter des chansons à la playlist et l'administrateur de gérer cette playlist. Le daemon tourne et lance ces chansons sur l'ordinateur qui projette les vidéos.

Il fonctionne comme un karaoké à la japonaise où chacun peut ajouter des chansons à la suite de la playlist. Un autre mode permet au public d'ajouter des vidéos à une liste de suggestions que l'administrateur prendra soin d'ajouter ou non.

## Principe

Il y a deux modules :
- Un serveur web sur lequel les utilisateurs du karaoke dans la pièce se connectent (cela implique qu'ils soient sur le même réseau wifi) et ajoutent des chansons à une playlist
- Un daemon (appelé player) qui lit la playlist en continu et joue les chansons qui y sont ajoutées au fur et à mesure. Le daemon lance le player vidéo nécessaire pour le karaoke (selon le type de fichier karaoke) 

Les fichiers doivent être placés dans un répertoire app/data. 

## Téléchargement

Nous sommes actuellement aux débuts de la réécriture en node.js de Toyunda Mugen.

Une version "legacy" en PHP existe sur ce dépôt :
https://lab.shelter.moe/toyundamugen/toyundamugen-app-legacy

## Pré-requis système

N'importe quoi qui fait tourner node.js (l'application est prépackagée) L'application fonctionne sous OSX/Linux/Windows.

Sous Linux vous aurez cependant besoin de :
* mpv
* rsync (pour le système de mise à jour, si utilisé.)
    
## Langages

Toyunda Mugen est écrit en node.js et contient quelques scripts bash à usage unique.

## Fonctionnalités :

- Gère vidéos seules ou vidéos + sous-titres embarqués.
- Gère le formats de time .ass 
- Permet de passer une chanson
- Ajout de chanson après celle en cours
- Mettre le karaoke en pause ou le relancer
- Shuffle de la playlist
- Ajout de la base entière dans la playlist
- Arrêt complet depuis l'interface web
- Interface pour smartphone/tablette et PC
- Affiche le titre du karaoké au début de la vidéo.
- Système de mise à jour rsync intégré si vous avez votre propre base de karaokés sur un serveur dédié.

## Comment ça fonctionne

* Assurez-vous d'avoir un dossier "data" dans "app" avec les dossiers suivants :
	* karas
	* lyrics
	* videos

* Placez des karaoké à l'intérieur. Voir https://lab.shelter.moe/toyundamugen/times

Sur le clavier de la machine lançant Toyunda Mugen :
* q : quitter le kara en cours (ça passe à la chanson suivante)
* Flèche gauche et droite : avancer un peu ou reculer dans le kara
* Flèche haut et bas : avancer ou reculer plus vite
* ESPACE : pause

### Comment ajouter vos propres karas sans les envoyer.

C'est possible mais c'est mieux de partager ! 

* Un fichier .kara dans le dossier app/data/ini 
* Un fichier .ass dans app/data/lyrics. Ce fichier n'est pas nécessaire si votre vidéo contient des sous-titres déjà dans le container (comme dans les mkv)
* Un fichier .mkv/.avi/.mp4/.webm... dans app/data/videos

Consultez le README.md du dépôt des times pour plus d'informations sur le format.
https://lab.shelter.moe/toyundamugen/times

## Comment participer au code

Lisez le Wiki ! 
https://lab.shelter.moe/toyundamugen/toyundamugen-app/wikis/home

## Envoyer vos propres karaokés pour validation

* Le plus simple c'est d'aller là : http://mei.do/toyundamugen
	* Ceci m'envoie votre kara pour que je le valide et l'ajoute à la base : https://lab.shelter.moe/toyundamugen/times
* Vous pouvez également contribuer vous-même à cette base si vous préférez le faire. Pour la vidéo, merci d'indiquer un lien où la récupérer dans votre commit.
