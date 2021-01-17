## v4.2.X ? - Ogi Something?

### Important notice

- Usernames are now **case-insensitive** (#770). Karaoke Mugen will detect name conflicts in your user database and eventually fixes them automatically or asking you to do something about. In any case, the accounts with conflictual names will be automatically renamed with suffixes.

## v5.0.x - Poppy Partagée

*clears throat* Karaoke Mugen 5.0 introduces a brand new singing experience for y'all! It contains a fully reworked public interface, which aims for ease of use and efficiency.

It also provides an easy way to share your karaoke with friends with **kara.moe subdomains** (example https://wxyz.kara.moe).

### New features

#### Song versions (#855)

A new type of tag has been introduced in 5.0 : versions.

This will allow you to better filter out (or in) different song versions like "Alternative", "Off Vocal" or "Full".
#### Remote access (#198)

Karaoke Mugen can now expose itself via Karaoke Mugen Server to allow other people on other networks to access your karaoke. Perfect for remote sessions at anime events or over Discord our Twitch.

![Remote Access control box](https://lab.shelter.moe/karaokemugen/karaokemugen-app/uploads/f769ef18debdb7e4d55abb9b3df91f77/Capture_d_écran_du_2020-12-31_00-08-25.png)

It can be enabled in Settings -> Karaoke. It will generate a token kept by Karaoke Mugen for you. It will allow your room URL (https://XXXX.kara.moe) to be always the same after restarting the app.

The tokens expire after 10 days of non-use, but you can ask an administrator of the server to promote your token into a permanent, customized one like Axel.kara.moe.

*In order to save bandwidth, some karaoke thumbnails or profile pictures may not be available for remote users, but this will not prevent them from adding these songs.*

#### New public interface (#804, #739, #551)

A brand new public interface is available with Karaoke Mugen 5.0. Our goal was to make the user experience better while providing more search tools and exploring capabilities.

- The current song lyrics are available on the home page
  - The current line is highlighted in yellow

![Lyrics Box](https://lab.shelter.moe/karaokemugen/karaokemugen-app/uploads/49f8517028bc3550e72631a7370fb154/Peek_31-12-2020_00-07.gif)

- The top progress bar has been replaced by a new bottom bar

![Bottom bar](https://lab.shelter.moe/karaokemugen/karaokemugen-app/uploads/43a3b9e5a235e9c3789b1efef43cc7d2/image.png)

- Homepage is now featuring a "now playing" box

![Player Box](https://lab.shelter.moe/karaokemugen/karaokemugen-app/uploads/8cc3b9e6d90d1bb9c6b2b16468c2962f/Capture_d_écran_2020-11-11_à_22.00.58.png)

- You can now explore tags by category

![Tags List](https://lab.shelter.moe/karaokemugen/karaokemugen-app/uploads/e9696536c20526808ada84b13520c085/Capture_d_écran_2020-11-11_à_21.57.50.png)

#### New shuffle modes (#772)

We reworked our shuffle modes, including a new one: balancing. Balancing creates pools of users: each user will have one song per pool (A-B-C, A-B-C, etc.), it creates more fairness for people adding less songs than others.

![Shuffle button](http://lab.shelter.moe/karaokemugen/karaokemugen-app/uploads/5307ea7a7f92e4416cca7b11881324eb/image.png)

#### Sessions exports (#773)

You can now more easily **export your sessions data** as .csv, it will contain songs requested by users, play history, etc.

#### Chibi player (#725)

![Chibi player](https://lab.shelter.moe/karaokemugen/karaokemugen-app/uploads/b6a4a7488db7456fadc30a37a15b18fb/Capture_d_%C3%A9cran_2020-12-04_%C3%A0_22.13.15.png)

**Chibi player** is a compact window designed to have easy controls over the Karaoke Mugen player, it can be set to be always on top of other windows.

It can be enabled in the Window menu.

### Breaking changes

- API is now **using a socket.io** interface, however `POST /api/command` with `{cmd: 'GetKaras', body: {body: {from: 0, size: 400}}}` can be used to send commands without establishing a socket.io command (#666).
  - This new API will be documented later, we lack workforce to do so right now.
- database.json config file is now merged with config.yml in `System.Database` object, see config sample (#746)
  - Karaoke Mugen should handle this change automatically for you and merge the 2 files

### Improvements

- KM will now ask you if you want to resume pending download on startup if there are any, instead of resuming them automatically like it did before (#852)
- The tutorial has been revamped to be shorter and easier to understand (#839)
- The search engine can now understand exclusion (-word) and group ("group of words") operators.
  - Search results are now sorted by relevance.
- (Admin interface) Rename, set as current/public have been merged into a single "Edit playlist" button (#832)
  - The create playlist screen also allows you to set a playlist as public and/or current.
- Users now receive notifications when they can add songs again (when their quota becomes positive, #764).
- Upgrade from KM 3.2 works again (#798)
- When users upvote a song, it cannot be deleted by the original requester anymore (#803)
- Thumbnails are generated for each song now (for the public interface, #800)
- System panel navigation has been reworked with a new home page (#724)
- Tag names are now uniform against all our applications (#678)
- Player is now configured to have [loudnorm](https://ffmpeg.org/ffmpeg-filters.html#loudnorm) normalization (bd2964bd) instead of replay gain calculation.
- Circled avatars aren't created by KM now but instead are automatically generated at playtime by lavfi filters (fb99c6ec)
- The stats/sentry consent is part of the setup procedure now (#830)

### Fixes

- Karaoke and tag metadata can now contain | (pipe) characters (#844)
- Editing a kara repository was creating errors (#780)
  - Copying a karaoke to a new repo updates correctly the database (#778)
- In French, "Genres" are now "Thèmes" (#802)
- The "next" button was greyed out if you added a song when the last song was playing (#806)
- Karaokes with missing tags are now not included in generation (#797)
- In the karaoke creation form, hitting "Enter" in a tag input is no longer submitting the form (and thus creating a karaoke into database) (#789)
- Karaoke tags are always in the same order now (#786)
- Some typos were corrected in French locales (a8eab177)

### Notes, misc

- New icon for macOS 11 Big Sur (#856)
- Upgraded ffmpeg toolset to 4.3.1 and mpv media player to 0.33 (with libass fixes, #826)
- Upgraded to Typescript 4.0 (#784)
- Karaoke Mugen 5.0 isn't generating Karaoke Mugen <3.x series files anymore (#738)
- appPath detection has been reworked (#747)
- CLI toolset is now using commander instead of minimist (#748)
- Bootstrap dependency was removed (#739)
