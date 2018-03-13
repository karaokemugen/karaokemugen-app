# Karaoke Mugen

Welcome to Karaoke Mugen.

Karaoke Mugen is a playlist manager for video karaoke. It's made of a webapp and an engine. The webapp allows users to add songs and admins to manage the karaoke session and playlists. The engine plays those songs on the computer used to display the video.

It works like a japanese karaoke where anyone can add songs one after another to a playlist with their smartphone, tablet or computer. Another mode allows users to add videos to a suggestion list the admin can then pick songs from.

Karaoke Mugen works offline and does not require an Internet connection.

## Install

If you don't want to install manually, prepared binaries are available [on the website](http://mugen.karaokes.moe/download.html) for Windows and macOS. For Linux, follow the following steps.

### Download

To install, git clone this repository or download a copy as ZIP.

### Yarn

If you don't have `yarn`, install it first :

```sh
npm install -g yarn
```

### Dependencies

Then launch `yarn` to install dependencies.

```sh
yarn install
```

### React

Part of the web application is in reactJS and needs to be built :

```sh
yarn BuildReact
```

### Samples

Create a folder called `app/data` and put the contents of the `samples` folder inside to try it out.

### Launch

To launch the app :

```sh
yarn start
```

Generating a database ie required on first launch and is done automatically if the file `app/data/karas.sqlite3` is missing. You can trigger it manually later by connectiong to `http://localhost:1338` (default password for user `admin` is `gurdil`). Another way is to delete the `app/data/karas.sqlite3` and let the app regenerate it or launch with the `--generate` command-line option.

## System requirements

The app is multi-platform and works on Linux/Windows/OSX.

It requires :

* NodeJS 8
* npm 5
* yarn 1

### Binaries

mpv (video player) and ffmpeg/ffprobe (video processing) are required by Karaoke Mugen

* mpv 0.25 or up for Windows/Linux, 0.27 or up required for macOS ([mpv's website](http://mpv.io))
* ffmpeg / ffprobe 3 or later ([ffmpeg's website](http://www.ffmpeg.org))

#### Windows/macOS

Binaries must be placed in the `app/bin` folder (create it if it doesn't exist already).

You can also specify paths where to find those binaries in your `config.ini` file if you have them already installed elsewhere on your system and wish to use them.

#### Linux

Make sure ffmpeg/ffprobe/mpv are available in `/usr/bin`. If that's not the case, modify those paths in `config.ini`

Linux distributions often package old versions of ffmpeg/ffprobe/mpv, update them first via their own websites' instructions.

## Languages

Karaoke Mugen is written in NodeJS and uses Babel / ES2015+

## Translations

Currently french and english are supported. Translators are welcome!

## Features

* Can use single videos or videos + included subtitles.
* Works with .ass subtitles
* Skip, pause, play, stop, rewind playback from the webapp.
* Display song lyrics from within the web interface.
* Manage playlists, shuffle them, order them, copy songs from one to another, etc.
* Web interface for smartphone/tablet/PC ~~IE6 compatible~~
* Displays karaoke information at the beginning and end of song
* Tag/metadata system for karaokes : year, studio, singer, songwriter, language, etc.
* Keep track of who asked for this or that song.
* Public or private mode :
  * In private mode (default) songs added by users are directly played one after the other in the current playlist
  * In public mode, songs are added to a suggestion list. It's up to the admin to add songs from this list.
* Export/import playlists
* REST API so you can develop custom clients or web interfaces.
* And many other things! Check out the [feature list](http://mugen.karaokes.moe/features.html) (in french only!)

## How it works

* See the download section
* Place karaoke songs inside the `app/data` folder. See the [karaoke base repository](https://lab.shelter.moe/karaokemugen/karaokebase) and [documentation](http://mugen.karaokes.moe/docs/user-guide/manage/) (in french)
* The webapp listens on port 1337 by default : `http://localhost:1337`
* Switch to the admin panel via `http://localhost:1337/admin`. Default password is  `gurdil` and username can be anything you want. From there, you can manage your playlists and launch the karaoke session!

In the repository mentionned above, you'll find a database of karaoke songs ready for use. Beware, it's about 160Gb big once the videos have been downloaded.

For more information, check out the [documentation site!](http://mugen.karaokes.moe/docs/) (in french)

## How to contribute

Read the [dedicated section on the documentation website](http://mugen.karaokes.moe/docs/dev-guide/code/) (in french for now!)

Everything's there, and if you have questions, you can come to [our Discord](https://discord.gg/a8dMYek) in the #karaoke_dev section!