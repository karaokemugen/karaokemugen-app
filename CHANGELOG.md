# [8.0.4] - 2024-06-02

This is a bugfix version, but also a version in memory of Axel's cat Shami who sadly passed away two weeks ago. We will miss you.

## Changed

-   [Maintainers] Add type in TagsForm
-   [Maintainers] Add rule to filter kara with parents with maxParentDepth equal to 1 in manifest
-   [Operators] Upgraded backend deps

## Fixed

-   [Users] Fix filter by tag for children karaoke
-   [Operators] Fixed unhandled exception for writeStreamFiles on next song when playlist is empty

# [8.0.3] - 2024-05-29

This is a major version, but a minor one compared to 7.1.66. Please read previous changelogs for more information on what's changed since the last major version (7.1)

Changelog format changes from now on. See [https://keepachangelog.com/](Keep A Changelog) for details.

## Added

-   [Users] New wallpaper we commissioned.
-   [Operators] Added new streamer text files for next song and who requested it (#1606)
-   [Maintainers] The alpha character has been added to sanitized filenames.
-   [Maintainers] Media can be reencoded from Karaoke Mugen if it doesn't meet the repository standards. (#1354)

## Changed

-   [Users] Upgraded frontend and backend dependencies
-   [Operators] mpv has been updated to 0.38
-   [Operators] Electron has been updated to version 30.
-   [Operators] Flatpak versions of Karaoke Mugen now force use of their bundled binaries (ignores config) (#1604)
-   [Maintainers] The entire karaoke base isn't validated anymore when a new song is added (#1602)
-   [Maintainers] Repository description isn't mandatory anymore
-   [Maintainers] Logged karafile overwrite errors
-   [Developers] Inbox errors do not trigger a Sentry call anymore
-   [Developers] Updated README with better info on PostgreSQL authentification
-   [Developers] ESLint has been updated to 9.0.0 (#1595)
-   [Developers] Merged linux packaging jobs in CI

## Removed

-   [Operators] Removed platforms from karaoke lists. They can still be seen in karaoke details.
-   [Developers] Removed SAST CI jobs for now

## Fixed

-   [Users] Fixed image previews for local karaokes
-   [Users] Public interface should now work on some older browsers/phones (added polyfills)
-   [Users] Fixed "from display type" being empty/invalid returning empty data
-   [Users] Fixed singer groups not being sorted correctly with singers and series (#1589)
-   [Operators] Mitigated a bug in ffmpeg >7.0 that prevents the scale2ref filter from working. This filter allows us to display QR Codes and avatars. Depending on the ffmpeg version mpv has been compiled against, scale2ref or scale filter is used. scale only works with master ffmpeg versions as of writing this. (#1608)
-   [Operators] Fixed deleting a song from the database (#1613)
-   [Operators] Fixed closing delete user modal
-   [Maintainers] Fixed custom binary git errors
-   [Maintainers] Fixed the family line check when using a song from another repository as parent (#1609)
-   [Maintainers] Fixed editing karaokes with multiple parents
-   [Maintainers] Fixed display issue in karaoke list on system panel (#1600)
-   [Maintainers] Fixed icon display in karaoke form (#1599)
-   [Maintainers] Fixed repository manifests with no rules set
-   [Maintainers] Fixed getAllKarasMicro in some cases

## Security

-   [Users] Removed passwords from logs when erroring out on userOnlineAuth
-   [Developers] Removed useless packages and files

# v7.1.66 - 22/04/2024

This is a bug fix release.

## Fixes

-   [Maintainers] Fixed validation across collections on kara creation (#1601)

# v7.1.65 - 22/04/2024

## New features

-   [Operators] Added before/after year criteria for smart playlists (#1585)
-   [Users] Remote token (which assigns URLs to your Karaoke Mugen app) is now editable in the Advanced Configuration page in system panel.

## Changes

-   [Operators] Added proper validation when editing smart playlist criterias
-   [Users] Change scrollbars to grey to be more visible
-   [Users] ~~Improved stability and performance~~ Added a users cache so checkValidUser doesn't flood the database engine
-   [Maintainers] Collections are now ignored when checking karaoke parent rules
-   [Maintainers] Repository rules are now checked when adding/editing a karaoke
-   [Maintainers] Disabled open lyrics button while media file is being uploaded
-   [Maintainers] All files will be unstaged before trying to create commits (#1588)
-   [Maintainers] Karaoke family line is now checked during generation and when added/edited (#1557 and #1556)

## Fixes

-   [Operators] Fixed incompatibility with mpv 0.38 and up (#1598)
-   [Operators] Fixed "Allow Duplicates" option not working properly (#1597)
-   [Operators] Fixed download and upload button display
-   [Operators] Fixed getplaylistinfo without PLAIDs.
-   [Operators] Fixed multiple smart playlist edits (#1586)
-   [Operators] Smart playlist type should properly change now when hitting the switch button (#1586)
-   [Operators] Fixed database deadlocks with smart playlists (#1577)
-   [Users] Fixed typos
-   [Users] Updated custom nickname/username requirements not being clear enough on the login screen (#1596)
-   [Users] Do not display link to current playlist if not visible
-   [Users] Fixed unhandled exceptions on startup for updateBase.
-   [Users] Database "disk full" errors are now caught properly
-   [Maintainers] Fixed media info card size in karaoke form
-   [Maintainers] Fixed overall bitrate calculation (#1583)
-   [Maintainers] Fixed checkbox display when there's a description for a tag in kara form
-   [Maintainers] Fixed FTP file differences detection when pushing to a new base.
-   [Devs] Fixed mpv options log (and other logs)

## Misc

-   Updated backend and frontend dependencies
-   Updated italian translation (100%)
-   Updated german translation (99.2%)
-   Updated node requirement to 20.x
-   Ignored some errors from Sentry

# v7.1.57 - 10/03/2024

Mainly bugfixes and a few new features.

## New features

-   [Operators] Added a public/current list selector on the top bar for easier playlist changes
-   [Maintainers] Added warning about libavcodec's aac encoder
-   [Maintainers] Added ability to squash (merge) commits into one when there are many commits to make
-   [Maintainers] Current commit is now displayed in git page in system panel

## Changes

-   [Users] Updated italian translation
-   [Users] Better responsive design layout
-   [Users] Upgraded backend and frontend dependencies
-   [Users] Quota is now freed when song is played AND added to playlist
-   [Maintainers] Added toast when batch edit is complete.
-   [Maintainers] Batch edit of karaokes is now MUCH faster (quicker refresh)
-   [Maintainers] Tag types are now sorted in tag files. It would create false modifications for some tag files during commits
-   [Maintainers] FTP renames and deletes are now done AFTER a succesfull push.

## Fixes

-   [Users] Fixed mpv on some Windows versions
-   [Users] Fixed first song played not having subtitles sometimes (thanks @sorc278!)
-   [Users] Added a second attempt when failing SQL transactions.
-   [Users] Fixed buttons alignment in tags list
-   [Operators] Fixed scrolling updates with long playlists
-   [Maintainers] Fixed FTP uploads
-   [Maintainers] Update data store checksum on karaoke batch edit (avoids regeneration on startup)
-   [Maintainers] Fixed edge case for sanitizeFilename
-   [Maintainers] Errors caused by maintainers aren't sent to sentry.io anymore
-   [Devs] Fixed some error messages when sent to sentry.io

# v7.1.50 - 05/02/2024

Happy new year! Late! But happy new year!

## New Features

-   Banner position on player screen can now be customized if the lyrics you're using are at the bottom of the screen for example. (#1530)
-   For maintainers : Edit and Play buttons added on inbox items once they are downloaded
-   For maintainers : Adding a media to the karaoke add form will show possible warnings or errors a media file might cause according to the repository's manifest. This is helpful to prevent people from updating faulty/bad quality stuff. (#1354)
-   For maintainers : Display list of files and diffs for commits when pushing changes to a git repository (#1555)
-   For maintainers : A check is made to avoid overwriting song files when saving a song with potentially a duplicate filename :uuid: (#1558)
-   Added a reset button or search fields in public and operator intefaces (#1540)
-   Added new subtitle formats thanks to subsrt (.srt, .lrc, .vtt). These will be converted to .ass
-   Added custom font support. Fonts can be added to a repository and used in .ass files. They'll be copied to a directory on startup where mpv can find them. **As a result, the new minimum mpv version is 0.37** (#1453)
-   Songs can be added more than once to the public playlists now (see options). This is useful for classic mode karaokes where two people might want to request the same song but not sing at the same time on it. (#1541)
-   Added optional player controls in public interface. Useful for allowing everyone control of the player in a controlled environment (with friends, etc.) (#1526)
-   Added detachable Score Window for twitch overlays during quizzes (#1467)
-   mp3 isn't the only audio file format anymore (#1561)
-   Added option to require a security code from operator in order to create new account/login from new online accounts (#1529)

## Changes

-   Updated spanish and german translations
-   Added Italian translation
-   In operator panel, notification toasts are now stacked and cancel button is removed when adding a song (operators can remove them anyway) (#1549)
-   Quiz answers when loading a previous game are now properly aligned in the setup modal (#1459)

## Fixes

-   Fixed loudnorm filter not being applied when changing playback speed (#1563)
-   Fixed avatar not disappearing sometimes after 8 seconds on player screen (#1559)
-   Fixed quiz answers alignment in score panel (#1491)
-   Fixed possible circular dependancy shenanigans with songs (#1553). Let's avoid pime taradoxes.
-   Fixed guest names for online use. Some weren't sluggified correctly (#1554)
-   Fixed playlist display and playing cursor on public playlist page (#1548)
-   Avoid scrolling to playing song when dragging occurs
-   Fixed playerbox display with multiple tags and versions
-   Fixed public playlist page not using the entire window height (#1528)
-   Fixed playlist and song search sharing the same search field in public interface (#1537)
-   Fixed news sometimes not displaying correctly on welcome screen (#1411)
-   Fixed online authentification a bit by increasing timeout on check
-   Fixed subtitles cleaning that could remove \r tags (#1542)
-   Fixed possible errors during Postgres dumps, making it fail while it didn't.
-   Fixed various issues with ffmpeg and aegisub (#1545 #1546)
-   Prevented query deadlocking when removing a tag with lots of karas using it

## Misc

-   Re-using @cospired/i18n-iso-languages instead of a fork. We now just add our private languages on top of it
-   Upgraded backend and frontend dependencies
-   Upgraded antd to version 5 (#1428)

# v7.1.41 - 11/12/2023

This is a hotfix release

## New features

-   Added `--skipParentsCheck` to CLI options to prevent KM from error'ing out if all parent songs aren't present.

## Changes

-   During Postgres upgrades, a copy of the dump with the data version number will be made, just in case.
-   Upgraded backend dependencies
-   Updated portugese translation
-   Removed some obsolete code

## Fixes

-   **Fixed PG dump file check.**
-   Fixed duplicate playlists in operator page
-   Fixed fsSize() hanging on Windows when network drives are disconnected
-   Fixed + button to add a song when in restricted mode on public interface

# v7.1.39 - 03/12/2023

This is a... release! With bugfixes and some new features

## New features

-   (re)Added QR Code to join the instance on screen
-   Added tooltip showing the time you'll land on when hovering on the song progress bar
-   Added an audio/video delay setting, for when you're on a screen with input lag (or using wireless speakers)
-   Added repository manifest containing rules about the repository (see kara.moe's manifest for an example. More documentation to come later)
-   Window size now adapts better to small screen sizes at launch
-   Added media compliance checks when adding a song to a repository.
-   Account creation can now be disabled completely if you want to avoid people skipping quota rule by creating new account.
-   Songs can now have specific types to display instead of series/singergroup/singer. A song may choose to display the singergroup instead of the series
-   Added lyrics cleanup for songs in karaoke creation form
-   Added Bluesky to social media profiles

## Changes

-   Reworked database restore and dump mechanics
-   Updated PostgreSQL to version 16. It should be transparent for end-users. For those using their own Postgres cluster, we're not yet using version 15 features just yet.
-   Updated ffmpeg to version 6
-   Update to mpv will follow sometime later as 0.36.0 has a bad bug with mp3 playback with covers
-   Enter key can now proceed in setup
-   Removed NoMediaDownloadsAtAll options as it was redundant with Online.AllowDownloads

## Fixes

-   Fixed low player volume on songs
-   Fixed zip repository update when folder is there but empty
-   Fixed empty button for years in operator panel
-   Fixed about window height
-   Fixed export playlist function to work better with KM server's import
-   Fixed french locale for event log button
-   Fixed commits being unchecked when adding a message
-   Fixed upvote count in library
-   Fixed adding repository by URL
-   Fixed furigana display on lyrics panel
-   Fixed playlists, favorites and animelists being updated after a database generation
-   Localized inbox types
-   Fixed checking for gitlab issue being set before updating
-   Fixed update error showing up when being offline
-   Fixed missing french locales
-   Fixed collor for first syllable on lyrics display
-   Fixed Kitsu regexp
-   Fixed stop button not working during classic pause
-   Fixed autoplay triggering when classic pause is set
-   Fixed URL open checks (#1534)
-   Fixed sentry throw for Git Binary not Found
-   Fixed refreshing play button on kara list after successful download

## Misc

-   Added Sunseille as a new contributor
-   Various code cleanups
-   Updated backend and frontend dependencies
-   Added German translation
-   Better error handling to get less false positives on Sentry
-   Minimum node version needed is now 18

# v7.1.31 - 08/10/2023

This is primilarly a bugfix release

## Changes

-   Switch from react-scripts to Vite for frontend build
-   Better Sentry logging
-   Add grant public SQL to init for Postgresql >=15

## Fixes

-   Fixed error in logs on missing tags when integrating songs
-   Fixed errors when updating profile
-   Fixed downloads from inbox with circular parent/children relation
-   Fixed encoding when creating or editing playlist
-   Fixed error display when pushing commits
-   Fixed gettint last chunk of a playlist
-   Fixed local account having online fields visible in profile
-   Fixed social networks sometimes being reset when editing a user
-   Some i18n fixes

# v7.1.27 - 10/09/2023

This is primilarly a bugfix release

## New features

-   Added hooks to remove tags from karaokes when creating/editing them

## Changes

-   Whenever a blacklist or whitelist is modified and impacts which songs should display in the library, a banner will prompt you to refresh the library manually.
    -   Refresh is automatic for the public interface
-   Better Sentry logging
-   Big rework for all errors
-   Removed gain from karaoke information data. This is deprecated in favor of loudnorm
-   Refactored some tag code
-   Upgraded backend and frontend dependencies
-   Prevented guest users from getting recreated by mistake
-   Switched K Menu and Quick Settings in Operator view and moved Home button in system panel so all Home buttons are roughly at the same place across interfaces
-   Changed "Downloads" to "Quiz mode" in Welcome screen

## Fixes

-   Fixed SettingsStoreData for user
-   Fixed smart playlists when not all collections are being used
-   Fixed zip repository update fallback not working as intended
-   Fixed some poll issues
-   Fixed downloads from inbox
-   Fixed test playlist
-   Fixed addKaraToPlaylist which wasn't admin-only
-   Fixed social networks sometimes being reset when editing a user
-   Fixed usernames containing weird characters. This is now disallowed.
-   Fixed flatpak dependencies (since 7.1.22)

# v7.1.22 - 10/08/2023

Hot fix for Postgres not launching directly on Windows with administrator users unless you use pg_ctl ? I've seen weirder stuff happen before. Do you know about The Wandering Inn ?

# v7.1.21 - 09/08/2023

Bugfixes! Bugfixes!

## Changes

-   Extended pitch levels. You can go much higher or lower now when modifying pitch
-   Database dump should take much less time now as we exclude karaoke store data from it (#1493)
-   mpv now restarts faster after a change needing restart

## Fixes

-   Fixed the multiple mpv windows appearing sometimes when mpv ahs been closed incorrectly.
-   Fixed classic mode not being synced between front and backend sometimes
-   Fixed progress bar not showing after next song
-   Fixed stopping mechanism when quizz ends because end of playlist
-   Fixed encore playing during quizz
-   Fixed outros playing during quizz
-   Fixed mpv needing a restart when changing screens
-   Fixed mpv log getter
-   Fixed postgresql not being closed down with Karaoke Mugen, especially under Linux
-   Fixed playlist export filenames
-   Fixed MPRIS initialization requesting info on a song that's not there yet
-   Fixed Flatpak build by compiling mpv/postgres/patch/ffmpeg directly
-   Some i18n fixes
-   Fixed play current modal using non standard playlists
-   Fixed singer groups in karaoke batch edit page

## Misc

-   Upgraded backend dependencies
-   Renamed some fields in database
-   Updated translations

# v7.1.17 - 20/07/2023

This is mainly a bugfix release

## New features

-   Added option in repository settings to never download any media during normal use. If this is turned on, KM will only stream from kara.moe instead of downloading songs. Be aware this may cause issues if your database isn't up to date.
-   "All users" can now be used in favorites/anilist criterias when creating an Automix

## Changes

-   Repository isn't a mandatory property in tag and kara files anymore
-   Automix limits are now optional
-   Updated translations
-   Changed CTRL+A shortcut to something else

## Fixes

-   Fixed flatpak for Steam Deck users (added libs that were missing for mpv)
-   Fixed README on SQL setup for Postgres 15+
-   Files won't be renamed on WIndows if only the case changes
-   Fixed news feed if one of the feeds is unavailable

## Misc

-   Upgraded backend dependencies

# v7.1.13 - 28/06/2023

This is a bugfix release (mostly)

## New features

-   Furigana is now shown in a kara detail's page within lyrics if they have any (like on songs from the kana collection)

## Changes

-   Do not exit anymore if mpv version is obsolete
-   Upgraded backend dependencies
-   Quiz settings no longer use configuration file but the app's state instead (and the DB for long-term storage)
-   Consider mediapath order when editing lyrics to pick the right media
-   Disabled sentry during shutdown process

## Fixes

-   mpv logs sh ould now be forwarded to sentry upon mpv errors
-   Fixed mastodon feeds
-   Fixed macOS notarization
-   Fixed connection info not displaying at th ebottom of the player screen
-   Fixed playlist ID in public interface
-   Fixed deleting checked karaoeks
-   Fixed karalist issues
-   Fixed current playlist search
-   Fixed opposite playlist in karaline
-   Fixed version selector's TypeError
-   Fixed starting quiz with empty playlist
-   Fixed displaying scores at the end of a quiz when playlist reaches its end
-   Fixed automix with anime lists

# v7.1.9 - 14/06/2023

Most of the work on this release has already been backported in 7.0.x versions. Refer to these for more details.

Below are changes from 7.0.46 to 7.1.0 :

## New features

-   You can now open a song's media file from the song list in system panel (#1454)
-   Added fallback playlist KM can play when your current playlist has ended (#1418)
-   Display year and duration of song in version selector in public interface (#1448)
-   Prevent app from starting up if it detects an older database version (#1427)
-   Added Mastodon link (#1421)
-   Added a "Deselect all" button when trying to push new changes to a repository (#1412)
-   Added option to automatically apply blur on karaokes with a warning tag (#1408)
-   Added a progress bar to database migrations (#1399)
-   Added play and usage time on welcome screen in the stats box (#1396)
-   Added button to open file explorer on database folder (#1393)
-   Added quiz mode (#755)

## Improvements

-   Changed tag type color for language in version selector of public interface to make it more visible (#1450)
-   Removed collections in version selector of public interface (#1449)
-   Removed group in version selector of public interface (#1447)
-   Renamed "Families" to "Video Contents" in tag types (#1446)
-   Restricted interface now allows search in library (#1367)

## Fixes

-   Fixed clicking on account after having clicked on website on welcome screen (#1378)
-   Fixed downloading inbox songs with # in their names (#1443)
-   Fixed display bug on "Player screen" option (#1441)
-   Fixed bug on lyrics cleanup on kara edit (#1440)
-   Fixed media downloads that shouldn't happen in local repositories (#1436)
-   Fixed karaoke list on tag edit form when tag has multiple types (#1409)
-   Fixed time in play bar (#1405)
-   Fixed modal that says you're not playing the current playlist (#1403)
-   Fixed error display when creating a playlist fails (#1402)
-   Fixed some filter error (#1398)
-   Fixed user edit JSON error (#1397)
-   Fixed kara form submission without series or singer (#1395)
-   Fixed JWT implementation (#1391)
-   Fixed playlist selector on operator interface when in low resolution (#1388)
-   Fixed frontend connection on a fresh reinstall (#1387)
-   Fixed some operator interface issues with selected karaokes (#1386)
-   Fixed some alignment problems in public interface (#1380)
-   Fixed scroll in public and login pages (#1379)
-   Fixed slider for video size in options (#1375 #1368)
-   Fixed intro and sponsor lines at the start of playlists not marked in operator view (#1372)
-   Fixed audio time set to negative when seeking to 0:00 (#1371)
-   Fixed public interface always in french (#1366)

## Misc

-   Changed `moduleResolution` to `node16` in typescript to be more ESM-compliant (#1452)
-   Removed Sentry DSN from codebase (#1434)
-   Switched from iso-countries-languages to i18n-iso-countries (#1420)
-   Removed temp path from config file (#1374)

# v7.0.46 - 08/01/2023

## Improvements

-   Updated Spanish translation

## Fixes

-   Fixed default repositories being wiped when migrating from 6.x versions
-   Fixed .deb icon for Linux releases
-   Fixed the way tag types are represented in tag files.
-   Fixed "too many files open" bug when integrating lots of tags or karaokes after an update
-   Fixed merging tags
-   Fixed getKara SQL bug with empty tag filters
-   Fixed generation in case i18n is missing from tags
-   Fixed z-index of tag popup
-   Fixed flatpak release (a bit)

# v7.0.43 - 01/01/2023

Happy new year everyone!

## New features

-   Added support for aarch64 architecture for Linux users (experimental, not for Flatpak yet)
-   Added Flatpak for Linux users! Karaoke Mugen can thus now easily be installed on a Steam Deck!
-   Number of upvotes is now displayed in library
-   Videos with warnings (R18/Spoiler/Epilepsy) can now be blurred automatically (or manually by the operator). Thanks @TheMio !
-   Added upvote button in the karaoke details page
-   When exporting medias from a playlist, a .m3u file is now also created for use in any video player.
-   Songs are now considered "played" (for stats) only when the song ended properly. Previously it was considered "played" as soona s the song started.
-   Database migrations can take some time and now have a progressbar on the init page.
-   Added "Open folder" button in the system panel's storage page
-   Added play/usage time in status page on welcome screen

## Improvements

-   Changed wording on the warning modal when hitting play and current playlist isn't displayed on screen
-   Kara form now checks for supported lyrics formats
-   The create playlist modal now tells you what's wrong when there's an error creating a playlist
-   Exported playlists are now labelled with an ISO date (YYYY-MM-DD)
-   Upgraded backend dependencies
-   Upgraded frontend dependencies
-   Restricted interface now allows searching in the library
-   Updated Spanish translation
-   Removed empty lyrics lines
-   Refactored code of pause message
-   mpv logs now have a complete timestamp and not just the date since it doesn't append to existing logs
-   Song parents can be from other repositories. Use at your own risk.
-   An error is displayed if automix contains no songs on creation

## Fixes

-   Fixed missing songs smart playlist criteria
-   Fixed repository basedir creation if not present
-   Fixed song filters when no words have been input
-   Fixed strict mode when generating. Now should error out properly on media change
-   Fixed no playlist selector on low resolution operator panel
-   Fixed kara form requirements not working anymore (serie/singer mandatory)
-   Fixed karaoke list in tag edit form when tag has multiple types
-   Fixed slider for mpv window size
-   Fixed scroll in public/login pages
-   Fixed video preview when there's a song change in public interface
-   Fixed missing poll message in i18n
-   Fixed mini playlist query
-   Fixed DisplaySongInfo not being correctly removed from screen sometimes
-   Fixed display of action buttons in playlist (public interface)
-   Fixed remove and upvote buttons in karaoke detail page (with a specific song version)
-   Fixed conflict between socket.io and will-navigate preventing destruction of the universe and everything (it made the app go crazy)
-   Fixed kitsu slug detection

## Misc

-   Added @red5h4d0w to contributors
-   Switched from jwt-simple to jsonwebtoken package
-   Removed migration screens from 4.5 and 5.0 versions

# v7.0.38 - 27/11/2022

## Fixes

-   Fixed kara.moe auto-update for people with installs before 7.0
-   Fixed opening external links in Linux
-   Fixed file browser in Linux
-   Fixed current song not being properly updated when you stop then play again.
-   Fixed fullscreen option for player not being consistent
-   Fixed drag & drop of songs in playlsit not always working right
-   Various fixes for future Flatpak release

## Misc

-   Upgraded frontend and backend dependencies
-   Removed temporary folder from config as we now use ~/KaraokeMugen/temp
-   Replaced mouse wheel up/down on player. It now changes volume again like before.

# v7.0.37 - 22/11/2022

## Fixes

-   Fixed filesystem available file detection
-   Fixed video size tooltip in option
-   Fixed video size and position needing restarts
-   Fixed jingles bar refresh on the playlist in operator panel
-   Fixed intro and sponsor bars at the beginning of the playlist
-   Fixed negative time displayed when rewinding audio files

# v7.0.36 - 19/11/2022

## New features

-   There is now a delete button on karaoke and tag forms in system panel
-   Export medias and subs from a playlist into a local directory (so you can use them with another player like VLC)

## Improvements

-   Search engine now takes song order into account, so you can search for "ED1" or "ED 1" to get the first ending of a song
-   Once generation is finished, library is refresh in operator view
-   In karaoke form, open Create Tag modal on enter only if autocomplete return 0 element

## Fixes

-   Fixed select log file method
-   Fixed guests accounts' language being incorrectly set to french
-   Moved temp directory back into data directory to make it work with the future flatpak release
-   Locked player commands during shutdown
-   Increased timeout for getStats on welcome page so it displays correctly
-   Fixed some Sentry errors
-   Changed tooltip for Anilist to be more obvious
-   Fixed progressbar on operator interface
-   Fixed kara info crash if no series or singer
-   Fixed the display monitor list
-   Fixed player state on startup
-   Fixed error when playing an online song that isn't available/internet is disabled.

## Misc

-   Upgraded backend dependencies

# v7.0.34 - 09/11/2022

This is a major release. A lot of bugfixes have been backported in 6.x versions so don't worry if you've seen some of them.

## New features

-   Pitch and speed can now be modified in real-time from the operator panel. Warning : may cause light lyrics desynchronisation if set too high or low. May also cause your public to throw nasty things at you.
-   The video player now supports animated pause screens! Use your favorite gif, webm or video as a pause screen now. (#1249)
    -   Beware, you can not have a separate sound track (mp3) file if you use a video or animation as a pause screen. Please include your audio in your pause video beforehand.
-   Guest accounts can be disabled if you wish to only allow individual accounts (#1232)
-   Karaoke Operators can decide if guests can name themselves. If the setting is enabled, guests will be asked for their name upon login. Once Karaoke Mugen is restarted, temporary accounts will be deleted. (#1241)
-   Customize your session's splash page with a message your users can see before logging in (#1259)
-   Customize the "Go to https://xxxx.kara.moe" message on the player (#1256)
-   AutoMixes have been improved : you can now add criterias (like you would do for a smart playlist) to generate the playlist of your dreams (#1270)
-   Link your profile with your Anilist/MyAnimeList/Kitsu profile! Once linked, Karaoke Mugen will create a special list "My Anime Songs" with songs from anime you've seen! This should help you populate your favorites or selecting songs during a karaoke session. (#1258)
-   The video player now makes use of your mouse's previous/next buttons to go to change songs if you've focused the player with your mouse (#1305)
-   New "franchise" tag type to allow searching/blacklisting songs by entire franchises instead of series (#1290)
-   New "music band" tag type to allow searching/blacklisting songs by music bands (when applicable) (#1289)
    -   If no series is present, but a music band is, it'll be displayed on the player instead of individual singers.
-   The Edit Tag page now shows which karaokes are using it. (#1286)
-   Video player will now display who upvoted a song along with the person who requested it (#1284)
-   Logs are now compressed to save space (#1278)
    -   The database dump too! (#1277)
-   Updates can be disabled on a per-repository basis (#1274)
-   Single songs can be shuffled individually in the playlist (#1246)
-   A new language type (Romanization) has been added to allow non-japanese titles/series names to have a proper romanization too.
-   Database updates and other background tasks are now displayed on the operator screen so you know if something's going on! (#1239 and #1225)
-   Added support for .SRT subtitle files (#1213)
-   Added support for .KBP subtitle import. They'll be converted into ASS format on submission (#1347)
-   Karaoke Mugen is now also available on :
    -   M1/M2 Macs (as a native application) (#824 #499)
    -   As an .AppImage for Linux

## Improvements

-   Additional information is displayed in the Status box on the welcome screen (#1342)
-   In the Event Log window, you can now click a button to open the log in your system's file explorer (#1343)
-   Stream Mode and Classic Mode are now exclusive and it's more obvious on the config page. (#1302)
-   A sample karaoke name is displayed in the Edit Profile window to show you what your linguistic preferences will do.
-   "Delete this karaoke" menu item (and other dangerous actions) are now more easily visible in pop-up menus on system panel (#1298)
-   Made criterias/list switch for smart playlists easier to read (#1292)
-   Optimized download manager page (#1281 and #1279)
-   Temporary directory in user data foler will be cleared as part of a migration (we don't use it anymore) (#1276)
    -   The system's temporary directory is now used
-   Increased kara creation/edit form usability (#1272)
-   Karaoke action buttons are now better displayed in karaoke list in system panel (#1248)
-   Notify a maintainer that a file is busy if they try to edit a karaoke and the files are used in another app (#1230)
-   mpv errors now have an accompanying log (#1229)
    -   Also, mpv logs now have a date in their filenames!
-   "Update repositories" button is now on the repositories screen.
-   Git/FTP Information is not mandatory anymore in repository edit form (#1330)
-   All fields from karaokes and tags are now trimmed upons ubmission (#1339)

## Fixes

-   Fixed progression toast missing from add/delete tag in karaoke (#1341)
-   Fixed avatar modal being too big on mobile (#1346)
-   Fixed permission checks in getPlaylistContentMicro route (#1337)
-   Fixed language preference select box on profile modale in some configurations (#1338)
-   Fixed creating new repository (#1327)
-   Fixed medias sync/update not properly removing songs from disabled collections (#1324 #1306)
-   Fixed circular dependencies in karaoke updates (#1320)
-   Fixed inbox download feedback for maintainers (#1316)
-   Fixed About page list of donators (#1310)
-   Fixed removing kara.moe repository creating a new local repo (#1309)
-   Fixed welcome page being too big on small screens (#1164)
-   Fixed + button not greyed out when a song is already present in the destination playlist (#1198)
-   After editing a tag, clicking on new tag doesn't pre-fill the new tag with your previously edited tag (that wasn't a feature, yeah) (#1299)
-   Fixed music not displaying properly on the Backgrounds system panel page. (#1301)
-   Fixed pause screen (#1300)
-   Fixed player's window positioning on MacOS (#1296)
-   Fixed confirmation modal appearing when removing a single song from a smart playlist (#1294)
-   Fixed criterias not refreshing when adding a single song (#1291)
-   Fixed "Add this song to the list" not being greyed out in public interface right after using it. (#1285)
-   Fixed adding songs in restricted mode via API (#1271)
-   Fixed online/local account conversion losing data (#1265)
-   Fixed git config update for maintainers (#1264)
-   Fixed zip folder not being downloaded after deleting it (#1263)
-   Fixed converting local account to online (#1261)
-   Fixed player buttons alignment (#1260)
-   Fixed songs without a collection not appearing in library (#1257)
-   Fixed backgrounds unable to be deleted when used in mpv (obviously) (#1254)
-   Fixed stop button doing pauses instead of stops sometimes (#1253)
-   Fixed settings in config page saved too often (#1250)
-   Fixed mystery songs being displayed in classic pause screen (#1240)
-   Fixed song count for tags depending on selected collections (#1236)
-   Fixed songs not appearing properly if their parents are in a disabled collection (#1235)
-   Fixed jingle/sponsor line disappearing in operator screen (#1233)
-   Fixed tag filter in public interface (#1228)
-   Fixed 5.x playlists not being importable (#1220)

## Misc. changes

-   Updated Electron to version 21.
-   Removed the player progress bar in the dock/taskbar. It was redundant with mpv's own progressbar.
-   Deprecated a variety of code that shouldn't be used anymore (#1247)
-   Some data types have been reworked to allow better type-checking of our code (#822)

# v6.1.18 - 20/09/2022

## Fixes

-   Fixed setup unable to pick up tags from kara.moe due to API changes

# v6.1.17 - 26/08/2022

## Fixes

-   Removed hook watcher system, since it's getting buggy with how many hooks there are in the karaoke base right now.

# v6.1.16 - 01/08/2022

## Fixes

-   Fixed confirmation modal appearing when removing a single song from a smart playlist
-   Fixed criterias not refreshing when adding a single song
-   Fixed "Add this song to the list" not being greyed out in public interface right after using it.
-   Fixed tips
-   Fixed "AND" smart playlists with a single karaoke added not working
-   Fixed opening URLs (using Electron's shell.openPath)
-   Fixed mpv's log not going through Sentry when needed
-   Fixed missing translation for Uploading media error
-   Fixed bugged moving media label in repo edit page

## Changes

-   Renamed "Change Interface" button to "Home"
-   Made changing between criterias and list view in smart playlists more clear
-   Renamed "Série" to "Oeuvre" in french translation
-   Added log to removeTag to try to understand why the f\*\*\* some tags aren't in database when integrating some songs after an update

# v6.1.15 - 21/07/2022

## Fixes

-   Fixed repository updates when there's a song with Unicode characters in its filename (thanks to the Japanese who put these everywhere)
-   Fixed blacklist not working when listing children of a song in public interface

# v6.1.14 - 13/07/2022

Us? Releasing a new version before a major event like Japan Expo? Perish the thought!

## Fixes

-   Fixed addKaraToPlaylist API being open even when UI is in restricted mode
-   Prevent basedir from being empty during git setup for maintainer mode
-   Reverted HTTP breadcrumb removal since it wasn't doing what we wanted.
-   Fixed switch from zip to git repo for maintainers

# v6.1.12 - 04/07/2022

## Misc

-   Upgraded backend and frontend dependencies
-   Added logs to track issues with smart playlist creation
-   Removed HTTP breadcrumbs in Sentry reports if they're about socket.io

## Fixes

-   Fixed multi language karaoke handling
-   Fixed getting playlist IDs for frontend in some rare cases
-   Fixed setting up git config for maintainers
-   Fixed download queue display
-   Fixed repo editing issues
-   Fixed remote to local user conversion losing data on its way
-   Fixed state emission errors from backend to frontend
-   Fixed base zip download if basedir isn't emptied properly

## Misc

-   Upgraded backend and frontend dependencies
-   Added logs to track issues with smart playlist creation
-   Removed HTTP breadcrumbs in Sentry reports if they're about socket.io

# v6.1.10 - 19/06/2022

## Changes

-   Display git and ftp only if maintainer and online are enabled in repository form
-   The `--debug` flag is now `--verbose` since debug is reserved by node now
-   Updated suggest link
-   Added search textbox in user list in system panel
-   Optimized mass edit of karaokes
-   Added Asia as a default collection
-   Moved update repositories button from Database page to Repositories page in system panel (#1223)
-   Added an example song in profile page so the user can see what his linguistic preferences will do (#1180)
-   Optimized users initialization a bit
-   Added language to user if null on login
-   Fixed users hitting play with no song to play throwing errors
-   Fixed trouble with input boxes on options page
-   Added link to current playlist on public welcome page
-   Fixed setup loading when updating repos is in progress

## Fixes

-   Fixed the "Too many files open" issue when patching repository after an update
-   Fixed display of smart criteria for tags in karaoke detail
-   Fixed errors when adding songs that are not present because of collections in smart playlists
-   Removed nulls in songorder in .kara.json files when they're created
-   Fixed karaoke list display with an unknown repository
-   Fixed previewing hooks for a new karaoke
-   Fixed language detection for users (now using browser)
-   Fixed setup loading when updating repos is in progress
-   Fixed users hitting play with no song to play throwing errors (#1255)
-   Fixed trouble with input boxes on options page (#1250)

## Misc

-   Updated backend and frontend dependencies
-   Updated indonesian translation
-   Added portugese translation

# v6.1.9 - 24/05/2022

## Deprecations

-   Toyunda v1-3 subtitle support has been deprecated. We don't normally deprecate features but this one has been a thorn in our foot for some time, making the karaoke creation process overly complicated as we needed the original video with the sub to convert its frame data to correct time.

## New Features

-   Karaoke Mugen now comes with its own mpv/ffmpeg/postgres in Linux, making installation much easier for .deb, .tar.gz and now AppImage format.
    -   AppImage is the recommended installation method as it supports auto-updates.

## Improvements

-   Karaoke add/creation form and tag form now warn you about adding a non-latin language to a list of title/descriptions
-   Prevent user from removing backgrounds currently in use by the player

## Fixes

-   Fixed years view in public interface. It now displays the correct years and number of songs according to your enabled collections.
-   Fixed stop player function not reporting the right status (pause instead of stop)
-   Fixed playing karaoke not updating correctly in playlist in operator mode
-   Fixed editPLC's profiling
-   Fixed deleting songs in inbox not closing issues for maintainers
-   Fixed karaoke integration, which should make base updates smoother.
-   Fixed guests we forgot to remove completely when we updated them last version
-   Fixed links to the documentation
-   Fixed karabundle import from File menu in app. This didn't work anyway.

## Misc

-   Upgraded dependencies
-   Updated indonesian translation

# v6.1.8 - 02/05/2022

## Improvements

-   Added collections in karaoke list in system panel

## Fixes

-   Fixed downloaded_status query, fixing several functions in the app)
-   Fixed macOS auto updates (hopefully)
-   Fixed displaying karaoke versions when adding songs from favorites in public interface

# v6.1.7 - 30/04/2022

## New features

-   Added option to prevent guests from logging in
-   Removed private joke/french guest avatars
-   Added new guest accounts

## Improvements

-   Tags will correctly display (along with their number of songs) depending on your enabled collections
-   KM will error out properly if lyrics/media are busy when editing a song

## Misc

-   Added some extra logging to Sentry when running into mpv errors
-   Added logging to missing parents errors during updates
-   Upgraded backend and frontend deps
-   Removed some DB logs
-   Added logging to tags

## Fixes

-   Fixed blacklisted parents preventing children from being displayed in public interface
-   Fixed mystery songs appearing on player screen and public
-   Fixed adding mystery songs to playlists not setting flag_visible to false properly
-   Fixed migrating whitelist from old KM apps (before we introduced smart playlists)
-   Fixed kara creation without lyrics
-   Fixed some bad mpv code for backgrounds and monitor
-   Fixed repository updates with parents
-   Fixed karaoke not going to next song if monitor enabled sometimes
-   Fixed displaying repositories in kara form
-   Fixed handling of double quotes in title aliases during generation
-   Fixed some UX for the karaform with language list
-   Fixed multiple collection checks for parents
-   Fixed search vector updates when adding/editing a song
-   Fixed karas with parents from disabled collections not appearing
-   Fixed jingle/sponsor line sometimes disappearing in playlist in operator mode
-   Fixed tag type not being mandatory in create tag modal
-   Fixed CSS hiding in public header menu
-   Fixed some playlist creation without correct dates

# v6.1.6 - 11/04/2022

## Fixes

-   Fixed public interface routing for tags (#1228)
-   Fixed add checked karas to blacklist or whitelist
-   Fixed auto-updates on macOS (#1227)
-   Fixed upvote display in favorites

# v6.1.5 - 10/04/2022

## Fixes

-   Fixed get collections in setup
-   Fixed getting kara parent default language when adding a new song
-   Fixed error when add criterias without value in smart playlist
-   Fixed button on database error message
-   Fixed preview button in public playlist wrongly displayed when no karaoke is present

## Misc

-   Upgraded frontend and backend dependencies
-   Reworked kara types (#922)
-   Mac OS
    -   Signed and notarized Mac OS X app (#499)
    -   Add dialog box on macOS on first run to explain what accessibility permissions are for
    -   Menu macOS : Add option check for update on startup
-   Better handling of languages and fallbacks for player (#1226)
-   Do not display languages for description in tag form at first

# v6.1.4 - 06/04/2022

## Fixes

-   Fixed parents check when integrating a new song
-   Fixed getting kara parent default language when adding a new song
-   Fixed localization of repository add/edit errors
-   Fixed news feeds without release notes crashing the proxy feed

## Misc

-   Upgraded frontend and backend dependencies
-   Added some logs when doing base updates

# v6.1.3 - 01/04/2022

## Fixes

-   Fixed importing playlists from Karaoke Mugen 5.x versions (#1220)
-   Fixed repositories and collection button in system panel home
-   Fixed default language in new karaoke submission form
-   Fixed buttons in system panel's side menu
-   Fixed an isssue with favorites updating and its default search
-   Fixed repository folder autofill when repository name is empty
-   Removed collections from public interface homepage

## Misc

-   Upgraded dependencies (backend)
-   Added frontend migration to explain to people what collections are for

# v6.1.2 - 30/03/2022

## New features

-   Song collections (#1193) : Managing several repositories ourselves was a pain, so we merged World and Otaku into one single repository, and added a new tag type called "Collections". Collections can be browsed and used like any other tag type. However, they're enabled/disabled by the karaoke operator at the system leve, which means that if they disable the "World" or "Shitpost" collection, no one one (even them!) will see the songs there.
-   Tags can now be synchronized from one repository to another (#1192)
-   Hooks now allow to add title aliases to a song depending on its titles. (#1184)
-   Favorites can now be displayed from newest to oldest (Note : newest as in created in the database, not newest added to favorites) (#1183)
-   English is not considered an universal fallback when deciding in which language a karaoke series/title should be displayed. Songs now have a "Default title language" setting. (#1178)
-   Karaoke previews are now hardsubbed : these hardsubs are generated by Erin, our dedicated server, and will be used when clicking the "preview" button in a karaoke's detail page on operator and public views, since having ASS in the browser is a pain at the moment. (#1162)
-   Playlists can now be shuffled _entirely_, not only after the currently playing song. (#1161)
-   Karaoke Mugen is now ECMAScript Modules-compatible. (#1110)

## Fixes

-   Fixed favorites being wrongly grouped (#1197)
-   Fixed invalid guest names due to change in our slug library (#1209)
-   Fixed editing songs in other repositories creating wrong tags (#1210)
-   Fixed hooks preview when editing songs (#1208)
-   Fixed error messages when removing public/current/whitelist/blacklist playlists (#1207)
-   Fixed parent songs appearing more than once on a song (#1205)
-   For other fixes, look at the Fixes sections of versions 6.0.0 to 6.0.52

# v6.0.52 - 07/03/2022

## New features

-   Added the + button to karalines again in public interface
-   Inbox management now can close issues and assign users.

## Misc

-   Karaoke Mugen is now compliant with ES Modules
-   Upgraded dependencies

## Fixes

-   Possible fix to PG dir with accent characters on Windows
-   Fixed switching current playlists
-   Fixed placeholder when clearing filter in operator panel's library
-   Fixed adding songs in the right order from library to a playlist when selecting multiple songs
-   Fixed switching to next song when clearing the playlist while a jingle is running.
-   Fixed error message when failed to check for updates
-   Fixed editing a karaoke when needing to extract subtitles
-   Fixed sorting users by last seen in user list on system panel
-   Fixed filter by groups on download page
-   Fixed karas validation when strict mode is enabled
-   Fixed addTitleAlias hooks
-   Fixed user online event subscriptions

# v6.0.50 - 13/02/2022

## Misc

-   Updated dependencies (Namely Electron 17)
-   Kara creation date is now displayed when you click on the details of a playlist item
-   Updated readme

## Improvements

-   Optimized adding a song to a playlist, especially when you decide to add a lot of songs to a playlist.
-   Added download media button on kara list in system panel when the song isn't downloaded yet
-   Made the + button bigger on public song list
-   Added a "Add to playlist" button on song details on the version selector
-   Stats are now updated in welcome page after updated all repositories

## Fixes

-   Fixed updating karaoke parents when doing a repository update
-   Fixed a possible SQL injection in getKaras
-   Fixed gitlab feeds display
-   Fixed various bugs we found via Sentry
-   Fixed rename user login in user edit page
-   Fixed post migration tasks not properly being awaited
-   Fixed favorites loading after previous library loading

# v6.0.48 - 30/01/2022

## Misc

-   Add link to forum in menu
-   Updated dependencies

## Fixes

-   Added minimum system version for macOS builds (10.14.0 due to postgres 13)
-   Updated timeout for api calls to 30 seconds instead of 10 seconds
-   Fixed warning when a song has the same parent twice
-   Updated translations
-   Prevent multiple updates from running at once
-   Fixed logout when accessing privileged routes

# v6.0.47 - 27/01/2022

## Misc

-   Updated backend dependencies

## Fixes

-   Made SQL migrations safer due to upgrades kind of making this a mess for some users
-   Various fixes to kara creation/edition
-   Added a button to go to the forum for help if you have database connection issues
-   Fixed FTP upload total size on progressbar
-   Tags list in system panel now saves its filter
-   Fixed software update messing up with repository updates
-   Updated translations
-   Fixed log out to operator page when wrong user role is detected
-   Fixed tag priority visibility on public/operator pages

# v6.0.44 - 19/01/2022

## Updates

-   Updated indonesian translation
-   Upgraded backend and frontend deps

## Fixes

-   Fix parents being deleted during updates order
-   Fix parents order when integrating new songs from updates
-   Added max year in kara form to prevent stuff
-   FIX ONLINE USER CREATION. AGAIN.

# v6.0.42 - 16/01/2022

## Fixes

-   Fix for creating a karaoke without lyrics
-   Fix enter key not registering a tag should be created in karaoke form
-   Fix refresh when editing karaoke
-   Fix parent topological sort when updating your base
-   Fix error display when inbox is not available for someone

## Translations

-   Improved indonesian

# v6.0.40 - 13/01/2022

## Hotfixes

-   Reinstate agentkeepalive for people with strange network configurations who can timeout while downloading media
-   Better manage database generations after a database migration occured

# v6.0.39 - 12/01/2022

## Hotfixes

-   Fix first startup not downloading the karaoke base
-   Fix about screen to display our most generous donators better

# v6.0.38 - 12/01/2022

## New features

-   Song information can be hidden by the player options, for blind tests for example (#1143)
-   You can choose your mpv output audio device (#968)
-   You can now upload custom backgrounds for the player (along with music!, #899, #785)
-   You can create "smart" playlists which will update automatically based on criteria you define (#809)
    -   This is like the blacklist system, but it's not limited to just blacklists. You can now create smart lists with anything, like all songs with the "Hololive" tag for example.
-   In streamer mode, Twitch messages will be shown in "Nico nico douga" fashion (#1023)
-   Songs are now grouped (configurable in user panel), a song will be presented with each version for you to choose (#935)
-   The public playlist will show a "Review songs" panel, it allows to see each karaoke in detail before deciding to accept/refuse (#1022)

### Karaoke Mugen Studio

Karaoke Mugen Studio is a set of features intended at contributors and maintainers:

-   The karaoke list now shows an "Edit lyrics" button, opening the associated program (e.g Aegisub, #1084).
-   Repositories can have hooks, automated "scripts" that will for example, add Hololive creator tag for any Hololive-affiliated singer (#948).
-   The karaoke inbox can be displayed in the app, maintainers can download karaokes and integrate them in the database (#1086 #1171).
-   You can push/pull Git-enabled repositories, along with uploading videos to FTP (#1085 #1153 #1152 #1158).
-   There is an "Edit karaoke" in KaraDetail entries (#1055)

## Improvements

-   A new tag type `warning` has been added. It has the "Adult Only", "Epilepsy" and "Spoiler" tags in it. The new tag type allows us to simplify some code. All tags in this type will display a warning on the player screen and in the library/playlists (#1175)
-   Karaoke creation form is now better, faster, stronger (and uses less code) (#1159)
-   Options in operator panel have been reworked a little (#1157 #1166 #1156)
-   "Transfer song to playlist after current song" and "Transfer song to the end of playlist" are now properly separate options in song context menu on operator panel (#1154)
-   A new option `SongInfoLanguage` under `Player.Display` section has been added in config. It allows you to select another language for the player to display song information as, if it's different from your OS's locale **and you really care about that because you're a weeb who likes displaying songs on the player screen in kana or romaji instead of your OS's locale**. (#1149)
-   There is now multiple lines in the current playlist for sponsors and jingles (#1134)
-   You can switch the interface language in the user settings (#1050). For the moment, only French and English are fully implemented. Spanish and Indonesian are partially implemented. You can contribute to the translation on https://hosted.weblate.org/projects/karaoke-mugen/.
-   Songs now have internationalized titles (#847)
-   There is now "Japanese" and "Japanese - Romaji" in language preferences (#850)
    -   Titles can now have aliases, since certain songs are known differently sometimes, unrelated to any language. This'll help people find songs via the search engine (#1168)
-   You can hide more elements from the player OSD (song informations #1143, quotes #1080)
-   `Player.SongInfoLanguage` config key allow power users to force a locale for song information displayed on the screen (#1149)
-   The zip/patch repository system was improved with a file download fallback (#1122)
-   The About page was refactored and includes donator list from our Patreon (thanks donators!)

## Fixes

-   Outdated media will not trigger an ffmpeg analysis anymore (#1151)
-   Fixed tag autocomplete system in the operator panel (#1163)
-   Time remaining in a playlist is now properly computed when there's no song currently playing set (#1160)
-   There is no more layout shift in Welcome Page (#1141)
-   App is now launchable even if one of your repositories is not reachable on disk (#1137)
-   The show/hide subtitles was reworked to avoid weird icon display (#1135)
-   The favorites stats consent is included in setup pages (#1125)
-   The app should start if a media path is not available (#1137)
-   The inline tag popout should be displayed correctly (#1069)
-   The progress bars and player statuses should be updating properly after wake-up on mobile devices (#1079)
-   Fix bottom margins on public interface (#1067)
-   Fix player scaling on HiDPI displays (09b80a54)
-   Users with online accounts were randomly reset, this shouldn't happen anymore (#1092)
-   Before setup, the menu bar is displaying a limited set of options (#1081)
-   Media probes shouldn't be done anymore on outdated media files (#1151)
-   Merging two tags when both are present in a karaoke should work properly now (#1107)
-   You can resume karaokes when you have an empty current playlist (#1101)
-   The zip/patch mechanism shouldn't try to update disabled repositories (#1115)
-   The moving process of karaokes in a list should be more stable (#1103)

## Misc

-   Tags can have a `-1` priority to be hidden from public, and `-2` to be hidden everywhere.
-   The code is now formatted with Prettier. Developers, please install the pre-commit hook with `yarn husky install` (should be done automatically on installation, #1114)
-   DAO functions names, user functions and resolved paths were refactored (#1119, 21cb29e0, #1089)
-   Medias update now uses the standard downloaded classes (#1120)
-   got was replaced by axios (#1099)
-   react-virtualized was replaced by react-virtuoso, react-sortable-hoc was replaced by react-beautiful-dnd (#954)
-   Electron was updated to version 15.x (#1100)
-   PostgreSQL was updated to version 13, the migration should happen automatically with backups done on the app start since version 5 (#488)
-   Progressively, the frontend is being converted to React functional components (#911)
-   Demo mode was removed (#1082)
-   The app is translated in more languages thanks to [Weblate](https://hosted.weblate.org/projects/karaoke-mugen/)
-   The following configuration keys were removed and/or moved: (#1057)
    -   `Frontend.GeneratePreviews` was removed and is always true
    -   `Frontend.AuthExpireTime` was removed
    -   `Frontend.Port` was moved in `System.FrontendPort`
    -   `Karaoke.Display` was moved in `Player.Display`

# v5.1.32 - 23/11/2021

## New features

-   In case of a failed patch during an update (and it happens a lot according to our sentry logs), songs will now be individually downloaded if git patches fail to apply (#1122)

## Fixes

-   Rejected patch logs are now logged, not only sent to Sentry
-   KM will download VC Redist 2012 for PG10, and VC Redist 2015 for newer versions
-   Base checksum test won't happen if database isn't ready yet
-   Skip online checks when editing a repository to move its medias around
-   Dump errors are now sent to Sentry

# v5.1.30 - 13/10/2021

## Improvements

-   Discord activity now shows URLs to Karaoke Mugen website, and your remote access if enabled.

## Fixes

-   [hotfix] Online users were not created properly due to Server API new behaviour.
-   CSS Imports fixes in Frontend
-   Rework move medias

# v5.1.29 - 10/09/2021

## Fixes

-   Microsoft Visual C++ Redistribuable will now be downloaded and installed by KM if it's missing. (#1105)
-   Failed patches are now reported to sentry so we can debug what's wrong
-   Failure to delete local users after they've been deleted from KM Server is now properly handled
-   Merging tags now takes the full tag information into account

## Misc

-   Extracting zip files is now made in Electron's main thread instead of a separate worker.

# v5.1.27 - 26/09/2021

## Improvements

-   Chibi playlist can now be resized
-   Toast is dismissed when deleting a song from a playlist
-   Filter isn't cleared anymore when going back from a song's detail page to the song list
-   Upgraded various backend dependencies
-   `--test` argument is now iignored for packaged apps

## Fixes

-   Fixed double guest errors when creating them
-   Added logs when initPGData fails.
-   (Hopefully) fix for PostgreSQL start up/init issues on paths with non ASCII characters
-   (Hopefully) fix for online accounts profile information being reset sometimes
-   (Hopefully) fix for multiple updates run during setup causing the repository update mechanism to hiccup
-   Fix media check-and-download when the media already exists
-   Prevent media updater from trying to delete non-media file

# v5.1.23 - 22/08/2021

## New features

-   Media keys usage can now be enabled/disabled in the system panel's system preferences.
-   Added Japanese Romaji language for tags
-   Stopped using loudnorm on pause/intermission music provided by the user.

## Fixes

-   Prevent streamer files writing from being executed when app isn't ready yet
-   Fixed "Change interface" button in system panel not displaying properly
-   Fixed downloaded status icon update in operator panel.
-   Removed sentry error report if updateMedias is already running
-   Fixed moving media folder in repositories
-   Fixed ssetup always running repository move even if not asked to
-   getKaras API can now be used with restricted interface mode
-   Caught some frontend errors
-   Fixed streamer files not able to write themselves because folders weren't created properly sometimes
-   Fixed some edge cases where windows weren't properly closed on app exit.
-   Fixed cases for weird characters in filenames (thanks Japan)
-   Fixed database dump fail log

## Other

-   Removed i18n tag validator and lang validator in preparation for 6.x

# v5.1.21 - 24/07/2021

## Fixes

-   Removed sentry warning when removing non existing tag files
-   Fix missing delete button when wanting to remove several songs at once in operator panel
-   Fix displaying quota time
-   Fix displaying quota message when restricted interface
-   Fix adding songs made possible when restricted interface
-   Removed textArea in karaform for comments
-   Fixed regexp for detecting if path is a Windows drive letter root
-   Fixed KM-APP-1P4

# v5.1.20 - 19/07/2021

## New features

-   Add instant play on public playlists (#1034)
-   Database is now dumped on exit as well so we can better upgrade PostgreSQL later in 6.0

## Fixes

-   Fix remote not self-destructing correctly in some cases (KM-APP-1NG)
-   Fix file browser on system panel when not using electron (#1059)
-   Fix adding all songs from playlist to playlist (#1060)
-   Menus on the operator panel are now exclusive (only one can be opened at once) (#1061)
-   Fix playlist buttons not being updated after public playlist change (#1062)
-   Fix searches in whitelist
-   Fix "time before song plays" unaccuracy
-   Fix race condition bug when updating repositories
-   Fix guests with non-ASCII characters
-   Prevent users from creating accounts with non-ASCII characters
-   Prevent multiple generations happening at hte same time
-   Prevent users from creating a repository at the root of a windows drive
-   Better quit sequence when auto-updating (to allow later PostgreSQL upgrade)
-   Fix keyboard shortcut conflict in menus
-   Fix delete playlist modal
-   "Select all" buttons no longer just inverts selection
-   Better explanation of what the "allow duplicates" option does
-   Removed mentions of shortener in privacy policy as it's not usable anymore
-   Removed mentions of msvcp/cr120.dll to detect if VC++ redist is installed on windows systems (it wasn't always working)
-   Fixed URLs to kara.moe

# v5.1.17 - 04/07/2021

## New features

-   Added Groquik guest account

## Fixes

-   Don't check media presence anymore in demo mode
-   Better logging of configuration before checking for binaries presence
-   Fixed settings store wipe on fetch error when trying to update a repository
-   Fixed songs order when mass adding these to playlists (#1052)
-   Fixed some english translations
-   Fixed display of delete button in media lists in system panel
-   Fixed movingMediaRepo errors
-   Fixed getRemoteData errors
-   Removed some useless logs
-   Fixed addDownloads errors

# v5.1.15 - 21/06/2021

## Fixes

-   Allow local repositories to have their songs modified/deleted
-   Stopped sending sentry errors for invalid playlists import
-   Fixed double generation when cloning new repository
-   Consolidate Repository action now becomes Moving Medias in setup and in repository pages because consolidate repositories is now vintage.

# v5.1.14 - 20/06/2021

## Fixes

-   Fix URL displayed on player screen not having the port
-   Added checks for adding blacklist criterias with wrong numbers as values
-   Fix generation aborting because all folders aren't properly created.

# v5.1.13 - 17/06/2021

## Hotfix

-   Fix on playing mp3s from http sources

# v5.1.12 - 17/06/2021

## Hotfix

-   A migration bug kept KM from being able to update the repositories properly to the new format

# v5.1.11 - 17/06/2021

This is a minor but major but still minor but well, it's a new version.

## Important notice regarding song management (#969)

Karaoke Mugen changes how it handles songs from version 5.1 and onwards.

We realize people don't wish to download all medias for all songs because it can take up a lot of space (currently ~420Gb) and don't seem to understand they need to donwload songs for them to appear in lists.

As a result, Karaoke Mugen will now download your repositories entirely if empty and keep them updated on startup.

Medias will be downloaded separately, as you need them :

-   When you add a song to the current playlist, it'll be downloaded in the background.
-   If you play a song from the library directly, and if it hasn't been downloaded, it'll be streamed directly from the repository's server.

There are ways for you now to see how much space a repository takes on your hard drive, and clean up unused songs manually or in bulk.

Since we're basing this work on git (we have Karaoke Mugen Server create a diff and then apply it to your files), your repository will be kept up to date when Karaoke Mugen starts. If medias have been updated for songs you have already downloaded the medias for before, they will be redownloaded.

## New features

-   A blacklist criteria set "Safe for karaoke" is now created automatically the first time you start Karaoke Mugen. It contains all problematic tags like R18, Spoilers and Epilepsy. You can use it or not :) (#1013)
-   You can now have music during pauses in your karaokes sessions. (#938)
    -   Put any audio file in the `backgrounds` folder.
    -   If the audio file has the same name as a particular background image, it'll be played when that background image appears.
    -   If a background image has no audio file associated, it'll select a random music from the folder
-   A new option "Use my favorites and song requests for stats" has been added to user profiles (#950)
-   A new option "Location" has been added to user profiles to define where you are in the world. This is for the KoE (Karaoke On Earth) project (#951)
-   Some improvements have been made for Twitch streamers :
    -   The pause screen now has a progress bar (#967)
    -   The pause screen can now be paused for a longer time if you need to, by hitting the Stop button in the player controls (#990)
    -   The Twitch chat now has a `!song` command to display the current song being played (#996)
    -   A new window containing the currently playing song and the next ones can be opened and captured via OBS to display on your stream layout (#998)
    -   Karaoke Mugen now writes some useful information in text files so you can read them through OBS Studio or similar to get useful information. These are located in the `streamFiles` directory (#997) :
        -   Current song name
        -   URL to access your karaoke session
        -   Interface status (opened/closed/restricted)
        -   Number of songs in the current and public playlists
        -   Time remaining in the current playlist
-   There is a new comment field in karaoke information (maintainers only) (#1012)

## Improvements

-   Settings are better explained on the options screen (#1026)
-   More songs are displayed in the public song library on mobile (#1015)
-   Added a warning on user profiles when email is empty (#1002)
-   All API documentation can now be found at [here](http://api.karaokes.moe/app) and is made with @nuxt/content. As a result, all old Apidoc comments have been removed from the app's source code. (#805)
-   The "About" window has been fully translated (#857)
-   Song list in system panel can now be filtered by tags (#945)
-   Song list in system panel now has a bulk delete option (#945)
-   Requester is added to stats sent to Karaoke Mugen Server (only if the user has opted in for its requests to be used for stats) (#949)
-   The unused tags/medias list now has a "Delete" button in front of each entry. (#976)
-   Some unused localized strings have been removed (#978)
-   Navigation in the operator panel has been improved (#989)
-   Improved sentry reports for frontend errors (#994)
-   The user list in the operator page can now be closed with the ESC key (#1010)
-   The border has been increased to 2 on the player's font for song info (#1011)
-   You can now use the ENTER key to submit the form on the login in setup page (#1018)
-   Tags are a little smaller in the player progress bar (#1021)
-   Bulk actions are now available in the blacklist view (#909)

## Fixes

-   Fixed OBS not capturing the KM window properly if it's hidden behind other windows/minimized
-   Fixed the "Select All" button on operator panel (#1019)
-   Fixed scroll in library (#1014)
-   Fixed volume button state on startup (#1016)
-   Blacklist criterias: Several fixes have been made (#909)
    -   Can't have "Longer than" and "Shorter than" at the same time, or even several of them.
    -   Can't have a "Shorter than" bigger than the "Longer than" criterias anymore
    -   The blacklist view explains a bit better how it's created from the current BLC set
    -   The reason why a song is blacklisted is now displayed in the karaoke info window
-   When running a packaged version, the first command-line argument is no longer ignored (#986)
-   Some SQL migrations now have a `if exists` clause for drops (#988)
-   Fixed some DB errors during shutdown (#991)
-   The remote is now properly reinitialized after some settings changes (#992)
-   Fixed some error popups (#993)
-   Fixed song list position in public interface when you come back from the karaoke detail page
-   Fixed Socket not initialized properly when remote is being enabled (#1006)

## Other

-   For users using Karaoke Mugen from its git/source code, the minimal MPV version required is now 0.33 (#1008)
-   The `https://kara.moe` URL has been disabled since it only worked when on the same network. It's replaced by the Remote system (with codes like `abcd.kara.moe`) which is now stable. Plus it was confusing (#1003)
-   Some playlist specific code has been moved to the KM shared library so we can use it for a new exciting feature on Karaoke Mugen Server (#1005)
-   Dependencies have been updated

# v5.0.37 - 09/05/2021

## Fixes

-   Fixed reset password for local account (a72066a)
-   Change discord link in init page (1c024ad)

# v5.0.36 - 09/05/2021

## Fixes

-   Fixed a weird case when adding a song to a current playlist with autoplay on, and the kara added isn't the last one in the playlist, but the currently playing song is the last one. Yes, complicated and stuff. That's why we have users : to test our app for bugs. (6f9723672)
-   Fixed a few minor web interface errors (5be0121d2 53b4a2bd4)
-   Added more breadcrumbs (logs) to Sentry on the web interface (68f711149)
-   Fixed i18n input field length in tag submission form (45d63c4c)

## Misc

-   Upgraded backend dependencies (62dd5c1b)

# v5.0.33 - 25/04/2021

## Improvements

-   There's now a warning if your email's left blank when you update your profile. Without any email, you won't be able to reset your password if you forget it.
    -   You can still ask for a password reset in exchange for 50 000 Karaoke Points(\*)
    -   (\*) Feature not yet implemented.

## Fixes

-   "We have resolved some bugs and improved stability to make your karaoke experience even better."
    -   Seriously though...
-   The "Consolidate repository" feature is now fixed.
-   Some english translations were missing in the app
-   There was a rare case when a minor functionality would prevent mpv from loading up files
-   Blacklist generation will work as intended even if no set is current.
    -   How it did happen is beyond us.
-   Some fixes were made on some success modals
-   We've added more logs to Sentry for frontend-related issues.

# v5.0.32 - 16/04/2021

## Improvements

-   In case of migration errors, migrations already applied are now logged.
-   Display original name between parenthesis when search serie in kara form

## Fixes

-   Fixed stop causing pauseScreen to disappear (#990)
-   Fixed stopAfter toast appearing when trying to stop (pause) the pauseScreen (#990)
-   Fixed command-line processing ignoring the first argument (#986)
-   Fixed some migrations for some people (#988) Don't ask how it happened, we don't even know. Karaoke Mugen is like magic sometimes. Or a child who grew up too quickly :(

# v5.0.31 "Poppy Partagée" - 14/04/2021

## Important notice

_clears throat_ Karaoke Mugen 5.0 introduces a brand new singing experience for y'all! It contains a fully reworked public interface, which aims for ease of use and efficiency.

It also provides an easy way to share your karaoke with friends with **kara.moe subdomains** (example https://wxyz.kara.moe).

-   Usernames are now **case-insensitive** (#770). Karaoke Mugen will detect name conflicts in your user database and eventually fixes them automatically or asking you to do something about. In any case, the accounts with conflictual names will be automatically renamed with suffixes.

## New features

### Privacy policy (#861)

Upon your first launch of this new version, you'll get a summary of the data we collect and how we use it. You can choose to disable data collection at anytime if you object to it.

We also added a system to more easily manage news updates whenever you install a new version of Karaoke Mugen (#845)

### Stats are now per repository (#875)

Stats can now be sent per-repository and are not global anymore. This means you can choose to send your stats data only to one repository but not to the other.

### Song versions (#855)

A new type of tag has been introduced in 5.0 : versions.

This will allow you to better filter out (or in) different song versions like "Alternative", "Off Vocal" or "Full".

### Remote access (#198)

Karaoke Mugen can now expose itself via Karaoke Mugen Server to allow other people on other networks to access your karaoke. Perfect for remote sessions at anime events or over Discord our Twitch.

![Remote Access control box](https://gitlab.com/karaokemugen/code/karaokemugen-app/uploads/f769ef18debdb7e4d55abb9b3df91f77/Capture_d_écran_du_2020-12-31_00-08-25.png)

It can be enabled in Settings -> Karaoke. It will generate a token kept by Karaoke Mugen for you. It will allow your room URL (https://XXXX.kara.moe) to be always the same after restarting the app.

The tokens expire after 10 days of non-use, but you can ask an administrator of the server to promote your token into a permanent, customized one like Axel.kara.moe.

_In order to save bandwidth, some karaoke thumbnails or profile pictures may not be available for remote users, but this will not prevent them from adding these songs._

### New public interface (#804, #739, #551)

A brand new public interface is available with Karaoke Mugen 5.0. Our goal was to make the user experience better while providing more search tools and exploring capabilities.

-   The current song lyrics are available on the home page
    -   The current line is highlighted in yellow

![Lyrics Box](https://gitlab.com/karaokemugen/code/karaokemugen-app/uploads/49f8517028bc3550e72631a7370fb154/Peek_31-12-2020_00-07.gif)

-   The top progress bar has been replaced by a new bottom bar

![Bottom bar](https://gitlab.com/karaokemugen/code/karaokemugen-app/uploads/43a3b9e5a235e9c3789b1efef43cc7d2/image.png)

-   Homepage is now featuring a "now playing" box

![Player Box](https://gitlab.com/karaokemugen/code/karaokemugen-app/uploads/8cc3b9e6d90d1bb9c6b2b16468c2962f/Capture_d_écran_2020-11-11_à_22.00.58.png)

-   You can now explore tags by category

![Tags List](https://gitlab.com/karaokemugen/code/karaokemugen-app/uploads/e9696536c20526808ada84b13520c085/Capture_d_écran_2020-11-11_à_21.57.50.png)

-   Popular songs are now fetched from your configured repositories instead of checking on your local database. You can disable this (#872)

### New shuffle modes (#772)

We reworked our shuffle modes, including a new one: balancing. Balancing creates pools of users: each user will have one song per pool (A-B-C, A-B-C, etc.), it creates more fairness for people adding less songs than others.

![Shuffle button](https://gitlab.com/karaokemugen/karaokemugen/karaokemugen-app/uploads/5307ea7a7f92e4416cca7b11881324eb/image.png)

### Sort playlist by likes (#887)

You can now sort a playlist by its number of likes from your guests. The playlist can also auto-sort itself (it's another property in the edit playlist window)

### Accept/refuse songs (#902)

When having a public and current playlist side by side in the operator page, you can accept or refuse songs in the suggestion playlist.

-   Accepted songs are copied into the current playlist and marked as free (thus freeing quota for the users who requested them)
-   Refused songs just sit there. Refusing a song frees it for the user who requested it, but since the song is in the public playlist the song will not be requested ever again.
-   Playlist can be viewed sorted by number of likes. Unaccepted/unrefused songs are shown first, then accepted then refused songs.

### Sessions exports (#773)

You can now more easily **export your sessions data** as .csv, it will contain songs requested by users, play history, etc.

### Chibi player (#725)

![Chibi player](https://gitlab.com/karaokemugen/code/karaokemugen-app/uploads/b6a4a7488db7456fadc30a37a15b18fb/Capture_d_%C3%A9cran_2020-12-04_%C3%A0_22.13.15.png)

**Chibi player** is a compact window designed to have easy controls over the Karaoke Mugen player, it can be set to be always on top of other windows.

It can be enabled in the Window menu.

## Breaking changes

-   API is now **using a socket.io** interface, however `POST /api/command` with `{cmd: 'GetKaras', body: {body: {from: 0, size: 400}}}` can be used to send commands without establishing a socket.io command (#666).
    -   This new API will be documented later, we lack workforce to do so right now.
-   database.json config file is now merged with config.yml in `System.Database` object, see config sample (#746)
    -   Karaoke Mugen should handle this change automatically for you and merge the two files

## Improvements

-   Downloads are now made 3 at a time, not one at a time, to speed up big download queues (#910)
-   Security code begone! The security code still exists when you're using a browser, but when using the app's electron browser, it will communicate with the app directly to get it and authenticate you. (#891)
-   When creating automixes, the songs' requesters are now the ones who had that song in their favorites (#897)
-   In streamer mode, stopping the player during a pause will disable pause time (allowing you to manually play the song once you're ready to sing again.) (#890)
-   The player window now has borders! (you can disable them like it was before) (#889)
-   Player window will stop resizing itself depending on the aspect ratio of the video (#888)
-   In classic/streamer mode, the "Next song" text isn't underlined anymore. Apparently it was a crime against mankind to do so (#886)
-   You can now bulk-add songs to your favorites, the white or black list from the operator panel. (#853)
-   Blacklist criterias panel is now explained (#867)
-   You can now see the download queue (#862)
-   KM will now ask you if you want to resume pending download on startup if there are any, instead of resuming them automatically like it did before (#852)
-   The tutorial has been revamped to be shorter and easier to understand (#839)
-   The search engine can now understand exclusion (-word) and group ("group of words") operators.
-   (Admin interface) Rename, set as current/public have been merged into a single "Edit playlist" button (#832)
    -   The create playlist screen also allows you to set a playlist as public and/or current.
-   Users now receive notifications when they can add songs again (when their quota becomes positive, #764).
-   Upgrade from KM 3.2 works again (#798)
-   When users upvote a song, it cannot be deleted by the original requester anymore (#803)
-   Thumbnails are generated for each song now (for the public interface, #800)
-   System panel navigation has been reworked with a new home page (#724)
-   Tag names are now uniform against all our applications (#678)
-   Player is now configured to have [loudnorm](https://ffmpeg.org/ffmpeg-filters.html#loudnorm) normalization (bd2964bd) instead of replay gain calculation.
-   Circled avatars aren't created by KM now but instead are automatically generated at playtime by lavfi filters (fb99c6ec)
-   The stats/sentry consent is part of the setup procedure now (#830)
-   Fingerprinting has been disabled. It allowed to recognize browsers/devices to keep them from unlogging and relogging as random guests to get new ones. Problem is a lot of browsers now keep the fingerprintjs library from working correctly for privacy/tracking reasons, so we stopped using it (#893)
-   Database rework! We reworked how songs are stored and accessed in the database, making adding/editing/removing karaokes and tags will be much faster for karaoke database maintainers. It also allows you to edit your song library during a karaoke as it won't conflict with users accessing it (#884 #882)
-   All window modals have been reworked and are more beautiful. (#881)
-   Admin messages can now coexist with the other messages (Go to kara.moe, song informations, b2e2bc52)
-   You can now delete a song with the flag_playing attribute set as long as it's not currently playing (#917)

## Fixes

-   Time before a song is going to play is now correctly displaying the right time (#912)
-   "Next song is..." notifications are disabled if the playlist is set as non visible (#896)
-   Playing a song from the library when the current playlist is near the end does not trigger a outro/encore jingle anymore (#908)
-   Telling if a user is connected to your karaoke session is now clearer (#906)
-   Fixed playlist outro triggered even though another song is due to play. This happened when you moved around a song from the playlsit to the end, after the currently last song (#905)
-   Karaoke and tag metadata can now contain | (pipe) characters (#844)
-   Editing a kara repository was creating errors (#780)
    -   Copying a karaoke to a new repo updates correctly the database (#778)
-   In French, "Genres" are now "Thèmes" (#802)
-   The "next" button was greyed out if you added a song when the last song was playing (#806)
-   Karaokes with missing tags are now not included in generation (#797)
-   In the karaoke creation form, hitting "Enter" in a tag input is no longer submitting the form (and thus creating a karaoke into database) (#789)
-   Karaoke tags are always in the same order now (#786)
-   Some typos were corrected in French locales (a8eab177)

## Notes, misc

-   Removed option to disallow duplicates of the same series/singer in a playlist.
-   Removed option to display visualization effects during audio-only karaokes. This wasn't very nice-looking and caused issues with some songs. (#934)
-   New icon for macOS 11 Big Sur (#856)
-   Upgraded ffmpeg toolset to 4.3.2 and mpv media player to 0.33.1 (with libass fixes, #826)
-   Upgraded to Typescript 4.0 (#784)
-   Karaoke Mugen 5.0 isn't generating Karaoke Mugen <3.x series files anymore (#738)
-   appPath detection has been reworked (#747)
-   CLI toolset is now using commander instead of minimist (#748)
-   Bootstrap dependency was removed (#739)

# v4.1.16 "Ôgi Observatrice" - 11/10/2020

## Fixes

-   Allow login again if online account password has changed (51362a0f)
-   Fix typos in tutorial (thanks @minirop) (b022e2ef)
-   Fix shortener communication when KM Server is offline (b1523fbe)

# v4.1.15 "Ôgi Observatrice" - 05/10/2020

## New featuers

-   Users are now notified when their quota becomes greater than 0 (when they can add songs again) (3ad268ec)
-   Users can't remove a song they added anymore if it's been upvoted (d1759dd1)

## Improvements

-   Favorites are now reuploaded to KM Server on login (595b3419)
-   "Genre" tag type is now "Theme" in french (83610d3c)
-   Preparations under the hood for file/data manipulation functions (#497)
-   Added app version to database to prepare for a better handling of app updates (#801)
-   Changelog is now included in binary builds (9e9157f0)

## Fixes

-   Fixed online auth not rejecting your online token if it's incorrect. This will force you to login again if your online token were invalid. It fixes favorites and profiles not being updated (and failing silently) (f6abbc20 ce2df5a8 9393181e)
-   Fixed outros being played after every random song if enabled (37732b5d)
-   Added error logging to when kara/tags can't be integrated (951f661c)
-   Fixed mpv version check when unknown (assume it's the latest version) (e4f98674)
-   Fixed copying kara to another repository not updating database properly (0bb60424)

# v4.1.12 "Ôgi Observatrice" - 21/09/2020

## Improvements

-   mpv's subs loading has been improved (94f7a0e3)
-   URL shortener (kara.moe) now communicates through websockets with KM App (#759)
-   Karaoke files now have sorted TIDs for each tag category (#786)
-   Updated core dependencies

## Fixes

-   Fixing tag downloads during karaoke downloads (8f8503c2)
-   Songs now are properly removed from generation when they have errors/missing tags, making it so redownloading them from the server works (#797)
-   Fixed upgrading from Karaoke Mugen 3.x apps (990687da)
-   Added stats payload to Sentry when an error is detected during upload (7fcdc52b 858dfcff)
-   Fixed some error reporting issues (2cc6619c 4000b7b9 227b384b d7ea15db)
-   Added a specific error message when sub format is unknown in kara edit/add form (4e3f1cc6)

# v4.1.10 "Ôgi Observatrice" - 03/09/2020

## Fixes

-   Downgraded Axios on frontend dependencies as it made it impossible to remove songs. A better fix will come later. (e32830247)
-   Songs with invalid data are now properly skipped during generation (bd1229f5f)

# v4.1.9 "Ôgi Observatrice" - 30/08/2020

## Improvements

-   Updated frontend dependencies (62e06f69)
-   Updated backend dependencies (46e7c24d 7cfdcdfc)
-   Made some code cleanups (c9776ed5 86466b89 f41f311f aaf48dd1)
-   Init screen's logs now automatically scroll (4852489a)

## Fixes

-   Added postgres-contrib to .deb package dependencies since tsvector isn't in all PostgreSQL distributions on Linux (would you believe that, Linux has too many distributions and cases to think of when packaging your app!) (b735714a)
-   Made some adjustments to Axios interceptors to avoid weird UI errors with API (e137d444)
-   The changeAdminPassword utility now uses bcrypt (cb184a6a)
-   Do not report to Sentry if media file can't be found (0eab2a9c)
-   Do not report to Sentry if there's a query error during database shutdown when the app is quitting (d6d5e64f)
-   Do not report to Sentry if avatar unlink doesn't work for some reason (1e8d3a78)
-   Avoid crash if no tip to display is found (4faf2b36)
-   Fix switching account to admin in login modal (a9e454d7)
-   Fix "Author" field filling in song suggestion issue (77754686)
-   Moved security code generation to pre-init stage so clicking on the menu will display it correctly (fabdf484 4c4ead00)
-   Only fetch player status when logged in (b735714a)
-   Better interception of "user already exists online" errors (986fde85)
-   Avoid DB query error in case a played / requested song is added twice to the database at the exact same time (how it happened in the first place is beyond me, but your code is like your child, they can do surprising stuff sometimes, like you didn't think your cat would be stupid enough to fall in a chimney but yes, he did.) (215a11f3)
-   Avoid sending stats payload if instance ID isn't set (Did I tell you about my cat and the neighbor's chimney?) (1a446b83)

# v4.1.8 "Ôgi Observatrice" - 23/08/2020

## New features

-   Added a way to copy tags from one repository to another
-   Added a message if trying to add a repository through km:// protocol if it already exists

## Improvements

-   When adding random songs, the tag/filter is now taken into account
-   Adjustments were made to the system panel's config page

## Fixes

-   Fixed double quotes (') searches
-   Fixed song search when words is null
-   Fixed search with accents
-   Fixed frontend sending undefined in searchType to API
-   Fixed switching account to administrator during the setup onboarding
-   Fixed Sentry.io answer display on the modal asking you about it after setup
-   Better file/protocol handling on startup
-   Fixed file handler to not pick files starting with --
-   Fixed noLiveDownload in lowercase in tag files

# v4.1.7 "Ôgi Observatrice" - 17/08/2020

## Fixes

-   Fixed search for " ' and accents

# v4.1.6 "Ôgi Observatrice" - 16/08/2020

## New features

-   Sessions can now have a end time. A warning is displayed on the operator screen when a session is near its end (warning time is configurable) (#765)
-   Songs can now be moved in a playlist and placed right after the currently playing song with one click (okay, two) (#763)
-   Karafun files can now be imported when they only contain metadata information, not video/song blobs (#733)
-   Added a filter field in system panel's configuration page (#730)
-   Some tags now have a "problematic" flag (Spoiler, Adults only and Epilepsy) which should allow you to recognize karaokes using them more easily in the list (#695)
-   Playlists can be inverted between left and right if you select the same playlist in the opposite panel

## Improvements

-   Search is now much faster thanks to the us of text search vectors in PostgreSQL (#774)
-   When adding a new repository, folders are all pre-filled to make it much easier (#771)
-   Polls now work if you're at the last song of a playlist (#753)
-   Configuration validation is now more complete and will prevent some errors (#750)
-   When KM's network port is busy, it uses a new one but won't save it to config file if it's not your first time running the app (#745)
-   Added check for PostgreSQL version when running the bundled one (#743)
-   Cleaned some database code (#742)
-   A lot of unit tests have been added (about 80) to better test for regressions when developping (#706)
-   Updated menu code to make it slicker and rearranged some items

## Fixes

-   Language order in filenames are now fixed when editing / creating songs (#767)
-   When using a filter on the library, using the "Add all songs" button now takes the filter into account (#762)
-   Fixed some series' name display bug (#757)
-   Mastodon toots are now displayed correctly (#754)
-   Fixed password reset (local and online) mechanisms (#768)
-   Do not error out anymore during tag updates if the old tag can't be found anymore
-   Fixed searching songs by year
-   Fixed BLC set copy not regenerating blacklist
-   Fixed BLC set exports
-   Fixed generation for tags without any types
-   Fixed some tasks not being ended correctly (file download, media download and repository consolidation tasks)
-   Fixed locales for consolidation task
-   Fixed player stop button with single play
-   Fixed series languages mode synchronization between instances for online account

# v4.0.15 "Ôgi Obscure" - 26/07/2020

We've made improvements and fixed bugs to make your Karaoke Mugen experience even better.

## New features

-   We are more compliant to Human Interface Guidelines for menu in Mac OS X #723
-   Add frontend notifications for non-API triggered events #744
-   Better explanation for delete account modal popup #735
-   Rework login modal display

## Fixes

-   Various fixes about Blacklist criterias display
-   Various fixes about poll and stream mode
-   Fix gif import for avatar file
-   Stats and ErrorTracking are now not fill by default in modal
-   Fix change page size in system's kara list
-   Reset lavfi-complex on audio-only files to remove seek lag #628
-   Fix memory leak on computing playlist media
-   Fix delete user with requested songs
-   Fix server display in login modal
-   Forbid @ character in login modal
-   Playlist: Upvote songs by adding them now doesn't display an error anymore
-   Electron: fix missing binaries message box #737

# v4.0.13 "Ôgi Obscure" - 17/07/2020

Version numbering has changed :

-   Major number version (here, 4) will change whenever we release a new version with additional features and change the character in the version's name
-   Middle number version (here, first 0) will change whenever we release an official, stable version of Karaoke Mugen to the public. It'll contain bugfixes and small improvements over the previous version but won't introduce big changes. It changes the second part of the version name.
-   Minor version number is subject to change more often. People on master and next branches will get a new minor version every sunday. These are usually automated.

You can find more info in issue #675

## New features

-   Public/Private mode has been removed. From now on, playlists can have both current/public flags at once.
    -   To get the old "public" behavior, have two playlists, one with the current flag and the other with the public flag.
    -   To get the old "private" behavior, have one playlist with both current and public flags set.
-   Operator UI has been overhauled and simplified (#704).
    -   Less useless notifications
    -   The "stop" button now defaults to stop after the current song ends. Press it again to stop the karaoke now.
    -   Options have been moved to the K button
    -   Current time and time remaining for a song are displayed in the progress bar
    -   Jingles and sponsors now appear in the current playlist so the operator can tell when they're going to happen.
    -   Playlist and Karaoke options are now in contextual menus inside the wrench icon
    -   Filters can be reset
    -   Previous & next song buttons are now greyed out if you're at the beginning or end of playlist. Play is greyed out as well if nothing is in the current playlist
    -   Application settings have been moved out from the operator settings page. They're now in the system panel.
    -   Some options have been simplified or removed.
-   You can now play songs directly from the song library without having to add it to a playlist first (#697)
-   After a playlist ends, Karaoke Mugen can play random songs until someone adds a new song to the playlist (kind of like an attract mode) (#698)
-   Already present in 3.2.2 but this is an important change : A setup page has been added for those using Karaoke Mugen for the first time. It works as a setup wizard asking you questions about accounts and where to download your songs (#661)
-   Playlists created from Karaoke Mugen Live or another Karaoke Mugen App can be given to the download page to download all songs in it that you don't have yet (#600)
-   Sample songs are now only downloaded if the user wants them (#658)
-   Series are now tags as well. This doesn't impact the end-user, but allowed us to clean more than 1500 lines of code since series and tags were treated separately but were basically the same kind of information related to a song. This should also speed up querying songs from the database (#629)
-   When you view a different playlist than the current one and hit the play button, a warning will appear to tell you the playlist you're viewing isn't the one that's going to be played. (#634)
-   Tips and tricks are displayed during the init phase to give you something to read (#674)
-   We now use [Sentry.io](https://sentry.io) to have errors reported to us automatically when they happen. Since this has privacy issues, this can be disabled. Just like for Stats Uploads, you will be asked if you want to allow that or not when updating. (#676 #709)
-   Generation during init phase now has a progressbar (#693)
-   Karaoke groups are now better displayed on the download page so you can more easily find them and add them to your download queue directly (#646)
-   Playlists now has icons depending on their type in the selection list (#612)
-   Karaoke Mugen can now handle different kind of files if you drag & drop them into its window or if you associate Karaoke Mugen to th em in your OS so you only need to double-click on them (#689 #600):
    -   `.kara.json` files will be played directly (if they exist in your database)
    -   `.karabundle` files will add a karaoke to your database. It's an efficient way to download individual songs from the web.
    -   `.kmplaylist` files will add a playlist to your database. **If some songs are not in your database, they will be downloaded.**
    -   `.kmfavorites` files will replace your favorites with the ones in the file
    -   `.kmblcset` will add a new set of blacklist criterias to your list (more info below)
-   Added blacklist criterias sets : you can now create different sets of blacklist criterias and switch from one to the other depending on where you're doing your karaoke. Example, between friends, at a wedding, at an anime convention, etc.
-   Discord Rich Presence has been added. You can now proudly display what you're singing on in your Discord profile status! This can be disabled. (#685)
-   Security code can now be copied to your clipboard in its dialog box (#670)
-   Song info popup can now be closed by clicking elsewhere on the screen (#641)
-   Added a tool in system panel to compare two repositories and check if lyrics are different between the two if there are identical songs, and allow to update them. This will help song base maintainers to keep multiple repositories with the same songs in sync (#681)
-   Added a tool in system panel to show tags with the same name but different types, which could be merged into the same tag. This will help song base maintainers when a singer is also a songwriter but has different identifiers in the database, for example (#672)
-   Added a tool in system panel to add/remove a specific tag from a list of songs (#655)
-   A database dump is automatically created on startup, allowing you to restore it in case of problems. This will also allow us to upgrade the database software (postgresql) later more easily. (#648)
-   A queue has been added to heavy database actions like generations and refreshes, thus avoiding weird behaviors when multiple tasks are triggered at the same time (#639 #638)
-   Added a validate button to the database page in system panel to only validate changed files without triggering a generation (#635)
-   A details button is available to display song details in the download window (#632)
-   Switched database migration tool from db-migrate to postgrator, allowing us to trigger specific tasks when a user updates Karaoke Mugen to the latest version. For example the fact that series are now tags will tell you the app needs to update your songs and ask you if you want that to happen or not (#627)
-   All system panel messages are now translated in French (and English of course) (#621)
-   Hardware acceleration is now enabled by dafault in auto-safe mode to allow hardware decoding of videos in the most standard cases. You can disable it in case it doesn't work right for you or force it enabled for all videos (not recommended) (#703)
-   A new option setting allows you to add extra arguments to mpv's command line, for advanced users only (#703)
-   The public interface now lets you easily vote for a song already present in the public playlist when you browse the main song list (#714 #713)
-   You can now use media keys on your keyboard if it has them (stop, previous, next, and play/pause) to control Karaoke Mugen (not on macOS due to a bug in Electron 9.x) (#718)

## Improvements

-   Passwords are now stored in a more secure way (salted bcrypt instead of SHA256) (#701).
    -   As an improvement to account security, changing your password from KM Server or another KM App instance will automatically log you out of other instances, as KM Server now stores the last time your password has been modified.
-   User role is now checked when making requests to the API, so that users who lost their admin status can't keep it forever (#588)
-   Migrated system panel from antd framework v3 to v4, resulting in better visuals and cleaner code (#610 #593)
-   Total repositories size is now displayed in the download page (#626)
-   Installer will stop deleting everything in the app folder on update (#640)
-   Groups are now displayed as checkboxes in karaoke edit/add form. (#647)
-   Anime and video game karaokes are now better differentiated in lists (#643)
-   For debug purposes, calls to the internet are better logged (#656 #644)
-   When downloading/updating all songs from a repository, a notification will appear to show you what it's doing (#660)
-   System panel's dark mode is now complete (#663)
-   Singers and series auto-complete is now a bit faster in system panel's karaoke creation tool (#662)
-   SQL code is better organized in the app's source code (#688)
-   When changing a repository's priority (moving it in the list) a timer will only validate your changes and regenerate your database after a bit (#687)
-   The MPV component has been rewritten using our own IPC implementation, because of many issues with node-mpv. We've seen with the node-mpv author to fix some issues with some patches. (#684 #711 #719)
-   Init phase has been a bit reworked when you display logs (#683)
-   Unit tests are now started at the end of the app's launch, speeding up continuous integration cycle (#633)
-   API error codes have been normalized. Karaoke Mugen can be a teapot now. (#716)
-   Logs are handled in a better way and are now more colorfun (#715)
-   The 404 Not Found page has been reworked.

## Fixes

-   Fixed database dead locks in some situations (#708)
-   Stopped publishing your IP too often for the URL shortener (#710)
-   Fixed long lyrics display in kara detail info (#712)
-   Creating a karaoke for repository A with a tag existing only in repository B now creates the tag in repository A too (#682)
-   Creating a karaoke with 3x or more the same tag (which didn't exist before) now works (#671)
-   The list of playlists is now properly refreshed on login (#654)
-   Selecting folders now works properly (#653)
-   Fixed crash when KM Server is down (#652)
-   Fixed failure to import MKV files (#651)
-   Fixed changing primary folder of a repository (#650)
-   Fixed song info popup with a # in its name, and search with singer if series is not present (#649)
-   Fixes locales by using non-breaking spaces

# v3.2.2 "Nadia Navigatrice" - 23/05/2020

This is a bugfix release with a few features added

## New features

-   A setup page has been added for those using Karaoke Mugen for the first time. It works as a setup wizard asking you questions about accounts and where to download your songs (#661)
-   An automatic dump of the database in SQL format is made at startup (only if you use the bundled postgresql) (#648)
-   You can quit a video preview by hitting the esc key on your keyboard now (#637)

## Improvements

-   Songtypes are now always displayed, if there are several ones for a song (24632e19, d4ad66ce)
-   Made seeking in mp3 files a bit faster. (#628)
-   Help menu is now "Help" not "?" (#665)
-   Downloads now show a "Preparing downloads" task popup to keep you updated on what's going on (#660)
-   Song family is now displayed on the songs list and repository on songs, tags and series list page to better identify songs (#643)
-   All requests now display user-agent so we have a clearer view of which KM versions are used (#644)
-   Added a queue for database intensive tasks like refreshes and generation to avoid multiple triggers (#639)

## Fixes

-   Fix downloading lots of songs at once by sending only one request (f2de124d)
-   Fix removing old kara file when downloading songs (f04e8c5a)
-   Fix KM folder being wiped during reinstalls/updates (77f5e849)
-   Fix kara edit/creation form to accepts MKVs (741ccfae)
-   Fix more info on Wikipedia in some rare cases (with #, or serie not present) (#649)
-   (possible) Fix for login/auth errors with KM Server (5ad9654b)
-   Fix change primary direction in a repository (2626a9bf)
-   Fix consolidate repository (86f41292)
-   Tags with no types are now ignored instead of added to the "Misc." category. This is useful when we add new tag types but they're not fully understood by the app (f22f7fe3)
-   Fixed display kara in session list (e2153723)
-   Fixed for if autoUpdate menu should be displayed or not (06f13869)
-   Using move instead of rename when editing a song's filename to avoid cross filesystem issues (#659)
-   Fixed display error for the reset password page (e990f78a)
-   Fixed refresh playlistList after login (29ec1ae6)
-   Fixed adding multiple folders via Electron window (#653)
-   Fixed tag file removal when editing/replacing/removing tags (25bd121e)

# v3.2.1 "Nadia Nostalgique" - 01/05/2020

This is a bugfix release with a few plot twists.

## New features

-   A confirmation modal will pop up if you try to start playback even though the current playlist is not on screen. This is made to avoid mistakes (and because it was seriously misleading). (#634)

## Improvements

-   Song download page now has a link for each song so you can check them out individually (#632)
-   In case of database errors, the resulting error and SQL query that triggered it is correctly displayed (2242ddba)
-   Ultrastar2ass now works for real. Updated to 1.0.12
-   kfn-to-ass is updated to 1.0.9 (Karafun imports)
-   In case of a database launch error, display error in logs (bef1448c)
-   Singers are now sorted in song filenames (847a5c29, 808e38b2)
-   Text is properly centered on init page now (d8ea6185)
-   When encountering an unknown error during init, a proper message will be displayed (4bf802d4)
-   Generation now works without any series or tags in base (fb6428bc)
-   .kara.json files won't be modified anymore during generation, only during validation (`--validate` option) (df79073f and a few others)
-   Tags are now sorted in a karaoke line (353192a0)
-   Throw an error when the created serie name already exist (67cc8c41)

## Fixes

-   When changing a song year, remove all group years and re-add them properly (77b2b2cf)
-   Fix avatar not being displayed on screen during audio only songs if visualization effects were disabled (77514ed5)
-   `--generate` now properly sets/compares base checksum (c14ed607)
-   SD Nanamin is now showing the proper surprised face when an error is shown on the init screen (29511ffa)
-   Fixed editing a song without a video (again) (d881e05d)
-   The AppImage for Linux now works. Thanks @amoethyst and @zeograd for the help (8d28cbd6, a4c8bec4)
-   Disabled electron's auto download because it conflicted with our code (eee54248)
-   Subchecksum errors are properly reported when in strict mode (4c05cf76)
-   Uncaught Exception / Unhandled Rejection Errors are now displayed correctly (06d46c77)
-   mpv should really restart now if you killed it. YOU MONSTER (1903710c)
-   Connection to KM Server now has a 5 second timeout (3c1ec94e)
-   Fix set volume to not trigger mute/unmute button (b013fcc9)

# v3.2.0 "Nadia Naturiste" - 04/04/2020

This is a major release with almost only UX features and improvements, so you should be safe to upgrade.

## New features

-   The app now uses Electron for a better user experience on all
    platforms (#533)
    -   All links are opened in Electron by default, but you can disable this behavior in the application's menu (#581)
    -   A new command flag `--cli` has been added to launch the app without any GUI (for non-interactive operations like updates or generation, or for use on Raspberry Pi (#575)
    -   Player progress bar is now visible in the Dock (macOS) or taskbar (Windows) (#572)
    -   A initialization page with optional logs is shown at startup (#568)
    -   Karaoke Mugen is now packaged in these formats :
        -   macOS: .dmg for easy install
        -   Windows: portable (.zip) and .exe installer
        -   Linux: appImage
    -   There is an auto-update system in place which will download updates and install them on startup (unless told not to) or when manually told to. (#7)
    -   The Visual C++ Redistribuable 2013 is now included during install on Windows, and installed if it appears you lack some vital DLL files for PostgreSQL (#595)
    -   Errors will open a system dialog box
    -   When prompted to select a folder or file (in config page, in repositories pages) a Open File system dialog will be used if you're visiting these pages using the electron app instead of a browser. If you're in a browser, a HTML5 browser will be used
-   Multiple repository management for songs (#549)
    -   Songs are now organized in repositories.
    -   You can have multiple repositories in your Karaoke Mugen
    -   By default you have a "kara.moe" repository and a "Local" one. The Local one is for your own songs that you don't necessarily want to share with the community through kara.moe.
    -   You can add, remove, or edit repositories, if for example someone adds a new song database completely foreign to kara.moe.
    -   Repositories can be enabled or disabled depending on the situation. A disabled repository won't be taken into account when generating database or updating stuff.
    -   A "Consolidate repository" button allows to move repositories' contents to a new folder (like on a external hard drive) (#569)
-   Users are notified when their song is going to play as soon as they add it (#564)
-   When streaming Karaoke Mugen to twitch, song polls will be sent to the twitch chat as well so users can vote for it as soon as it is happening, to avoid polls ending sooner without users being able to vote for it due to stream lag (#602)
-   Tags and series are now checked when running a song database update. Previously they were not checked, which meant that unless you download a song which used them, you wouldn't get the new data (#616)
-   A new "tasks" system allows you to quickly see which background tasks are running on Karaoke Mugen : media updates, downloads, database generation, etc. Tasks are visible on the system panel and the welcome screen

## Improvements

-   Initialization is now faster since we're checking file modification dates instead of contents to decide if we need to generate or not (#563)
-   Generation is faster as duplicate SID/TID/KIDs check is now done with maps instead of arrays
-   Audio visualizer on audio-only songs is now smaller and in a corner of the screen to give more room to artwork (#559)
-   Various improvements have been made to the system panel, especially its navigation and to download manager (#579)
-   mpv (player) logs have been moved to the logs/ directory (#574)
-   Logs are in JSON format now which allows a standardized display in the control panel logs. Logs are now updated in real time on that page (#567)
-   Login is now shared between the system panel and frontend (#594)
-   You can modify songs without medias (#604)
-   Rework of operator tutorial and public tutorial (1130eb69, be5413a8)

## Fixes

-   Fix playlist not working if a user added a song to it before, and does not exist anymore or has been converted from local to online. Thanks @Yom for finding this.
-   Fix download of songs with # or % in their names.
-   Fix download page not showing songs if you change filter while being on a page other than the first one. Now page view is reset when you change filters. Thanks @Cattenize for spotting this and writing an issue! (#620)
-   Fix issues with playlist medias updates through git (encores, intros, outros, etc.) by using a HTTP download system instead of using git, which tended to block the main thread and make the app unresponsive for a bit while it decompressed files (#582)
-   Fix getLucky button in PC display in public page (10351b73)
-   Fix get blacklist criterias from public (6a0fcbe3)
-   Fix bug display alias and i18n in system panel (90ce22d3)
-   Fix create playlist require to refresh (a5f11ef5)
-   Fix welcome page loading when kara.moe is down (e910db1c)
-   Fix autocomplete tags with alias when create or edit a kara (457a41a2)
-   Fix force language in profil modal (b1047ae8)

# v3.1.2 "Mitsuha Matinale" - 12/03/2020

This is a bugfix release

## Fixes

-   Added msvcp120.dll to files checked with other binaries (necessary for Postgresql) (c2492d85)
-   Updated ultrastar2ass to 1.0.11, toyunda2ass to 1.0.12 (0f25eff7, 80375c75)
-   Updated node-mpv-km to 2.0.2 to remove rogue console.log (9b4674a1)
-   Fix playlist medias list creation on startup not happening if no internet is available (9d0aa945)
-   Fix base update errors with songs with no updated media to download (19221c4b)
-   Fix encore/outro message time (cad586e3)
-   Made song integration synchronous again after download to avoid weird behavior near end of download queue (88f68235)

# v3.1.1 "Mitsuha Mélancolique" - 06/03/2020

This is a minor release containing fixes AND new features.

## New Features

-   Songs with the "Spoiler" tag will get a red SPOILER WARNING above its details when the song starts on screen (96d3dafb, a67c2e80, d7d1dc2c and aa84a0b4)
-   Admin account password is no longer displayed in terminal or tutorial (d5971b98)
-   The player and profile modal will now display rounded avatars (#590 and a few other commits)
-   Jingles and sponsors can now be disabled completely (instead of you having to set them to 0 to disable) (31f76202 and 943823c5)
-   You can now add a message being shown on screen during encore/outros/intros (511ec410)

## Improvements

-   Profile modal now has a close button (1d3e2c5c)
-   ultrastar2ass has been upgraded to 1.0.9
-   toyunda2ass has been upgraded to 1.0.10
-   Downloading lots of songs should be faster now :
    -   The next song is downloaded as soon as the first one is downloaded. Integration of songs is done asynchronously (98868a04)
    -   Instead of downloading tag, series, karas and ass files separately, they're downloaded in one bundle and separated again aftar download (#562)
-   The enter key can now be used to login (58ec5d14)
-   Song suggestions (when you can't find what you're looking for) now ask for more information because we were tired of getting useless demands for songs we did have no clue what they were (#560)
-   Deciding to run KM on another port than the default 1337 one is only decided on first run of the app. If the port is busy and it's not the first time you run KM, it'll throw an error (9eaccd60)

## Fixes

-   Fixed
-   Fixed karaoke stopping after intro if sponsors are disabled or non-existant (f6e09d84)
-   Importing favorites is now fixed (650ce09a)
-   Reworked playlist reordering so it takes into account songs not available in database anymore (5798d60b)
-   When tags or songs have disappeared from database but are still in the app's blacklist criterias, they are now completely removed from output but still kept in database. (b8d32f04 and e62f0fe4)
-   Fixed bug in blacklist criteria search (8360154b)
-   "Look for application software updates" was ignored in config, this is fixed now (e2e577d1)
-   Various fixes to tutorial (cce04418)
-   Songs should be displayed correctly now in blacklist criterias (aaf44844)
-   Various fixes to specific login/account issues (ff0d6466, bba4aebc)
-   Fix system panel behaviour with unusual host/port combinations (df82b603)
-   Fix issues with playlist medias updates through git (encores, intros, outros, etc.) (cd9fd878)
    -   This is a temporary fix : the issue (#582) is resolved entirely in the future 3.2.0 version.
-   Various fixes with Safari on operator interface.
-   Download manager now lists remote tags instead of local ones which caused issues when your database was nearly empty (8d98227f, 0b334eb6, 319c88a5 and f607e7ae)
-   Various fixes to download manager

# v3.1.0 "Mitsuha Mélodramatique" - 17/01/2020

This is a major release.

## New Features

-   The config page in the System Panel is improved, allowing you to change all settings, even some internal ones, paths, etc. (#533)
-   Sessions can now be flagged as private if you want to avoid sending them over to Karaoke Mugen Server (#543)
-   Added a `--noPlayer` option to avoid starting the player along with KM when you only want to manage your karaoke database. (#541)
-   Added a QuickStart setting which equals `--noBaseCheck`. This allows you to bypass the karaoke base verification to save some time on startup when you're absolutely certain nothing has changed. (#541)
-   When the current song nears its end, a message appears on users' devices to tell them what the next song is (#537)
-   When adding a song, the message also gives you how long before it should be playing (#536)
-   This version of Karaoke Mugen does not generate Kara V3 files anymore when creating new karaokes (yes this is a new feature) (#534)
-   Download page now has a filter to only show missing or updated songs (#532)
-   Download page now has a clean all button (956711e6)
-   Playlists now have three new medias in addition of intros and jingles : (#531)
    -   Outros are played at the very end of the playlist
    -   Encores are played before the last song plays
    -   Sponsors are played every interval you have set
    -   We offer a few of those in our git repos, they will be downloaded automagically by Karaoke Mugen.
-   KM is now bundled with a `portable` file. If this file exists, KM will store everything in the `app` folder, just like before. If not, KM will store all its data files in the user's home folder : `$HOME/KaraokeMugen` (#525)
-   User avatars are now displayed next to the songs they added in playlist (#423)
-   System panel is now translated in french and english (#263)
-   Improve system panel's config page (#486)
-   The karaoke submission form now accepts a new karaoke format, karaWin files (.kar). The files will be converted to the ASS format on import. (#550)
-   A repository property is added to tag and series files automatically for now in preparation for 3.2's multi-repo (e57ca80a)
-   Dropped compatibility for Windows 32 bit OSes (219eaf53)

## Improvements

-   The swipe movement to switch from the song list to the playlists in mobile view has been deprecated in favor of a button, as it was causing too many misuses (#547)
-   Player (mpv) is now restarted if it's been closed by mistake or voluntarily by the user whenever an action requiring it is made (#540)
-   The frontend's and system's APIs have been merged into one, just so we could create more bugs (#539)
-   Upgraded all dependencies, notably Got (HTTP client) to version 10 (#535)
-   Frontend is now written in typescript, yay. (#528)
-   Downloader has been rewritten with async functions and a queue system (#511)
-   Logged in users now is a scrollable list in frontend (#476)
-   If you login in operator page without an operator account, add a modal to propose to change the type of account (2ad52c9a)
-   Changed display for tablets (cfeb689a, 934dcfa8, f35b3245)
-   Changed buttons order in playlist's header and in a song for admin (3be92d61)
-   Changed login modal in operator page (817ef98b)
-   Removed drag&drop useless refresh (747c78e5)
-   Playlist is now refreshed when resized (#548)
-   Kara creation now include long tag automagic support (#555)

## Fixes

-   Display shutdown popup only when disconnect is cause by transport error (0276f4e6)
-   Fix Filter by tag + search a value now work (c50dd0c4)
-   Fix add Random Karas in operator page (1d85f6c0)
-   Users now cannot remove a song from a playlist while that same song is playing and the player is effectively playing it. (#556)
-   The Omega character is now translated as O in filenames (e5379db7)
-   Suggestion issue template now adds the right suggestion tag to gitlab issues (103aa8de)

# v3.0.2 "Leafa Langoureuse" - 09/01/2020

This is a bugfix release

## Improvements

-   Security code can't be used anymore to reset your local password. If you lost your password, use the security code to create a new admin account (c7dad84b)
-   Poll winner is sent to Twitch chat when available (df5d27f1)
-   Config settings are correctly updated when displaying the settings page (d7acf199)
-   When in restricted mode, the frontend will display a modal only on mobile (fad65274)
-   Quotes are not being removed anymore during searches. So "May'n" won't search for "May" and "n" anymore. (49cbc80d)
-   Add a message to check if the song is not available for download before make a suggestion (95db6039)
-   Now use checkAuth route to verify authorization in frontend (824f8b7d)
-   Remove use of swipe in mobile for add Kara and change view (#547 - 735b3851, c8cdf0ba, 6756e3c2, b3e2c9b9)
-   Icon to tell the difference between mystery karas and others is now clickable (925374eb)
-   Add search aliases or locales in serie field on kara page (429458e1, d0ea6b3f)

## Fixes

-   Fix autoplay setting not working as intended (f0f2f18c)
-   When downloading a song, tags or series could have needed to be removed if their filename were different, but it throwed an error if the file didn't exist anymore, which could happen inbetween database refreshes. Now the error won't throw anymore, just display in debug logs (77af237b)
-   Fix samples' TV Series tag. (3bbf5eb2)
-   Fix nickname can't be empty error when modifying password (1a4ae993)
-   Fix admin tutorial (030c3069)
-   Fix issues when playlists are set to invisible (6c2bf0b5)
-   When downloading songs, tags/series are now correctly deleted when their name has changed (0751bcf1)
-   Toyunda2ASS has been updated to 1.0.8 - correctly detects CRLF line breaks now (0eec58af)
-   Percentages in poll votes are now rounded to two decimal digits (e8e3f6c7)
-   Polls should work pollfectly now. (84bf4818)
-   When going from the kara list to a filtered list (applying a filter) the scroll placement is reset (af79e412)
-   Remaining time of a playlist is now correctly updated (32698f3c)
-   No more flickering when scroll in a playlist (ee38366a)
-   Fix scroll on user list in profile modal (#476)
-   Fix add an ip for Host in system panel config page (f2f01947)
-   Fix modals on small screen (9cbe227e, 2eed7ef4, 5fdb1997)
-   Fix initial render for playlist (8b1ece19, 92c73fa5)
-   Fix favorites display in public page (12b67a1b)
-   Fix alignement ro playing karaoke in start of a playlist (08b17f43)
-   Fix open the login modal when logout (013a421f)
-   Fix spam of toast when page was hidden (e6ac7ca7)
-   Fix restricted mode (d738745b, 158d7ff2)
-   Fix songtype display in mobile when title is multiline (631daded)
-   Fix wrong color display for buttons in karaDetail (daddc90f)
-   Fix help modal display (a1975f83)
-   Fix update songs in download page (7c92302e)
-   Fix filter songs in download page (12d13b1d)

# v3.0.1 "Leafa Loyale" - 13/12/2019

This is a bugfix release.

## Improvements

-   Described where is the security code in the admin intro d71a5889
-   Bumped taskCounter from 5 to 100 during batch downloads so KM doesn't stop downloading every now and then db989b9e
-   Added proper error messages for login in operator panel c7fbb20f
-   Added proper error messages when using wrong security code in login window 46c9f81a
-   Ensures mpv is running before issuing any command, restarts it if it's not present 473dc256
-   Added close button for automix modal 0ea139aa
-   Added i18n for playlists names af4565b5
-   Added modal for delete criteria from blacklist 2dae9632, 3c636e7c, f5dd39de
-   Changed songs display order 4aa306fa

## Fixes

-   Fixed avatar fetching for online users d68c8748
-   Fixed API documentation 48ccf953
-   Fixed moving songs from one playlist to the other e1f6bd89
-   Fixed playlist buttons not refreshed when you change the other side in operator window 7ae4e647
-   Fixed adding blacklist criterias with enter 8c7a7228
-   Fixed like button on karas 653fe77d, 512901b5
-   Fixed free button 91b855f3
-   Fixed convert and delete online profile 80ac08f9
-   Fixed import playlist 3a829eda, daf52009, 6407261d
-   Fixed right click transfer button 4fdf9c0f, 80ac390e
-   Fixed right click add button from public playlist to current playlist de2a88a8
-   Fixed blue color display change for playing kara b629c8a0
-   Fixed mute button bfb64a44
-   Fixed open login modal after log out a9349c54
-   Fixed error display for patch kara a263013f
-   Fixed right click add button for multiple karas in admin page 7ff87aa2, 9c45a866
-   Fixed export playlist button d2a3e85f
-   Fixed change visibility of a kara twice without close details da546927
-   Fixed buttons display in playlist header 26c9af11
-   Fixed nickname is now mandatory 871fb6b4, 101befe3
-   Fixed switch to another playlist when delete one f4e895fa
-   Fixed input display in rename playlist modal 17ee2a0c
-   Fixed blacklist criterias tags display 88a338ae

# v3.0.0 "Leafa Lumineuse" - 29/11/2019

This is a VERY MAJOR release.

Many things have changed, both in database schemas, code base, frontend, and even how Karaoke Mugen works

## New Features

-   A banner will be displayed on the welcome screen to signal there is a new Karaoke Mugen version and that you should upgrade (#7)
-   All guest accounts now have specific avatars. For fun. (#392)
-   Karaoke data files (.kara) are now on version 4 and are named .kara.json. (#341)
    -   Karaoke Mugen 3.x is not compatible with Karaoke files version 3 or below. This means you'll need to update your Karaoke Base for Karaoke Mugen 3.x.
    -   If you have songs you have not uploaded to the Karaoke Base, please contact us so we can help you convert your files.
-   Streamer mode with Twitch integration (#447)
    -   Song poll results can be displayed on the player's wallpaper inbetween songs.
    -   Twitch users can vote from chat for which song to play next
    -   Added a configurable pause time in between songs.
-   Song tags have been completely reworked (#443)
    -   Tags (languages, songwriters, singers, creators, etc.) are now files in the Karaoke Base, which means they're not tied to the application's version anymore. Anyone can add its own tags if need be.
    -   New tag types : Misc (formerly "Tags"), Genres, Origins, Platforms and Families
    -   New tags have been added to the Karaoke Base as a result : Fanworks for dojin songs/videos
    -   WARNING : As a result, blacklists criterias relying on tags won't be valid anymore and are going to be removed from your blacklist criterias. You can readd them later.
-   Mystery karaoke toggle (#441)
    -   You can flag a song as visible or invisible. Invisible songs will be marked as ??? to the public, which means they won't know in advance what that song is in the playlist. Good for surprises and troll songs.
    -   You can add mystery labels, which are shown randomly in place of the real song's name in a song slot to users. This is troll ammo.
    -   You can make it so admins or users added songs are automatically marked as invisible (or not)
-   Classic Karaoke Mode (#432)
    -   In Karaoke Classic mode, a pause is made in between songs, and the person who requested the song (or admin, or after a time period has elapsed) can hit play on its device. This is a mode for those who prefer a classic karaoke box experience where each user takes the microphone to sing on the song they asked for.
-   New features for Download manager :
    -   Blacklist system to keep the Download manager to automatically download some songs. Manual download is still possible (#427)
    -   A "Update All" button to update existing songs and download all songs missing from your database. See above for the blacklist feature. (#426)
    -   Advanced search (via tags/series) (#425)
-   Session management on welcome screen (#390)
    -   You can now name individual karaoke sessions when starting one with friends or during events. It'll allow you to filter song history to see, for example, which songs were played during Epitanime 2020 or Jonetsu 5555. Sessions are just groups for stats but can be helpful for other purposes later.
    -   Session data can be exported as CSV (#508)
-   QR Code has been removed (why is it a new feature?) (#451)
-   Users can now select which language for series names they tend to prefer (just like an admin can). This setting is saved to your online account. (#440)
-   New, updated sample songs included with every release (#452)
-   Battle-tested with Node 12 (#439)
-   Karaoke Mugen is now coded with TypeScript, for better debugging and safer programming :) (#437 #391)
-   For MugenPi users (or those who don't want to look at the console screen), logs are now available in the System Control Panel (#434)
-   Live changes to the database (editing a song) won't trigger a new generation on next app startup (#433)
-   Admins can restrict song additions by users to one song per series or singer to avoid people trying to force their favorite series or singer by adding all its songs (#431)
-   A new (shy) look for the frontend has been achieved with the React rewrite (#430 #300)
-   Suggesting a song to be added to the karaoke base now generates an issue on our Gitlab (configurable) (#422)
-   An intro video is played at the beginning of a playlist if you're starting on the first song. If a sponsor jingle file is present (Beginning with `Sponsor - `) it will be played right after. (#482)
-   The karaoke submission form now accepts new karaoke formats in addition of ASS. The files will be converted to the ASS format on import. New formats supported are :
    -   Toyunda files (.txt) (#463)
    -   UltraStar files (.txt) (#31)
    -   Karafun files (.kfn) (#471)
-   Dark theme for the system panel (#468)
-   Settings in the options panel now have tooltips to explain what they do (#460)
-   Login modal in public and admin interface now has toggles for online/local accounts and password reset feature. (#489)
-   Database can be restored from the karaokemugen.sql file in the application's directory (#509)

## Improvements

-   System panel's code dependencies are now up to date (#445)
-   Playlist information is updated more often on screen so a device coming back from sleep mode can get an updated version of the page sooner (#416)
-   Search engine in playlists now looks for the song requester as well. (#448)
-   Quotations (" and ') are now taken into account during search (#446)
-   Karaoke Mugen's API has been split in smaller chunks for easier debugging and programming.
-   A lot of code is now shared between Karaoke Mugen App and Server via the Karaoke Mugen Shared Library (#402) saving us a lot of time
-   Importing playlists is now safer thanks to a code rewrite by using constraints instead of tests (#329)
-   Preview videos are not generated anymore. It was costly and took a hell lot of time. Now full media files are served instead (#457)
-   Updated mpv version to 0.29.1.
-   Karaoke base updates now go through the Download Manager and should easier to handle.
-   When editing a karaoke in the system UI, tags and series are checked for differences between the old and new karaoke to avoid triggering useless refreshes.
-   Added a message in case MS Visual Studio C++ 2013 redist is not installed (Windows only) (#492)
-   Karaoke Mugen behaves better when mpv has been shutdown outside of KM (#491)
-   Added `--dumpDB` and `--restoreDB` command-line arguments.

## Fixes

-   Toggling lyrics/song title display on mobile now works properly (#414)
-   Videos aren't weboptimized again even if you don't change anything about it in the edit song form (#436)
-   Toots from Mastodon are now displayed proper on the welcome screen's feed (#429)
-   Fix KM not allowing you to login your online account if a local account with the same nickname exists in your database. (#466)
-   When working with several karaoke/media/lyrics folders, edited karas will be placed in the original folders they belong to instead of the
    first one in the list.
-   i18n fields in series edit page in control panel are now automatically validated, no need to fiddle with them anymore (#505)
-   .ass files are now properly deleted when editing a kara (#490)

# v2.5.3 "Konata Kimono" - 30/06/2019

This is a bugfix release.

## Fixes

-   Fixed Downloads submenu in the system panel not working with V4 kara format in KM Server (28236d09)
-   Fixed toggleOnTop setting not working (770cc4bd)

# v2.5.2 "Konata 4-Koma" - 22/05/2019

This is a bugfix release.

## Enhancements

-   You can now force the admin password to be changed (in case you forgot it, or are running a unattended setup) with the `--forceAdminPassword <password>` flag.

## Fixes

-   Fixed file resolver when using multiple folders for karas, series, medias or lyrics files (c2e5eacf)
-   Fixed mpv auto restart method (3ca3b6c7)
-   Fixed wallpaper not appearing anymore at the end of a song if "stop after current song" has been pressed (7330ed8a)
-   Fixed retrying to play song if loading media failed due to mpv hiccup (7f3da9ba)
-   Web interface will now request english translations from server if your browser is not set to a known locale (61082963)
-   Media files are not weboptimized anymore if you don't modify them in the karaoke edit form (4ee094bc)
-   Catch errors when switching to the next song in a playing playlist (35a86966)
-   Partly fixed edit user form errors (523a7120)

# v2.5.1 "Konata Kiffante" - 06/05/2019

This is a bugfix release.

## Fixes

-   Added notice to type in your full username on system panel login page (463b62e8)
-   Fixed tag add/remove on blacklist criterias list ( de6611d4 )
-   Fixed import/export favorites from admin interface ( f2ee577e, c76941c7, 7ae9b9b9 )
-   Fixed import favorites from public interface ( 0222d592 )
-   Fixed blacklist criterias import from an older SQLite database ( 0785947 )
-   Fixed downloads not being started automatically on app startup ( 87d68d9e )
-   Fixed public/private switch ( df949195 )
-   Fixed online profile updates ( 20a24b1e )
-   Fixed suggestion mail modal box ( 6503c363 )
-   Fixed errors with multi-series karaokes ( bfbe9eed )

# v2.5.0 "Konata Karaokiste" - 30/04/2019

This is a major release.

## New features

-   Songs can now be downloaded individually from a Karaoke Mugen Server (like `kara.moe`) instead of updating the complete karaoke base every time. Go to the Karas -> Downloads submenu in the system panel. This feature is still in beta and we would love feedback (#339)
-   Users can now create online accounts on a Karaoke Mugen Server, which means favorites and profile info are stored online and not on the local Karaoke Mugen application. Online accounts are enabled by default. To create/login using local accounts, remove the `kara.moe` part of the Server field on the login/new account form (#303)
-   Added tag CREDITLESS for creditless songs (#382)
-   Added tag COVER for cover songs (#393)
-   Added tag DRAMA for songs from TV drama shows (#393)
-   Added tag WIIU for songs from Nintendo Wii U games
-   Added tag FANDUB for fandubbed videos (#418)
-   Already present since 2.4.1 : Stats are now uploaded periodically to Karaoke Mugen Server (if the instance admin agrees) (#377)

## Improvements

-   Configuration storage has been completely revamped and is now a YAML file instead of the old INI format. Your old configuration file will be automatically imported at launch (#355)
-   Favorites are now handled in a simpler way. Favorites playlists are no longer used, instead Favorites are stored on a separate table in database. You can safely delete any favorites playlist after upgrading to 2.5.0 (#389)
-   Karaoke Mugen now uses a PostgreSQL database instead of a SQLite3 one, leading to cleaner code and faster response times. Your old SQLite3 database will be imported at launch (#379)
-   (Already present since 2.4.1) Initialization catchphrases(tm) are now displayed on the welcome screen (#375)
-   MP3 playback is now more dynamic with some visualization effects (#349)
-   Those who requested a song will now see their avatar next to the song information on screen at the start and end of a song. (#283)
-   Downloadable groups can now be filtered / blacklisted
-   New guest names and catchphrases!
-   Transitions between songs are now shorter as we do not reload the karaoke background image at end of song
-   Blacklist is now regenerated after a database generation to keep it consistent
-   New option `--noBaseCheck` to disable data file checks to save time (when you're sure the base has not changed)
-   New option `--reset` to reset user data. WARNING : this wipes users, stats, playlists, etc.
-   Configuration is not updated anymore in real time if you modify the config file while Karaoke Mugen is running (it caused too many problems). You'll need to modify the config file while Karaoke Mugen is stopped for your changes to take effect.
-   All communication with Karaoke Mugen Server is now done in HTTPS.
-   Executable file has been greatly reduced by replacing some packages with simpler, lighter versions with similar functionality
-   Preview generation should be more consistent now
-   When creating a new karaoke, mp4 videos are web-optimized automatically
-   Karaoke operators can now add several random karaokes to the current playlist by pressing a button on the admin interface, to fill a playlist for example (#392).
-   Users can now add a song more than once in a playlist (if the required setting is enabled) (#388)

## Fixes

-   Fixed song search so it now also searches in series names aliases (#387)
-   Fixed Karaoke Mugen allowing users to put commas in series names (#386)
-   Fixed Karaoke Mugen adding you as an author to a karaoke you're editing if there's no author already in metadata info (#385)
-   Fixed series name not translated with user's browser's locale in control panel (#384)
-   Fixed background listing taking non-image files into account in the `app/background` directory, which could cause mpv to crash.
-   Fixed delete button hidden behind menu in mobile public playlist view (#399)
-   When the interface is in restricted mode, a modal pops up to explain to the user that it cannot add songs anymore. (#404)
-   Guests don't see the favorites button anymore (#415)
-   Direct3D is not the default output video driver for mpv anymore on Windows.

# v2.4.2 "Juri Joueuse" - 13/12/2018

This is a bug fix release.

## Improvements

-   Issues created automatically when a user makes a song suggestion in Karaoke Mugen App now contain a more polite message, as well as the user's nickname
-   Media renaming now doesn't abort if a file is not found

## Fixes

-   Fixed importing playlists
-   Fixed all jingles playing at once if interval is set to 0
-   Fixed using filters in a song list when you're not at the top of the list
-   Stats are now properly sent on startup

# v2.4.1 "Juri Joviale" - 28/11/2018

## New features

-   Stats are now uploaded periodically to Karaoke Mugen Server (if the instance admin agrees) (#377)
-   A media renaming procedure is available in the system panel / database tab to allow people to rename all their media files and avoid redownloading them all. (#376)
-   Initialization catchphrases(tm) are now displayed on the welcome screen (#375)

## Fixes

-   Drag & Dropping songs within a playlist sometimes didn't work as expected. Song positions are now fixed (#375)
-   Fixed automix creation
-   Monitor window isn't synced anymore with the main player, as this would cause weird behaviors on many videos when the monitor tries to play catch up.
-   Weird error messages about invalid configuration won't appear anymore (#373)

# v2.4.0 "Juri Judicieuse" - 06/11/2018

## New features

-   Configuration can be edited by hand from control panel. Not all configuration items are editable. (#338)
-   Karaoke Mugen is now fully compatible (and even requires) Node 10 (#307)
-   The welcome screen now displays what's new on the karaoke base and site's RSS feeds (#343)
-   Our new logo, designed by @Sedeto, has been added to the welcome screen!

## Improvements

-   Songs can now be freed from the current playlist
-   Progress when generating database or updating base files from the control panel is now displayed on the control panel itself (#348)
-   Generation's progress is now displayed in the console.
-   Public interface is reloaded when the webapp mode (open, restricted or closed) changes. (#357)
-   TAG_VOICELESS has been removed in favor of the language code ZXX which is "No linguistic content" (#366)
-   Special language names (FR, JAP, ANG...) in files is now obsolete in favor of ISO639-2B codes. This is for better consistency. (#365)
-   The `series.json` file is not used anymore. Instead, series data is read from the new `series/` folder with its `.series.json` files (#364)
-   Series' international names are now searchable in control panel (#362)
-   When two KIDs are in conflict in your karaoke base, Karaoke Mugen will now tell you which ones are causing the conflict (#361)
-   In the karaoke submission form, tags have been replaced by checkboxes for misc tags. (#359)
-   Icons and names have been changed for consistency on the welcome screen (#356)
-   Your data files are now checked on startup to decide if a generation is needed or not. (#354)
-   Series are displayed in a more concise way in case of AMVs. (#350)
-   Karaoke and series lists in control panel are now properly paginated. Page position and searches are remembered when coming back to the list after editing/creating a karaoke (#342)
-   When creating/editing a language, a text box allows to search for a language code.

## Fixes

-   Download problems when updating your base files should be fixed now. Really. (#332)
-   Download groups weren't saved properly in .kara files when saving one from the kara submission form (#367)
-   Fixed hardsub video submission with the control panel's form
-   Fixed adding series without aliases
-   Fixed Smart Shuffle
-   Fixed deleting favorites
-   Fixed editing series not updating i18n data
-   Fixed search field in control panel not registering the last character typed

# v2.3.2 "Ichika Imperturbable" - 03/09/2018

This is a bugfix release.

## Fixes

-   Fix searching through series original names
-   Fix kara/media/sub files not being renamed properly when edited

# v2.3.1 "Ichika Insouciante" - 22/08/2018

This is a bugfix release.

**IMPORTANT : Karaoke files version 2 or lower are now deprecated. Please update your karaoke base.**

## Improvements

-   Searches now take the original series' name into account too.
-   Karas in error are not added to the database anymore
-   Audio files are now accepted in the karaoke add form.
-   Various speedups in karaoke and playlist content list display thanks to @Jaerdoster's mad SQL skills
-   Added a XBOXONE tag for songs.
-   mpv does not try to autoload external files anymore, resulting in better performance if your media files are on a network storage.

## Fixes

-   The karaoke base update button now works.
-   Editing a hardsubbed karaoke now works.
-   Filenames are better sanitized when editing/adding new karaokes
-   Searching in playlists now work again.
-   Fixed some possible SQL injections.
-   When a media is missing, getting karaoke details does not fail anymore
-   Fixed some english translations
-   Fixed jingles not playing at all
-   Fixed log spam on OSX about config file being changed
-   Fixed config file being accidentally overwritten with a new one
-   Songs are now correctly removed automatically from the public playlist once played.

# v2.3.0 "Ichika Idolâtrice" - 14/08/2018

For a complete run-down on the new features, check out v2.3.0-rc1's changelog below.

We will only cover changes from rc1 to finale here :

## Enhancements

-   "Update from Shelter" button now returns a message immediately inviting you to check the console for progress
-   "Connection lost" message now displays a cool noise effect
-   Database is now more optimized and should make actions involving playlists faster

## Fixes

-   #328 Progress bar during updates should scale properly to the window and not display "Infinity" anymore
-   Filter panel on karaoke list now displays properly on Safari iOS
-   Config file should not be overwritten anymore (hopefully)
-   Fixed updating series and displaying karaoke lists and tags in control panel
-   Fixed the "Stop after current song" button

# v2.3.0-rc1 "Ichika Immergée" - 08/08/2018

## New exciting features(tm)

-   #118 Karaoke Mugen can generate .kara files for you if you fill out a form in the control panel, making it much easier to create karaoke files for the Karaoke Mugen base.
-   #325 There is now a link to help users suggest a series they think should be in the Karaoke Mugen database
-   #340 In addition of the usual view and favorites view, users can get a new "Most recent songs" view with the last 200 songs added in the database (ordered by creation date)
-   #120 Users can now navigate through the song list by tags (language, singer, etc.) year, and series.
-   #305 A smarter shuffle is available for those with big playlists.
    -   It should spread long and short songs to avoid too many long songs following each other
    -   Songs added by one user won't be following each other and will be spread through the playlist
-   #334 The series database can be managed from the control panel. This updates the `series.json` file
-   #324 Karaoke operators can now free songs manually
-   #153 A "more information" link has been added to songs' info panel. It allows you to get more information on a particular series or singer.
-   #152 You can add a song multiple times in the current playlist now (optional)

## Enhancements

-   #336 The web interface will fade to black and display a message when Karaoke Mugen isn't running anymore
-   #330 Buttons have been normalized throughout the web interface
-   #322 Many optimizations have been made through the code, making it also simpler to read.
-   #321 The temp folder is cleaned at startup.
-   #320 Users' login time is not updated in real time anymore to avoid stressing out the database
-   The `userdata.sqlite3` file is backuped before a new generation is made.
-   #139 PIP Slider in web interface now has percentage values displayed

## Fixes

-   #326 Songs cannot be added anymore if they are present in the blacklist
-   #317 Catching SQLITE_BUSY error messages from background jobs during database maintenance mode
-   Engine asks if player is ready before issuing any commands.

# v2.2.3 "Haruhi Hyperactive" - 16/07/2018

## Fixes

-   #332 Fixes an issue some (many) people had with the in-app karaoke base updater, where downloads would get stalled and the app hanged. Writing a complete download system with retries and error handling is difficult, and the issue isn't showing for a lot of people.
-   Fixes a big issue with database (re)generation regarding series, which would causes mismatches between a series in the karaoke list and what's going to be played.
-   Karaoke Mugen shouldn't hang anymore when trying to generate a database without any kara files present
-   Quotes in series names are properly inserted in database now
-   FTP downloads for updater now has a retry system
-   Medias are now downloaded before subs

# v2.2.2 "Haruhi Hibernante" - 03/07/2018

## Fixes

-   #311 AutoPlay mode is now working again, for real.
-   #333 Preview generation has been fixed, and won't be canceled on the first video it cannot generate preview for.
-   #331 Admin tutorial now checks for `appFirstRun` in addition of `admpwd`
-   Media files are now moved from the import folder to the medias folder when doing a mass import.

## Enhancements

-   New tag for songs : TAG_3DS
-   #335 When using the second video monitor (second mpv), it wasn't synchronized with the first one when you used arrow keys to navigate in the first mpv video. Note that this could potentially lead to video lags on the second mpv window, but since it's just a monitor, we didn't think it would be much of an issue. Please give us feedback about this.
-   Default video directory is now `medias`
-   Samples have been updated with a `medias` folder.
-   Samples now include a `series.json` sample file
-   macOS releases are now in `.tar.gz` instead of `zip` to keep permissions intact.

# v2.2.1 "Haruhi Hypnotisante" - 19/06/2018

This version is also known as "Just Haruhi"

## IMPORTANT

In preparation for **July 1st 2018** when the videos folder will be renamed to "medias", your videos folder will be renamed automatically after this date if :

-   Your config has the default `app/data/videos`
-   That folder exists
-   The `medias` folder does not exist.

If any of these conditions are not met, proceed as usual, your configuration and folder structure won't be modified.

## Enhancements

-   `userdata.sqlite3` is backupped before running integrity checks so you can recover from a bad karaoke database generation that would have wiped out your playlists, favorites, and other data.
-   Added TAG_WII
-   Added TAG_SATURN
-   Config file change message is now debug only.

## Fixes

-   The .kara generation tool has been fixed. Also, if a .kara's subfile has `dummy.ass` it won't trigger a subtitle extraction on its .mkv file anymore. Some .mkvs have hardsubs, yes.
-   Blacklisting series now work correctly.
-   When triggering the player's play method, make sure it is ready before.
-   #316 Base updater should handle connection timeouts better.
-   Fixed database generation when using `--generate` without any database existing.

# v2.2.0 "Haruhi Hagiographique" - 04/06/2018

For a complete changelog of v2.2 changes, check out v2.2-rc1's changelog below.

Changes from v2.2-rc1 to v2.2 :

## Bonus features

-   #314 Karaoke Mugen can optionally publish its public and local IP to `kara.moe` to allow people to type a shorter URL in order to access the instance from the local network. `kara.moe` will redirect to your local instance.
-   #312 A monitor window can be spawned for the player, allowing you, karaoke session operator, to see what the others see on the big screen where your main window is.
-   Added new guest names and quotes
-   Karaoke Mugen will check during startup if all guests exist. If not, new guests will be added to the user list. So you won't miss on new updates!
-   Added the "Duo" tag for karaokes meant to be sung by two people.
-   Added a demo mode for online demonstrations (passwords can't be changed and mpv is not controllable)
-   .ass files are now read directly by mpv and not by Karaoke Mugen then passed to mpv anymore.

## Fixes

-   #313 Control panel's user list now displays dates correctly
-   Better error handling for mpv thanks to node-mpv new features
-   Database generation from the control panel now works again
-   Removed useless code in initial database creation. The `appFirstRun` setting will be overriden to 1 if `userdata.sqlite3` is missing.
-   Searches containing quotes (') now return results
-   Blank series data is created if it exists in a .kara file but not in the `series.json` file. This allows you to search for that series even if it's not in the JSON file. NOTE : this throws an error in strict mode.

# v2.2-rc1 "Haruhi Hargneuse" - 24/05/2018

This version requires your attention on the following points :

-   `PathMedias` setting for storing media files replaces `PathVideos`
-   Videos will be stored in a `medias` folder, not `videos` anymore starting July 1st 2018
-   .kara format is going to be version 3 from now on, which means older versions of Karaoke Mugen won't be able to import the [Karaoke Base](https://gitlab.com/karaokemugen/bases/karaokebase) beyond July 1st 2018

## New Shiny Features

-   #302 As a regular user, you can now remove your own submissions from the current/public playlist, in case you added a song by mistake for instance.
-   #288 Alternative series names have been overhauled. We now have a database of series' names depending on language. Admins can select which way series should be displayed:
    -   As they are originally (use japanese titles for japanese shows, etc.)
    -   According to the song's language (use japanese titles for japanese songs, english titles for english songs, etc.)
    -   According to Karaoke Mugen's language (uses system locale to determine which language to use. Defaults back to english and then original name)
    -   According to the user's language (uses your browser's language to determine which language to use. Defaults back to english adn then original name)
-   #282 Support for audio-only karaokes
    -   You can create karaokes with mp3+ass files, for songs which do not have any video available anywhere on the Internets.
    -   Supported formats are mp3, m4a and ogg.
    -   Your file should have a cover art metadata. If it does it'll be used as background. If not KM's default background will be used.
    -   Enjoy your long versions of songs :)
    -   As a result KM's .kara format evolves to version 3. Version 2 can still be imported safely in KM 2.1 and below. Version 3 can only be imported in 2.2 and higher.
    -   `videos` folder now becomes the `medias` folder. To help with this.
-   #279 Song history can now be viewed in the control panel (administration).
    -   This is a list of most viewed songs.
-   #273 You can import/export your favorites.
    -   Useful when you go from one karaoke session to the other, carry your favorites on your phone anywhere and import them in the KM instance you're using!
-   #233 Song rankings can now be viewed in the control panel. This is a list of most requested songs (not necessarily viewed)
-   #109 Adding songs can now be limited to either number of songs or time.
    -   For example you can give users 5 minutes of karaoke each.
    -   Adding songs longer than their time left is not allowed.
    -   Just like with songs, time is given back once the song is freed or is being played on screen.
-   #79 Public vote mode can be enabled and offers a poll to users on their devices with 4 songs to choose from.
    -   Songs are taken from the public/suggestions playlist.
    -   Poll lasts 30 seconds and the winner song is added to the current playlist.
    -   If two or more songs are the highest in votes, a random one is chosen among them.
    -   Another poll is created.
    -   This is perfect if you want to have your users participate in the current playlist creation or if you want to just lean back and enjoy karaoke with friends without worrying about the playlist (create an AutoMix and make it a public playlist, then enable this mode)

## Enhancements

-   #304 Search fields now includes who added the song in a playlist
-   #297 Small tweaks made to the welcome page
-   #291 Jingle information is now displayed in the UI's song bar when a jingle is playing
-   #290 ASS files are no longer stored in the database.
    -   This should make database generation much faster
    -   Modifying an ASS file (to test stuff while making karaokes) will have an immediate effect now.
-   #288 Search/filtering is now done in SQL, which greatly improves speeds
-   #285 Config file is now validated and ignored if there are mistakes anywhere

## Fixes

-   #299 Better handling of how Karaoke Mugen is shut down regarding database access (should remove any SQLITE_BUSY errors)
-   #295 Forbidden messages won't be displayed anymore on first login
-   #311 Autoplay/Repeat playlist now behave correctly

# v2.1.2 "Gabriel Gênante" - 16/05/2018

## Information

-   Minimum required NodeJS version is now 8.4.0. This does not affect you if you use the packaged, binary versions of Karaoke Mugen

## Fixes

-   #40 Lowered number of files processed simultaneously during generation. Linux users won't need to modify their max number of file descriptors with `ulimit`
-   Fixed favorites list not being displayed properly
-   A proper error message is displayed when trying to add a song already present in the playlist
-   #298 Jingles list is now properly created. You won't run out of jingles anymore!
-   #293 Song list sort order has been modified a little (music videos are now properly sorted)

## Enhancements

-   #294 Karaoke Mugen now exits after karaoke base update is done.
-   #296 "Press key on exit" is only displayed if there's an error.

## Features removed

-   #7 We pulled a Sony on you and removed the software updater. It wasn't working to begin with and needed separate development efforts. If someone's up for it...

# v2.1.1 "Gabriel Grivoise" - 03/05/2018

## Fixes

-   The Magical Girl tag is now properly displayed
-   A bug in the function checking if a user is allowed to add a karaoke has been fixed
-   Importing playlists has been fixed
-   #289 Throttled the commands sent to the player to avoid flooding it when user purposefully clicks like an idiot everywhere at high speeds.

# v2.1.0 "Gabriel Glamoureuse" - 18/04/2018

Refer to the previous release candidates for a full changelog.

Changes sinces 2.1-rc1 :

## Enhancements

-   Added a new tag for songs difficult to sing : TAG_HARDMODE
-   #287 When using the "stop after current song" button, hitting the Play button will play the next song, not the one you stopped at.
-   #253 Rearranged options panel
-   #284 Removed admin password change since it's not used anymore
-   #281 Songs are now properly ordered by types in lists (Opening first, then insert songs, then endings)
-   Added more log messages
-   Added some tasks before exiting the app (close database and mpv properly)

## Fixes

-   #270 Fixed duplicate kara information panel when opening and closing it quickly.
-   #277 Fixed (hopefully) app slowdown under high load
-   Fixed some admin tutorial messages
-   #274 Songwriter is now a searchable item in karaoke lists
-   Fixed song quotas per user not being updated properly
-   Fixed song copy from one playlist to another
-   Tweaked french translation a little
-   #276 Fixed private/public mode switches
-   Link to documentation is now correct in welcome screen

## Delayed

-   #7 Auto-updater for the app has been moved to v2.2 as we still have some work to do and it's a little tricky.

# v2.1-rc1 "Gabriel Glandeuse" - 05/04/2018

Due to the many changes in this version, you're advised to read the `config.ini.sample` file or the docs to find out about new settings.

You're also advised to read [the documentation](http://mugen.karaokes.moe/docs/).
[API documentation](http://mugen.karaokes.moe/apidoc/) has also been updated.

Contributors for this version : @Aeden, @AxelTerizaki, @bcourtine, @Kmeuh, @mirukyu, @spokeek, @Ziassan

## Known bugs

-   Software updates (#7) are not working properly yet. This will be fixed in the final release. In the meantime it has been disabled.

## New features

-   #223 An interactive tutorial has been added for admins and users. A welcome screen has also been added, and the app will open a browser on startup.
-   #101 Video previews can be generated (if you switch the setting on) for users to check what the karaoke video looks like on their device.
-   #115 Added a user system to better manage permissions and create new features
-   #127 Remade the control panel in ReactJS and added new features inside
-   #150 Viewcounts can be reset in the control panel.
-   #247 Users can be managed from the control panel.
-   #151 Songs in lists now change colors if they're soon to be played, or have been played recently
-   #167 In public mode, song suggestions can be "liked" by users so the admin can get a better idea of what the public wants. Songs which receive enough "likes" don't count anymore in a user's quota.
-   #199 Added a favorites system. Users can add/remove favorite karaokes and add karas from that list.
-   #202 Public interface can now be closed down or limited by an admin to disallow adding new karaokes, for example.
-   #214 Current playlist now scrolls and follows the currently playing karaoke
-   #228 In private mode, makes sure people who didn't request many songs get priority
-   #234 `--validate` command-line argument to only validate .kara files (avoid generating database)
-   Many command-line arguments have been added. Run `yarn start --help` to get a list.
-   #238 A bunch of new tags have been added to the file format
-   #240 `config.ini` is now reloaded if modified outside of the app while it's running
-   #248 Updating the karaoke base from Shelter can now be done within the app's control panel, or via commandline with the `--updateBase` argument.
-   #252 Wallpaper will now be changed once per version
-   #266 Added a button in control panel to backup your config.ini file (creates a config.ini.backup file)

## Enhancements

-   #201 Generating karaoke database is now faster and simpler
-   #218 Jingles are all played before being shuffled again to avoid repeats
-   #219 .kara files are now verified before being imported into a database
-   #226 The app has been entirely rewritten in ES2015+, meaning it's simpler to read and code for
-   #231 Config files have been reorganized. `config.ini.default` isn't needed anymore by the app to start up.
-   #239 "Play after" feature has been fixed.
-   #246 mpv is now restarted at once if the karaoke isn't running.
-   #261 Log files are now in their own directories
-   #267 Quotes are now ignored when doing searches

## Fixes

-   #217 Obsolete blacklist criterias can now be deleted.
-   #227 Long titles now fit in playlists
-   #236 Viewcounts are now kept even after a database regeneration
-   #251 Karaoke Mugen's URL font on connection info display during play/stop mode has been enlarged as it was difficult to read from afar.
-   #260 .kara files' `datemodif` information is now written correctly.
-   #244 Lyrics panel in kara information can now be closed.

# v2.0.7 - 17/02/2018

Below here, patch notes were written in french.

Hé ben non c'était pas la dernière version la 2.0.6 vous y avez cru hein ?

## Correctifs

-   Fix bug introduit dans la 2.0.6 empêchant d'initialiser la base au lancement.

# v2.0.6 - 15/02/2018

Dernière version (fort probablement) avant le passage à la 2.1.

## Correctifs

-   En cas de changement de base de données de karaokés, l'application ne plante plus comme une otarie bourrée à la bière au lancement. (Relancer une seconde fois fonctionnait)
-   Les tests d'intégrité en cas de changement de base de données / régénération sont désormais tous executés. Cela pouvait causer des playlists mélangées.
-   Les options sont désormais correctement enregistrées même lorsqu'elles sont vides.

# v2.0.5 - 01/12/2017

## Améliorations

-   Ajout d'une option `--generate` à la ligne de commande pour forcer une génération de la base et quitter.

## Correctifs

-   Faire glisser à gauche sur l'interface mobile ne rajoute plus le kara ! Seulement à droite.
-   Fix des samples
-   Fix en cas de kara absent d'une génération sur l'autre de la base.

# v2.0.4 - 20/11/2017

-   Fix des jingles qui ne se jouent plus si on change l'intervalle entre deux jingles et que cet intervalle devient plus petit que le compteur actuel
-   Déploiement continu des nouvelles versions via gitlab

# v2.0.3 - 12/11/2017

-   Fix de la réécriture de karas durant la génération
-   Fix de l'erreur `OnLog is not a function` du calcul de gain des jingles

# v2.0.2 - 12/11/2017

-   #221 Fix en cas d'absence de jingle (cela arrêtait la lecture)

# v2.0.1 - 11/11/2017

-   Traduction de certains commentaires de code
-   #201 Nouveau système de génération de base de données, plus souple, moins de code.
-   Readme anglais/français

# v2.0 "Finé Fantastique" - 06/11/2017

## Améliorations

-   Possibilité d'annuler un kara en cours d'ajout depuis la version mobile
-   Favicon !
-   Le titre de la fenêtre affiche désormais "Karaoke Mugen"
-   Le temps total et restant d'une playlist est désormais indiqué en HH:MM plutôt qu'en HH:MM:SS

## Corrections

-   Messages d'erreur plus clairs
-   Vider une playlist met à jour le temps restant de celle-ci
-   #187 Les paramètres plein écran et toujours au dessus sont maintenant plus clairs.
-   Le volume ne change plus subitement après un redémarrage
-   Le temps restant d'un kara est mieux calculé

## Développement

-   Ajout d'une doc complète de l'API : http://mugen.karaokes.moe/apidoc

# v2.0 Release Candidate 1 "Finé Fiévreuse" - 25/10/2017

## Améliorations

-   #181 Karaoké Mugen peut désormais passer des jingles vidéo entre X karaokés !
    -   Déposez de courtes vidéos dans le dossier `app/jingles` (ou tout autre dossier de votre choix via le paramètre `PathJingles` de votre fichier `config.ini`)
    -   Réglez le paramètre "Intervalle entre les jingles" dans l'interface ou modifiez `EngineJinglesInterval` pour définir le nombre de chansons qui doivent passer avant qu'un jingle ne passe (20 chansons par défaut, soit environ 30 minutes de karaoké)
    -   Les jingles ne sont pas affichés dans la playlist !
    -   Leur gain audio est calculé au démarrage de l'app (#185)
-   #180 Le QR Code est maintenant affiché en surimpression par le lecteur vidéo
    -   Démarrage du coup plus rapide car pas de fichier image à modifier.
    -   Déposez des fonds d'écran dans le dossier `app/backgrounds` et Karaoke Mugen en prendra aléatoirement un pour l'afficher entre deux chansons.
-   #182 Dans l'affichage des playlists, le temps restant de celle-ci s'affiche désormais en bas à droite.
-   #172 Les fichiers de log sont maintenant nommés avec la date du jour.
-   #175 Les chemins spécifiés dans le fichier `config.ini` peuvent maintenant être multiples.
    -   Karaoke Mugen ira chercher dans chaque dossier (karas, paroles, vidéos, fonds d'écran
        , jingles...) tous les fichiers s'y trouvant. Par exemple si vous avez trois dossiers de vidéos listés, Karaoke Mugen vérifiera la présence de vidéo dans chaque dossier avant d'abandonner.
    -   Pour indiquer plusieurs dossiers, il faut séparer leurs chemins par des pipes `|`. `Alt Droit + 6` sur un clavier AZERTY. Exemple : `app/data/videos|D:/mesvideostest`
    -   Les chemins seront traités dans l'ordre. Si une même vidéo (par exemple) existe dans deux dossiers, c'est celle du premier dossier listé qui sera prise en priorité
-   #174 Ajout d'un paramètre `EngineAutoPlay` (Lecture Automatique) qui lance la lecture automatiquement dés qu'un karaoké est ajouté, si celui est sur stop.
    -   Pour toujours plus de KARAOKE INFINI.
-   #174 Ajout d'un paramètre `EngineRepeatPlaylist` (Répéter la playlist courante)
    -   Cela permet de relancer celle-ci automatiquement lorsqu'on arrive au dernier morceau.
-   #137 Nouvelle fonction Lire Ensuite.
    -   Un clic droit sur le bouton d'ajout d'un kara permet de l'insérer pile après la chanson en cours !
-   #179 Boutons de navigation "retour en haut/en bas/kara en cours" ajoutés
-   #196 Personnalisation des infos affichées en bas de l'écran durant les pauses/jingles
    -   `EngineDisplayConnectionInfo` : Affiche ou non les infos de connexion (défaut : 1)
    -   `EngineDisplayConnectionInfoQRCode` : Affiche ou non le QR Code (défaut : 1)
    -   `EngineDisplayConnectionInfoHost` : Force une adresse IP/nom d'hôte pour l'URL de connexion (défaut : vide)
    -   `EngineDisplayConnectionInfoMessage` : Ajoute un message avant celui avec l'URL. Par exemple pour indiquer un réseau Wifi auquel se connecter au préalable.
    -   Les informations de connexion sont réaffichées à 50% de la chanson en cours pendant 8 secondes
-   #195 Les informations de la chanson sont maintenant affichées aussi à la fin de la chanson en cours
-   Il est désormais possible d'indiquer à Karaoke Mugen un chemin web (HTTP) pour récupérer les vidéos s'il ne les trouve pas dans vos dossiers.
    -   Si vous êtes sur un réseau local ou que vos vidéos sont hébergées sur Internet, vous pouvez spécifier `PathVideosHTTP=http://monsiteweb.com/videos` pour que Karaoke Mugen streame les vidéos. Cela ne les télécharge pas définitivement sur votre disque dur !
-   #189 Des openings ou endings spécifiques peuvent être recherchés désormais.
-   La recherche prend en compte l'auteur du karaoké
-   #184 Le temps de passage d'un karaoké dans la liste de lecture courante est indiqué (genre "dans 25 minutes")
-   Les karas dans la liste publique/de suggestions sont supprimés dés qu'ils sont joués en courante.
-   #135 L'interface est traduite en anglais et français et se base sur la langue de votre navigateur. On a posé les bases pour une traduction en d'autres langues
-   #197 Bouton aller au début/en fin de playlist et aller au kara en cours de lecture
-   #204 Nouveau critère de blacklist (nom de la série)
-   #92 Une limite de chansons par utilisateur a été mise en place.
    -   Une fois définie, la limite empêche les gens d'ajouter un karaoké s'ils ont déjà ajouté trop de chansons. Une fois les chansons de l'utilisateur passées, il peut en ajouter de nouvelles.

## Corrections

-   #75 Utilisation d'un nouveau module d'accès à la base de données SQLite permettant de gérer les migrations et les promesses.
-   #191 Les pseudos contenant { } sont maintenant correctement affichés à l'écran
-   Optimisations de la génération de la base de données
    -   La génération de la base de données ne réécrit plus inutilement les .kara (uniquement s'il y a des modifications apportées, vidéo changée, etc.)
    -   Ajout de profiling sur les différentes étapes pour voir lesquelles prennent du temps
    -   Les tests d'intégrité de la base utilisateur utilisent maintenant une transaction et sont bien plus rapides si vous avez beaucoup de playlists ou de karas blacklistés.
    -   Les fichiers de paroles vides (vidéos hardsubbées, etc.) ne sont plus écrits dans la base.
    -   Tests en cas de bases de données mal formées pour déclencher une regénération si besoin
-   #169 Fix du fichier log inexistant
-   #178 Les champs de saisie des critères de blacklist sont désormais pleinement utilisables, en toutes circonstances (même durant les horaires de nuit)
-   #177 Le scrolling sur iPad/iPhone/iTouch est maintenant plus fluide
-   #114 Les critères de blacklist sont maintenant correctement mis à jour lors d'une régénération e la base.
-   Plus de type "inutilisé" parmi les critères de blacklist !
-   Quelques fix d'interfaces au niveau des critères de blacklist (notamment #192)
-   #193 Les changements de mot de passe devraient mieux se passer désormais.
-   #186 Les tests d'intégrité de la base utilisateur sont réalisés à chaque lancement si la base karas et utilisateur n'ont pas été générées en même temps.
-   #183 La recherche des noms de série alternatives marche de nouveau correctement
-   Un message est affiché quand les paroles ne sont pas affichables dans l'interface
-   #205 #206 "Tags" devient "Métadonnées" dans l'interface
-   #194 Soucis de scrolling en cas de karas avec plusieurs lignes corrigé
-   #207 Les langues sont traduites dans la liste des critères d'une blacklist
-   #208 Le critère "tag par nom" n'est plus sensible à la casse
-   #210 La blacklist se rafraichit désormais correctement
-   #213 Les paramètres "AlwaysOnTop" et "Fullscreen" sont désormais bien affichés sur l'interface par rapport à la réalité du terrain.
-   #212 Le QRCode est maintenant en haut de l'écran pour éviter que des lignes trop longues en bas ne s'affichent dessus
-   #211 La suppression multiple d'éléments de la whitelist fonctionne de nouveau
-   #209 On peut de nouveau ajouter plusieurs karaokés d'un coup à la blacklist
-   #190 La suppresion de plusieurs karaokés devrait être plus rapide

## Développement

-   Passage à Babel/ES2015+ tout doucement. (Nécessite Node8)
-   **Modification d'API** : Les messages de réponse de l'API ont été complètement revus, consultez la documentation pour plus d'informations.
-   #135 Les retours de l'API ont été normalisés. Une doc plus précise et complète va bientôt être disponible

## Mettre à jour

### Versions binaires

-   Soon(tm)

### Version source

-   Récupérer le dernier code source

```sh
git fetch
git checkout v2.0-rc1
```

-   Mettre à jour les packages

```sh
yarn install
```

Si `yarn` n'est pas installé :

```sh
npm install -g yarn
```

`npm`, c'est un peu comme Internet Explorer, son seul intêret c'est d'installer `yarn`

# v2.0 Beta 2 "Finé Foutraque" - 29/09/2017

## Améliorations

-   #130 Le bouton "J'ai de la chance !" piochera désormais dans le résultat de votre recherche. Par exemple si vous tapez "Naruto" il prendra au hasard un OP/ED de Naruto.
-   #134 Ajouter une selection deselectionne les karas selectionnés (une modification selectionnée par nos soins)
-   #138 Lors d'un changement de paramètre nécessitant un redémarrage du lecteur, celui-ci redémarrera à la fin de la chanson en cours (par exemple changer d'écran ne peut pas être fait à la volée)
-   #144 L'export de liste de lecture (et l'import) prend désormais en compte où vous en étiez dans la liste de lecture
-   #146 L'administrateur peut maintenant afficher des messages à l'écran du karaoké ou sur les interfaces des utilisateurs (ou les deux). L'affichage à l'écran supporte les tags ASS.
-   #164 L'application refusera de démarrer si vous n'avez pas mpv 0.25 d'installé sur votre système. Cela ne concerne que les cas où vous fournissez votre propre mpv à Karaoke Mugen.
-   #143 Les paramètres pour spécifier les binaires de mpv selon votre OS (`BinPlayerOSX`, `BinPlayerWindows` et `BinPlayerLinux`) sont désormais bien pris en compte
-   #145 Lors du premier lancement, ce sont cinq karaokés aléatoires qui sont ajoutés à la liste de lecture courante, pas juste les 5 premiers.
-   #73 Le fond d'écran quand un karaoké n'est pas actif est maintenant personnalisable ! Spécifiez son nom avec l'option `PlayerBackground` dans votre fichier `config.ini`. Les fonds d'écran doivent être déposés dans le dossier `app/backgrounds`
-   #62 La génération ne foutra plus en l'air vos .kara en cas d'erreur inattendue.
-   #154 Lors de la génération, les fichiers cachés sont ignorés.
-   #131 Utiliser la molette quand la souris passe sur la fenêtre du lecteur monte ou descend le son au lieu d'avancer/reculer dans la vidéo.
-   #165 Sous macOS, le fichier de log reste dans le dossier de Karaoke Mugen (avant il allait dans le dossier home de l'utilisateur)
-   #60 La génération de la base de données affiche désormais sa progression pour éviter de vous faire baliser lorsque que votre ordinateur est trop lent.
-   Le lecteur vidéo sous macOS gére bien mieux le plein écran (utilisation de `--no-native-fs`)
-   Les informations à l'écran lorsqu'un karaoké n'est pas en cours sont écrites plus clairement, et le QR Code mieux dimensionné
-   Les listes de lecture sont maintenant triées par nom
-   L'interface est désormais totalement en thème sombre

## Correctifs

-   #133 Le paramètre "Toujours au dessus" fonctionne désormais normalement
-   #136 Fixes d'interface et francisation de nombreux éléments texte encore en anglais
-   #140 Revue du CSS de l'interface
-   #129 Optimisation de la base de données pour ne plus ajouter d'ASS vides en cas de hardsubs.
-   #148 L'initialisation de certaines pages de la webapp se passe mieux
-   Lors de la génération de la base de données, le champ "series" d'un .kara est maintenant pris en compte correctement
-   De nombreux, nombreux correctifs d'interface.
-   L'import de grandes playlists fonctionne désormais normalement
-   Le lecteur s'arrête normalement si la liste de lecture courante est vide et qu'on essaye de la jouer.
-   Lorsque la base de données est vide, le Dummy Plug s'active pour vous ajouter 5 karaokés au hasard de votre base. Il n'y aura plus de message d'erreur si vous avez moins de 5 karaokés, voire pas de karaoké du tout.

## Problèmes connus

-   Sous certaines configurations macOS, un warning de type `UnhandledPromiseRejection` peut apparaître au changement de chansons, nous sommes sur le coup. Ce message n'empêche en aucun cas d'utiliser l'application.
-   Si vous avez des critères de blacklist assez divers, certains peuvent être éronnés après une regénération de votre base. Pensez à les vérifier après chaque génération ! Voir l'issue #114

# v2.0 Beta 1 "Finé Flegmatique" - 18/09/2017

Aucune note de sortie

# v2.0 Alpha "Finé Folklorique" - 29/08/2017

Aucune note de sortie
