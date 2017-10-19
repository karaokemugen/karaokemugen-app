# Karaoke Mugen

Bienvenue dans Karaoke Mugen.

Karaoke Mugen est un système de gestion de playlist de karaoke vidéo. Il se présente sous la forme d'une appli web et d'un moteur. L'appli web permet aux gens d'ajouter des chansons à la playlist et l'administrateur de gérer cette playlist. Le moteur tourne et lance ces chansons sur l'ordinateur qui projette les vidéos.

Il fonctionne comme un karaoké à la japonaise où chacun peut ajouter des chansons à la suite de la playlist via son smartphone, tablette ou ordinateur. Un autre mode permet au public d'ajouter des vidéos à une liste de suggestions que l'administrateur prendra soin d'ajouter ou non.

## Téléchargement

Pour installer, clonez le dépôt, puis utilisez `yarn`.

Si vous n'avez pas `yarn` :

```sh
npm install -g yarn
```

Puis lancez `yarn` pour installer les dépendances.

```sh
yarn install
```

Créez un dossier `app/data` puis balancez le contenu du dossier `samples` dedans, pour tester.

Pour lancer l'app :

```sh
npm start
```

La génération de la base de données est nécessaire à la première utilisation et se fait automatiquement si le fichier `app/data/karas.sqlite3` n'existe pas. Vous pouvez la déclencher manuellement plus tard en vous connectant sur `http://localhost:1338` (mot de passe par défaut `gurdil` ou la valeur de `AdminPassword` dans le fichier `config.ini` personnel) et en ayant placé des karaokés dans `app/data/` (voir plus bas).

## Pré-requis système

L'application fonctionne sous OSX/Linux/Windows.

* NodeJS 8
* npm 5
* yarn 1


### Binaires

mpv (lecteur vidéo) et ffmpeg/ffprobe (traitement vidéo) sont nécessaires au fonctionnement de Karaoke Mugen :

* mpv 0.25 minimum, 0.27 sous macOS ([site web de mpv](http://mpv.io))
* ffmpeg / ffprobe ([site web de ffmpeg](http://www.ffmpeg.org))

#### Windows/macOS

Les executables sont à placer dans le dossier `app/bin` (le créer s'il n'existe pas) :

Vous pouvez également spécifier les chemins menant vers ces binaires dans votre fichier de configuration `config.ini`

#### Linux

Assurez-vous que ffmpeg/ffprobe/mpv sont disponibles dans le chemin `/usr/bin`. Si ce n'est pas le cas, modifiez leurs chemins dans `config.ini`

Les distributions linux embarquent souvent de vieilles versions de ffmpeg/ffprobe/mpv, mettez-les à jour grâce aux instructions sur leurs sites web respectifs.

## Langages

Karaoke Mugen est écrit en NodeJS et utilise Babel / ES2015+

## Fonctionnalités

Certaines sont encore à venir, mais ça doit vous donner une idée de l'étendue du projet

* Gère vidéos seules ou vidéos + sous-titres embarqués.
* Gère le formats de sous-titrage .ass
* Permet de passer une chanson
* Affiche les paroles des chansons dans l'interface
* Mettre le karaoke en pause ou le relancer
* Shuffle de la playlist
* Ajout de la base entière dans la playlist
* Arrêt complet depuis l'interface web
* Interface pour smartphone/tablette et PC, ~~compatible IE6~~
* Affiche le titre du karaoké au début de la vidéo.
* Système de mise à jour rsync intégré si vous avez votre propre base de karaokés sur un serveur dédié.
* Système de tags pour les karaokés : année, studio, chanteur/euse, compositeur/euse, langue...
* Savoir qui a demandé tel karaoké parmi vos invités.
* Pilotage du lecteur depuis l'interface admin
* Mode public ou privé :
  * En mode privé (par défaut) les karaokés ajoutés par les utilisateurs sont directement mis à la suite dans la playlist courante.
  * En mode public, les karaokés sont ajoutés à une liste de suggestions et c'est à l'administrateur de décider quelles chansons ajouter !
* Export/import de playlists
* API REST pour le développement d'autres interfaces ou de clients mobiles
* Et plein d'autres choses : allez voir la [liste des fonctionnalités](http://mugen.karaokes.moe/features.html) !

## Comment ça fonctionne

* Voir la partie téléchargement
* Placez des karaoké à l'intérieur d'un dossier `app/data`. Voir le [dépôt de la base](https://lab.shelter.moe/karaokemugen/karaokebase) et la [documentation](http://mugen.karaokes.moe/docs/user-guide/manage/)
* L'interface web écoute par défaut sur le port 1337 : `http://localhost:1337`
* Passez en admin via : `http://localhost:1337/admin`. Le mot de passe par défaut est `gurdil` et vous pouvez mettre ce que vous voulez en nom d'utilisateur. De cette interface, vous pouvez ajouter/gérer vos karaokés et lancer la lecture !

Sur le dépôt cité plus haut, vous trouverez une base de karaokés déjà prête à l'emploi. Attention, celle-ci pèse 160 Go une fois les vidéos téléchargées.

Pour en savoir plus, [lisez le site de documentation !](http://mugen.karaokes.moe/docs/)

## Comment participer au code

Il y a une [section dédiée sur le site de documentation](http://mugen.karaokes.moe/docs/dev-guide/code/) !

Tout y est expliqué, ou presque, et si vous avez des questions, venez sur [notre Discord](https://discord.gg/a8dMYek) !

## Ancienne version

Une version "legacy" en PHP existe sur [ce dépôt](https://lab.shelter.moe/karaokemugen/toyundamugen-app-legacy)

Cette version est fonctionelle mais assez basique. Elle n'est par contre plus maintenue.
