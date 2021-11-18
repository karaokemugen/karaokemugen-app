# Karaoke Mugen

![logo](img/Logo-final-fond-transparent.png)

![presentation](img/presentation.png)

Master branch: [![pipeline status](https://lab.shelter.moe/karaokemugen/karaokemugen-app/badges/master/pipeline.svg)](https://lab.shelter.moe/karaokemugen/karaokemugen-app/commits/master) -
Next branch: [![pipeline status](https://lab.shelter.moe/karaokemugen/karaokemugen-app/badges/next/pipeline.svg)](https://lab.shelter.moe/karaokemugen/karaokemugen-app/commits/next) [![Requirements Status](https://requires.io/github/AxelTerizaki/karaokemugen-app/requirements.svg?branch=master)](https://requires.io/github/AxelTerizaki/karaokemugen-app/requirements/?branch=master)


Project: ![Last commit](https://img.shields.io/github/last-commit/AxelTerizaki/karaokemugen-app.svg) ![Latest version](https://img.shields.io/github/tag/karaoke-mugen/karaokemugen-app.svg) ![License](https://img.shields.io/github/license/karaoke-mugen/karaokemugen-app.svg) ![Size](https://img.shields.io/github/repo-size/karaoke-mugen/karaokemugen-app.svg) ![Commits since release on next](https://img.shields.io/github/commits-since/axelterizaki/karaokemugen-app/release/next)

Social: [![Discord](https://img.shields.io/discord/84245347336982528.svg)](http://karaokes.moe/discord) Twitter [![Social](https://img.shields.io/twitter/follow/KaraokeMugen?label=Follow)](https://twitter.com/KaraokeMugen)

Karaoke Mugen is a playlist manager and player for video and audio karaoke. It's made of a webapp and an engine. The webapp allows users to search for and add songs and admins to manage the karaoke session and playlists. The engine plays those songs on the computer used to display the video.

It works like a japanese karaoke where anyone can add songs one after another to a playlist with their smartphone, tablet or computer. The playlist can be reviewed by an operator or played "as is". This behaviour is configurable.

Karaoke Mugen can work offline and can do without an Internet connection, but a few of its features need online access.

This is a mature product, battle-tested during anime conventions like [Jonetsu](http://www.jonetsu.fr), Japan Expo or Japanantes and similar events, weddings, anime nights between friends, etc. There still are some bugs remaining we'd like to exterminate, obviously :).

[Visit Karaoke Mugen's homepage](http://karaokes.moe)

## Features

* **Accepted formats**:
  * **Video**: AVI, MP4, MKV (anything supported by [mpv](http://mpv.io) really)
  * **Subtitles**: ASS, Karafun, KAR, Epitanime Toyunda v1-v3, Ultrastar .txt files (if not ASS, they will be converted to ASS upon importation, and cannot be used directly)
  * **Music**: MP3, M4A, OGG (anything supported by [mpv](http://mpv.io) really)
* **Complete player controls**: Skip, pause, play, stop, rewind playback, hide/show lyrics, mute/unmute and volume control.
* **Playlist management**: Reorder, shuffle, copy and move songs around between playlists
  * Playlists can be _current_ (used by the video player) and/or _public_ (where users can send songs to)
  * Playlists can be _hidden_ from public interface.
  * Some songs in the playlist can be _hidden_, these songs will be displayed as "???" to keep the surprise to public users.
  * Playlists can be _smart_ : automatically generate playlists depending on some criterias.
* **Blacklist and whitelist system**: Hide some songs from public view.
* **Complete metadata structure for songs**: Singers, songwriters, creators, authors, languages, categorization tags...
  * Complete **filter system** and **search engine** based on the aforementionned metadata.
* **System Panel** to configure Karaoke Mugen:
  * **Multi-karaoke repositories support**: You can add as many repositories you want. Karaoke Mugen has 2 "official repositories": the [otaku base](https://lab.shelter.moe/karaokemugen/bases/karaokebase) and the [world base](https://lab.shelter.moe/karaokemugen/bases/karaokebase-world)
  * **Configure** application behaviour and **view logs**
  * **Manage** your song library (add, remove, edit...)
  * **View stats** like most played or requested songs
* **User profiles** with access rights, favorites list, and preferences
* **Web interface** for smartphone/tablet/PC ~~IE6 compatible~~
  * Public interface is for public and can be set to _restricted mode_ to prevent adding songs or in _closed mode_ to prevent access while you prepare your karaoke.
  * Users can **add songs** they want from the library.
  * Operators can **organize playlists** and control the player through the operator interface.
* **Highly customizable experience** to tailor the app to your specific needs (for twitch streams, in front of a crowd, between friends, for karaoke contests, etc.)
* **Display karaoke information** or operator announcements during song playback
* **Export/import** playlists, favorites, blacklist criterias sets
* And **many other things**! Check out the [feature list](http://mugen.karaokes.moe/en/features.html)

## How it works

* See the **[install](#install)** section below
* **Launch the app** (see the **[launch](#launch)** section below). You will be prompted with some questions and you will need to create an account (online or local).
* Karaoke Mugen will update its database on startup with the default karaoke repository. You can alternatively create your own repositories and karaokes. See the [karaoke base repository](https://lab.shelter.moe/karaokemugen/bases/karaokebase) and [documentation](http://docs.karaokes.moe/en/user-guide/manage/).
* Once your playlist is ready, invite some friends and direct them to the public interface with their device. Let them add songs. Once enough songs are added, hit play and **have fun**!

Medias are downloaded on the go, but you can pre-download everything (beware, it's several hundred gigabytes big!) if you're preparing a karaoke event in a place without reliable Internet for example.

For more information, check out the [documentation site](http://docs.karaokes.moe)!

## System requirements

The app is multi-platform and works on Linux/Windows/macOS.

For source installs, it requires nodeJS 14 or above, as well as postgresql, GNU patch, mpv and ffmpeg binaries (see below).

For binary installs, everything's included.

## Install

If you don't want to install manually, binaries are available [on the website](http://mugen.karaokes.moe/en/download.html) for Windows, Linux and macOS. The instructions below are for early-adopters, power users or devs who want to tinker with the app.

### Download

To install, git clone this repository with the `--recursive` flag since it uses git submodules or download one of the available binaries for macOS or Windows on [Karaoke Mugen's website](http://mugen.karaokes.moe).

### Config files and portability

If a file named `portable` exists in the same directory as KM, it will seek its config files in a `app` folder from that directory.

If that file does not exist, config files will be read from `~/KaraokeMugen/`.

Portable mode is useful if you're storing Karaoke Mugen on a removeable media or an external hard drive.

### Required binaries

mpv (video player), ffmpeg (video/audio processing), GNU Patch (data updates), and postgreSQL (database) are required by Karaoke Mugen.

#### Depending on your system

You can also define paths where to find those binaries in your `config.yml` file if you have them already installed elsewhere on your system and wish to use them. See `config.sample.yml` for examples.

Here are the default places where Karaoke Mugen will look for these binaries below :

##### Windows / macOS

Binaries must be placed in the `app/bin` folder (create it if it doesn't exist already).

##### Linux

Make sure ffmpeg/mpv are available in `/usr/bin`. If that's not the case, modify those paths in `config.yml`.

Make sure postgres is launched, [configured](#PostgreSQL) and ready for use.

Linux distributions often package old versions of ffmpeg/mpv/postgresql, update them first via their own websites' instructions.

#### mpv

mpv 0.33 or later is required. ([mpv's website](http://mpv.io))

#### ffmpeg

ffmpeg 3 or later is required ([ffmpeg's website](http://www.ffmpeg.org))

#### Patch

You'll need a version of the GNU patch utility 2.7 or above so Karaoke Mugen can apply git-patches sent via Karaoke Mugen Server to keep your song lists up to date.

* On Windows, you can download a pre-compiled one [here](https://mugen.karaokes.moe/downloads/patch.exe)
* On macOS we recommend you use [Homebrew](https://brew.sh)
* On Linux, make sure your distribution has the latest patch package.

#### PostgreSQL

PostgreSQL 13.x or later is required ([postgreSQL's website](https://www.postgresql.org/))

Version 12.x can work but we're bundling 13 with the binary distribution of Karaoke Mugen, so we'll base any feature decision later on version 13.

Later PostgreSQL versions should work just fine.

Karaoke Mugen can use PostgreSQL in two ways :

* **Existing database cluster :** Connect to an existing PostgreSQL server (edit the `config.yml` file to point to the correct server and database). **This is the preferred way on Linux systems**.
* **Bundled PostgreSQL version :** If `bundledPostgresBinary` is set to `true` in `config.yml` then Karaoke Mugen will seek a `app/bin/postgresql` directory. Inside, you should have a complete PostgreSQL distribution including a `bin`, `lib` and `share` folders. Karaoke Mugen needs to find the `pg_ctl` binary in the `bin` folder.

See [Database setup](#Database-setup) for more information.

### Yarn

If you don't have `yarn`, install it first from [Yarn's website](http://yarnpkg.com)

### Git submodules

Initialize some git config values either via `yarn gitconfig` or by hand:

```sh
git config diff.submodule log
git config fetch.recursesubmodules on-demand
git config status.submodulesummary true
git config push.recursesubmodules on-demand
git config submodule.recurse true
```

Use the `yarn pull` command (which is a shortcut for git pull with submodules) to update submodules.

### Dependencies

Launch `yarn` to install dependencies and build the React frontend

```sh
yarn setup
```

This runs install on the app and frontend then builds them.

### Database setup

Karaoke Mugen needs a PostgreSQL database to work.

Create a `config.yml` and place it in your data directory (`~/KaraokeMugen` or `app/` in portable configurations). Edit it and add the following, filling in the blanks (username, password, port, host and database name of your choosing.) and switch `bundledPostgresBinary` to `false`. Leave `superuser` and `superuserPassword` blank. It should look like this :

```YAML
System:
  Database:
    bundledPostgresBinary: false
    database: karaokemugen_app
    host: localhost
    password: musubi
    port: 5432
    username: karaokemugen_app
```

As a superuser on PostgreSQL, you need to create the database properly. Use the `psql` command-line tool to connect to your PostgreSQL cluster and create the needed database and extension. Example with the `config.yml` above :

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

Generating a database ie required on first launch and is done automatically if the database specified in `config.yml` is empty. You can trigger it manually later by connecting to the system panel from the welcome screen. Another way is to launch with the `--generate` command-line option.

On first run, the app will make you create an admin user and decide on a few base settings. You'll get to follow a guided tour of the operator panel too. You can trigger this tour process again by selecting the Tutorial item in the K menu on the app's operator panel.

## Translations

### Frontend

[![Translation status frontend](https://hosted.weblate.org/widgets/karaoke-mugen/-/karaoke-mugen-app-frontend/multi-auto.svg)](https://hosted.weblate.org/engage/karaoke-mugen/)

### Backend

[![Translation status backend](https://hosted.weblate.org/widgets/karaoke-mugen/-/karaoke-mugen-app-backend/multi-auto.svg)](https://hosted.weblate.org/engage/karaoke-mugen/)

## Contact

You can contact us by either

* Creating an issue
* Going to the [contact page](http://mugen.karaokes.moe/en/contact.html) and picking the communication channel of your choice.

## How to contribute

Karaoke Mugen is created by people who like anime, karaoke, etc. You can help us ~~fill the world with karaoke~~!

For general contributions, read the [dedicated section on the documentation website](http://docs.karaokes.moe/en/dev-guide/code/)

For code/development contributions, read the [contributing guide](CONTRIBUTING.md)

Everything's there, and if you have questions, you can come to [our Discord](http://karaokes.moe/discord) in the #karaoke_dev channel!

## Donations

We accept donations through Patreon, Liberapay or Paypal directly. If you're interested in helping us pay for our infrastructure and other projects, please donate! [For more information on why we need money and how to donate, see this news article on our site](https://mugen.karaokes.moe/en/2021/11/16/donations.html)
## Special thanks

<img src="https://sentry-brand.storage.googleapis.com/sentry-logo-black.png" alt="Sentry full logo" width="125"/>

Thanks to the [Sentry error tracking](https://sentry.io/welcome?utm_source=KaraokeMugen) solution, the app is self-reporting its errors to maintainers to help them to fix issues.<br/>

<img src="https://lab.shelter.moe/karaokemugen/karaokemugen-app/uploads/dba8fa95d7b4f1fac5e5877c72257f36/image.png" alt="BrowserStack full logo" width="125" />

Thanks to the [BrowserStack testing solution](https://browserstack.com), we can be sure that our interfaces will run just fine on each device.

<img src="https://uploads-ssl.webflow.com/5ac3c046c82724970fc60918/5c019d917bba312af7553b49_MacStadium-developerlogo.png" alt="MacStadium full logo" width="125"/>

Thanks to [MacStadium](http://www.macstadium.com), we have a Mac mini M1 to run tests and CI to build Karaoke Mugen for the M1 architecture!

<img src="https://upload.wikimedia.org/wikipedia/commons/thumb/6/69/Weblate_logo.svg/1024px-Weblate_logo.svg.png" alts="Weblate logo" width="125"/>

Thanks to [Weblate](https://weblate.org) we can allow people to more easily contribute to translating the app in many languages!

## Credits

"Nanamin", Karaoke Mugen's mascott as well as Karaoke Mugen's logo are designed by [Sedeto](http://sedeto.fr)

## License

Karaoke Mugen is licensed under MIT License. Other projects related to Karaoke Mugen may have other license terms. Please check every project for more information.
