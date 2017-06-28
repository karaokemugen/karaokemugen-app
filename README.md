# Toyunda Mugen


Bienvenue dans Toyunda Mugen. 

Toyunda Mugen est un système de gestion de playlist de karaoke vidéo. Il se présente sous la forme d'une appli web et d'un moteur. L'appli web permet aux gens d'ajouter des chansons à la playlist et l'administrateur de gérer cette playlist. Le moteur tourne et lance ces chansons sur l'ordinateur qui projette les vidéos.

Il fonctionne comme un karaoké à la japonaise où chacun peut ajouter des chansons à la suite de la playlist. Un autre mode permet au public d'ajouter des vidéos à une liste de suggestions que l'administrateur prendra soin d'ajouter ou non.

## Principe

Il y a deux modules principaux :
- Un serveur web sur lequel les utilisateurs du karaoke dans la pièce se connectent (cela implique qu'ils soient sur le même réseau wifi) et ajoutent des chansons à une playlist via leur appareil de prédilection (mobile, tablette, ordinateur...)
- Un moteur qui lit la playlist en continu et joue les chansons qui y sont ajoutées au fur et à mesure. Le moteur lance le player vidéo nécessaire pour le karaoke.

## Téléchargement

Nous sommes actuellement aux débuts de la réécriture en node.js de Toyunda Mugen.

Une version "legacy" en PHP existe sur ce dépôt :
https://lab.shelter.moe/toyundamugen/toyundamugen-app-legacy

Cette version est parfaitement fonctionelle mais assez basique.

## Pré-requis système

N'importe quoi qui fait tourner node.js (l'application sera prépackagée).

L'application fonctionne sous OSX/Linux/Windows.

Sous Linux vous aurez cependant besoin de :
* mpv
* ffmpeg / ffprobe

Sous Windows et OSX les binaires seront téléchargés automatiquement.

    
## Langages

Toyunda Mugen est écrit en node.js et contient quelques scripts bash à usage unique.

## Fonctionnalités :

- Gère vidéos seules ou vidéos + sous-titres embarqués.
- Gère le formats de sous-titrage .ass 
- Permet de passer une chanson
- Ajout de chanson après celle en cours
- Mettre le karaoke en pause ou le relancer
- Shuffle de la playlist
- Ajout de la base entière dans la playlist
- Arrêt complet depuis l'interface web
- Interface pour smartphone/tablette et PC
- Affiche le titre du karaoké au début de la vidéo.
- Système de mise à jour rsync intégré si vous avez votre propre base de karaokés sur un serveur dédié.
- Système de tags pour les karaokés.
- Savoir qui a demandé tel karaoké parmi vos invités.
- et quelques autres choses encore...!

## Comment ça fonctionne

* Récupérez une version de ce dépôt via un git clone ou un téléchargement.
* Assurez-vous d'avoir ffprobe.exe et mpv.exe dans un dossier app/bin* 
* Placez des karaoké à l'intérieur d'un dossier app/data. Voir https://lab.shelter.moe/toyundamugen/times

## Comment participer au code

Lisez le Wiki ! 
https://lab.shelter.moe/toyundamugen/toyundamugen-app/wikis/home

Tout y est expliqué, ou presque, et si vous avez des questions, il y a un lien vers le Discord où nous échangeons quotidiennement !