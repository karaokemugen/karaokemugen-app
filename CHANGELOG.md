# Versions

## v3.2.0 "Nadia Naturiste" - xx/04/2020

This is a major release with almost only UX features and improvements, so you should be safe to upgrade.

### New features

- The app now uses Electron for a better user experience on all
platforms (#533)
  - All links are opened in Electron by default, but you can disable this behavior in the application's menu (#581)
  - A new command flag `--cli` has been added to launch the app without any GUI (for non-interactive operations like updates or generation, or for use on Raspberry Pi (#575)
  - Player progress bar is now visible in the Dock (macOS) or taskbar (Windows) (#572)
  - A initialization page with optional logs is shown at startup (#568)
  - Karaoke Mugen is now packaged in these formats :
    - macOS: .dmg for easy install
    - Windows: portable (.zip) and .exe installer
    - Linux: appImage
  - There is an auto-update system in place which will download updates and install them on startup (unless told not to) or when manually told to. (#7)
- Multiple repository management for songs (#549)
  - Songs aer now organized in repositories.
  - You can have multiple repositories in your Karaoke Mugen
  - By default you have a "kara.moe" repository and a "Local" one. The Local one is for your own songs that you don't necessarily want to share with the community through kara.moe.
  - You can add, remove, or edit repositories, if for example someone adds a new song database completely foreign to kara.moe.
  - A "Consolidate repository" button allows to move repositories' contents to a new folder (like on a external hard drive) (#569)
- Users are notified when their song is going to play as soon as they add it (#564)

### Improvements

- Initialization is now faster since we're checking file modification dates instead of contents to decide if we need to generate or not (#563)
- Audio visualizer on audio-only songs is now smaller and in a corner of the screen to give more room to artwork (#559)
- Various improvements have been made to the system panel, especially its navigation and to download manager (#579)
- mpv (player) logs have been moved to the logs/ directory (#574)
- Logs are in JSON format now which allows a standardized display in the control panel logs. Logs are now updated in real time on that page (#567)

### Fixes

- Fix issues with playlist medias updates through git (encores, intros, outros, etc.) by using a worker thread (#582)

## v3.1.1 "Mitsuha Mélancolique" - 05/03/2020

This is a minor release containing fixes AND new features.

### New Features

- Songs with the "Spoiler" tag will get a red SPOILER WARNING above its details when the song starts on screen (96d3dafb, a67c2e80, d7d1dc2c and aa84a0b4)
- Admin account password is no longer displayed in terminal or tutorial (d5971b98)
- The player and profile modal will now display rounded avatars (#590 and a few other commits)
- Jingles and sponsors can now be disabled completely (instead of you having to set them to 0 to disable) (31f76202 and 943823c5)
- You can now add a message being shown on screen during encore/outros/intros (511ec410)

### Improvements

- Profile modal now has a close button (1d3e2c5c)
- ultrastar2ass has been upgraded to 1.0.9
- toyunda2ass has been upgraded to 1.0.10
- Downloading lots of songs should be faster now :
  - The next song is downloaded as soon as the first one is downloaded. Integration of songs is done asynchronously (98868a04)
  - Instead of downloading tag, series, karas and ass files separately, they're downloaded in one bundle and separated again aftar download (#562)
- The enter key can now be used to login (58ec5d14)
- Song suggestions (when you can't find what you're looking for) now ask for more information because we were tired of getting useless demands for songs we did have no clue what they were (#560)
- Deciding to run KM on another port than the default 1337 one is only decided on first run of the app. If the port is busy and it's not the first time you run KM, it'll throw an error (9eaccd60)

### Fixes

- Importing favorites is now fixed (650ce09a)
- Reworked playlist reordering so it takes into account songs not available in database anymore (5798d60b)
- When tags or songs have disappeared from database but are still in the app's blacklist criterias, they are now completely removed from output but still kept in database. (b8d32f04 and e62f0fe4)
- Fixed bug in blacklist criteria search (8360154b)
- "Look for application software updates" was ignored in config, this is fixed now (e2e577d1)
- Various fixes to tutorial (cce04418)
- Songs should be displayed correctly now in blacklist criterias (aaf44844)
- Various fixes to specific login/account issues (ff0d6466, bba4aebc)
- Fix system panel behaviour with unusual host/port combinations (df82b603)
- Fix issues with playlist medias updates through git (encores, intros, outros, etc.) (cd9fd878)
  - This is a temporary fix : the issue (#582) is resolved entirely in the future 3.2.0 version.
- Various fixes with Safari on operator interface.
- Download manager now lists remote tags instead of local ones which caused issues when your database was nearly empty (8d98227f, 0b334eb6, 319c88a5 and f607e7ae)
- Various fixes to download manager

## v3.1.0 "Mitsuha Mélodramatique" - 17/01/2020

This is a major release.

### New Features

- The config page in the System Panel is improved, allowing you to change all settings, even some internal ones, paths, etc. (#533)
- Sessions can now be flagged as private if you want to avoid sending them over to Karaoke Mugen Server (#543)
- Added a `--noPlayer` option to avoid starting the player along with KM when you only want to manage your karaoke database. (#541)
- Added a QuickStart setting which equals `--noBaseCheck`. This allows you to bypass the karaoke base verification to save some time on startup when you're absolutely certain nothing has changed. (#541)
- When the current song nears its end, a message appears on users' devices to tell them what the next song is (#537)
- When adding a song, the message also gives you how long before it should be playing (#536)
- This version of Karaoke Mugen does not generate Kara V3 files anymore when creating new karaokes (yes this is a new feature) (#534)
- Download page now has a filter to only show missing or updated songs (#532)
- Download page now has a clean all button (956711e6)
- Playlists now have three new medias in addition of intros and jingles : (#531)
  - Outros are played at the very end of the playlist
  - Encores are played before the last song plays
  - Sponsors are played every interval you have set
  - We offer a few of those in our git repos, they will be downloaded automagically by Karaoke Mugen.
- KM is now bundled with a `portable` file. If this file exists, KM will store everything in the `app` folder, just like before. If not, KM will store all its data files in the user's home folder : `$HOME/KaraokeMugen` (#525)
- User avatars are now displayed next to the songs they added in playlist (#423)
- System panel is now translated in french and english (#263)
- Improve system panel's config page (#486)
- The karaoke submission form now accepts a new karaoke format, karaWin files (.kar). The files will be converted to the ASS format on import. (#550)
- A repository property is added to tag and series files automatically for now in preparation for 3.2's multi-repo (e57ca80a)
- Dropped compatibility for Windows 32 bit OSes (219eaf53)

### Improvements

- The swipe movement to switch from the song list to the playlists in mobile view has been deprecated in favor of a button, as it was causing too many misuses (#547)
- Player (mpv) is now restarted if it's been closed by mistake or voluntarily by the user whenever an action requiring it is made (#540)
- The frontend's and system's APIs have been merged into one, just so we could create more bugs (#539)
- Upgraded all dependencies, notably Got (HTTP client) to version 10 (#535)
- Frontend is now written in typescript, yay. (#528)
- Downloader has been rewritten with async functions and a queue system (#511)
- Logged in users now is a scrollable list in frontend (#476)
- If you login in operator page without an operator account, add a modal to propose to change the type of account (2ad52c9a)
- Changed display for tablets (cfeb689a, 934dcfa8, f35b3245)
- Changed buttons order in playlist's header and in a song for admin (3be92d61)
- Changed login modal in operator page (817ef98b)
- Removed drag&drop useless refresh (747c78e5)
- Playlist is now refreshed when resized (#548)
- Kara creation now include long tag automagic support (#555)

### Fixes

- Display shutdown popup only when disconnect is cause by transport error (0276f4e6)
- Fix Filter by tag + search a value now work (c50dd0c4)
- Fix add Random Karas in operator page (1d85f6c0)
- Users now cannot remove a song from a playlist while that same song is playing and the player is effectively playing it. (#556)
- The Omega character is now translated as O in filenames (e5379db7)
- Suggestion issue template now adds the right suggestion tag to gitlab issues (103aa8de)

## v3.0.2 "Leafa Langoureuse" - 09/01/2020

This is a bugfix release

### Improvements

- Security code can't be used anymore to reset your local password. If you lost your password, use the security code to create a new admin account (c7dad84b)
- Poll winner is sent to Twitch chat when available (df5d27f1)
- Config settings are correctly updated when displaying the settings page (d7acf199)
- When in restricted mode, the frontend will display a modal only on mobile (fad65274)
- Quotes are not being removed anymore during searches. So "May'n" won't search for "May" and "n" anymore. (49cbc80d)
- Add a message to check if the song is not available for download before make a suggestion (95db6039)
- Now use checkAuth route to verify authorization in frontend (824f8b7d)
- Remove use of swipe in mobile for add Kara and change view (#547 - 735b3851, c8cdf0ba, 6756e3c2, b3e2c9b9)
- Icon to tell the difference between mystery karas and others is now clickable (925374eb)
- Add search aliases or locales in serie field on kara page (429458e1, d0ea6b3f)

### Fixes

- Fix autoplay setting not working as intended (f0f2f18c)
- When downloading a song, tags or series could have needed to be removed if their filename were different, but it throwed an error if the file didn't exist anymore, which could happen inbetween database refreshes. Now the error won't throw anymore, just display in debug logs (77af237b)
- Fix samples' TV Series tag. (3bbf5eb2)
- Fix nickname can't be empty error when modifying password (1a4ae993)
- Fix admin tutorial (030c3069)
- Fix issues when playlists are set to invisible (6c2bf0b5)
- When downloading songs, tags/series are now correctly deleted when their name has changed (0751bcf1)
- Toyunda2ASS has been updated to 1.0.8 - correctly detects CRLF line breaks now (0eec58af)
- Percentages in poll votes are now rounded to two decimal digits (e8e3f6c7)
- Polls should work pollfectly now. (84bf4818)
- When going from the kara list to a filtered list (applying a filter) the scroll placement is reset (af79e412)
- Remaining time of a playlist is now correctly updated (32698f3c)
- No more flickering when scroll in a playlist (ee38366a)
- Fix scroll on user list in profile modal (#476)
- Fix add an ip for Host in system panel config page (f2f01947)
- Fix modals on small screen (9cbe227e, 2eed7ef4, 5fdb1997)
- Fix initial render for playlist (8b1ece19, 92c73fa5)
- Fix favorites display in public page (12b67a1b)
- Fix alignement ro playing karaoke in start of a playlist (08b17f43)
- Fix open the login modal when logout (013a421f)
- Fix spam of toast when page was hidden (e6ac7ca7)
- Fix restricted mode (d738745b, 158d7ff2)
- Fix songtype display in mobile when title is multiline (631daded)
- Fix wrong color display for buttons in karaDetail (daddc90f)
- Fix help modal display (a1975f83)
- Fix update songs in download page (7c92302e)
- Fix filter songs in download page (12d13b1d)


## v3.0.1 "Leafa Loyale" - 13/12/2019

This is a bugfix release.

### Improvements

- Described where is the security code in the admin intro d71a5889
- Bumped taskCounter from 5 to 100 during batch downloads so KM doesn't stop downloading every now and then db989b9e
- Added proper error messages for login in operator panel c7fbb20f
- Added proper error messages when using wrong security code in login window 46c9f81a
- Ensures mpv is running before issuing any command, restarts it if it's not present 473dc256
- Added close button for automix modal 0ea139aa
- Added i18n for playlists names af4565b5
- Added modal for delete criteria from blacklist 2dae9632, 3c636e7c, f5dd39de
- Changed songs display order 4aa306fa

### Fixes

- Fixed avatar fetching for online users d68c8748
- Fixed API documentation 48ccf953
- Fixed moving songs from one playlist to the other e1f6bd89
- Fixed playlist buttons not refreshed when you change the other side in operator window 7ae4e647
- Fixed adding blacklist criterias with enter 8c7a7228
- Fixed like button on karas 653fe77d, 512901b5
- Fixed free button 91b855f3
- Fixed convert and delete online profile 80ac08f9
- Fixed import playlist 3a829eda, daf52009, 6407261d
- Fixed right click transfer button 4fdf9c0f, 80ac390e
- Fixed right click add button from public playlist to current playlist de2a88a8
- Fixed blue color display change for playing kara b629c8a0
- Fixed mute button bfb64a44
- Fixed open login modal after log out a9349c54
- Fixed error display for patch kara a263013f
- Fixed right click add button for multiple karas in admin page 7ff87aa2, 9c45a866
- Fixed export playlist button d2a3e85f
- Fixed change visibility of a kara twice without close details da546927
- Fixed buttons display in playlist header 26c9af11
- Fixed nickname is now mandatory 871fb6b4, 101befe3
- Fixed switch to another playlist when delete one f4e895fa
- Fixed input display in rename playlist modal 17ee2a0c
- Fixed blacklist criterias tags display 88a338ae

## v3.0.0 "Leafa Lumineuse" - 29/11/2019

This is a VERY MAJOR release.

Many things have changed, both in database schemas, code base, frontend, and even how Karaoke Mugen works

### New Features

- A banner will be displayed on the welcome screen to signal there is a new Karaoke Mugen version and that you should upgrade (#7)
- All guest accounts now have specific avatars. For fun. (#392)
- Karaoke data files (.kara) are now on version 4 and are named .kara.json. (#341)
  - Karaoke Mugen 3.x is not compatible with Karaoke files version 3 or below. This means you'll need to update your Karaoke Base for Karaoke Mugen 3.x.
  - If you have songs you have not uploaded to the Karaoke Base, please contact us so we can help you convert your files.
- Streamer mode with Twitch integration (#447)
  - Song poll results can be displayed on the player's wallpaper inbetween songs.
  - Twitch users can vote from chat for which song to play next
  - Added a configurable pause time in between songs.
- Song tags have been completely reworked (#443)
  - Tags (languages, songwriters, singers, creators, etc.) are now files in the Karaoke Base, which means they're not tied to the application's version anymore. Anyone can add its own tags if need be.
  - New tag types : Misc (formerly "Tags"), Genres, Origins, Platforms and Families
  - New tags have been added to the Karaoke Base as a result : Fanworks for dojin songs/videos
  - WARNING : As a result, blacklists criterias relying on tags won't be valid anymore and are going to be removed from your blacklist criterias. You can readd them later.
- Mystery karaoke toggle (#441)
  - You can flag a song as visible or invisible. Invisible songs will be marked as ??? to the public, which means they won't know in advance what that song is in the playlist. Good for surprises and troll songs.
  - You can add mystery labels, which are shown randomly in place of the real song's name in a song slot to users. This is troll ammo.
  - You can make it so admins or users added songs are automatically marked as invisible (or not)
- Classic Karaoke Mode (#432)
  - In Karaoke Classic mode, a pause is made in between songs, and the person who requested the song (or admin, or after a time period has elapsed) can hit play on its device. This is a mode for those who prefer a classic karaoke box experience where each user takes the microphone to sing on the song they asked for.
- New features for Download manager :
  - Blacklist system to keep the Download manager to automatically download some songs. Manual download is still possible (#427)
  - A "Update All" button to update existing songs and download all songs missing from your database. See above for the blacklist feature. (#426)
  - Advanced search (via tags/series) (#425)
- Session management on welcome screen (#390)
  - You can now name individual karaoke sessions when starting one with friends or during events. It'll allow you to filter song history to see, for example, which songs were played during Epitanime 2020 or Jonetsu 5555. Sessions are just groups for stats but can be helpful for other purposes later.
  - Session data can be exported as CSV (#508)
- QR Code has been removed (why is it a new feature?) (#451)
- Users can now select which language for series names they tend to prefer (just like an admin can). This setting is saved to your online account. (#440)
- New, updated sample songs included with every release (#452)
- Battle-tested with Node 12 (#439)
- Karaoke Mugen is now coded with TypeScript, for better debugging and safer programming :) (#437 #391)
- For MugenPi users (or those who don't want to look at the console screen), logs are now available in the System Control Panel (#434)
- Live changes to the database (editing a song) won't trigger a new generation on next app startup (#433)
- Admins can restrict song additions by users to one song per series or singer to avoid people trying to force their favorite series or singer by adding all its songs (#431)
- A new (shy) look for the frontend has been achieved with the React rewrite (#430 #300)
- Suggesting a song to be added to the karaoke base now generates an issue on our Gitlab (configurable) (#422)
- An intro video is played at the beginning of a playlist if you're starting on the first song. If a sponsor jingle file is present (Beginning with `Sponsor - `) it will be played right after. (#482)
- The karaoke submission form now accepts new karaoke formats in addition of ASS. The files will be converted to the ASS format on import. New formats supported are :
  - Toyunda files (.txt) (#463)
  - UltraStar files (.txt) (#31)
  - Karafun files (.kfn) (#471)
- Dark theme for the system panel (#468)
- Settings in the options panel now have tooltips to explain what they do (#460)
- Login modal in public and admin interface now has toggles for online/local accounts and password reset feature. (#489)
- Database can be restored from the karaokemugen.sql file in the application's directory (#509)

### Improvements

- System panel's code dependencies are now up to date (#445)
- Playlist information is updated more often on screen so a device coming back from sleep mode can get an updated version of the page sooner (#416)
- Search engine in playlists now looks for the song requester as well. (#448)
- Quotations (" and ') are now taken into account during search (#446)
- Karaoke Mugen's API has been split in smaller chunks for easier debugging and programming.
- A lot of code is now shared between Karaoke Mugen App and Server via the Karaoke Mugen Shared Library (#402) saving us a lot of time
- Importing playlists is now safer thanks to a code rewrite by using constraints instead of tests (#329)
- Preview videos are not generated anymore. It was costly and took a hell lot of time. Now full media files are served instead (#457)
- Updated mpv version to 0.29.1.
- Karaoke base updates now go through the Download Manager and should easier to handle.
- When editing a karaoke in the system UI, tags and series are checked for differences between the old and new karaoke to avoid triggering useless refreshes.
- Added a message in case MS Visual Studio C++ 2013 redist is not installed (Windows only) (#492)
- Karaoke Mugen behaves better when mpv has been shutdown outside of KM (#491)
- Added `--dumpDB` and `--restoreDB` command-line arguments.

### Fixes

- Toggling lyrics/song title display on mobile now works properly (#414)
- Videos aren't weboptimized again even if you don't change anything about it in the edit song form (#436)
- Toots from Mastodon are now displayed proper on the welcome screen's feed (#429)
- Fix KM not allowing you to login your online account if a local account with the same nickname exists in your database. (#466)
- When working with several karaoke/media/lyrics folders, edited karas will be placed in the original folders they belong to instead of the
first one in the list.
- i18n fields in series edit page in control panel are now automatically validated, no need to fiddle with them anymore (#505)
- .ass files are now properly deleted when editing a kara (#490)

## v2.5.3 "Konata Kimono" - 30/06/2019

This is a bugfix release.

### Fixes

- Fixed Downloads submenu in the system panel not working with V4 kara format in KM Server (28236d09)
- Fixed toggleOnTop setting not working (770cc4bd)

## v2.5.2 "Konata 4-Koma" - 22/05/2019

This is a bugfix release.

### Enhancements

- You can now force the admin password to be changed (in case you forgot it, or are running a unattended setup) with the `--forceAdminPassword <password>` flag.

### Fixes

- Fixed file resolver when using multiple folders for karas, series, medias or lyrics files (c2e5eacf)
- Fixed mpv auto restart method (3ca3b6c7)
- Fixed wallpaper not appearing anymore at the end of a song if "stop after current song" has been pressed (7330ed8a)
- Fixed retrying to play song if loading media failed due to mpv hiccup (7f3da9ba)
- Web interface will now request english translations from server if your browser is not set to a known locale (61082963)
- Media files are not weboptimized anymore if you don't modify them in the karaoke edit form (4ee094bc)
- Catch errors when switching to the next song in a playing playlist (35a86966)
- Partly fixed edit user form errors (523a7120)

## v2.5.1 "Konata Kiffante" - 06/05/2019

This is a bugfix release.

### Fixes

- Added notice to type in your full username on system panel login page (463b62e8)
- Fixed tag add/remove on blacklist criterias list ( de6611d4 )
- Fixed import/export favorites from admin interface ( f2ee577e, c76941c7, 7ae9b9b9 )
- Fixed import favorites from public interface ( 0222d592 )
- Fixed blacklist criterias import from an older SQLite database ( 0785947 )
- Fixed downloads not being started automatically on app startup  ( 87d68d9e )
- Fixed public/private switch ( df949195 )
- Fixed online profile updates ( 20a24b1e )
- Fixed suggestion mail modal box ( 6503c363 )
- Fixed errors with multi-series karaokes ( bfbe9eed )

## v2.5.0 "Konata Karaokiste" - 30/04/2019

This is a major release.

### New features

- Songs can now be downloaded individually from a Karaoke Mugen Server (like `kara.moe`) instead of updating the complete karaoke base every time. Go to the Karas -> Downloads submenu in the system panel. This feature is still in beta and we would love feedback (#339)
- Users can now create online accounts on a Karaoke Mugen Server, which means favorites and profile info are stored online and not on the local Karaoke Mugen application. Online accounts are enabled by default. To create/login using local accounts, remove the `kara.moe` part of the Server field on the login/new account form (#303)
- Added tag CREDITLESS for creditless songs (#382)
- Added tag COVER for cover songs (#393)
- Added tag DRAMA for songs from TV drama shows (#393)
- Added tag WIIU for songs from Nintendo Wii U games
- Added tag FANDUB for fandubbed videos (#418)
- Already present since 2.4.1 : Stats are now uploaded periodically to Karaoke Mugen Server (if the instance admin agrees) (#377)

### Improvements

- Configuration storage has been completely revamped and is now a YAML file instead of the old INI format. Your old configuration file will be automatically imported at launch (#355)
- Favorites are now handled in a simpler way. Favorites playlists are no longer used, instead Favorites are stored on a separate table in database. You can safely delete any favorites playlist after upgrading to 2.5.0 (#389)
- Karaoke Mugen now uses a PostgreSQL database instead of a SQLite3 one, leading to cleaner code and faster response times. Your old SQLite3 database will be imported at launch (#379)
- (Already present since 2.4.1) Initialization catchphrases(tm) are now displayed on the welcome screen (#375)
- MP3 playback is now more dynamic with some visualization effects (#349)
- Those who requested a song will now see their avatar next to the song information on screen at the start and end of a song. (#283)
- Downloadable groups can now be filtered / blacklisted
- New guest names and catchphrases!
- Transitions between songs are now shorter as we do not reload the karaoke background image at end of song
- Blacklist is now regenerated after a database generation to keep it consistent
- New option `--noBaseCheck` to disable data file checks to save time (when you're sure the base has not changed)
- New option `--reset` to reset user data. WARNING : this wipes users, stats, playlists, etc.
- Configuration is not updated anymore in real time if you modify the config file while Karaoke Mugen is running (it caused too many problems). You'll need to modify the config file while Karaoke Mugen is stopped for your changes to take effect.
- All communication with Karaoke Mugen Server is now done in HTTPS.
- Executable file has been greatly reduced by replacing some packages with simpler, lighter versions with similar functionality
- Preview generation should be more consistent now
- When creating a new karaoke, mp4 videos are web-optimized automatically
- Karaoke operators can now add several random karaokes to the current playlist by pressing a button on the admin interface, to fill a playlist for example (#392).
- Users can now add a song more than once in a playlist (if the required setting is enabled) (#388)

### Fixes

- Fixed song search so it now also searches in series names aliases (#387)
- Fixed Karaoke Mugen allowing users to put commas in series names (#386)
- Fixed Karaoke Mugen adding you as an author to a karaoke you're editing if there's no author already in metadata info (#385)
- Fixed series name not translated with user's browser's locale in control panel (#384)
- Fixed background listing taking non-image files into account in the `app/background` directory, which could cause mpv to crash.
- Fixed delete button hidden behind menu in mobile public playlist view (#399)
- When the interface is in restricted mode, a modal pops up to explain to the user that it cannot add songs anymore. (#404)
- Guests don't see the favorites button anymore (#415)
- Direct3D is not the default output video driver for mpv anymore on Windows.

## v2.4.2 "Juri Joueuse" - 13/12/2018

This is a bug fix release.

### Improvements

- Issues created automatically when a user makes a song suggestion in Karaoke Mugen App now contain a more polite message, as well as the user's nickname
- Media renaming now doesn't abort if a file is not found

### Fixes

- Fixed importing playlists
- Fixed all jingles playing at once if interval is set to 0
- Fixed using filters in a song list when you're not at the top of the list
- Stats are now properly sent on startup

## v2.4.1 "Juri Joviale" - 28/11/2018

### New features

- Stats are now uploaded periodically to Karaoke Mugen Server (if the instance admin agrees) (#377)
- A media renaming procedure is available in the system panel / database tab to allow people to rename all their media files and avoid redownloading them all. (#376)
- Initialization catchphrases(tm) are now displayed on the welcome screen (#375)

### Fixes

- Drag & Dropping songs within a playlist sometimes didn't work as expected. Song positions are now fixed (#375)
- Fixed automix creation
- Monitor window isn't synced anymore with the main player, as this would cause weird behaviors on many videos when the monitor tries to play catch up.
- Weird error messages about invalid configuration won't appear anymore (#373)

## v2.4.0 "Juri Judicieuse" - 06/11/2018

### New features

- Configuration can be edited by hand from control panel. Not all configuration items are editable. (#338)
- Karaoke Mugen is now fully compatible (and even requires) Node 10 (#307)
- The welcome screen now displays what's new on the karaoke base and site's RSS feeds (#343)
- Our new logo, designed by @Sedeto, has been added to the welcome screen!

### Improvements

- Songs can now be freed from the current playlist
- Progress when generating database or updating base files from the control panel is now displayed on the control panel itself (#348)
- Generation's progress is now displayed in the console.
- Public interface is reloaded when the webapp mode (open, restricted or closed) changes. (#357)
- TAG_VOICELESS has been removed in favor of the language code ZXX which is "No linguistic content" (#366)
- Special language names (FR, JAP, ANG...) in files is now obsolete in favor of ISO639-2B codes. This is for better consistency. (#365)
- The `series.json` file is not used anymore. Instead, series data is read from the new `series/` folder with its `.series.json` files (#364)
- Series' international names are now searchable in control panel (#362)
- When two KIDs are in conflict in your karaoke base, Karaoke Mugen will now tell you which ones are causing the conflict (#361)
- In the karaoke submission form, tags have been replaced by checkboxes for misc tags. (#359)
- Icons and names have been changed for consistency on the welcome screen (#356)
- Your data files are now checked on startup to decide if a generation is needed or not. (#354)
- Series are displayed in a more concise way in case of AMVs. (#350)
- Karaoke and series lists in control panel are now properly paginated. Page position and searches are remembered when coming back to the list after editing/creating a karaoke (#342)
- When creating/editing a language, a text box allows to search for a language code.

### Fixes

- Download problems when updating your base files should be fixed now. Really. (#332)
- Download groups weren't saved properly in .kara files when saving one from the kara submission form (#367)
- Fixed hardsub video submission with the control panel's form
- Fixed adding series without aliases
- Fixed Smart Shuffle
- Fixed deleting favorites
- Fixed editing series not updating i18n data
- Fixed search field in control panel not registering the last character typed

## v2.3.2 "Ichika Imperturbable" - 03/09/2018

This is a bugfix release.

### Fixes

- Fix searching through series original names
- Fix kara/media/sub files not being renamed properly when edited

## v2.3.1 "Ichika Insouciante" - 22/08/2018

This is a bugfix release.

**IMPORTANT : Karaoke files version 2 or lower are now deprecated. Please update your karaoke base.**

### Improvements

- Searches now take the original series' name into account too.
- Karas in error are not added to the database anymore
- Audio files are now accepted in the karaoke add form.
- Various speedups in karaoke and playlist content list display thanks to @Jaerdoster's mad SQL skills
- Added a XBOXONE tag for songs.
- mpv does not try to autoload external files anymore, resulting in better performance if your media files are on a network storage.

### Fixes

- The karaoke base update button now works.
- Editing a hardsubbed karaoke now works.
- Filenames are better sanitized when editing/adding new karaokes
- Searching in playlists now work again.
- Fixed some possible SQL injections.
- When a media is missing, getting karaoke details does not fail anymore
- Fixed some english translations
- Fixed jingles not playing at all
- Fixed log spam on OSX about config file being changed
- Fixed config file being accidentally overwritten with a new one
- Songs are now correctly removed automatically from the public playlist once played.

## v2.3.0 "Ichika Idolâtrice" - 14/08/2018

For a complete run-down on the new features, check out v2.3.0-rc1's changelog below.

We will only cover changes from rc1 to finale here :

### Enhancements

- "Update from Shelter" button now returns a message immediately inviting you to check the console for progress
- "Connection lost" message now displays a cool noise effect
- Database is now more optimized and should make actions involving playlists faster

### Fixes

- #328 Progress bar during updates should scale properly to the window and not display "Infinity" anymore
- Filter panel on karaoke list now displays properly on Safari iOS
- Config file should not be overwritten anymore (hopefully)
- Fixed updating series and displaying karaoke lists and tags in control panel
- Fixed the "Stop after current song" button

## v2.3.0-rc1 "Ichika Immergée" - 08/08/2018

### New exciting features(tm)

- #118 Karaoke Mugen can generate .kara files for you if you fill out a form in the control panel, making it much easier to create karaoke files for the Karaoke Mugen base.
- #325 There is now a link to help users suggest a series they think should be in the Karaoke Mugen database
- #340 In addition of the usual view and favorites view, users can get a new "Most recent songs" view with the last 200 songs added in the database (ordered by creation date)
- #120 Users can now navigate through the song list by tags (language, singer, etc.) year, and series.
- #305 A smarter shuffle is available for those with big playlists.
  - It should spread long and short songs to avoid too many long songs following each other
  - Songs added by one user won't be following each other and will be spread through the playlist
- #334 The series database can be managed from the control panel. This updates the `series.json` file
- #324 Karaoke operators can now free songs manually
- #153 A "more information" link has been added to songs' info panel. It allows you to get more information on a particular series or singer.
- #152 You can add a song multiple times in the current playlist now (optional)

### Enhancements

- #336 The web interface will fade to black and display a message when Karaoke Mugen isn't running anymore
- #330 Buttons have been normalized throughout the web interface
- #322 Many optimizations have been made through the code, making it also simpler to read.
- #321 The temp folder is cleaned at startup.
- #320 Users' login time is not updated in real time anymore to avoid stressing out the database
- The `userdata.sqlite3` file is backuped before a new generation is made.
- #139 PIP Slider in web interface now has percentage values displayed

### Fixes

- #326 Songs cannot be added anymore if they are present in the blacklist
- #317 Catching SQLITE_BUSY error messages from background jobs during database maintenance mode
- Engine asks if player is ready before issuing any commands.

## v2.2.3 "Haruhi Hyperactive" - 16/07/2018

### Fixes

- #332 Fixes an issue some (many) people had with the in-app karaoke base updater, where downloads would get stalled and the app hanged. Writing a complete download system with retries and error handling is difficult, and the issue isn't showing for a lot of people.
- Fixes a big issue with database (re)generation regarding series, which would causes mismatches between a series in the karaoke list and what's going to be played.
- Karaoke Mugen shouldn't hang anymore when trying to generate a database without any kara files present
- Quotes in series names are properly inserted in database now
- FTP downloads for updater now has a retry system
- Medias are now downloaded before subs

## v2.2.2 "Haruhi Hibernante" - 03/07/2018

### Fixes

- #311 AutoPlay mode is now working again, for real.
- #333 Preview generation has been fixed, and won't be canceled on the first video it cannot generate preview for.
- #331 Admin tutorial now checks for `appFirstRun` in addition of `admpwd`
- Media files are now moved from the import folder to the medias folder when doing a mass import.

### Enhancements

- New tag for songs : TAG_3DS
- #335 When using the second video monitor (second mpv), it wasn't synchronized with the first one when you used arrow keys to navigate in the first mpv video. Note that this could potentially lead to video lags on the second mpv window, but since it's just a monitor, we didn't think it would be much of an issue. Please give us feedback about this.
- Default video directory is now `medias`
- Samples have been updated with a `medias` folder.
- Samples now include a `series.json` sample file
- macOS releases are now in `.tar.gz` instead of `zip` to keep permissions intact.

## v2.2.1 "Haruhi Hypnotisante" - 19/06/2018

This version is also known as "Just Haruhi"

### IMPORTANT

In preparation for **July 1st 2018** when the videos folder will be renamed to "medias", your videos folder will be renamed automatically after this date if :

- Your config has the default `app/data/videos`
- That folder exists
- The `medias` folder does not exist.

If any of these conditions are not met, proceed as usual, your configuration and folder structure won't be modified.

### Enhancements

- `userdata.sqlite3` is backupped before running integrity checks so you can recover from a bad karaoke database generation that would have wiped out your playlists, favorites, and other data.
- Added TAG_WII
- Added TAG_SATURN
- Config file change message is now debug only.

### Fixes

- The .kara generation tool has been fixed. Also, if a .kara's subfile has `dummy.ass` it won't trigger a subtitle extraction on its .mkv file anymore. Some .mkvs have hardsubs, yes.
- Blacklisting series now work correctly.
- When triggering the player's play method, make sure it is ready before.
- #316 Base updater should handle connection timeouts better.
- Fixed database generation when using `--generate` without any database existing.

## v2.2.0 "Haruhi Hagiographique" - 04/06/2018

For a complete changelog of v2.2 changes, check out v2.2-rc1's changelog below.

Changes from v2.2-rc1 to v2.2 :

### Bonus features

- #314 Karaoke Mugen can optionally publish its public and local IP to `kara.moe` to allow people to type a shorter URL in order to access the instance from the local network. `kara.moe` will redirect to your local instance.
- #312 A monitor window can be spawned for the player, allowing you, karaoke session operator, to see what the others see on the big screen where your main window is.
- Added new guest names and quotes
- Karaoke Mugen will check during startup if all guests exist. If not, new guests will be added to the user list. So you won't miss on new updates!
- Added the "Duo" tag for karaokes meant to be sung by two people.
- Added a demo mode for online demonstrations (passwords can't be changed and mpv is not controllable)
- .ass files are now read directly by mpv and not by Karaoke Mugen then passed to mpv anymore.

### Fixes

- #313 Control panel's user list now displays dates correctly
- Better error handling for mpv thanks to node-mpv new features
- Database generation from the control panel now works again
- Removed useless code in initial database creation. The `appFirstRun` setting will be overriden to 1 if `userdata.sqlite3` is missing.
- Searches containing quotes (') now return results
- Blank series data is created if it exists in a .kara file but not in the `series.json` file. This allows you to search for that series even if it's not in the JSON file. NOTE : this throws an error in strict mode.

## v2.2-rc1 "Haruhi Hargneuse" - 24/05/2018

This version requires your attention on the following points :

- `PathMedias` setting for storing media files replaces `PathVideos`
- Videos will be stored in a `medias` folder, not `videos` anymore starting July 1st 2018
- .kara format is going to be version 3 from now on, which means older versions of Karaoke Mugen won't be able to import the [Karaoke Base](http://lab.shelter.moe/karaokemugen/karaokebase) beyond July 1st 2018

### New Shiny Features

- #302 As a regular user, you can now remove your own submissions from the current/public playlist, in case you added a song by mistake for instance.
- #288 Alternative series names have been overhauled. We now have a database of series' names depending on language. Admins can select which way series should be displayed:
  - As they are originally (use japanese titles for japanese shows, etc.)
  - According to the song's language (use japanese titles for japanese songs, english titles for english songs, etc.)
  - According to Karaoke Mugen's language (uses system locale to determine which language to use. Defaults back to english and then original name)
  - According to the user's language (uses your browser's language to determine which language to use. Defaults back to english adn then original name)
- #282 Support for audio-only karaokes
  - You can create karaokes with mp3+ass files, for songs which do not have any video available anywhere on the Internets.
  - Supported formats are mp3, m4a and ogg.
  - Your file should have a cover art metadata. If it does it'll be used as background. If not KM's default background will be used.
  - Enjoy your long versions of songs :)
  - As a result KM's .kara format evolves to version 3. Version 2 can still be imported safely in KM 2.1 and below. Version 3 can only be imported in 2.2 and higher.
  - `videos` folder now becomes the `medias` folder. To help with this.
- #279 Song history can now be viewed in the control panel (administration).
  - This is a list of most viewed songs.
- #273 You can import/export your favorites.
  - Useful when you go from one karaoke session to the other, carry your favorites on your phone anywhere and import them in the KM instance you're using!
- #233 Song rankings can now be viewed in the control panel. This is a list of most requested songs (not necessarily viewed)
- #109 Adding songs can now be limited to either number of songs or time.
  - For example you can give users 5 minutes of karaoke each.
  - Adding songs longer than their time left is not allowed.
  - Just like with songs, time is given back once the song is freed or is being played on screen.
- #79 Public vote mode can be enabled and offers a poll to users on their devices with 4 songs to choose from.
  - Songs are taken from the public/suggestions playlist.
  - Poll lasts 30 seconds and the winner song is added to the current playlist.
  - If two or more songs are the highest in votes, a random one is chosen among them.
  - Another poll is created.
  - This is perfect if you want to have your users participate in the current playlist creation or if you want to just lean back and enjoy karaoke with friends without worrying about the playlist (create an AutoMix and make it a public playlist, then enable this mode)

### Enhancements

- #304 Search fields now includes who added the song in a playlist
- #297 Small tweaks made to the welcome page
- #291 Jingle information is now displayed in the UI's song bar when a jingle is playing
- #290 ASS files are no longer stored in the database.
  - This should make database generation much faster
  - Modifying an ASS file (to test stuff while making karaokes) will have an immediate effect now.
- #288 Search/filtering is now done in SQL, which greatly improves speeds
- #285 Config file is now validated and ignored if there are mistakes anywhere

### Fixes

- #299 Better handling of how Karaoke Mugen is shut down regarding database access (should remove any SQLITE_BUSY errors)
- #295 Forbidden messages won't be displayed anymore on first login
- #311 Autoplay/Repeat playlist now behave correctly

## v2.1.2 "Gabriel Gênante" - 16/05/2018

### Information

- Minimum required NodeJS version is now 8.4.0. This does not affect you if you use the packaged, binary versions of Karaoke Mugen

### Fixes

- #40 Lowered number of files processed simultaneously during generation. Linux users won't need to modify their max number of file descriptors with `ulimit`
- Fixed favorites list not being displayed properly
- A proper error message is displayed when trying to add a song already present in the playlist
- #298 Jingles list is now properly created. You won't run out of jingles anymore!
- #293 Song list sort order has been modified a little (music videos are now properly sorted)

### Enhancements

- #294 Karaoke Mugen now exits after karaoke base update is done.
- #296 "Press key on exit" is only displayed if there's an error.

### Features removed

- #7 We pulled a Sony on you and removed the software updater. It wasn't working to begin with and needed separate development efforts. If someone's up for it...

## v2.1.1 "Gabriel Grivoise" - 03/05/2018

### Fixes

- The Magical Girl tag is now properly displayed
- A bug in the function checking if a user is allowed to add a karaoke has been fixed
- Importing playlists has been fixed
- #289 Throttled the commands sent to the player to avoid flooding it when user purposefully clicks like an idiot everywhere at high speeds.

## v2.1.0 "Gabriel Glamoureuse" - 18/04/2018

Refer to the previous release candidates for a full changelog.

Changes sinces 2.1-rc1 :

### Enhancements

- Added a new tag for songs difficult to sing : TAG_HARDMODE
- #287 When using the "stop after current song" button, hitting the Play button will play the next song, not the one you stopped at.
- #253 Rearranged options panel
- #284 Removed admin password change since it's not used anymore
- #281 Songs are now properly ordered by types in lists (Opening first, then insert songs, then endings)
- Added more log messages
- Added some tasks before exiting the app (close database and mpv properly)

### Fixes

- #270 Fixed duplicate kara information panel when opening and closing it quickly.
- #277 Fixed (hopefully) app slowdown under high load
- Fixed some admin tutorial messages
- #274 Songwriter is now a searchable item in karaoke lists
- Fixed song quotas per user not being updated properly
- Fixed song copy from one playlist to another
- Tweaked french translation a little
- #276 Fixed private/public mode switches
- Link to documentation is now correct in welcome screen

### Delayed

- #7 Auto-updater for the app has been moved to v2.2 as we still have some work to do and it's a little tricky.


## v2.1-rc1 "Gabriel Glandeuse" - 05/04/2018

Due to the many changes in this version, you're advised to read the `config.ini.sample` file or the docs to find out about new settings.

You're also advised to read [the documentation](http://mugen.karaokes.moe/docs/
).
[API documentation](http://mugen.karaokes.moe/apidoc/) has also been updated.

Contributors for this version : @Aeden, @AxelTerizaki, @bcourtine, @Kmeuh, @mirukyu, @spokeek, @Ziassan

### Known bugs

- Software updates (#7) are not working properly yet. This will be fixed in the final release. In the meantime it has been disabled.

### New features

- #223 An interactive tutorial has been added for admins and users. A welcome screen has also been added, and the app will open a browser on startup.
- #101 Video previews can be generated (if you switch the setting on) for users to check what the karaoke video looks like on their device.
- #115 Added a user system to better manage permissions and create new features
- #127 Remade the control panel in ReactJS and added new features inside
- #150 Viewcounts can be reset in the control panel.
- #247 Users can be managed from the control panel.
- #151 Songs in lists now change colors if they're soon to be played, or have been played recently
- #167 In public mode, song suggestions can be "liked" by users so the admin can get a better idea of what the public wants. Songs which receive enough "likes" don't count anymore in a user's quota.
- #199 Added a favorites system. Users can add/remove favorite karaokes and add karas from that list.
- #202 Public interface can now be closed down or limited by an admin to disallow adding new karaokes, for example.
- #214 Current playlist now scrolls and follows the currently playing karaoke
- #228 In private mode, makes sure people who didn't request many songs get priority
- #234 `--validate` command-line argument to only validate .kara files (avoid generating database)
- Many command-line arguments have been added. Run `yarn start --help` to get a list.
- #238 A bunch of new tags have been added to the file format
- #240 `config.ini` is now reloaded if modified outside of the app while it's running
- #248 Updating the karaoke base from Shelter can now be done within the app's control panel, or via commandline with the `--updateBase` argument.
- #252 Wallpaper will now be changed once per version
- #266 Added a button in control panel to backup your config.ini file (creates a config.ini.backup file)

### Enhancements

- #201 Generating karaoke database is now faster and simpler
- #218 Jingles are all played before being shuffled again to avoid repeats
- #219 .kara files are now verified before being imported into a database
- #226 The app has been entirely rewritten in ES2015+, meaning it's simpler to read and code for
- #231 Config files have been reorganized. `config.ini.default` isn't needed anymore by the app to start up.
- #239 "Play after" feature has been fixed.
- #246 mpv is now restarted at once if the karaoke isn't running.
- #261 Log files are now in their own directories
- #267 Quotes are now ignored when doing searches

### Fixes

- #217 Obsolete blacklist criterias can now be deleted.
- #227 Long titles now fit in playlists
- #236 Viewcounts are now kept even after a database regeneration
- #251 Karaoke Mugen's URL font on connection info display during play/stop mode has been enlarged as it was difficult to read from afar.
- #260 .kara files' `datemodif` information is now written correctly.
- #244 Lyrics panel in kara information can now be closed.

## v2.0.7 - 17/02/2018

Below here, patch notes were written in french.

Hé ben non c'était pas la dernière version la 2.0.6 vous y avez cru hein ?

### Correctifs

- Fix bug introduit dans la 2.0.6 empêchant d'initialiser la base au lancement.

## v2.0.6 - 15/02/2018

Dernière version (fort probablement) avant le passage à la 2.1.

### Correctifs

- En cas de changement de base de données de karaokés, l'application ne plante plus comme une otarie bourrée à la bière au lancement. (Relancer une seconde fois fonctionnait)
- Les tests d'intégrité en cas de changement de base de données / régénération sont désormais tous executés. Cela pouvait causer des playlists mélangées.
- Les options sont désormais correctement enregistrées même lorsqu'elles sont vides.

## v2.0.5 - 01/12/2017

### Améliorations

- Ajout d'une option `--generate` à la ligne de commande pour forcer une génération de la base et quitter.

### Correctifs

- Faire glisser à gauche sur l'interface mobile ne rajoute plus le kara ! Seulement à droite.
- Fix des samples
- Fix en cas de kara absent d'une génération sur l'autre de la base.

## v2.0.4 - 20/11/2017

- Fix des jingles qui ne se jouent plus si on change l'intervalle entre deux jingles et que cet intervalle devient plus petit que le compteur actuel
- Déploiement continu des nouvelles versions via gitlab

## v2.0.3 - 12/11/2017

- Fix de la réécriture de karas durant la génération
- Fix de l'erreur `OnLog is not a function` du calcul de gain des jingles

## v2.0.2 - 12/11/2017

- #221 Fix en cas d'absence de jingle (cela arrêtait la lecture)

## v2.0.1 - 11/11/2017

- Traduction de certains commentaires de code
- #201 Nouveau système de génération de base de données, plus souple, moins de code.
- Readme anglais/français

## v2.0 "Finé Fantastique" - 06/11/2017

### Améliorations

- Possibilité d'annuler un kara en cours d'ajout depuis la version mobile
- Favicon !
- Le titre de la fenêtre affiche désormais "Karaoke Mugen"
- Le temps total et restant d'une playlist est désormais indiqué en HH:MM plutôt qu'en HH:MM:SS

### Corrections

- Messages d'erreur plus clairs
- Vider une playlist met à jour le temps restant de celle-ci
- #187 Les paramètres plein écran et toujours au dessus sont maintenant plus clairs.
- Le volume ne change plus subitement après un redémarrage
- Le temps restant d'un kara est mieux calculé

### Développement

- Ajout d'une doc complète de l'API : http://mugen.karaokes.moe/apidoc

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
