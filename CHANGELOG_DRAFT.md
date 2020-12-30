## v4.2.X ? - Ogi Something?

### Important notice

- Usernames are now **case-insensitive** (#770). Karaoke Mugen will detect name conflicts in your user database and eventually fixes them automatically or asking you to do something about. In any case, the accounts with conflictual names will be automatically renamed with suffixes.

## v5.0.x - Poppy Partagée

*clears throat* Karaoke Mugen 5.0 introduces a brand new singing experience for y'all! It contains a fully reworked public interface, which aims for ease of use and efficiency.
It also provides an easy way to share your karaoke to the people with **kara.moe subdomains** (https://helo.kara.moe).

### New features

#### Remote access (#198)

Karaoke Mugen can now expose himself via kara.moe server to allow other people on another networks to access your karaoke. Perfect for remote sessions.

![Remote Access control box](https://lab.shelter.moe/karaokemugen/karaokemugen-app/uploads/f769ef18debdb7e4d55abb9b3df91f77/Capture_d_écran_du_2020-12-31_00-08-25.png)

It can be enabled in Settings -> Karaoke, it will generate for you a token kept by Karaoke Mugen. It will allow your room URL (https://XXXX.kara.moe) to be always the same after restarts.
The tokens expire after 10 days of non-use, but you can ask an administrator of the server to promote your token into a permanent, customized one.

*In order to save bandwidth, some karaokes thumbnails or profile pictures may not be available for remote users, but this will not prevent them to add these karaokes.*

#### New public interface (#804, #739, #551)

A brand new public interface is available with Karaoke Mugen 5.0. Our goal was to make user experience better while providing more search tools and exploring capabilities.

- The current song lyrics is available on the home page
  - The current line is highlighted in yellow<br/>
  ![Lyrics Box](https://lab.shelter.moe/karaokemugen/karaokemugen-app/uploads/49f8517028bc3550e72631a7370fb154/Peek_31-12-2020_00-07.gif)
- The top progress bar has been replaced by a new bottom bar<br/>
![Bottom bar](https://lab.shelter.moe/karaokemugen/karaokemugen-app/uploads/43a3b9e5a235e9c3789b1efef43cc7d2/image.png)
- Homepage is now featuring a "now playing" box<br/>
![Player Box](https://lab.shelter.moe/karaokemugen/karaokemugen-app/uploads/8cc3b9e6d90d1bb9c6b2b16468c2962f/Capture_d_écran_2020-11-11_à_22.00.58.png)
- You can now explore tags by category<br/>
![Tags List](https://lab.shelter.moe/karaokemugen/karaokemugen-app/uploads/e9696536c20526808ada84b13520c085/Capture_d_écran_2020-11-11_à_21.57.50.png)

#### New shuffle modes (#772)

We reworked our shuffle modes, including a new one: balancing. Balancing creates pools of users: each user will have one song per pool (A-B-C, A-B-C, etc.), it means more fairness for people adding less karaokes than others.

![Shuffle button](http://lab.shelter.moe/karaokemugen/karaokemugen-app/uploads/5307ea7a7f92e4416cca7b11881324eb/image.png)

#### Sessions exports (#773)

You can now **export your sessions data** as .csv, it will contain songs requested by users, play history, etc.

#### Chibi player (#725)

![Chibi player](https://lab.shelter.moe/karaokemugen/karaokemugen-app/uploads/b6a4a7488db7456fadc30a37a15b18fb/Capture_d_%C3%A9cran_2020-12-04_%C3%A0_22.13.15.png)

**Chibi player** is a compact window designed to have easy controls over the Karaoke Mugen player, it can be set on top on other windows.
It can be enabled to the Window menu.

### Breaking changes

- API is now **using a socket.io** interface, however `POST /api/command` with `{cmd: 'GetKaras', body: {body: {from: 0, size: 400}}}` can be used to send commands without establishing a socket.io command (#666).
  - This new API will be documented later, we lack workforce to do so.
- database.json config file is now merged with config.yml in `System.Database` object, see config sample (#746)
  - Karaoke Mugen should handle this change automatically for you and merge the 2 files

### Improvements

- The search is now equipped with excluding (-word) and group ("group of words") operators.
  - The search are sorted by relevance.
- (Admin interface) Rename, set as current/public have been merged into a single "Edit playlist" button (#832)
  - The create playlist screen also allows you to set a playlist as public and/or current. 
- Users now receives notification when they can add songs again (when their quota became > 0, #764).
- Upgrade from 3.2 works again (#798)
- When users upvotes a song, it cannot be deleted by the original requester (#803)
- Thumbnails are generated for each karaoke by now (for the public interface, #800)
- System panel navigation has been reworked with a new home page (#724)
- Tag names are now uniform against all our applications (#678)
- Player is now configured to have [loudnorm](https://ffmpeg.org/ffmpeg-filters.html#loudnorm) normalization (bd2964bd)
- The generation of circled images has been deleted in favor of lavfi filters (fb99c6ec)
- The stats/sentry consent is part of the setup procedure now (#830)

### Fixes

- Editing a kara repository was creating errors (#780)
  - Copying a karaoke to a new repo updates correctly the database (#778)
- In French, "Genres" are now "Thèmes" (#802)
- The "next" button was greyed out if you added a song when the last song was playing (#806)
- Karaokes with missing tags are now not included in generation (#797)
- In karaoke creation form, hitting "Enter" in a tag input is no longer writing a karaoke into database (#789)
- Karaoke tags are always in the same order now (#786)
- Some typos were corrected in French locales (a8eab177)

### Notes, misc

- Upgraded ffmpeg toolset to 4.3.1 and mpv media player to 0.33 (with libass fixes, #826)
- Upgraded to Typescript 4.0 (#784)
- Karaoke Mugen 5.0 isn't generating Karaoke Mugen &lt;3.x series files (#738)
- appPath detection has been reworked (#747)
- CLI toolset is now commander (#748)
- Bootstrap dependency was deleted (#739)
