# Versions

## v2.0 Release Candidate 1 "Finé Fiévreuse" - 25/10/2017

### Améliorations

- #181 Karaoké Mugen peut désormais passer des jingles vidéo entre X karaokés !
  - Déposez de courtes vidéos dans le dossier `app/jingles` (ou tout autre dossier de votre choix via le paramètre `PathJingles` de votre fichier `config.ini`)
  - Réglez le paramètre "Intervalle entre les jingles" dans l'interface ou modifiez `EngineJinglesInterval` pour définir le nombre de chansons qui doivent passer avant qu'un jingle ne passe (20 chansons par défaut, soit environ 30 minutes de karaoké)
  - Les jingles ne sont pas affichés dans la playlist !
  - Leur gain audio est calculé au démarrage de l'app (#185)
- #180 Le QR Code est maintenant affiché en surimpression par le lecteur vidéo
  - Démarrage du coup plus rapide car pas de fichier image à modifier.
  - Déposez des fonds d'écran dans le dossier `app/backgrounds` et Karaoke Mugen en prendra aléatoirement un pour l'afficher entre deux chansons.
- #182 Dans l'affichage des playlists, le temps restant de celle-ci s'affiche désormais en bas à droite.
- #172 Les fichiers de log sont maintenant nommés avec la date du jour.
- #175 Les chemins spécifiés dans le fichier `config.ini` peuvent maintenant être multiples. 
  - Karaoke Mugen ira chercher dans chaque dossier (karas, paroles, vidéos, fonds d'écran
, jingles...) tous les fichiers s'y trouvant. Par exemple si vous avez trois dossiers de vidéos listés, Karaoke Mugen vérifiera la présence de vidéo dans chaque dossier avant d'abandonner.
  - Pour indiquer plusieurs dossiers, il faut séparer leurs chemins par des pipes `|`. `Alt Droit + 6` sur un clavier AZERTY. Exemple : `app/data/videos|D:/mesvideostest`
  - Les chemins seront traités dans l'ordre. Si une même vidéo (par exemple) existe dans deux dossiers, c'est celle du premier dossier listé qui sera prise en priorité
- #174 Ajout d'un paramètre `EngineAutoPlay` (Lecture Automatique) qui lance la lecture automatiquement dés qu'un karaoké est ajouté, si celui est sur stop. 
  - Pour toujours plus de KARAOKE INFINI.
- #174 Ajout d'un paramètre `EngineRepeatPlaylist` (Répéter la playlist courante)
  - Cela permet de relancer celle-ci automatiquement lorsqu'on arrive au dernier morceau. 
- #137 Nouvelle fonction Lire Ensuite. 
  - Un clic droit sur le bouton d'ajout d'un kara permet de l'insérer pile après la chanson en cours !
- #179 Boutons de navigation "retour en haut/en bas/kara en cours" ajoutés
- #196 Personnalisation des infos affichées en bas de l'écran durant les pauses/jingles
  - `EngineDisplayConnectionInfo` : Affiche ou non les infos de connexion (défaut : 1)
  - `EngineDisplayConnectionInfoQRCode` : Affiche ou non le QR Code (défaut : 1)
  - `EngineDisplayConnectionInfoHost` : Force une adresse IP/nom d'hôte pour l'URL de connexion (défaut : vide)
  - `EngineDisplayConnectionInfoMessage` : Ajoute un message avant celui avec l'URL. Par exemple pour indiquer un réseau Wifi auquel se connecter au préalable.
  - Les informations de connexion sont réaffichées à 50% de la chanson en cours pendant 8 secondes
- #195 Les informations de la chanson sont maintenant affichées aussi à la fin de la chanson en cours
- Il est désormais possible d'indiquer à Karaoke Mugen un chemin web (HTTP) pour récupérer les vidéos s'il ne les trouve pas dans vos dossiers. 
  - Si vous êtes sur un réseau local ou que vos vidéos sont hébergées sur Internet, vous pouvez spécifier `PathVideosHTTP=http://monsiteweb.com/videos` pour que Karaoke Mugen streame les vidéos. Cela ne les télécharge pas définitivement sur votre disque dur !
