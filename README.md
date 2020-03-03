# Karaoke Mugen

![logo](img/Logo-final-fond-transparent.png)

![presentation](img/presentation.png)

Master branch : [![pipeline status](https://lab.shelter.moe/karaokemugen/karaokemugen-app/badges/master/pipeline.svg)](https://lab.shelter.moe/karaokemugen/karaokemugen-app/commits/master) -
Next branch : [![pipeline status](https://lab.shelter.moe/karaokemugen/karaokemugen-app/badges/next/pipeline.svg)](https://lab.shelter.moe/karaokemugen/karaokemugen-app/commits/next)

![Last commit](https://img.shields.io/github/last-commit/AxelTerizaki/karaokemugen-app.svg) ![Latest version](https://img.shields.io/github/tag/karaoke-mugen/karaokemugen-app.svg) ![License](https://img.shields.io/github/license/karaoke-mugen/karaokemugen-app.svg) ![Size](https://img.shields.io/github/repo-size/karaoke-mugen/karaokemugen-app.svg) ![Discord](https://img.shields.io/discord/84245347336982528.svg)

[Visit Karaoke Mugen's homepage](http://karaokes.moe)

Karaoke Mugen is a playlist manager and player for video and audio karaoke. It's made of a webapp and an engine. The webapp allows users to search for and add songs and admins to manage the karaoke session and playlists. The engine plays those songs on the computer used to display the video.

It works like a japanese karaoke where anyone can add songs one after another to a playlist with their smartphone, tablet or computer. Another mode allows users to add songs to a suggestion list the admin can then pick songs from.

Karaoke Mugen works offline and does not require an Internet connection, but a few of its features may need online access.

This is a mature product, battle-tested during anime conventions like [Jonetsu](http://www.jonetsu.fr), Japan Expo or Japanantes and similar events, weddings, anime nights between friends, etc. There still are some bugs remaining we'd like to exterminate, obviously :)

## Features

* Accepted formats :
  * Video: AVI, MP4, MKV (anything supported by [mpv](http://mpv.io) really)
  * Subtitles: ASS, Karafun, KAR, Epitanime Toyunda, Ultrastar .txt files (if not ASS, they will be converted to ASS upon importation, and cannot be used directly)
  * Music: MP3, M4A, OGG
* Complete player controls : Skip, pause, play, stop, rewind playback, hide/show lyrics, mute/unmute and volume control
* Playlist management : Reorder, shuffle, copy and move songs around between playlists
* Blacklist and whitelist system : Create criterias to ban songs on.
* Complete metadata structure for songs : Singers, songwriters, creators, authors, languages, categorization tags...
* Complete filter system and search engine based on the aforementionned metadata.
* User profiles with access rights, favorites list, and other info
* Web interface for smartphone/tablet/PC ~~IE6 compatible~~
* Highly customized experience to tailor the app to your specific needs (in front of a crowd, between friends, for karaoke contests, etc.)
* Displays karaoke information or admin announcements during song playback
* Public or private mode :
  * In private mode (default) songs added by users are directly played one after the other in the current playlist
  * In public mode, songs are added to a suggestion list. It's up to the admin to add songs from this list.
* Export/import playlists and favorites
* [REST API](http://mugen.karaokes.moe/apidoc) so you can create custom clients or web interfaces.
* And many other things! Check out the [feature list](http://mugen.karaokes.moe/en/features.html)

## How it works

* See the install section below
* Place karaoke songs inside the `app/data` folder. See the [karaoke base repository](https://lab.shelter.moe/karaokemugen/karaokebase) and [documentation](http://docs.karaokes.moe/en/user-guide/manage/). If you don't want to add a full karaoke base for now, Karaoke Mugen will copy its samples in your `app/data` if it's left empty so you can try out the app. You can also individually download songs.
* Launch the app (see the launch section below). It will open a browser on the welcome screen. Follow the guided tour for admins.
* Once your playlist is ready, invite some friends and direct them to the public interface with their device. Let them add songs. Once enough songs are added, hit play and have fun!

In the repository mentioned above, you'll find a karaoke songs database ready for use. Beware, it's over a few hundreds gigabytes big once the videos have been downloaded.

For more information, check out the [documentation site!](http://docs.karaokes.moe)

## System requirements

The app is multi-platform and works on Linux/Windows/macOS.

It requires nodeJS 10.9 or above.

It also requires mpv and ffmpeg binaries (see below).

## Install

If you don't want to install manually, binaries are available [on the website](http://mugen.karaokes.moe/en/download.html) for Windows and macOS. For Linux, follow the following steps.

### Download

To install, git clone this repository with the `--recursive` flag since it uses git submodules or download one of the available binaries for macOS or Windows on [Karaoke Mugen's website](http://mugen.karaokes.moe)

### Config files and portability

If a file named `portable` exists in the same directory as KM, it will seek its config files in a `app` folder from that directory.

If that file does not exist, config files will be read from `~/KaraokeMugen/`.

Portable mode is useful if you're storing Karaoke Mugen on a removeable media or an external hard drive.

### Required binaries

mpv (video player), ffmpeg (video processing) and postgreSQL (database) are required by Karaoke Mugen

#### Depending on your system

##### Windows / macOS

Binaries must be placed in the `app/bin` folder (create it if it doesn't exist already).

You can also specify paths where to find those binaries in your `config.yml` file if you have them already installed elsewhere on your system and wish to use them. See `config.sample.yml` for examples.

##### Linux

Make sure ffmpeg/mpv are available in `/usr/bin`. If that's not the case, modify those paths in `config.yml`

Make sure postgres is launched and ready for use.

Linux distributions often package old versions of ffmpeg/mpv, update them first via their own websites' instructions.

#### mpv

mpv 0.25 or later for Windows/Linux, 0.27 or later is required for macOS ([mpv's website](http://mpv.io))

#### ffmpeg

ffmpeg 3 or later is required ([ffmpeg's website](http://www.ffmpeg.org))

#### PostgreSQL

PostgreSQL 10.6 or later is required ([postgreSQL's website](https://www.postgresql.org/))

Earlier PostgreSQL versions (9.x, 10.x...) should work but have not been tested.

Karaoke Mugen can use PostgreSQL in two ways :

- **Existing database cluster :** Connect to an existing PostgreSQL server (edit the `database.json` file to point to the correct server and database)
- **Bundlded PostgreSQL version :** If `bundledPostgresBinary` is set to `true` in `database.json` then Karaoke Mugen will seek a `app/bin/postgresql` directory. Inside, you should have a complete PostgreSQL distribution including a `bin`, `lib` and `share` folders. Karaoke Mugen needs to find the `pg_ctl` binary in the `bin` folder.

### Yarn

If you don't have `yarn`, install it first from [Yarn's website](http://yarnpkg.com)

### Git submodules

Initialize some git config values either via `yarn gitconfig` or by hand :

Warning : these are global. If you wish to make them local, put `local` after `config` in each command.

```sh
git config diff.submodule log
git config fetch.recursesubmodules on-demand
git config status.submodulesummary true
git config push.recursesubmodules on-demand
git config submodule.recurse true
```

### Dependencies

Launch `yarn` to install dependencies and build the React frontend and system control panel.

```sh
yarn setup
```

This runs install on the app, system panel and frontend then builds them.

### Database setup

Karaoke Mugen needs a PostgreSQL database to work.

Use the supplied `database.sample.json` file and copy it to `database.json` and place it in your data directory (`$HOME/KaraokeMugen` or `app/` in portable configurations). Edit it and fill in the blanks (username, password, port, host and database name of your choosing.) and switch `bundledPostgresBinary` to `false`. Leave `superuser` and `superuserPassword` blank. It should look like this :

```JSON
{
  "sql-file": true,
  "defaultEnv": "prod",
  "prod": {
    "driver": "pg",
    "user": "karaokemugen_app",
    "password": "musubi",
    "host": "localhost",
    "port": 5432,
    "database": "karaokemugen_app",
    "schema": "public",
    "superuser": null,
    "superuserPassword": null,
    "bundledPostgresBinary": false
  }
}
```

As a superuser on PostgreSQL, you need to create the database properly. Use the `psql` command-line tool to connect to your PostgreSQL cluster and create the needed database and extension. Example with the `database.json` above :

```SQL
CREATE DATABASE karaokemugen_app ENCODING 'UTF8';
CREATE USER karaokemugen_app WITH ENCRYPTED PASSWORD 'musubi';
GRANT ALL PRIVILEGES ON DATABASE karaokemugen_app TO karaokemugen_app;
```

Switch to the newly created database and enable the `unaccent` extension.

```SQL
\c karaokemugen_app
CREATE EXTENSION unaccent;
```

All done!

### Launch

To launch the app :

```sh
yarn start
```

Generating a database ie required on first launch and is done automatically if the database specified in `database.json` is empty. You can trigger it manually later by connecting to the admin panel from the welcome screen. Another way is to launch with the `--generate` command-line option.

On first run, the app will make you create an admin user and follow a guided tour of the operator/admin panel. You can trigger this tour/admin creation process again by setting `FirstRun` to `true` in your config file. Check the sample config file for example.

#### Launch without Electron

If you need to launch the app without Electron (like, for a Raspberry Pi system), use

```sh
yarn startNoElectron
```

## Translations

Currently french and english are supported. Translators are welcome!

## Contact

You can contact us by either

* Creating an issue
* Going to the [contact page](http://mugen.karaokes.moe/en/contact.html) and picking the communication channel of your choice.

## How to contribute

For general contributions, read the [dedicated section on the documentation website](http://docs.karaokes.moe/en/dev-guide/code/)

For code/development contributions, read the [contributing guide](CONTRIBUTING.md)

Everything's there, and if you have questions, you can come to [our Discord](http://karaokes.moe/discord) in the #karaoke_dev channel!

## Credits

"Nanamin", Karaoke Mugen's mascott as well as Karaoke Mugen's logo are designed by [Sedeto](http://www.sedeto.fr)

## License

MIT