- #189 Des openings ou endings spécifiques peuvent être recherchés désormais.
- La recherche prend en compte l'auteur du karaoké
- #184 Le temps de passage d'un karaoké dans la liste de lecture courante est indiqué (genre "dans 25 minutes")
- Les karas dans la liste publique/de suggestions sont supprimés dés qu'ils sont joués en courante.
- #135 L'interface est traduite en anglais et français et se base sur la langue de votre navigateur. On a posé les bases pour une traduction en d'autres langues
- #197 Bouton aller au début/en fin de playlist et aller au kara en cours de lecture
- #204 Nouveau critère de blacklist (nom de la série) 
- #92 Une limite de chansons par utilisateur a été mise en place. 
  - Une fois définie, la limite empêche les gens d'ajouter un karaoké s'ils ont déjà ajouté trop de chansons. Une fois les chansons de l'utilisateur passées, il peut en ajouter de nouvelles.

### Corrections 

- #75 Utilisation d'un nouveau module d'accès à la base de données SQLite permettant de gérer les migrations et les promesses.
- #191 Les pseudos contenant { } sont maintenant correctement affichés à l'écran
- Optimisations de la génération de la base de données
  - La génération de la base de données ne réécrit plus inutilement les .kara (uniquement s'il y a des modifications apportées, vidéo changée, etc.)
  - Ajout de profiling sur les différentes étapes pour voir lesquelles prennent du temps
  - Les tests d'intégrité de la base utilisateur utilisent maintenant une transaction et sont bien plus rapides si vous avez beaucoup de playlists ou de karas blacklistés.
  - Les fichiers de paroles vides (vidéos hardsubbées, etc.) ne sont plus écrits dans la base.
  - Tests en cas de bases de données mal formées pour déclencher une regénération si besoin
- #169 Fix du fichier log inexistant
- #178 Les champs de saisie des critères de blacklist sont désormais pleinement utilisables, en toutes circonstances (même durant les horaires de nuit)
- #177 Le scrolling sur iPad/iPhone/iTouch est maintenant plus fluide
- #114 Les critères de blacklist sont maintenant correctement mis à jour lors d'une régénération e la base.
- Plus de type "inutilisé" parmi les critères de blacklist !
- Quelques fix d'interfaces au niveau des critères de blacklist (notamment #192)
- #193 Les changements de mot de passe devraient mieux se passer désormais.
- #186 Les tests d'intégrité de la base utilisateur sont réalisés à chaque lancement si la base karas et utilisateur n'ont pas été générées en même temps.
- #183 La recherche des noms de série alternatives marche de nouveau correctement
- Un message est affiché quand les paroles ne sont pas affichables dans l'interface
- #205 #206 "Tags" devient "Métadonnées" dans l'interface
- #194 Soucis de scrolling en cas de karas avec plusieurs lignes corrigé
- #207 Les langues sont traduites dans la liste des critères d'une blacklist
- #208 Le critère "tag par nom" n'est plus sensible à la casse
- #210 La blacklist se rafraichit désormais correctement
- #213 Les paramètres "AlwaysOnTop" et "Fullscreen" sont désormais bien affichés sur l'interface par rapport à la réalité du terrain.
- #212 Le QRCode est maintenant en haut de l'écran pour éviter que des lignes trop longues en bas ne s'affichent dessus
- #211 La suppression multiple d'éléments de la whitelist fonctionne de nouveau
- #209 On peut de nouveau ajouter plusieurs karaokés d'un coup à la blacklist
- #190 La suppresion de plusieurs karaokés devrait être plus rapide

### Développement

- Passage à Babel/ES2015+ tout doucement. (Nécessite Node8)
- **Modification d'API** : Les messages de réponse de l'API ont été complètement revus, consultez la documentation pour plus d'informations.
- #135 Les retours de l'API ont été normalisés. Une doc plus précise et complète va bientôt être disponible

### Mettre à jour

#### Versions binaires

- Soon(tm)

#### Version source

- Récupérer le dernier code source

```sh
git fetch
git checkout v2.0-rc1
```

- Mettre à jour les packages

```sh
yarn install
```

Si `yarn` n'est pas installé :

```sh
npm install -g yarn
```

`npm`, c'est un peu comme Internet Explorer, son seul intêret c'est d'installer `yarn`

## v2.0 Beta 2 "Finé Foutraque" - 29/09/2017

### Améliorations

- #130 Le bouton "J'ai de la chance !" piochera désormais dans le résultat de votre recherche. Par exemple si vous tapez "Naruto" il prendra au hasard un OP/ED de Naruto.
- #134 Ajouter une selection deselectionne les karas selectionnés (une modification selectionnée par nos soins)
- #138 Lors d'un changement de paramètre nécessitant un redémarrage du lecteur, celui-ci redémarrera à la fin de la chanson en cours (par exemple changer d'écran ne peut pas être fait à la volée)
- #144 L'export de liste de lecture (et l'import) prend désormais en compte où vous en étiez dans la liste de lecture
- #146 L'administrateur peut maintenant afficher des messages à l'écran du karaoké ou sur les interfaces des utilisateurs (ou les deux). L'affichage à l'écran supporte les tags ASS.
- #164 L'application refusera de démarrer si vous n'avez pas mpv 0.25 d'installé sur votre système. Cela ne concerne que les cas où vous fournissez votre propre mpv à Karaoke Mugen.
- #143 Les paramètres pour spécifier les binaires de mpv selon votre OS (`BinPlayerOSX`, `BinPlayerWindows` et `BinPlayerLinux`) sont désormais bien pris en compte
- #145 Lors du premier lancement, ce sont cinq karaokés aléatoires qui sont ajoutés à la liste de lecture courante, pas juste les 5 premiers.
- #73 Le fond d'écran quand un karaoké n'est pas actif est maintenant personnalisable ! Spécifiez son nom avec l'option `PlayerBackground` dans votre fichier `config.ini`. Les fonds d'écran doivent être déposés dans le dossier `app/backgrounds`
- #62 La génération ne foutra plus en l'air vos .kara en cas d'erreur inattendue.
- #154 Lors de la génération, les fichiers cachés sont ignorés.
- #131 Utiliser la molette quand la souris passe sur la fenêtre du lecteur monte ou descend le son au lieu d'avancer/reculer dans la vidéo.
- #165 Sous macOS, le fichier de log reste dans le dossier de Karaoke Mugen (avant il allait dans le dossier home de l'utilisateur)
- #60 La génération de la base de données affiche désormais sa progression pour éviter de vous faire baliser lorsque que votre ordinateur est trop lent.
- Le lecteur vidéo sous macOS gére bien mieux le plein écran (utilisation de `--no-native-fs`)
- Les informations à l'écran lorsqu'un karaoké n'est pas en cours sont écrites plus clairement, et le QR Code mieux dimensionné
- Les listes de lecture sont maintenant triées par nom
- L'interface est désormais totalement en thème sombre

### Correctifs

- #133 Le paramètre "Toujours au dessus" fonctionne désormais normalement
- #136 Fixes d'interface et francisation de nombreux éléments texte encore en anglais
- #140 Revue du CSS de l'interface
- #129 Optimisation de la base de données pour ne plus ajouter d'ASS vides en cas de hardsubs.
- #148 L'initialisation de certaines pages de la webapp se passe mieux
- Lors de la génération de la base de données, le champ "series" d'un .kara est maintenant pris en compte correctement
- De nombreux, nombreux correctifs d'interface.
- L'import de grandes playlists fonctionne désormais normalement
- Le lecteur s'arrête normalement si la liste de lecture courante est vide et qu'on essaye de la jouer.
- Lorsque la base de données est vide, le Dummy Plug s'active pour vous ajouter 5 karaokés au hasard de votre base. Il n'y aura plus de message d'erreur si vous avez moins de 5 karaokés, voire pas de karaoké du tout.

### Problèmes connus

- Sous certaines configurations macOS, un warning de type `UnhandledPromiseRejection` peut apparaître au changement de chansons, nous sommes sur le coup. Ce message n'empêche en aucun cas d'utiliser l'application.
- Si vous avez des critères de blacklist assez divers, certains peuvent être éronnés après une regénération de votre base. Pensez à les vérifier après chaque génération ! Voir l'issue #114

## v2.0 Beta 1 "Finé Flegmatique" - 18/09/2017

Aucune note de sortie

## v2.0 Alpha "Finé Folklorique" - 29/08/2017

Aucune note de sortie