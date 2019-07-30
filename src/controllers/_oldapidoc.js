/**
 * @api {get} admin/playlists/:pl_id/karas/:plc_id Get song info from a playlist
 * @apiName GetPlaylistPLC
 * @apiVersion 2.0.0
 * @apiGroup Playlists
 * @apiPermission admin
 *
 * @apiParam {Number} pl_id Target playlist ID. **Note :** Irrelevant since PLCIDs are unique in the table.
 * @apiParam {Number} plc_id Playlist content ID.
 * @apiSuccess {String} data/NORM_author Normalized karaoke's author name
 * @apiSuccess {String} data/NORM_creator Normalized creator's name
 * @apiSuccess {String} data/NORM_pseudo_add Normalized name of person who added the karaoke to the playlist
 * @apiSuccess {String} data/NORM_serie Normalized name of series the karaoke is from
 * @apiSuccess {String} data/NORM_serie_altname Normalized names of alternative names to the series the karaoke is from. When there are more than one alternative name, they're separated by forward slashes (`/`)
 * @apiSuccess {String} data/NORM_singer Normalized name of singer.
 * @apiSuccess {String} data/NORM_songwriter Normalized name of songwriter.
 * @apiSuccess {String} data/NORM_title Normalized song title
 * @apiSuccess {String} data/author Karaoke author's name
 * @apiSuccess {Number} data/created_at UNIX timestamp of the karaoke's creation date in the base
 * @apiSuccess {String} data/creator Show's creator name
 * @apiSuccess {Number} data/duration Song duration in seconds
 * @apiSuccess {Number} data/flag_blacklisted Is the song in the blacklist ?
 * @apiSuccess {Number} data/flag_playing Is the song the one currently playing ?
 * @apiSuccess {Number} data/flag_whitelisted Is the song in the whitelist ?
 * @apiSuccess {Number} data/gain Calculated audio gain for the karaoke's video, in decibels (can be negative)
 * @apiSuccess {Number} data/kara_id Karaoke's ID in the main database
 * @apiSuccess {String} data/kid Karaoke's unique ID (survives accross database generations)
 * @apiSuccess {String} data/language Song's language in ISO639-2B format, separated by commas when a song has several languages
 * @apiSuccess {String} data/language_i18n Song's language translated in the client's native language
 * @apiSuccess {String} data/misc Internal tag list (`TAG_VIDEOGAME`, etc.)
 * @apiSuccess {String} data/misc_i18n Translated tag list
 * @apiSuccess {Number} data/playlist_id ID of playlist this song belongs to
 * @apiSuccess {Number} data/playlistcontent_ID PLC ID of this song.
 * @apiSuccess {Number} data/pos Position in the playlist. First song has a position of `1`
 * @apiSuccess {String} data/pseudo_add User who added/requested the song
 * @apiSuccess {String} data/serie Name of series/show the song belongs to
 * @apiSuccess {String} data/serie_altname Alternative name(s) of series/show this song belongs to. Names are separated by forward slashes (`/`)
 * @apiSuccess {String} data/singer Singer's name, if known.
 * @apiSuccess {Number} data/songorder Song's order, relative to it's type. Opening 1, Opening 2, Ending 1, Ending 2, etc.
 * @apiSuccess {String} data/songtype Song's type internal tag (`TYPE_OP`, `TYPE_ED`, `TYPE_IN` ...)
 * @apiSuccess {String} data/songtype_i18n Translated song's type (`Opening`, `Ending`, `Insert Song`...)
 * @apiSuccess {String} data/songtype_i18n_short Short translated version of the song's type (`OP`, `ED`, `IN`, ...)
 * @apiSuccess {Number} data/time_before_play Estimated time remaining before the song is going to play (in seconds). `0` if the song is currently playing or if there is no song selected as currently playing in the playlist (thus making this estimate impossible)
 * @apiSuccess {String} data/title Song's title
 * @apiSuccess {String} data/videofile Video's filename
 * @apiSuccess {Number} data/viewcount Counts how many times the song has been played
 * @apiSuccess {String} data/year Song's creation year. Empty string is returned if no year is known.
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "data": [
 *       {
 *           "NORM_author": null,
 *           "NORM_creator": null,
 *           "NORM_pseudo_add": "Axel",
 *           "NORM_serie": "C3 ~ Cube X Cursed X Curious",
 *           "NORM_serie_altname": "C-Cube/CxCxC",
 *           "NORM_singer": null,
 *           "NORM_songwriter": null,
 *           "NORM_title": "Hana",
 *           "author": null,
 *           "created_at": 1508427958,
 *           "creator": null,
 *           "duration": 0,
 *           "flag_blacklisted": 0,
 *           "flag_playing": 0,
 *           "flag_whitelisted": 0,
 *           "gain": 0,
 *           "kara_id": 1007,
 *           "kid": "c05e24eb-206b-4ff5-88d4-74e8d5ad6f75",
 *           "language": "jpn",
 *           "language_i18n": "Japonais",
 *           "misc": null,
 *           "misc_i18n": null,
 *           "playlist_id": 2,
 *           "playlistcontent_id": 4961,
 *           "pos": 12,
 *           "pseudo_add": "Axel",
 *           "serie": "C3 ~ Cube X Cursed X Curious",
 *           "serie_altname": "C-Cube/CxCxC",
 *           "singer": null,
 *           "songorder": 1,
 *           "songtype": "TYPE_ED",
 *           "songtype_i18n": "Ending",
 *           "songtype_i18n_short": "ED",
 *           "songwriter": null,
 *           "time_before_play": 0,
 *           "title": "Hana",
 *           "videofile": "JAP - C3 ~ Cube X Cursed X Curious - ED1 - Hana.avi",
 *           "viewcount": 0,
 *           "year": ""
 *       }
 *   ]
 * }
 * @apiError PL_VIEW_CONTENT_ERROR Unable to fetch playlist's content information
 *
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * {
 *   "code": "PL_VIEW_CONTENT_ERROR",
 *   "message": "PLCID unknown!"
 * }
 */

/**
 * @api {get} admin/settings Get settings
 * @apiName GetSettings
 * @apiVersion 2.0.0
 * @apiGroup Main
 * @apiPermission admin
 *
 * @apiSuccess {Object} data Contains all configuration settings. See example or documentation for what each setting does.
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "data": {
 *       "AdminPassword": "xxxx",
 *       "BinPlayerLinux": "/usr/bin/mpv",
 *       "BinPlayerOSX": "app/bin/mpv.app/Contents/MacOS/mpv",
 *       "BinPlayerWindows": "app/bin/mpv.exe",
 *       "BinffmpegLinux": "/usr/bin/ffmpeg",
 *       "BinffmpegOSX": "app/bin/ffmpeg",
 *       "BinffmpegPath": "D:\\perso\\toyundamugen-app\\app\\bin\\ffmpeg.exe",
 *       "BinffmpegWindows": "app/bin/ffmpeg.exe",
 *       "BinffprobeLinux": "/usr/bin/ffprobe",
 *       "BinffprobeOSX": "app/bin/ffprobe",
 *       "BinffprobePath": "D:\\perso\\toyundamugen-app\\app\\bin\\ffprobe.exe
 *       "BinffprobeWindows": "app/bin/ffprobe.exe",
 *       "BinmpvPath": "D:\\perso\\toyundamugen-app\\app\\bin\\mpv.exe",
 *       "EngineAllowNicknameChange": "1",
 *       "EngineAllowViewBlacklist": "1",
 *       "EngineAllowViewBlacklistCriterias": "1",
 *       "EngineAllowViewWhitelist": "1",
 *       "EngineAutoPlay": "0",
 *       "EngineDefaultLocale": "fr",
 *       "EngineDisplayConnectionInfo": "1",
 *       "EngineDisplayConnectionInfoHost": "",
 *       "EngineDisplayConnectionInfoMessage": "",
 *       "EngineDisplayConnectionInfoQRCode": "1",
 *       "EngineDisplayNickname": "1",
 *       "EngineJinglesInterval": "1",
 *       "EnginePrivateMode": "1",
 *       "EngineRepeatPlaylist": "0",
 *       "EngineSongsPerUser": "10000",
 *       "PathAltname": "../times/series_altnames.csv",
 *       "PathBackgrounds": "app/backgrounds",
 *       "PathBin": "app/bin",
 *       "PathDB": "app/db",
 *       "PathDBKarasFile": "karas.sqlite3",
 *       "PathDBUserFile": "userdata.sqlite3",
 *       "PathJingles": "app/jingles",
 *       "PathKaras": "../times/karas",
 *       "PathSubs": "../times/lyrics",
 *       "PathTemp": "app/temp",
 *       "PathVideos": "app/data/videos",
 *       "PathVideosHTTP": "",
 *       "PlayerBackground": "",
 *       "PlayerFullscreen": "0",
 *       "PlayerNoBar": "1",
 *       "PlayerNoHud": "1",
 *       "PlayerPIP": "1",
 *       "PlayerPIPPositionX": "Left",
 *       "PlayerPIPPositionY": "Bottom",
 *       "PlayerPIPSize": "30",
 *       "PlayerScreen": "0",
 *       "PlayerStayOnTop": "1",
 *       "VersionName": "Finé Fiévreuse",
 *       "VersionNo": "v2.0 Release Candidate 1",
 *       "appPath": "F:\\karaokemugen-app\\",
 *       "isTest": false,
 *       "mpvVideoOutput": "direct3d",
 *       "os": "win32",
 *       "osHost": "10.202.40.43"
 *   }
 * }
 */

/**
 * @api {put} admin/settings Update settings
 * @apiName PutSettings
 * @apiVersion 2.0.0
 * @apiPermission admin
 * @apiGroup Main
 * @apiDescription **Note :** All settings must be sent at once in a single request.
 * @apiParam {String} AdminPassword Administrator's password.
 * @apiParam {Boolean} EngineAllowNicknameChange Allow/disallow users to change their nickname once set.
 * @apiParam {Boolean} EngineAllowViewBlacklist Allow/disallow users to view blacklist contents from the guest interface
 * @apiParam {Boolean} EngineAllowViewWhitelist Allow/disallow users to view whitelist contents from the guest interface
 * @apiParam {Boolean} EngineAllowViewBlacklistCriterias Allow/disallow users to view blacklist criterias list from the guest interface
 * @apiParam {Boolean} EngineAllowAutoPlay Enable/disable AutoPlay feature (starts playing once a song is added to current playlist)
 * @apiParam {Boolean} EngineDisplayConnectionInfo Show/hide connection info during jingles or pauses (the "Go to http://" message)
 * @apiParam {String} EngineDisplayConnectionInfoHost Force IP/Hostname displayed during jingles or pauses in case autodetection returns the wrong IP
 * @apiParam {String} EngineDisplayConnectionInfoMessage Add a small message before the text showing the URL to connect to
 * @apiParam {Boolean} EngineDisplayConnectionInfoQRCode Enable/disable QR Code during pauses inbetween two songs.
 * @apiParam {Boolean} EngineDisplayNickname Enable/disable displaying the username who requested a song.
 * @apiParam {Number} EngineJinglesInterval Interval in number of songs between two jingles. 0 to disable entirely.
 * @apiParam {Boolean} EnginePrivateMode `false` = Public Karaoke mode, `true` = Private Karaoke Mode. See documentation.
 * @apiParam {Boolean} EngineRepeatPlaylist Enable/disable auto repeat playlist when at end.
 * @apiParam {Number} EngineSongsPerUser Number of songs allowed per person.
 * @apiParam {Boolean} PlayerFullscreen Enable/disable full screen mode
 * @apiParam {Boolean} PlayerNoBar `true` = Hide progress bar / `false` = Show progress bar
 * @apiParam {Boolean} PlayerNoHud `true` = Hide HUD / `false` = Show HUD
 * @apiParam {Boolean} PlayerPIP Enable/disable Picture-in-picture mode
 * @apiParam {String=Left,Center,Right} PlayerPIPPositionX Horizontal position of PIP screen
 * @apiParam {String=Top,Center,Bottom} PlayerPIPPositionY Vertical position of PIP screen
 * @apiParam {Number} PlayerPIPSize Size in percentage of the PIP screen
 * @apiParam {Number} PlayerScreen Screen number to display the videos on. If screen number is not available, main screen is used. `9` means autodetection.
 * @apiParam {Boolean} PlayerStayOnTop Enable/disable stay on top of all windows.
 * @apiSuccess {Object} data Contains all configuration settings. See example or documentation for what each setting does.
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 */

/**
 * @api {get} public/settings Get settings (public)
 * @apiName GetSettingsPublic
 * @apiVersion 2.0.0
 * @apiGroup Main
 * @apiPermission public
 * @apiDescription Contrary to `admin/settings` path, this one doesn't return things like paths, binaries or admin password information.
 * @apiSuccess {Object} data Contains all configuration settings. See example or documentation for what each setting does.
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "data": {
 *       "EngineAllowNicknameChange": "1",
 *       "EngineAllowViewBlacklist": "1",
 *       "EngineAllowViewBlacklistCriterias": "1",
 *       "EngineAllowViewWhitelist": "1",
 *       "EngineAutoPlay": "0",
 *       "EngineDefaultLocale": "fr",
 *       "EngineDisplayConnectionInfo": "1",
 *       "EngineDisplayConnectionInfoHost": "",
 *       "EngineDisplayConnectionInfoMessage": "",
 *       "EngineDisplayConnectionInfoQRCode": "1",
 *       "EngineDisplayNickname": "1",
 *       "EngineJinglesInterval": "1",
 *       "EnginePrivateMode": "1",
 *       "EngineRepeatPlaylist": "0",
 *       "EngineSongsPerUser": "10000",
 *       "PlayerBackground": "",
 *       "PlayerFullscreen": "0",
 *       "PlayerNoBar": "1",
 *       "PlayerNoHud": "1",
 *       "PlayerPIP": "1",
 *       "PlayerPIPPositionX": "Left",
 *       "PlayerPIPPositionY": "Bottom",
 *       "PlayerPIPSize": "30",
 *       "PlayerScreen": "0",
 *       "PlayerStayOnTop": "1",
 *       "VersionName": "Finé Fiévreuse",
 *       "VersionNo": "v2.0 Release Candidate 1",
 *       "mpvVideoOutput": "direct3d",
 *   }
 * }
 */

/**
 * @api {post} public/karas/:kara_id Add karaoke to current/public playlist
 * @apiName PostKaras
 * @apiVersion 2.0.0
 * @apiGroup Playlists
 * @apiPermission public
 * @apiDescription Contrary to the admin route, this adds a single karaoke song to either current or public playlist depending on private/public mode selected by admin in configuration.
 * @apiParam {Number} kara_id Karaoke ID to add to current/public playlist
 * @apiParam {String} requestedby Name of user who added the song.
 * @apiSuccess {String} args/kara Karaoke title added
 * @apiSuccess {Number} args/kara_id Karaoke ID added.
 * @apiSuccess {String} args/playlist Name of playlist the song was added to
 * @apiSuccess {Number} args/playlist_id Playlist ID the song was added to
 * @apiSuccess {String} code Message to display
 * @apiSuccess {String} data See `args` above.
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "args": {
 *       "kara": "Dragon Screamer",
 *       "kara_id": "1029",
 *       "playlist": "Courante",
 *       "playlist_id": 1
 *   },
 *   "code": "PLAYLIST_MODE_SONG_ADDED",
 *   "data": {
 *       "kara": "Dragon Screamer",
 *       "kara_id": "1029",
 *       "playlist": "Courante",
 *       "playlist_id": 1
 *   }
 * }

* @apiError PLAYLIST_MODE_ADD_SONG_ERROR_QUOTA_REACHED User asked for too many karaokes already.
* @apiError PLAYLIST_MODE_ADD_SONG_ERROR Karaoke already present in playlist
*
* @apiErrorExample Error-Response:
* HTTP/1.1 500 Internal Server Error
* {
*   "args": {
*       "kara": "1033",
*       "playlist": 1,
*       "user": "Axel"
*   },
*   "code": "PLAYLIST_MODE_ADD_SONG_ERROR_QUOTA_REACHED",
*   "message": "User quota reached"
* }
*/

/**
 * @api {post} admin/playlists/:pl_id/karas Add karaokes to playlist
 * @apiName PatchPlaylistKaras
 * @apiVersion 2.0.0
 * @apiGroup Playlists
 * @apiPermission admin
 *
 * @apiParam {Number} pl_id Target playlist ID.
 * @apiParam {Number[]} kara_id List of `kara_id` separated by commas (`,`). Example : `1021,2209,44,872`
 * @apiParam {Number} [pos] Position in target playlist where to copy the karaoke to. If not specified, will place karaokes at the end of target playlist. `-1` adds karaokes after the currently playing song in target playlist.
 * @apiParam {String} requestedby Name of user who added the song.
 * @apiSuccess {String[]} args/plc_ids IDs of playlist contents copied
 * @apiSuccess {String} args/playlist_id ID of destinaton playlist
 * @apiSuccess {String} code Message to display
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "args": {
 *       "playlist": 2,
 *       "plc_ids": [
 * 			"4946",
 * 			"639"
 * 		 ]
 *   },
 *   "code": "PL_SONG_MOVED",
 *   "data": null
 * }
 * @apiError PL_ADD_SONG_ERROR Unable to add songs to the playlist
 *
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * {
 *   "args": "Liste de lecture publique",
 *   "code": "PL_ADD_SONG_ERROR",
 *   "message": "No karaoke could be added, all are in destination playlist already (PLID : 2)"
 * }
 */

/**
 * @api {get} admin/playlists/:pl_id/karas Get list of karaokes in a playlist
 * @apiName GetPlaylistKaras
 * @apiVersion 2.0.0
 * @apiGroup Playlists
 * @apiPermission admin
 *
 * @apiParam {Number} pl_id Target playlist ID.
 * @apiParam {String} [filter] Filter list by this string.
 * @apiParam {String} [lang] ISO639-2B code of client's language (to return translated text into the user's language) Defaults to engine's locale.
 * @apiParam {Number} [from=0] Return only the results starting from this position. Useful for continuous scrolling. 0 if unspecified
 * @apiParam {Number} [size=999999] Return only x number of results. Useful for continuous scrolling. 999999 if unspecified.
 *
 * @apiSuccess {Object[]} data/content/karas Array of `kara` objects
 * @apiSuccess {Number} data/infos/count Number of karaokes in playlist
 * @apiSuccess {Number} data/infos/from Starting position of listing
 * @apiSuccess {Number} data/infos/to End position of listing
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "data": {
 *       "content": [
 *           {
 *               "NORM_author": null,
 *               "NORM_creator": null,
 *               "NORM_pseudo_add": "Administrateur",
 *               "NORM_serie": "Dynasty Warriors 3",
 *               "NORM_serie_altname": "DW3/DW 3",
 *               "NORM_singer": null,
 *               "NORM_songwriter": null,
 *               "NORM_title": "Circuit",
 *               "author": null,
 *               "created_at": 1508423806,
 *               "creator": null,
 *               "duration": 0,
 *               "flag_blacklisted": 0,
 *               "flag_playing": 1,
 *               "flag_whitelisted": 0,
 *               "gain": 0,
 *               "kara_id": 176,
 *               "kid": "b0de301c-5756-49fb-b019-85a99a66586b",
 *               "language": "chi",
 *               "language_i18n": "Chinois",
 *               "misc": "TAG_VIDEOGAME",
 *               "misc_i18n": "Jeu vidéo",
 *               "playlistcontent_id": 4946,
 *               "pos": 1,
 *               "pseudo_add": "Administrateur",
 *               "serie": "Dynasty Warriors 3",
 *               "serie_altname": "DW3/DW 3",
 *               "singer": null,
 *               "songorder": 0,
 *               "songtype": "TYPE_ED",
 *               "songtype_i18n": "Ending",
 *               "songtype_i18n_short": "ED",
 *               "songwriter": null,
 *               "title": "Circuit",
 *               "videofile": "CHI - Dynasty Warriors 3 - GAME ED - Circuit.avi"
 *               "viewcount": 0,
 *               "year": ""
 *           },
 *           ...
 *       ],
 *       "infos": {
 *           "count": 3,
 * 			 "from": 0,
 * 			 "to": 120
 *       }
 *   }
 * }
 * @apiError PL_VIEW_SONGS_ERROR Unable to fetch list of karaokes in a playlist
 *
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 */
/**
 * @api {get} public/playlists/:pl_id/karas Get list of karaokes in a playlist (public)
 * @apiName GetPlaylistKarasPublic
 * @apiVersion 2.0.0
 * @apiGroup Playlists
 * @apiPermission public
 * @apiDescription Contrary to the `/admin/playlists/` path, this one will not return playlists which have the `flag_visible` set to `0`.
 * @apiParam {Number} pl_id Target playlist ID.
 * @apiParam {String} [filter] Filter list by this string.
 * @apiParam {String} [lang] ISO639-2B code of client's language (to return translated text into the user's language) Defaults to engine's locale.
 * @apiParam {Number} [from=0] Return only the results starting from this position. Useful for continuous scrolling. 0 if unspecified
 * @apiParam {Number} [size=999999] Return only x number of results. Useful for continuous scrolling. 999999 if unspecified.
 *
 * @apiSuccess {Object[]} data/content/karas Array of `kara` objects
 * @apiSuccess {Number} data/infos/count Number of karaokes in playlist
 * @apiSuccess {Number} data/infos/from Starting position of listing
 * @apiSuccess {Number} data/infos/to End position of listing
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "data": {
 *       "content": [
 *           {
 *               "NORM_author": null,
 *               "NORM_creator": null,
 *               "NORM_pseudo_add": "Administrateur",
 *               "NORM_serie": "Dynasty Warriors 3",
 *               "NORM_serie_altname": "DW3/DW 3",
 *               "NORM_singer": null,
 *               "NORM_songwriter": null,
 *               "NORM_title": "Circuit",
 *               "author": null,
 *               "created_at": 1508423806,
 *               "creator": null,
 *               "duration": 0,
 *               "flag_blacklisted": 0,
 *               "flag_playing": 1,
 *               "flag_whitelisted": 0,
 *               "gain": 0,
 *               "kara_id": 176,
 *               "kid": "b0de301c-5756-49fb-b019-85a99a66586b",
 *               "language": "chi",
 *               "language_i18n": "Chinois",
 *               "misc": "TAG_VIDEOGAME",
 *               "misc_i18n": "Jeu vidéo",
 *               "playlistcontent_id": 4946,
 *               "pos": 1,
 *               "pseudo_add": "Administrateur",
 *               "serie": "Dynasty Warriors 3",
 *               "serie_altname": "DW3/DW 3",
 *               "singer": null,
 *               "songorder": 0,
 *               "songtype": "TYPE_ED",
 *               "songtype_i18n": "Ending",
 *               "songtype_i18n_short": "ED",
 *               "songwriter": null,
 *               "title": "Circuit",
 *               "videofile": "CHI - Dynasty Warriors 3 - GAME ED - Circuit.avi"
 *               "viewcount": 0,
 *               "year": ""
 *           },
 *           ...
 *       ],
 *       "infos": {
 *           "count": 3,
 * 			 "from": 0,
 * 			 "to": 120
 *       }
 *   }
 * }
 * @apiError PL_VIEW_SONGS_ERROR Unable to fetch list of karaokes in a playlist
 *
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 */
/**
 * @api {get} public/playlists/:pl_id/karas/:plc_id Get song info from a playlist (public)
 * @apiName GetPlaylistPLCPublic
 * @apiVersion 2.0.0
 * @apiGroup Playlists
 * @apiPermission public
 * @apiDescription Contrary to the `admin/playlists` path, this one won't return any karaoke info from a playlist the user has no access to.
 * @apiParam {Number} pl_id Target playlist ID. **Note :** Irrelevant since PLCIDs are unique in the table.
 * @apiParam {Number} plc_id Playlist content ID.
 * @apiSuccess {String} data/NORM_author Normalized karaoke's author name
 * @apiSuccess {String} data/NORM_creator Normalized creator's name
 * @apiSuccess {String} data/NORM_pseudo_add Normalized name of person who added the karaoke to the playlist
 * @apiSuccess {String} data/NORM_serie Normalized name of series the karaoke is from
 * @apiSuccess {String} data/NORM_serie_altname Normalized names of alternative names to the series the karaoke is from. When there are more than one alternative name, they're separated by forward slashes (`/`)
 * @apiSuccess {String} data/NORM_singer Normalized name of singer.
 * @apiSuccess {String} data/NORM_songwriter Normalized name of songwriter.
 * @apiSuccess {String} data/NORM_title Normalized song title
 * @apiSuccess {String} data/author Karaoke author's name
 * @apiSuccess {Number} data/created_at UNIX timestamp of the karaoke's creation date in the base
 * @apiSuccess {String} data/creator Show's creator name
 * @apiSuccess {Number} data/duration Song duration in seconds
 * @apiSuccess {Number} data/flag_blacklisted Is the song in the blacklist ?
 * @apiSuccess {Number} data/flag_playing Is the song the one currently playing ?
 * @apiSuccess {Number} data/flag_whitelisted Is the song in the whitelist ?
 * @apiSuccess {Number} data/gain Calculated audio gain for the karaoke's video, in decibels (can be negative)
 * @apiSuccess {Number} data/kara_id Karaoke's ID in the main database
 * @apiSuccess {String} data/kid Karaoke's unique ID (survives accross database generations)
 * @apiSuccess {String} data/language Song's language in ISO639-2B format, separated by commas when a song has several languages
 * @apiSuccess {String} data/language_i18n Song's language translated in the client's native language
 * @apiSuccess {String} data/misc Internal tag list (`TAG_VIDEOGAME`, etc.)
 * @apiSuccess {String} data/misc_i18n Translated tag list
 * @apiSuccess {Number} data/playlist_id ID of playlist this song belongs to
 * @apiSuccess {Number} data/playlistcontent_ID PLC ID of this song.
 * @apiSuccess {Number} data/pos Position in the playlist. First song has a position of `1`
 * @apiSuccess {String} data/pseudo_add User who added/requested the song
 * @apiSuccess {String} data/serie Name of series/show the song belongs to
 * @apiSuccess {String} data/serie_altname Alternative name(s) of series/show this song belongs to. Names are separated by forward slashes (`/`)
 * @apiSuccess {String} data/singer Singer's name, if known.
 * @apiSuccess {Number} data/songorder Song's order, relative to it's type. Opening 1, Opening 2, Ending 1, Ending 2, etc.
 * @apiSuccess {String} data/songtype Song's type internal tag (`TYPE_OP`, `TYPE_ED`, `TYPE_IN` ...)
 * @apiSuccess {String} data/songtype_i18n Translated song's type (`Opening`, `Ending`, `Insert Song`...)
 * @apiSuccess {String} data/songtype_i18n_short Short translated version of the song's type (`OP`, `ED`, `IN`, ...)
 * @apiSuccess {Number} data/time_before_play Estimated time remaining before the song is going to play (in seconds). `0` if the song is currently playing or if there is no song selected as currently playing in the playlist (thus making this estimate impossible)
 * @apiSuccess {String} data/title Song's title
 * @apiSuccess {String} data/videofile Video's filename
 * @apiSuccess {Number} data/viewcount Counts how many times the song has been played
 * @apiSuccess {String} data/year Song's creation year. Empty string is returned if no year is known.
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "data": [
 *       {
 *           "NORM_author": null,
 *           "NORM_creator": null,
 *           "NORM_pseudo_add": "Axel",
 *           "NORM_serie": "C3 ~ Cube X Cursed X Curious",
 *           "NORM_serie_altname": "C-Cube/CxCxC",
 *           "NORM_singer": null,
 *           "NORM_songwriter": null,
 *           "NORM_title": "Hana",
 *           "author": null,
 *           "created_at": 1508427958,
 *           "creator": null,
 *           "duration": 0,
 *           "flag_blacklisted": 0,
 *           "flag_playing": 0,
 *           "flag_whitelisted": 0,
 *           "gain": 0,
 *           "kara_id": 1007,
 *           "kid": "c05e24eb-206b-4ff5-88d4-74e8d5ad6f75",
 *           "language": "jpn",
 *           "language_i18n": "Japonais",
 *           "misc": null,
 *           "misc_i18n": null,
 *           "playlist_id": 2,
 *           "playlistcontent_id": 4961,
 *           "pos": 12,
 *           "pseudo_add": "Axel",
 *           "serie": "C3 ~ Cube X Cursed X Curious",
 *           "serie_altname": "C-Cube/CxCxC",
 *           "singer": null,
 *           "songorder": 1,
 *           "songtype": "TYPE_ED",
 *           "songtype_i18n": "Ending",
 *           "songtype_i18n_short": "ED",
 *           "songwriter": null,
 *           "time_before_play": 0,
 *           "title": "Hana",
 *           "videofile": "JAP - C3 ~ Cube X Cursed X Curious - ED1 - Hana.avi",
 *           "viewcount": 0,
 *           "year": ""
 *       }
 *   ]
 * }
 * @apiError PL_VIEW_CONTENT_ERROR Unable to fetch playlist's content information
 *
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * {
 *   "code": "PL_VIEW_CONTENT_ERROR",
 *   "message": "PLCID unknown!"
 * }
 */

/**
 * @api {get} /public/karas Get complete list of karaokes
 * @apiName GetKaras
 * @apiVersion 2.0.0
 * @apiGroup Karaokes
 * @apiPermission public
 *
 * @apiParam {String} [filter] Filter list by this string.
 * @apiParam {String} [lang] ISO639-2B code of client's language (to return translated text into the user's language) Defaults to engine's locale.
 * @apiParam {Number} [from=0] Return only the results starting from this position. Useful for continuous scrolling. 0 if unspecified
 * @apiParam {Number} [size=999999] Return only x number of results. Useful for continuous scrolling. 999999 if unspecified.
 *
 * @apiSuccess {Object[]} data/content/karas Array of `kara` objects
 * @apiSuccess {Number} data/infos/count Number of karaokes in playlist
 * @apiSuccess {Number} data/infos/from Starting position of listing
 * @apiSuccess {Number} data/infos/to End position of listing
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "data": {
 *       "content": [
 *           {
 *               "NORM_author": null,
 *               "NORM_creator": null,
 *               "NORM_pseudo_add": "Administrateur",
 *               "NORM_serie": "Dynasty Warriors 3",
 *               "NORM_serie_altname": "DW3/DW 3",
 *               "NORM_singer": null,
 *               "NORM_songwriter": null,
 *               "NORM_title": "Circuit",
 *               "author": null,
 *               "created_at": 1508423806,
 *               "creator": null,
 *               "duration": 0,
 *               "gain": 0,
 *               "kara_id": 176,
 *               "kid": "b0de301c-5756-49fb-b019-85a99a66586b",
 *               "language": "chi",
 *               "language_i18n": "Chinois",
 *               "misc": "TAG_VIDEOGAME",
 *               "misc_i18n": "Jeu vidéo",
 *               "serie": "Dynasty Warriors 3",
 *               "serie_altname": "DW3/DW 3",
 *               "singer": null,
 *               "songorder": 0,
 *               "songtype": "TYPE_ED",
 *               "songtype_i18n": "Ending",
 *               "songtype_i18n_short": "ED",
 *               "songwriter": null,
 *               "title": "Circuit",
 *               "videofile": "CHI - Dynasty Warriors 3 - GAME ED - Circuit.avi"
 *               "viewcount": 0,
 *               "year": ""
 *           },
 *           ...
 *       ],
 *       "infos": {
 *           "count": 3,
 * 			 "from": 0,
 * 			 "to": 120
 *       }
 *   }
 * }
 * @apiError SONG_LIST_ERROR Unable to fetch list of karaokes
 *
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 */

/**
 * @api {get} public/karas/:kara_id Get song info from database
 * @apiName GetKaraInfo
 * @apiVersion 2.0.0
 * @apiGroup Karaokes
 * @apiPermission public
 *
 * @apiParam {Number} kara_id Karaoke ID you want to fetch information from
 * @apiSuccess {String} data/NORM_author Normalized karaoke's author name
 * @apiSuccess {String} data/NORM_creator Normalized creator's name
 * @apiSuccess {String} data/NORM_pseudo_add Normalized name of person who added the karaoke to the playlist
 * @apiSuccess {String} data/NORM_serie Normalized name of series the karaoke is from
 * @apiSuccess {String} data/NORM_serie_altname Normalized names of alternative names to the series the karaoke is from. When there are more than one alternative name, they're separated by forward slashes (`/`)
 * @apiSuccess {String} data/NORM_singer Normalized name of singer.
 * @apiSuccess {String} data/NORM_songwriter Normalized name of songwriter.
 * @apiSuccess {String} data/NORM_title Normalized song title
 * @apiSuccess {String} data/author Karaoke author's name
 * @apiSuccess {Number} data/created_at UNIX timestamp of the karaoke's creation date in the base
 * @apiSuccess {String} data/creator Show's creator name
 * @apiSuccess {Number} data/duration Song duration in seconds
 * @apiSuccess {Number} data/gain Calculated audio gain for the karaoke's video, in decibels (can be negative)
 * @apiSuccess {String} data/kid Karaoke's unique ID (survives accross database generations)
 * @apiSuccess {String} data/language Song's language in ISO639-2B format, separated by commas when a song has several languages
 * @apiSuccess {String} data/language_i18n Song's language translated in the client's native language
 * @apiSuccess {String} data/misc Internal tag list (`TAG_VIDEOGAME`, etc.)
 * @apiSuccess {String} data/misc_i18n Translated tag list
 * @apiSuccess {String} data/serie Name of series/show the song belongs to
 * @apiSuccess {String} data/serie_altname Alternative name(s) of series/show this song belongs to. Names are separated by forward slashes (`/`)
 * @apiSuccess {String} data/singer Singer's name, if known.
 * @apiSuccess {Number} data/songorder Song's order, relative to it's type. Opening 1, Opening 2, Ending 1, Ending 2, etc.
 * @apiSuccess {String} data/songtype Song's type internal tag (`TYPE_OP`, `TYPE_ED`, `TYPE_IN` ...)
 * @apiSuccess {String} data/songtype_i18n Translated song's type (`Opening`, `Ending`, `Insert Song`...)
 * @apiSuccess {String} data/songtype_i18n_short Short translated version of the song's type (`OP`, `ED`, `IN`, ...)
 * @apiSuccess {Number} data/time_before_play Estimated time remaining before the song is going to play (in seconds). `0` if the song is currently playing or if there is no song selected as currently playing in the playlist (thus making this estimate impossible)
 * @apiSuccess {String} data/title Song's title
 * @apiSuccess {String} data/videofile Video's filename
 * @apiSuccess {Number} data/viewcount Counts how many times the song has been played
 * @apiSuccess {String} data/year Song's creation year. Empty string is returned if no year is known.
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "data": [
 *       {
 *           "NORM_author": null,
 *           "NORM_creator": null,
 *           "NORM_pseudo_add": "Axel",
 *           "NORM_serie": "C3 ~ Cube X Cursed X Curious",
 *           "NORM_serie_altname": "C-Cube/CxCxC",
 *           "NORM_singer": null,
 *           "NORM_songwriter": null,
 *           "NORM_title": "Hana",
 *           "author": null,
 *           "created_at": 1508427958,
 *           "creator": null,
 *           "duration": 0,
 *           "gain": 0,
 *           "kid": "c05e24eb-206b-4ff5-88d4-74e8d5ad6f75",
 *           "language": "jpn",
 *           "language_i18n": "Japonais",
 *           "misc": null,
 *           "misc_i18n": null,
 *           "serie": "C3 ~ Cube X Cursed X Curious",
 *           "serie_altname": "C-Cube/CxCxC",
 *           "singer": null,
 *           "songorder": 1,
 *           "songtype": "TYPE_ED",
 *           "songtype_i18n": "Ending",
 *           "songtype_i18n_short": "ED",
 *           "songwriter": null,
 *           "time_before_play": 0,
 *           "title": "Hana",
 *           "videofile": "JAP - C3 ~ Cube X Cursed X Curious - ED1 - Hana.avi",
 *           "viewcount": 0,
 *           "year": ""
 *       }
 *   ]
 * }
 * @apiError PL_VIEW_CONTENT_ERROR Unable to fetch playlist's content information
 *
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * {
 *   "code": "PL_VIEW_CONTENT_ERROR",
 *   "message": "PLCID unknown!"
 * }
 */

/**
 * @api {get} public/playlists/current/karas Get list of karaokes in the current playlist
 * @apiName GetPlaylistKarasCurrent
 * @apiVersion 2.0.0
 * @apiGroup Playlists
 * @apiPermission public
 *
 * @apiParam {Number} pl_id Target playlist ID.
 * @apiParam {String} [filter] Filter list by this string.
 * @apiParam {String} [lang] ISO639-2B code of client's language (to return translated text into the user's language) Defaults to engine's locale.
 * @apiParam {Number} [from=0] Return only the results starting from this position. Useful for continuous scrolling. 0 if unspecified
 * @apiParam {Number} [size=999999] Return only x number of results. Useful for continuous scrolling. 999999 if unspecified.
 *
 * @apiSuccess {Object[]} data/content/karas Array of `kara` objects
 * @apiSuccess {Number} data/infos/count Number of karaokes in playlist
 * @apiSuccess {Number} data/infos/from Starting position of listing
 * @apiSuccess {Number} data/infos/to End position of listing
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "data": {
 *       "content": [
 *           {
 *               "NORM_author": null,
 *               "NORM_creator": null,
 *               "NORM_pseudo_add": "Administrateur",
 *               "NORM_serie": "Dynasty Warriors 3",
 *               "NORM_serie_altname": "DW3/DW 3",
 *               "NORM_singer": null,
 *               "NORM_songwriter": null,
 *               "NORM_title": "Circuit",
 *               "author": null,
 *               "created_at": 1508423806,
 *               "creator": null,
 *               "duration": 0,
 *               "flag_blacklisted": 0,
 *               "flag_playing": 1,
 *               "flag_whitelisted": 0,
 *               "gain": 0,
 *               "kara_id": 176,
 *               "kid": "b0de301c-5756-49fb-b019-85a99a66586b",
 *               "language": "chi",
 *               "language_i18n": "Chinois",
 *               "misc": "TAG_VIDEOGAME",
 *               "misc_i18n": "Jeu vidéo",
 *               "playlistcontent_id": 4946,
 *               "pos": 1,
 *               "pseudo_add": "Administrateur",
 *               "serie": "Dynasty Warriors 3",
 *               "serie_altname": "DW3/DW 3",
 *               "singer": null,
 *               "songorder": 0,
 *               "songtype": "TYPE_ED",
 *               "songtype_i18n": "Ending",
 *               "songtype_i18n_short": "ED",
 *               "songwriter": null,
 *               "title": "Circuit",
 *               "videofile": "CHI - Dynasty Warriors 3 - GAME ED - Circuit.avi"
 *               "viewcount": 0,
 *               "year": ""
 *           },
 *           ...
 *       ],
 *       "infos": {
 *           "count": 3,
 * 			 "from": 0,
 * 			 "to": 120
 *       }
 *   }
 * }
 * @apiError PL_VIEW_SONGS_CURRENT_ERROR Unable to fetch list of karaokes of current playlist
 *
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 */

/**
 * @api {get} public/playlists/public/karas Get list of karaokes in the public playlist
 * @apiName GetPlaylistKarasPublic
 * @apiVersion 2.0.0
 * @apiGroup Playlists
 * @apiPermission public
 *
 * @apiParam {Number} pl_id Target playlist ID.
 * @apiParam {String} [filter] Filter list by this string.
 * @apiParam {String} [lang] ISO639-2B code of client's language (to return translated text into the user's language) Defaults to engine's locale.
 * @apiParam {Number} [from=0] Return only the results starting from this position. Useful for continuous scrolling. 0 if unspecified
 * @apiParam {Number} [size=999999] Return only x number of results. Useful for continuous scrolling. 999999 if unspecified.
 *
 * @apiSuccess {Object[]} data/content/karas Array of `kara` objects
 * @apiSuccess {Number} data/infos/count Number of karaokes in playlist
 * @apiSuccess {Number} data/infos/from Starting position of listing
 * @apiSuccess {Number} data/infos/to End position of listing
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "data": {
 *       "content": [
 *           {
 *               "NORM_author": null,
 *               "NORM_creator": null,
 *               "NORM_pseudo_add": "Administrateur",
 *               "NORM_serie": "Dynasty Warriors 3",
 *               "NORM_serie_altname": "DW3/DW 3",
 *               "NORM_singer": null,
 *               "NORM_songwriter": null,
 *               "NORM_title": "Circuit",
 *               "author": null,
 *               "created_at": 1508423806,
 *               "creator": null,
 *               "duration": 0,
 *               "flag_blacklisted": 0,
 *               "flag_playing": 1,
 *               "flag_whitelisted": 0,
 *               "gain": 0,
 *               "kara_id": 176,
 *               "kid": "b0de301c-5756-49fb-b019-85a99a66586b",
 *               "language": "chi",
 *               "language_i18n": "Chinois",
 *               "misc": "TAG_VIDEOGAME",
 *               "misc_i18n": "Jeu vidéo",
 *               "playlistcontent_id": 4946,
 *               "pos": 1,
 *               "pseudo_add": "Administrateur",
 *               "serie": "Dynasty Warriors 3",
 *               "serie_altname": "DW3/DW 3",
 *               "singer": null,
 *               "songorder": 0,
 *               "songtype": "TYPE_ED",
 *               "songtype_i18n": "Ending",
 *               "songtype_i18n_short": "ED",
 *               "songwriter": null,
 *               "title": "Circuit",
 *               "videofile": "CHI - Dynasty Warriors 3 - GAME ED - Circuit.avi"
 *               "viewcount": 0,
 *               "year": ""
 *           },
 *           ...
 *       ],
 *       "infos": {
 *           "count": 3,
 * 			 "from": 0,
 * 			 "to": 120
 *       }
 *   }
 * }
 * @apiError PL_VIEW_SONGS_PUBLIC_ERROR Unable to fetch list of karaokes of public playlist
 *
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 */
/**
 * @api {get} public/playlists/:pl_id Get playlist information (public)
 * @apiName GetPlaylistPublic
 * @apiGroup Playlists
 * @apiPermission public
 * @apiVersion 2.0.0
 * @apiDescription Contrary to the `/admin/playlists/` path, this one will not return playlists which have the `flag_visible` set to `0`.
 * @apiParam {Number} pl_id Target playlist ID.
 * @apiSuccess {Number} data/created_at Playlist creation date in UNIX timestamp
 * @apiSuccess {Number} data/flag_current Is playlist the current one? Mutually exclusive with `flag_public`
 * @apiSuccess {Number} data/flag_public Is playlist the public one? Mutually exclusive with `flag_current`
 * @apiSuccess {Number} data/flag_visible Is playlist visible to normal users?
 * @apiSuccess {Number} data/length Duration of playlist in seconds
 * @apiSuccess {Number} data/modified_at Playlist last edit date in UNIX timestamp
 * @apiSuccess {String} data/name Name of playlist
 * @apiSuccess {Number} data/num_karas Number of karaoke songs in the playlist
 * @apiSuccess {Number} data/playlist_id Database's playlist ID
 * @apiSuccess {Number} data/time_left Time left in seconds before playlist ends, relative to the currently playing song's position.
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "data": {
 *       "created_at": 1508313440,
 *       "flag_current": 1,
 *       "flag_public": 0,
 *       "flag_visible": 1,
 *       "length": 0,
 *       "modified_at": 1508408078,
 *       "name": "Liste de lecture courante",
 *       "num_karas": 6,
 *       "playlist_id": 1,
 *       "time_left": 0
 *   }
 *}
 * @apiError PL_VIEW_ERROR Unable to fetch info from a playlist
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 */
/**
 * @api {get} public/playlists/ Get list of playlists (public)
 * @apiName GetPlaylistsPublic
 * @apiGroup Playlists
 * @apiVersion 2.0.0
 * @apiPermission public
 * @apiDescription Contrary to the `/admin/playlists/` path, this one will not return playlists which have the `flag_visible` set to `0`.
 * @apiSuccess {Object[]} playlists Playlists information
 *
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 * {
 *   "data": [
 *       {
 *           "created_at": 1508313440,
 *           "flag_current": 1,
 *           "flag_public": 0,
 *           "flag_visible": 1,
 *           "length": 0,
 *           "modified_at": 1508408078,
 *           "name": "Liste de lecture courante",
 *           "num_karas": 6,
 *           "playlist_id": 1,
 *           "time_left": 0
 *       }
 *   ]
 * }
 * @apiError PL_LIST_ERROR Unable to fetch a list of playlists
 *
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 */

/**
 * @api {get} public/whitelist Get whitelist (public)
 * @apiName GetWhitelistPublic
 * @apiVersion 2.0.0
 * @apiGroup Whitelist
 * @apiPermission public
 * @apiDescription If `EngineAllowViewWhitelist` is set to `0` in configuration, then returns an error message (see below)
 * @apiParam {String} [filter] Filter list by this string.
 * @apiParam {String} [lang] ISO639-2B code of client's language (to return translated text into the user's language) Defaults to engine's locale
 * @apiParam {Number} [from=0] Return only the results starting from this position. Useful for continuous scrolling. 0 if unspecified
 * @apiParam {Number} [size=999999] Return only x number of results. Useful for continuous scrolling. 999999 if unspecified.* @apiSuccess {String} code Message to display
 * @apiSuccess {Object[]} data/content List of karaoke objects
 * @apiSuccess {Number} data/infos/count Number of items in whitelist no matter which range was requested
 * @apiSuccess {Number} data/infos/from Items listed are from this position
 * @apiSuccess {Number} data/infos/to Items listed end at this position
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "data": {
 *       "content": [
 *           {
 *               "NORM_author": null,
 *               "NORM_creator": "Eurovision",
 *               "NORM_serie": null,
 *               "NORM_serie_altname": null,
 *               "NORM_singer": "Dschinghis Khan",
 *               "NORM_songwriter": "Ralph Siegel",
 *               "NORM_title": "Moskau",
 *               "author": null,
 *               "created_at": 1508921852,
 *               "creator": "Eurovision",
 *               "duration": 0,
 *               "kara_id": 1,
 *               "kid": "d9bb6a76-2b7d-469e-ba44-6acfc463202e",
 *               "language": "ger",
 *               "language_i18n": "Allemand",
 *               "misc": "TAG_CONCERT,TAG_REAL",
 *               "misc_i18n": "Concert,Non-anime",
 *               "serie": null,
 *               "serie_altname": null,
 *               "singer": "Dschinghis Khan",
 *               "songorder": 0,
 *               "songtype": "TYPE_MUSIC",
 *               "songtype_i18n": "Music Video",
 *               "songtype_i18n_short": "MV",
 *               "songwriter": "Ralph Siegel",
 *               "title": "Moskau",
 *               "videofile": "ALL - Dschinghis Khan - MV - Moskau.avi",
 *               "viewcount": 0,
 *               "whitelist_id": 1,
 *               "year": "1980"
 *           }
 *       ],
 *       "infos": {
 *           "count": 1,
 *           "from": 0,
 *           "to": 999999
 *       }
 *   }
 * }
 * @apiError WL_VIEW_ERROR Whitelist could not be viewed
 * @apiError WL_VIEW_FORBIDDEN Whitelist view is not allowed for users
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * {
 *   "code": "WL_VIEW_FORBIDDEN"
 * }

 */

/**
 * @api {get} public/blacklist Get blacklist (public)
 * @apiName GetBlacklistPublic
 * @apiVersion 2.0.0
 * @apiGroup Blacklist
 * @apiPermission public
 * @apiDescription If `EngineAllowViewBlacklist` is set to `0` in configuration, then returns an error message (see below)
 * @apiParam {String} [filter] Filter list by this string.
 * @apiParam {String} [lang] ISO639-2B code of client's language (to return translated text into the user's language) Defaults to engine's locale
 * @apiParam {Number} [from=0] Return only the results starting from this position. Useful for continuous scrolling. 0 if unspecified
 * @apiParam {Number} [size=999999] Return only x number of results. Useful for continuous scrolling. 999999 if unspecified.* @apiSuccess {String} code Message to display
 * @apiSuccess {Object[]} data/content List of karaoke objects
 * @apiSuccess {Number} data/infos/count Number of items in whitelist no matter which range was requested
 * @apiSuccess {Number} data/infos/from Items listed are from this position
 * @apiSuccess {Number} data/infos/size How many items listed.
/**
 * @api {get} public/playlists/:pl_id Get playlist information (public)
 * @apiName GetPlaylistPublic
 * @apiGroup Playlists
 * @apiPermission public
 * @apiVersion 2.0.0
 * @apiDescription Contrary to the `/admin/playlists/` path, this one will not return playlists which have the `flag_visible` set to `0`.
 * @apiParam {Number} pl_id Target playlist ID.
 * @apiSuccess {Number} data/created_at Playlist creation date in UNIX timestamp
 * @apiSuccess {Number} data/flag_current Is playlist the current one? Mutually exclusive with `flag_public`
 * @apiSuccess {Number} data/flag_public Is playlist the public one? Mutually exclusive with `flag_current`
 * @apiSuccess {Number} data/flag_visible Is playlist visible to normal users?
 * @apiSuccess {Number} data/length Duration of playlist in seconds
 * @apiSuccess {Number} data/modified_at Playlist last edit date in UNIX timestamp
 * @apiSuccess {String} data/name Name of playlist
 * @apiSuccess {Number} data/num_karas Number of karaoke songs in the playlist
 * @apiSuccess {Number} data/playlist_id Database's playlist ID
 * @apiSuccess {Number} data/time_left Time left in seconds before playlist ends, relative to the currently playing song's position.
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "data": {
 *       "created_at": 1508313440,
 *       "flag_current": 1,
 *       "flag_public": 0,
 *       "flag_visible": 1,
 *       "length": 0,
 *       "modified_at": 1508408078,
 *       "name": "Liste de lecture courante",
 *       "num_karas": 6,
 *       "playlist_id": 1,
 *       "time_left": 0
 *   }
 *}
 * @apiError PL_VIEW_ERROR Unable to fetch info from a playlist
 *
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 */

/**
 * @api {get} /admin/playlists/:pl_id/karas Get list of karaokes in a playlist
 * @apiName GetPlaylistKaras
 * @apiVersion 2.1.0
 * @apiGroup Playlists
 * @apiPermission admin
 *
 * @apiParam {Number} pl_id Target playlist ID.
 * @apiParam {String} [filter] Filter list by this string.
 * @apiParam {String} [lang] ISO639-2B code of client's language (to return translated text into the user's language) Defaults to engine's locale.
 * @apiParam {Number} [from=0] Return only the results starting from this position. Useful for continuous scrolling. 0 if unspecified
 * @apiParam {Number} [size=999999] Return only x number of results. Useful for continuous scrolling. 999999 if unspecified.
 *
 * @apiSuccess {Object[]} data/content/karas Array of `kara` objects
 * @apiSuccess {Number} data/infos/count Number of karaokes in playlist
 * @apiSuccess {Number} data/infos/from Starting position of listing
 * @apiSuccess {Number} data/infos/to End position of listing
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "data": {
 *       "content": [
 *           {
 *               "NORM_author": null,
 *               "NORM_creator": "Eurovision",
 *               "NORM_serie": null,
 *               "NORM_serie_altname": null,
 *               "NORM_singer": "Dschinghis Khan",
 *               "NORM_songwriter": "Ralph Siegel",
 *               "NORM_title": "Moskau",
 *               "author": null,
 *               "created_at": 1508921852,
 *               "creator": "Eurovision",
 *               "duration": 0,
 *               "kara_id": 1,
 *               "kid": "d9bb6a76-2b7d-469e-ba44-6acfc463202e",
 *               "language": "ger",
 *               "language_i18n": "Allemand",
 *               "misc": "TAG_CONCERT,TAG_REAL",
 *               "misc_i18n": "Concert,Non-anime",
 *               "serie": null,
 *               "serie_altname": null,
 *               "singer": "Dschinghis Khan",
 *               "songorder": 0,
 *               "songtype": "TYPE_MUSIC",
 *               "songtype_i18n": "Music Video",
 *               "songtype_i18n_short": "MV",
 *               "songwriter": "Ralph Siegel",
 *               "title": "Moskau",
 *               "videofile": "ALL - Dschinghis Khan - MV - Moskau.avi",
 *               "viewcount": 0,
 *               "whitelist_id": 1,
 *               "year": "1980"
 *           }
 *       ],
 *       "infos": {
 *           "count": 1,
 *           "from": 0,
 *           "to": 999999
 *       }
 *   }
 * }
 * @apiError BL_VIEW_ERROR Blacklist could not be viewed
 * @apiError BL_VIEW_FORBIDDEN Blacklist view is not allowed for users

 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * {
 *   "code": "BL_VIEW_FORBIDDEN"
 * }
 */
/**
 * @api {get} public/blacklist/criterias Get list of blacklist criterias (public)
 * @apiName GetBlacklistCriteriasPublic
 * @apiVersion 2.0.0
 * @apiGroup Blacklist
 * @apiPermission public
 *
 * @apiSuccess {Number} data/blcriteria_id Blacklist criteria's ID.
 * @apiSuccess {Number} data/type Blacklist criteria's type. Refer to dev documentation for more info on BLC types.
 * @apiSuccess {Number} data/value Value associated to balcklist criteria (what is being blacklisted)
 * @apiSuccess {String} data/value_i18n Translated value to display on screen.
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "data": [
 *       {
 *           "blcriteria_id": 2,
 *           "type": 6,
 *           "value": "241",
 *           "value_i18n": "Jean-Jacques Debout"
 *       }
 *   ]
 * }

* @apiError BLC_VIEW_ERROR Blacklist criterias could not be listed
* @apiError BLC_VIEW_FORBIDDEN Blacklist criterias are not viewable by users.
*
* @apiErrorExample Error-Response:
* HTTP/1.1 500 Internal Server Error
* {
*   "code": "BLC_VIEW_FORBIDDEN"
* }
*/
/**
 * @api {get} public/player Get player status
 * @apiName GetPlayer
 * @apiVersion 2.0.0
 * @apiGroup Player
 * @apiPermission public
 * @apiDescription Player info is updated very frequently. You can poll it to get precise information from player and engine altogether.
 * @apiSuccess {Number} data/currentlyPlaying Karaoke ID of song being played
 * @apiSuccess {Number} data/duration Current's song duration in seconds
 * @apiSuccess {Boolean} data/fullscreen Player's fullscreen status
 * @apiSuccess {Boolean} data/muteStatus Player's volume mute status
 * @apiSuccess {Boolean} data/onTop Player's Always-on-top status
 * @apiSuccess {String=pause,stop,play} data/playerStatus Player's status (not to mistake with engine's status, see below). Player status is `pause` if displaying a background.
 * @apiSuccess {Boolean} data/private Engine's public/private status
 * @apiSuccess {Boolean} data/showSubs Player's showing subtitles or not
 * @apiSuccess {String=pause,play,stop} data/status Engine's status
 * @apiSuccess {Boolean} data/onTop Player's Always-on-top status
 * @apiSuccess {String} data/subText Text/lyrics being displayed on screen
 * @apiSuccess {Number} data/timePosition Player's current position in the song.
 * @apiSuccess {Number} data/volume Volume (from `0` to `100`)
 * Example Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "data": {
 *       "currentlyPlaying": 1020,
 *       "duration": 0,
 *       "fullscreen": false,
 *       "muteStatus": false,
 *       "onTop": true,
 *       "playerStatus": "pause",
 *       "private": true,
 *       "showSubs": true,
 *       "status": "stop",
 *       "subText": null,
 *       "timePosition": 0,
 *       "volume": 100
 *   }
 * }
 * @apiError PLAYER_STATUS_ERROR Error fetching player status (is the player running?)
 *
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * {
 *   "code": "PLAYER_STATUS_ERROR"
 * }


/**
 * @api {get} /public/karas Get complete list of karaokes
 * @apiName GetKaras
 * @apiVersion 2.0.0
 * @apiGroup Karaokes
 * @apiPermission public
 *
 * @apiParam {String} [filter] Filter list by this string.
 * @apiParam {String} [lang] ISO639-2B code of client's language (to return translated text into the user's language) Defaults to engine's locale.
 * @apiParam {Number} [from=0] Return only the results starting from this position. Useful for continuous scrolling. 0 if unspecified
 * @apiParam {Number} [size=999999] Return only x number of results. Useful for continuous scrolling. 999999 if unspecified.
 *
 * @apiSuccess {Object[]} data/content/karas Array of `kara` objects
 * @apiSuccess {Number} data/infos/count Number of karaokes in playlist
 * @apiSuccess {Number} data/infos/from Starting position of listing
 * @apiSuccess {Number} data/infos/to End position of listing
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "data": {
 *       "content": [
 *           {
 *               "NORM_author": null,
 *               "NORM_creator": null,
 *               "NORM_pseudo_add": "Administrateur",
 *               "NORM_serie": "Dynasty Warriors 3",
 *               "NORM_serie_altname": "DW3/DW 3",
 *               "NORM_singer": null,
 *               "NORM_songwriter": null,
 *               "NORM_title": "Circuit",
 *               "author": null,
 *               "created_at": 1508423806,
 *               "creator": null,
 *               "duration": 0,
 *               "flag_blacklisted": 0,
 *               "flag_playing": 1,
 *               "flag_whitelisted": 0,
 *               "gain": 0,
 *               "kara_id": 176,
 *               "kid": "b0de301c-5756-49fb-b019-85a99a66586b",
 *               "language": "chi",
 *               "language_i18n": "Chinois",
 *               "misc": "TAG_VIDEOGAME",
 *               "misc_i18n": "Jeu vidéo",
 *               "playlistcontent_id": 4946,
 *               "pos": 1,
 *               "pseudo_add": "Administrateur",
 *               "serie": "Dynasty Warriors 3",
 *               "serie_altname": "DW3/DW 3",
 *               "singer": null,
 *               "songorder": 0,
 *               "songtype": "TYPE_ED",
 *               "songtype_i18n": "Ending",
 *               "songtype_i18n_short": "ED",
 *               "songwriter": null,
 *               "title": "Circuit",
 *               "videofile": "CHI - Dynasty Warriors 3 - GAME ED - Circuit.avi"
 *               "viewcount": 0,
 *               "year": ""
 *           },
 *           ...
 *       ],
 *       "infos": {
 *           "count": 3,
 * 			 "from": 0,
 * 			 "to": 120
 *       }
 *   }
 * }
 * @apiError SONG_LIST_ERROR Unable to fetch list of karaokes
 *
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 */
/**
 * @api {get} /public/karas/random Get a random karaoke ID
 * @apiName GetKarasRandom
 * @apiVersion 2.0.0
 * @apiGroup Karaokes
 * @apiPermission public
 * @apiDescription This selects a random karaoke from the database. What you will do with it depends entirely on you.
 * @apiSuccess {Number} data Random Karaoke ID
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "data": 4550
 * }
 * @apiError GET_UNLUCKY Unable to find a random karaoke
 *
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 */
/**
 * @api {post} public/karas/:kara_id/lyrics Get song lyrics
 * @apiName GetKarasLyrics
 * @apiVersion 2.0.0
 * @apiGroup Karaokes
 * @apiPermission public
 * @apiParam {Number} kara_id Karaoke ID to get lyrics from
 * @apiSuccess {String[]} data Array of strings making the song's lyrics
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "data": "Lyrics for this song are not available"
 * }

* @apiError LYRICS_VIEW_ERROR Unable to fetch lyrics data
*
* @apiErrorExample Error-Response:
* HTTP/1.1 500 Internal Server Error
* {
*   "code": "PLAYLIST_MODE_ADD_SONG_ERROR_QUOTA_REACHED"
* }
*/

/**
 * @api {get} public/playlists/current Get current playlist information
 * @apiName GetPlaylistCurrent
 * @apiGroup Playlists
 * @apiPermission public
 * @apiVersion 2.0.0
 * @apiDescription This route allows to check basic information about the current playlist, no matter which ID it has (and without you having to know it)
 * @apiSuccess {Number} data/created_at Playlist creation date in UNIX timestamp
 * @apiSuccess {Number} data/flag_current Is playlist the current one? Mutually exclusive with `flag_public`
 * @apiSuccess {Number} data/flag_public Is playlist the public one? Mutually exclusive with `flag_current`
 * @apiSuccess {Number} data/flag_visible Is playlist visible to normal users?
 * @apiSuccess {Number} data/length Duration of playlist in seconds
 * @apiSuccess {Number} data/modified_at Playlist last edit date in UNIX timestamp
 * @apiSuccess {String} data/name Name of playlist
 * @apiSuccess {Number} data/num_karas Number of karaoke songs in the playlist
 * @apiSuccess {Number} data/playlist_id Database's playlist ID
 * @apiSuccess {Number} data/time_left Time left in seconds before playlist ends, relative to the currently playing song's position.
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "data": {
 *       "created_at": 1508313440,
 *       "flag_current": 1,
 *       "flag_public": 0,
 *       "flag_visible": 1,
 *       "length": 0,
 *       "modified_at": 1508408078,
 *       "name": "Liste de lecture courante",
 *       "num_karas": 6,
 *       "playlist_id": 1,
 *       "time_left": 0
 *   }
 *}
 * @apiError PL_VIEW_CURRENT_ERROR Unable to fetch info from current playlist
 *
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 */

/**
 * @api {get} public/playlists/public Get public playlist information
 * @apiName GetPlaylistPublic
 * @apiGroup Playlists
 * @apiPermission public
 * @apiVersion 2.0.0
 * @apiDescription This route allows to check basic information about the public playlist, no matter which ID it has (and without you having to know it)
 * @apiSuccess {Number} data/created_at Playlist creation date in UNIX timestamp
 * @apiSuccess {Number} data/flag_current Is playlist the current one? Mutually exclusive with `flag_public`
 * @apiSuccess {Number} data/flag_public Is playlist the public one? Mutually exclusive with `flag_current`
 * @apiSuccess {Number} data/flag_visible Is playlist visible to normal users?
 * @apiSuccess {Number} data/length Duration of playlist in seconds
 * @apiSuccess {Number} data/modified_at Playlist last edit date in UNIX timestamp
 * @apiSuccess {String} data/name Name of playlist
 * @apiSuccess {Number} data/num_karas Number of karaoke songs in the playlist
 * @apiSuccess {Number} data/playlist_id Database's playlist ID
 * @apiSuccess {Number} data/time_left Time left in seconds before playlist ends, relative to the currently playing song's position.
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "data": {
 *       "created_at": 1508313440,
 *       "flag_current": 1,
 *       "flag_public": 0,
 *       "flag_visible": 1,
 *       "length": 0,
 *       "modified_at": 1508408078,
 *       "name": "Liste de lecture courante",
 *       "num_karas": 6,
 *       "playlist_id": 1,
 *       "time_left": 0
 *   }
 *}
 * @apiError PL_VIEW_PUBLIC_ERROR Unable to fetch info from public playlist


/**
 * @api {get} /public/player Get player status
 * @apiName GetPlayer
 * @apiVersion 2.0.0
 * @apiGroup Player
 * @apiPermission public
 * @apiDescription Player info is updated very frequently. You can poll it to get precise information from player and engine altogether.
 * @apiSuccess {Number} data/currentlyPlaying Karaoke ID of song being played
 * @apiSuccess {Number} data/duration Current's song duration in seconds
 * @apiSuccess {Boolean} data/fullscreen Player's fullscreen status
 * @apiSuccess {Boolean} data/muteStatus Player's volume mute status
 * @apiSuccess {Boolean} data/onTop Player's Always-on-top status
 * @apiSuccess {String=pause,stop,play} data/playerStatus Player's status (not to mistake with engine's status, see below). Player status is `pause` if displaying a background.
 * @apiSuccess {Boolean} data/private Engine's public/private status
 * @apiSuccess {Boolean} data/showSubs Player's showing subtitles or not
 * @apiSuccess {String=pause,play,stop} data/status Engine's status
 * @apiSuccess {Boolean} data/onTop Player's Always-on-top status
 * @apiSuccess {String} data/subText Text/lyrics being displayed on screen
 * @apiSuccess {Number} data/timePosition Player's current position in the song.
 * @apiSuccess {Number} data/volume Volume (from `0` to `100`)
 * Example Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "data": {
 *       "currentlyPlaying": 1020,
 *       "duration": 0,
 *       "fullscreen": false,
 *       "muteStatus": false,
 *       "onTop": true,
 *       "playerStatus": "pause",
 *       "private": true,
 *       "showSubs": true,
 *       "status": "stop",
 *       "subText": null,
 *       "timePosition": 0,
 *       "volume": 100
 *   }
 * }
 * @apiError PLAYER_STATUS_ERROR Error fetching player status (is the player running?)
 *
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * {
 *   "code": "PLAYER_STATUS_ERROR"
 * }
 */
/**
 * @api {get} admin/playlists/ Get list of playlists
 * @apiName GetPlaylists
 * @apiGroup Playlists
 * @apiVersion 2.0.0
 * @apiPermission admin
 *
 * @apiSuccess {Object[]} playlists Playlists information
 *
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 * {
 *   "data": [
 *       {
 *           "created_at": 1508313440,
 *           "flag_current": 1,
 *           "flag_public": 0,
 *           "flag_visible": 1,
 *           "length": 0,
 *           "modified_at": 1508408078,
 *           "name": "Liste de lecture courante",
 *           "num_karas": 6,
 *           "playlist_id": 1,
 *           "time_left": 0
 *       }
 *   ]
 * }
 * @apiError PL_LIST_ERROR Unable to fetch a list of playlists
 *
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 */
/**
	* @api {get} public/tags Get tag list
	* @apiName GetTags
	* @apiVersion 2.0.0
	* @apiGroup Karaokes
	* @apiPermission public
	*
	* @apiSuccess {String} data/name Name of tag
	* @apiSuccess {String} data/name_i18n Translated name of tag
	* @apiSuccess {Number} data/tag_id Tag ID number
	* @apiSuccess {Number} data/type Tag type number
	*
	* @apiSuccessExample Success-Response:
	* HTTP/1.1 200 OK
	* {
	*     "data": [
	*        {
	*          "name": "20th Century",
	*          "name_i18n": "20th Century",
	*          "tag_id": 371,
	*          "type": 2
	*        },
	*        {
	*		   "name": "TYPE_AMV",
	*          "name_i18n": "Anime Music Video",
	*          "tag_id": 15,
	*          "type": 3
	*        },
	*        {
	*          "name": "ita",
	*          "name_i18n": "Italien",
	*          "tag_id": 370,
	*          "type": 5
	*        }
	*		 ...
	*   ]
	* }
	* @apiError TAGS_LIST_ERROR Unable to get list of tags
	*
	* @apiErrorExample Error-Response:
	* HTTP/1.1 500 Internal Server Error
	*/

/**
 * @api {get} /admin/settings Get settings
 * @apiName GetSettings
 * @apiVersion 2.1.0
 * @apiGroup Main
 * @apiPermission admin
 *
 * @apiSuccess {Object} data Contains all configuration settings. See example or documentation for what each setting does.
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "data": {
 *       "AdminPassword": "xxxx",
 *       "BinPlayerLinux": "/usr/bin/mpv",
 *       "BinPlayerOSX": "app/bin/mpv.app/Contents/MacOS/mpv",
 *       "BinPlayerWindows": "app/bin/mpv.exe",
 *       "BinffmpegLinux": "/usr/bin/ffmpeg",
 *       "BinffmpegOSX": "app/bin/ffmpeg",
 *       "BinffmpegPath": "D:\\perso\\toyundamugen-app\\app\\bin\\ffmpeg.exe",
 *       "BinffmpegWindows": "app/bin/ffmpeg.exe",
 *       "BinffprobeLinux": "/usr/bin/ffprobe",
 *       "BinffprobeOSX": "app/bin/ffprobe",
 *       "BinffprobePath": "D:\\perso\\toyundamugen-app\\app\\bin\\ffprobe.exe
 *       "BinffprobeWindows": "app/bin/ffprobe.exe",
 *       "BinmpvPath": "D:\\perso\\toyundamugen-app\\app\\bin\\mpv.exe",
 *       "EngineAllowViewBlacklist": "1",
 *       "EngineAllowViewBlacklistCriterias": "1",
 *       "EngineAllowViewWhitelist": "1",
 *       "EngineAutoPlay": "0",
 *       "EngineDefaultLocale": "fr",
 *       "EngineDisplayConnectionInfo": "1",
 *       "EngineDisplayConnectionInfoHost": "",
 *       "EngineDisplayConnectionInfoMessage": "",
 *       "EngineDisplayConnectionInfoQRCode": "1",
 *       "EngineDisplayNickname": "1",
 * 		 "EngineFreeUpvotes": "1",
 *       "EngineFreeUpvotesRequiredPercentage": "33",
 *       "EngineFreeUpvotesRequiredMin": "4",
 *       "EngineJinglesInterval": "1",
 *       "EnginePrivateMode": "1",
 *       "EngineRepeatPlaylist": "0",
 *       "EngineSmartInsert": "1",
 *       "EngineSongsPerUser": "10000",
 *       "EngineCreatePreviews": "1",
 *       "PathAltname": "../times/series_altnames.csv",
 *       "PathBackgrounds": "app/backgrounds",
 *       "PathBin": "app/bin",
 *       "PathDB": "app/db",
 *       "PathDBKarasFile": "engine.sqlite3",
 *       "PathDBUserFile": "userdata.sqlite3",
 *       "PathJingles": "app/jingles",
 *       "PathKaras": "../times/karas",
 *       "PathSubs": "../times/lyrics",
 *       "PathTemp": "app/temp",
 *       "PathVideos": "app/data/videos",
 *       "PathVideosHTTP": "",
 *       "PlayerBackground": "",
 *       "PlayerFullscreen": "0",
 *       "PlayerNoBar": "1",
 *       "PlayerNoHud": "1",
 *       "PlayerPIP": "1",
 *       "PlayerPIPPositionX": "Left",
 *       "PlayerPIPPositionY": "Bottom",
 *       "PlayerPIPSize": "30",
 *       "PlayerScreen": "0",
 *       "PlayerStayOnTop": "1",
 *       "VersionName": "Finé Fiévreuse",
 *       "VersionNo": "v2.0 Release Candidate 1",
 *       "appPath": "F:\\karaokemugen-app\\",
 *       "isTest": false,
 *       "mpvVideoOutput": "direct3d",
 *       "os": "win32",
 *       "osHost": "10.202.40.43",
 * 		 "WebappMode": "2"
 *   }
 * }
 */

/**
 * @api {get} /admin/whitelist Get whitelist
 * @apiName GetWhitelist
 * @apiVersion 2.0.0
 * @apiGroup Whitelist
 * @apiPermission admin
 *
 * @apiParam {String} [filter] Filter list by this string.
 * @apiParam {String} [lang] ISO639-2B code of client's language (to return translated text into the user's language) Defaults to engine's locale
 * @apiParam {Number} [from=0] Return only the results starting from this position. Useful for continuous scrolling. 0 if unspecified
 * @apiParam {Number} [size=999999] Return only x number of results. Useful for continuous scrolling. 999999 if unspecified.* @apiSuccess {String} code Message to display
 * @apiSuccess {Object[]} data/content List of karaoke objects
 * @apiSuccess {Number} data/infos/count Number of items in whitelist no matter which range was requested
 * @apiSuccess {Number} data/infos/from Items listed are from this position
 * @apiSuccess {Number} data/infos/size How many items listed.
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "data": {
 *       "content": [
 *           {
 *               "NORM_author": null,
 *               "NORM_creator": "Eurovision",
 *               "NORM_serie": null,
 *               "NORM_serie_altname": null,
 *               "NORM_singer": "Dschinghis Khan",
 *               "NORM_songwriter": "Ralph Siegel",
 *               "NORM_title": "Moskau",
 *               "author": null,
 *               "created_at": 1508921852,
 *               "creator": "Eurovision",
 *               "duration": 0,
 *               "kara_id": 1,
 *               "kid": "d9bb6a76-2b7d-469e-ba44-6acfc463202e",
 *               "language": "ger",
 *               "language_i18n": "Allemand",
 *               "misc": "TAG_CONCERT,TAG_REAL",
 *               "misc_i18n": "Concert,Non-anime",
 *               "serie": null,
 *               "serie_altname": null,
 *               "singer": "Dschinghis Khan",
 *               "songorder": 0,
 *               "songtype": "TYPE_MUSIC",
 *               "songtype_i18n": "Music Video",
 *               "songtype_i18n_short": "MV",
 *               "songwriter": "Ralph Siegel",
 *               "title": "Moskau",
 *               "videofile": "ALL - Dschinghis Khan - MV - Moskau.avi",
 *               "viewcount": 0,
 *               "whitelist_id": 1,
 *               "year": "1980"
 *           }
 *       ],
 *       "infos": {
 *           "count": 1,
 *           "from": 0,
 *           "to": 999999
 *       }
 *   }
 * }
 * @apiError WL_VIEW_ERROR Whitelist could not be viewed
 *
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * {
 *   "code": "WL_VIEW_ERROR"
 * }
 */

/**
 * @api {get} /admin/blacklist Get blacklist
 * @apiName GetBlacklist
 * @apiVersion 2.0.0
 * @apiGroup Blacklist
 * @apiPermission admin
 *
 * @apiParam {String} [filter] Filter list by this string.
 * @apiParam {String} [lang] ISO639-2B code of client's language (to return translated text into the user's language) Defaults to engine's locale
 * @apiParam {Number} [from=0] Return only the results starting from this position. Useful for continuous scrolling. 0 if unspecified
 * @apiParam {Number} [size=999999] Return only x number of results. Useful for continuous scrolling. 999999 if unspecified.* @apiSuccess {String} code Message to display
 * @apiSuccess {Object[]} data/content List of karaoke objects
 * @apiSuccess {Number} data/infos/count Number of items in whitelist no matter which range was requested
 * @apiSuccess {Number} data/infos/from Items listed are from this position
 * @apiSuccess {Number} data/infos/size How many items listed.
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "data": {
 *       "content": [
 *           {
 *               "NORM_author": "Jean-Jacques Debout",
 *               "NORM_creator": null,
 *               "NORM_serie": "Capitaine Flam",
 *               "NORM_serie_altname": "Kyaputen Fyucha",
 *               "NORM_singer": "Richard Simon",
 *               "NORM_songwriter": "Roger Dumas",
 *               "NORM_title": "",
 *               "author": "Jean-Jacques Debout",
 *               "created_at": 1508924354,
 *               "creator": null,
 *               "duration": 0,
 *               "kara_id": 217,
 *               "kid": "1b8bca21-4d26-41bd-90b7-2afba74381ee",
 *               "language": "fre",
 *               "language_i18n": "Français",
 *               "misc": null,
 *               "misc_i18n": null,
 *               "reason_add": "Blacklisted Tag : Jean-Jacques Debout (type 6)",
 *               "serie": "Capitaine Flam",
 *               "serie_altname": "Kyaputen Fyucha",
 *               "singer": "Richard Simon",
 *               "songorder": 0,
 *               "songtype": "TYPE_OP",
 *               "songtype_i18n": "Opening",
 *               "songtype_i18n_short": "OP",
 *               "songwriter": "Roger Dumas",
 *               "title": "",
 *               "videofile": "FR - Capitaine Flam - OP.avi",
 *               "viewcount": 0,
 *               "year": "1981"
 *           }
 *       ],
 *       "infos": {
 *           "count": 1,
 *           "from": 0,
 *           "to": 999999
 *       }
 *   }
 * }
 * @apiError BL_VIEW_ERROR Blacklist could not be viewed
 *
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * {
 *   "code": "BL_VIEW_ERROR"
 * }
 */

/**
 * @api {get} /public/playlists/:pl_id/karas/:plc_id Get song info from a playlist (public)
 * @apiName GetPlaylistPLCPublic
 * @apiVersion 2.1.0
 * @apiGroup Playlists
 * @apiPermission public
 * @apiDescription Contrary to the `admin/playlists` path, this one won't return any karaoke info from a playlist the user has no access to.
 * @apiParam {Number} pl_id Target playlist ID. **Note :** Irrelevant since PLCIDs are unique in the table.
 * @apiParam {Number} plc_id Playlist content ID.
 * @apiSuccess {String} data/NORM_author Normalized karaoke's author name
 * @apiSuccess {String} data/NORM_creator Normalized creator's name
 * @apiSuccess {String} data/NORM_pseudo_add Normalized name of person who added the karaoke to the playlist
 * @apiSuccess {String} data/NORM_serie Normalized name of series the karaoke is from
 * @apiSuccess {String} data/NORM_serie_altname Normalized names of alternative names to the series the karaoke is from. When there are more than one alternative name, they're separated by forward slashes (`/`)
 * @apiSuccess {String} data/NORM_singer Normalized name of singer.
 * @apiSuccess {String} data/NORM_songwriter Normalized name of songwriter.
 * @apiSuccess {String} data/NORM_title Normalized song title
 * @apiSuccess {String} data/author Karaoke author's name
 * @apiSuccess {Number} data/created_at UNIX timestamp of the karaoke's creation date in the base
 * @apiSuccess {String} data/creator Show's creator name
 * @apiSuccess {Number} data/duration Song duration in seconds
 * @apiSuccess {Number} data/flag_blacklisted Is the song in the blacklist ?
 * @apiSuccess {Number} data/flag_favorites 1 = the song is in your favorites, 0 = not.
 * @apiSuccess {Number} data/flag_playing Is the song the one currently playing ?
 * @apiSuccess {Number} data/flag_whitelisted Is the song in the whitelist ?
 * @apiSuccess {Number} data/flag_dejavu Has the song been played in the last hour ? (by default, `EngineMaxDejaVuTime` is at 60 minutes)
 * @apiSuccess {Number} data/gain Calculated audio gain for the karaoke's video, in decibels (can be negative)
 * @apiSuccess {Number} data/kara_id Karaoke's ID in the main database
 * @apiSuccess {String} data/kid Karaoke's unique ID (survives accross database generations)
 * @apiSuccess {String} data/language Song's language in ISO639-2B format, separated by commas when a song has several languages
 * @apiSuccess {String} data/language_i18n Song's language translated in the client's native language
 * @apiSuccess {Number} data/lastplayed_at Time when the song was last played at in UNIX timestamp. `null` if never played before.
 * @apiSuccess {String} data/misc Internal tag list (`TAG_VIDEOGAME`, etc.)
 * @apiSuccess {String} data/misc_i18n Translated tag list
 * @apiSuccess {Number} data/playlist_id ID of playlist this song belongs to
 * @apiSuccess {Number} data/playlistcontent_ID PLC ID of this song.
 * @apiSuccess {Number} data/pos Position in the playlist. First song has a position of `1`
 * @apiSuccess {String} data/pseudo_add Nickname of user who added this song
 * @apiSuccess {String} data/serie Name of series/show the song belongs to
 * @apiSuccess {String} data/serie_altname Alternative name(s) of series/show this song belongs to. Names are separated by forward slashes (`/`)
 * @apiSuccess {String} data/singer Singer's name, if known.
 * @apiSuccess {Number} data/songorder Song's order, relative to it's type. Opening 1, Opening 2, Ending 1, Ending 2, etc.
 * @apiSuccess {String} data/songtype Song's type internal tag (`TYPE_OP`, `TYPE_ED`, `TYPE_IN` ...)
 * @apiSuccess {String} data/songtype_i18n Translated song's type (`Opening`, `Ending`, `Insert Song`...)
 * @apiSuccess {String} data/songtype_i18n_short Short translated version of the song's type (`OP`, `ED`, `IN`, ...)
 * @apiSuccess {Number} data/time_before_play Estimated time remaining before the song is going to play (in seconds). `0` if the song is currently playing or if there is no song selected as currently playing in the playlist (thus making this estimate impossible)
 * @apiSuccess {String} data/title Song's title
 * @apiSuccess {String} data/username Username who added that song
 * @apiSuccess {String} data/videofile Video's filename
 * @apiSuccess {Number} data/viewcount Counts how many times the song has been played
 * @apiSuccess {String} data/year Song's creation year. Empty string is returned if no year is known.
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "data": [
 *       {
 *           "NORM_author": null,
 *           "NORM_creator": null,
 *           "NORM_pseudo_add": "Axel",
 *           "NORM_serie": "C3 ~ Cube X Cursed X Curious",
 *           "NORM_serie_altname": "C-Cube/CxCxC",
 *           "NORM_singer": null,
 *           "NORM_songwriter": null,
 *           "NORM_title": "Hana",
 *           "author": null,
 *           "created_at": 1508427958,
 *           "creator": null,
 *           "duration": 0,
 *           "flag_blacklisted": 0,
 *           "flag_playing": 0,
 * 			 "flag_favorites": 0,
 *           "flag_whitelisted": 0,
 * 	         "flag_dejavu": 0,
 *           "gain": 0,
 *           "kara_id": 1007,
 *           "kid": "c05e24eb-206b-4ff5-88d4-74e8d5ad6f75",
 *           "language": "jpn",
 *           "language_i18n": "Japonais",
 * 			 "lastplayed_at": null,
 *           "misc": null,
 *           "misc_i18n": null,
 *           "playlist_id": 2,
 *           "playlistcontent_id": 4961,
 *           "pos": 12,
 *           "pseudo_add": "Axel",
 *           "serie": "C3 ~ Cube X Cursed X Curious",
 *           "serie_altname": "C-Cube/CxCxC",
 *           "singer": null,
 *           "songorder": 1,
 *           "songtype": "TYPE_ED",
 *           "songtype_i18n": "Ending",
 *           "songtype_i18n_short": "ED",
 *           "songwriter": null,
 *           "time_before_play": 0,
 *           "title": "Hana",
 * 			 "username": "axelterizaki",
 *           "videofile": "JAP - C3 ~ Cube X Cursed X Curious - ED1 - Hana.avi",
 *           "viewcount": 0,
 *           "year": ""
 *       }
 *   ]
 * }
 * @apiError PL_VIEW_CONTENT_ERROR Unable to fetch playlist's content information
 * @apiError WEBAPPMODE_CLOSED_API_MESSAGE API is disabled at the moment.
 *
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * {
 *   "code": "PL_VIEW_CONTENT_ERROR",
 *   "message": "PLCID unknown!"
 * }
 * @apiErrorExample Error-Response:
 * HTTP/1.1 403 Forbidden
 */

/**
 * @api {get} /public/whitelist Get whitelist (public)
 * @apiName GetWhitelistPublic
 * @apiVersion 2.1.0
 * @apiGroup Whitelist
 * @apiPermission public
 * @apiDescription If `EngineAllowViewWhitelist` is set to `0` in configuration, then returns an error message (see below)
 * @apiParam {String} [filter] Filter list by this string.
 * @apiParam {String} [lang] ISO639-2B code of client's language (to return translated text into the user's language) Defaults to engine's locale
 * @apiParam {Number} [from=0] Return only the results starting from this position. Useful for continuous scrolling. 0 if unspecified
 * @apiParam {Number} [size=999999] Return only x number of results. Useful for continuous scrolling. 999999 if unspecified.* @apiSuccess {String} code Message to display
 * @apiSuccess {Object[]} data/content List of karaoke objects
 * @apiSuccess {Number} data/infos/count Number of items in whitelist no matter which range was requested
 * @apiSuccess {Number} data/infos/from Items listed are from this position
 * @apiSuccess {Number} data/infos/to Items listed end at this position
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "data": {
 *       "content": [
 *           {
 *               "NORM_author": null,
 *               "NORM_creator": "Eurovision",
 *               "NORM_serie": null,
 *               "NORM_serie_altname": null,
 *               "NORM_singer": "Dschinghis Khan",
 *               "NORM_songwriter": "Ralph Siegel",
 *               "NORM_title": "Moskau",
 *               "author": null,
 *               "created_at": 1508921852,
 *               "creator": "Eurovision",
 *               "duration": 0,
 *               "kara_id": 1,
 *               "kid": "d9bb6a76-2b7d-469e-ba44-6acfc463202e",
 *               "language": "ger",
 *               "language_i18n": "Allemand",
 *               "misc": "TAG_CONCERT,TAG_REAL",
 *               "misc_i18n": "Concert,Non-anime",
 *               "serie": null,
 *               "serie_altname": null,
 *               "singer": "Dschinghis Khan",
 *               "songorder": 0,
 *               "songtype": "TYPE_MUSIC",
 *               "songtype_i18n": "Music Video",
 *               "songtype_i18n_short": "MV",
 *               "songwriter": "Ralph Siegel",
 *               "title": "Moskau",
 *               "videofile": "ALL - Dschinghis Khan - MV - Moskau.avi",
 *               "viewcount": 0,
 *               "whitelist_id": 1,
 *               "year": "1980"
 *           }
 *       ],
 *       "infos": {
 *           "count": 1,
 *           "from": 0,
 *           "to": 999999
 *       }
 *   }
 * }
 * @apiError WL_VIEW_ERROR Whitelist could not be viewed
 * @apiError WL_VIEW_FORBIDDEN Whitelist view is not allowed for users
 * @apiError WEBAPPMODE_CLOSED_API_MESSAGE API is disabled at the moment.
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * {
 *   "code": "WL_VIEW_FORBIDDEN"
 * }
 * @apiErrorExample Error-Response:
 * HTTP/1.1 403 Forbidden
 */
/**
 * @api {get} /public/blacklist Get blacklist (public)
 * @apiName GetBlacklistPublic
 * @apiVersion 2.1.0
 * @apiGroup Blacklist
 * @apiPermission public
 * @apiDescription If `EngineAllowViewBlacklist` is set to `0` in configuration, then returns an error message (see below)
 * @apiParam {String} [filter] Filter list by this string.
 * @apiParam {String} [lang] ISO639-2B code of client's language (to return translated text into the user's language) Defaults to engine's locale
 * @apiParam {Number} [from=0] Return only the results starting from this position. Useful for continuous scrolling. 0 if unspecified
 * @apiParam {Number} [size=999999] Return only x number of results. Useful for continuous scrolling. 999999 if unspecified.* @apiSuccess {String} code Message to display
 * @apiSuccess {Object[]} data/content List of karaoke objects
 * @apiSuccess {Number} data/infos/count Number of items in whitelist no matter which range was requested
 * @apiSuccess {Number} data/infos/from Items listed are from this position
 * @apiSuccess {Number} data/infos/size How many items listed.
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "data": {
 *       "content": [
 *           {
 *               "NORM_author": null,
 *               "NORM_creator": "Eurovision",
 *               "NORM_serie": null,
 *               "NORM_serie_altname": null,
 *               "NORM_singer": "Dschinghis Khan",
 *               "NORM_songwriter": "Ralph Siegel",
 *               "NORM_title": "Moskau",
 *               "author": null,
 *               "created_at": 1508921852,
 *               "creator": "Eurovision",
 *               "duration": 0,
 *               "kara_id": 1,
 *               "kid": "d9bb6a76-2b7d-469e-ba44-6acfc463202e",
 *               "language": "ger",
 *               "language_i18n": "Allemand",
 *               "misc": "TAG_CONCERT,TAG_REAL",
 *               "misc_i18n": "Concert,Non-anime",
 *               "serie": null,
 *               "serie_altname": null,
 *               "singer": "Dschinghis Khan",
 *               "songorder": 0,
 *               "songtype": "TYPE_MUSIC",
 *               "songtype_i18n": "Music Video",
 *               "songtype_i18n_short": "MV",
 *               "songwriter": "Ralph Siegel",
 *               "title": "Moskau",
 *               "videofile": "ALL - Dschinghis Khan - MV - Moskau.avi",
 *               "viewcount": 0,
 *               "whitelist_id": 1,
 *               "year": "1980"
 *           }
 *       ],
 *       "infos": {
 *           "count": 1,
 *           "from": 0,
 *           "to": 999999
 *       }
 *   }
 * }
 * @apiError BL_VIEW_ERROR Blacklist could not be viewed
 * @apiError BL_VIEW_FORBIDDEN Blacklist view is not allowed for users
 * @apiError WEBAPPMODE_CLOSED_API_MESSAGE API is disabled at the moment.
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * {
 *   "code": "BL_VIEW_FORBIDDEN"
 * }
 * @apiErrorExample Error-Response:
 * HTTP/1.1 403 Forbidden
 */
/**
 * @api {get} /public/karas Get complete list of karaokes
 * @apiName GetKaras
 * @apiVersion 2.1.0
 * @apiGroup Karaokes
 * @apiPermission public
 *
 * @apiParam {String} [filter] Filter list by this string.
 * @apiParam {String} [lang] ISO639-2B code of client's language (to return translated text into the user's language) Defaults to engine's locale.
 * @apiParam {Number} [from=0] Return only the results starting from this position. Useful for continuous scrolling. 0 if unspecified
 * @apiParam {Number} [size=999999] Return only x number of results. Useful for continuous scrolling. 999999 if unspecified.
 *
 * @apiSuccess {Object[]} data/content/karas Array of `kara` objects
 * @apiSuccess {Number} data/infos/count Number of karaokes in playlist
 * @apiSuccess {Number} data/infos/from Starting position of listing
 * @apiSuccess {Number} data/infos/to End position of listing
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "data": {
 *       "content": [
 *           {
 *               "NORM_author": null,
 *               "NORM_creator": null,
 *               "NORM_serie": "Dynasty Warriors 3",
 *               "NORM_serie_altname": "DW3/DW 3",
 *               "NORM_singer": null,
 *               "NORM_songwriter": null,
 *               "NORM_title": "Circuit",
 *               "author": null,
 *               "created_at": 1508423806,
 *               "creator": null,
 *               "duration": 0,
 * 	             "flag_dejavu": 0,
 * 				 "flag_favorites": 1,
 *               "gain": 0,
 *               "kara_id": 176,
 *               "kid": "b0de301c-5756-49fb-b019-85a99a66586b",
 *               "language": "chi",
 *               "language_i18n": "Chinois",
 * 				 "lastplayed_at": null,
 *               "misc": "TAG_VIDEOGAME",
 *               "misc_i18n": "Jeu vidéo",
 *               "serie": "Dynasty Warriors 3",
 *               "serie_altname": "DW3/DW 3",
 *               "singer": null,
 *               "songorder": 0,
 *               "songtype": "TYPE_ED",
 *               "songtype_i18n": "Ending",
 *               "songtype_i18n_short": "ED",
 *               "songwriter": null,
 *               "title": "Circuit",
 *               "videofile": "CHI - Dynasty Warriors 3 - GAME ED - Circuit.avi"
 *               "viewcount": 0,
 *               "year": ""
 *           },
 *           ...
 *       ],
 *       "infos": {
 *           "count": 3,
 * 			 "from": 0,
 * 			 "to": 120
 *       }
 *   }
 * }
 * @apiError SONG_LIST_ERROR Unable to fetch list of karaokes
 * @apiError WEBAPPMODE_CLOSED_API_MESSAGE API is disabled at the moment.
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * @apiErrorExample Error-Response:
 * HTTP/1.1 403 Forbidden
 */
/**
 * @api {get} /public/karas/:kara_id Get song info from database
 * @apiName GetKaraInfo
 * @apiVersion 2.1.0
 * @apiGroup Karaokes
 * @apiPermission public
 *
 * @apiParam {Number} kara_id Karaoke ID you want to fetch information from
 * @apiSuccess {String} data/NORM_author Normalized karaoke's author name
 * @apiSuccess {String} data/NORM_creator Normalized creator's name
 * @apiSuccess {String} data/NORM_serie Normalized name of series the karaoke is from
 * @apiSuccess {String} data/NORM_serie_altname Normalized names of alternative names to the series the karaoke is from. When there are more than one alternative name, they're separated by forward slashes (`/`)
 * @apiSuccess {String} data/NORM_singer Normalized name of singer.
 * @apiSuccess {String} data/NORM_songwriter Normalized name of songwriter.
 * @apiSuccess {String} data/NORM_title Normalized song title
 * @apiSuccess {String} data/author Karaoke author's name
 * @apiSuccess {Number} data/created_at UNIX timestamp of the karaoke's creation date in the base
 * @apiSuccess {String} data/creator Show's creator name
 * @apiSuccess {Number} data/duration Song duration in seconds
 * @apiSuccess {Number} data/flag_dejavu Has the song been played in the last hour ? (by default `EngineMaxDejaVuTime` is at 60 minutes)
 * @apiSuccess {Number} data/flag_favorites 1 = the song is in your favorites, 0 = not.
 * @apiSuccess {Number} data/gain Calculated audio gain for the karaoke's video, in decibels (can be negative)
 * @apiSuccess {String} data/kid Karaoke's unique ID (survives accross database generations)
 * @apiSuccess {String} data/language Song's language in ISO639-2B format, separated by commas when a song has several languages
 * @apiSuccess {String} data/language_i18n Song's language translated in the client's native language
 * @apiSuccess {Number} data/lastplayed_at Last time the song has been played in UNIX timestamp. `null` if never played before
 * @apiSuccess {String} data/misc Internal tag list (`TAG_VIDEOGAME`, etc.)
 * @apiSuccess {String} data/misc_i18n Translated tag list
 * @apiSuccess {String} data/serie Name of series/show the song belongs to
 * @apiSuccess {String} data/serie_altname Alternative name(s) of series/show this song belongs to. Names are separated by forward slashes (`/`)
 * @apiSuccess {String} data/singer Singer's name, if known.
 * @apiSuccess {Number} data/songorder Song's order, relative to it's type. Opening 1, Opening 2, Ending 1, Ending 2, etc.
 * @apiSuccess {String} data/songtype Song's type internal tag (`TYPE_OP`, `TYPE_ED`, `TYPE_IN` ...)
 * @apiSuccess {String} data/songtype_i18n Translated song's type (`Opening`, `Ending`, `Insert Song`...)
 * @apiSuccess {String} data/songtype_i18n_short Short translated version of the song's type (`OP`, `ED`, `IN`, ...)
 * @apiSuccess {Number} data/time_before_play Estimated time remaining before the song is going to play (in seconds). `0` if the song is currently playing or if there is no song selected as currently playing in the playlist (thus making this estimate impossible)
 * @apiSuccess {String} data/title Song's title
 * @apiSuccess {String} data/videofile Video's filename
 * @apiSuccess {Number} data/viewcount Counts how many times the song has been played
 * @apiSuccess {String} data/year Song's creation year. Empty string is returned if no year is known.
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "data": [
 *       {
 *           "NORM_author": null,
 *           "NORM_creator": null,
 *           "NORM_serie": "C3 ~ Cube X Cursed X Curious",
 *           "NORM_serie_altname": "C-Cube/CxCxC",
 *           "NORM_singer": null,
 *           "NORM_songwriter": null,
 *           "NORM_title": "Hana",
 *           "author": null,
 *           "created_at": 1508427958,
 *           "creator": null,
 *           "duration": 0,
 * 	         "flag_dejavu": 0,
 * 		     "flag_favorites": 0,
 *           "gain": 0,
 *           "kid": "c05e24eb-206b-4ff5-88d4-74e8d5ad6f75",
 *           "language": "jpn",
 *           "language_i18n": "Japonais",
 * 			 "lastplayed_at": null,
 *           "misc": null,
 *           "misc_i18n": null,
 *           "serie": "C3 ~ Cube X Cursed X Curious",
 *           "serie_altname": "C-Cube/CxCxC",
 *           "singer": null,
 *           "songorder": 1,
 *           "songtype": "TYPE_ED",
 *           "songtype_i18n": "Ending",
 *           "songtype_i18n_short": "ED",
 *           "songwriter": null,
 *           "time_before_play": 0,
 *           "title": "Hana",
 *           "videofile": "JAP - C3 ~ Cube X Cursed X Curious - ED1 - Hana.avi",
 *           "viewcount": 0,
 *           "year": ""
 *       }
 *   ]
 * }
 * @apiError SONG_VIEW_ERROR Unable to list songs
 * @apiError WEBAPPMODE_CLOSED_API_MESSAGE API is disabled at the moment.
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * {
 *   "code": "SONG_VIEW_ERROR",
 *   "message": null
 * }
 * @apiErrorExample Error-Response:
 * HTTP/1.1 403 Forbidden
 */
/**
 * @api {get} /public/playlists/current/karas Get list of karaokes in the current playlist
 * @apiName GetPlaylistKarasCurrent
 * @apiVersion 2.1.0
 * @apiGroup Playlists
 * @apiPermission public
 *
 * @apiParam {Number} pl_id Target playlist ID.
 * @apiParam {String} [filter] Filter list by this string.
 * @apiParam {String} [lang] ISO639-2B code of client's language (to return translated text into the user's language) Defaults to engine's locale.
 * @apiParam {Number} [from=0] Return only the results starting from this position. Useful for continuous scrolling. 0 if unspecified
 * @apiParam {Number} [size=999999] Return only x number of results. Useful for continuous scrolling. 999999 if unspecified.
 *
 * @apiSuccess {Object[]} data/content/karas Array of `kara` objects
 * @apiSuccess {Number} data/infos/count Number of karaokes in playlist
 * @apiSuccess {Number} data/infos/from Starting position of listing
 * @apiSuccess {Number} data/infos/to End position of listing
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "data": {
 *       "content": [
 *           {
 *               "NORM_author": null,
 *               "NORM_creator": null,
 *               "NORM_pseudo_add": "Administrateur",
 *               "NORM_serie": "Dynasty Warriors 3",
 *               "NORM_serie_altname": "DW3/DW 3",
 *               "NORM_singer": null,
 *               "NORM_songwriter": null,
 *               "NORM_title": "Circuit",
 *               "author": null,
 *               "created_at": 1508423806,
 *               "creator": null,
 *               "duration": 0,
 *               "flag_blacklisted": 0,
 *               "flag_playing": 1,
 *               "flag_whitelisted": 0,
 * 	             "flag_dejavu": 0,
 *               "gain": 0,
 *               "kara_id": 176,
 *               "kid": "b0de301c-5756-49fb-b019-85a99a66586b",
 *               "language": "chi",
 *               "language_i18n": "Chinois",
 * 				 "lastplayed_at": null,
 *               "misc": "TAG_VIDEOGAME",
 *               "misc_i18n": "Jeu vidéo",
 *               "playlistcontent_id": 4946,
 *               "pos": 1,
 *               "pseudo_add": "Administrateur",
 *               "serie": "Dynasty Warriors 3",
 *               "serie_altname": "DW3/DW 3",
 *               "singer": null,
 *               "songorder": 0,
 *               "songtype": "TYPE_ED",
 *               "songtype_i18n": "Ending",
 *               "songtype_i18n_short": "ED",
 *               "songwriter": null,
 *               "title": "Circuit",*
 * 				 "username": "admin",
 *               "videofile": "CHI - Dynasty Warriors 3 - GAME ED - Circuit.avi"
 *               "viewcount": 0,
 *               "year": ""
 *           },
 *           ...
 *       ],
 *       "infos": {
 *           "count": 3,
 * 			 "from": 0,
 * 			 "to": 120
 *       }
 *   }
 * }
 * @apiError PL_VIEW_SONGS_CURRENT_ERROR Unable to fetch list of karaokes of current playlist
 * @apiError WEBAPPMODE_CLOSED_API_MESSAGE API is disabled at the moment.
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * @apiErrorExample Error-Response:
 * HTTP/1.1 403 Forbidden
 */
/**
 * @api {get} /public/playlists/public/karas Get list of karaokes in the public playlist
 * @apiName GetPlaylistKarasPublic
 * @apiVersion 2.1.0
 * @apiGroup Playlists
 * @apiPermission public
 *
 * @apiParam {Number} pl_id Target playlist ID.
 * @apiParam {String} [filter] Filter list by this string.
 * @apiParam {String} [lang] ISO639-2B code of client's language (to return translated text into the user's language) Defaults to engine's locale.
 * @apiParam {Number} [from=0] Return only the results starting from this position. Useful for continuous scrolling. 0 if unspecified
 * @apiParam {Number} [size=999999] Return only x number of results. Useful for continuous scrolling. 999999 if unspecified.
 *
 * @apiSuccess {Object[]} data/content/karas Array of `kara` objects
 * @apiSuccess {Number} data/infos/count Number of karaokes in playlist
 * @apiSuccess {Number} data/infos/from Starting position of listing
 * @apiSuccess {Number} data/infos/to End position of listing
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "data": {
 *       "content": [
 *           {
 *               "NORM_author": null,
 *               "NORM_creator": null,
 *               "NORM_pseudo_add": "Administrateur",
 *               "NORM_serie": "Dynasty Warriors 3",
 *               "NORM_serie_altname": "DW3/DW 3",
 *               "NORM_singer": null,
 *               "NORM_songwriter": null,
 *               "NORM_title": "Circuit",
 *               "author": null,
 *               "created_at": 1508423806,
 *               "creator": null,
 *               "duration": 0,
 *               "flag_blacklisted": 0,
 *               "flag_playing": 1,
 *               "flag_whitelisted": 0,
 * 	             "flag_dejavu": 0,
 *               "gain": 0,
 *               "kara_id": 176,
 *               "kid": "b0de301c-5756-49fb-b019-85a99a66586b",
 *               "language": "chi",
 *               "language_i18n": "Chinois",
 * 				 "lastplayed_at": null,
 *               "misc": "TAG_VIDEOGAME",
 *               "misc_i18n": "Jeu vidéo",
 *               "playlistcontent_id": 4946,
 *               "pos": 1,
 *               "pseudo_add": "Administrateur",
 *               "serie": "Dynasty Warriors 3",
 *               "serie_altname": "DW3/DW 3",
 *               "singer": null,
 *               "songorder": 0,
 *               "songtype": "TYPE_ED",
 *               "songtype_i18n": "Ending",
 *               "songtype_i18n_short": "ED",
 *               "songwriter": null,
 *               "title": "Circuit",
 * 				 "username": "admin",
 *               "videofile": "CHI - Dynasty Warriors 3 - GAME ED - Circuit.avi"
 *               "viewcount": 0,
 *               "year": ""
 *           },
 *           ...
 *       ],
 *       "infos": {
 *           "count": 3,
 * 			 "from": 0,
 * 			 "to": 120
 *       }
 *   }
 * }
 * @apiError PL_VIEW_SONGS_PUBLIC_ERROR Unable to fetch list of karaokes of public playlist
 * @apiError WEBAPPMODE_CLOSED_API_MESSAGE API is disabled at the moment.
 *
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * @apiErrorExample Error-Response:
 * HTTP/1.1 403 Forbidden
 */
/**
 * @api {get} /public/favorites View own favorites
 * @apiName GetFavorites
 * @apiVersion 2.1.0
 * @apiGroup Favorites
 * @apiPermission own
 *
 * @apiParam {String} [filter] Filter list by this string.
 * @apiParam {String} [lang] ISO639-2B code of client's language (to return translated text into the user's language) Defaults to engine's locale.
 * @apiParam {Number} [from=0] Return only the results starting from this position. Useful for continuous scrolling. 0 if unspecified
 * @apiParam {Number} [size=999999] Return only x number of results. Useful for continuous scrolling. 999999 if unspecified.
 *
 * @apiSuccess {Object[]} data/content/karas Array of `kara` objects
 * @apiSuccess {Number} data/infos/count Number of karaokes in playlist
 * @apiSuccess {Number} data/infos/from Starting position of listing
 * @apiSuccess {Number} data/infos/to End position of listing
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "data": {
 *       "content": [
 *           {
 *               "NORM_author": null,
 *               "NORM_creator": null,
 *               "NORM_pseudo_add": "Administrateur",
 *               "NORM_serie": "Dynasty Warriors 3",
 *               "NORM_serie_altname": "DW3/DW 3",
 *               "NORM_singer": null,
 *               "NORM_songwriter": null,
 *               "NORM_title": "Circuit",
 *               "author": null,
 *               "created_at": 1508423806,
 *               "creator": null,
 *               "duration": 0,
 *               "flag_blacklisted": 0,
 *               "flag_playing": 1,
 *               "flag_whitelisted": 0,
 *               "gain": 0,
 *               "kara_id": 176,
 *               "kid": "b0de301c-5756-49fb-b019-85a99a66586b",
 *               "language": "chi",
 *               "language_i18n": "Chinois",
 *               "misc": "TAG_VIDEOGAME",
 *               "misc_i18n": "Jeu vidéo",
 *               "playlistcontent_id": 4946,
 *               "pos": 1,
 *               "pseudo_add": "Administrateur",
 *               "serie": "Dynasty Warriors 3",
 *               "serie_altname": "DW3/DW 3",
 *               "singer": null,
 *               "songorder": 0,
 *               "songtype": "TYPE_ED",
 *               "songtype_i18n": "Ending",
 *               "songtype_i18n_short": "ED",
 *               "songwriter": null,
 *               "title": "Circuit",
 * 				 "username": "admin",
 *               "videofile": "CHI - Dynasty Warriors 3 - GAME ED - Circuit.avi"
 *               "viewcount": 0,
 *               "year": ""
 *           },
 *           ...
 *       ],
 *       "infos": {
 *           "count": 3,
 * 			 "from": 0,
 * 			 "to": 120
 *       }
 *   }
 * }
 * @apiError FAVORITES_VIEW_ERROR Unable to fetch list of karaokes in favorites
 * @apiError WEBAPPMODE_CLOSED_API_MESSAGE API is disabled at the moment.
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * @apiErrorExample Error-Response:
 * HTTP/1.1 403 Forbidden
 */
/**
 * @api {get} /admin/playlists/:pl_id/karas Get list of karaokes in a playlist
 * @apiName GetPlaylistKaras
 * @apiVersion 2.1.0
 * @apiGroup Playlists
 * @apiPermission admin
 *
 * @apiParam {Number} pl_id Target playlist ID.
 * @apiParam {String} [filter] Filter list by this string.
 * @apiParam {String} [lang] ISO639-2B code of client's language (to return translated text into the user's language) Defaults to engine's locale.
 * @apiParam {Number} [from=0] Return only the results starting from this position. Useful for continuous scrolling. 0 if unspecified
 * @apiParam {Number} [size=999999] Return only x number of results. Useful for continuous scrolling. 999999 if unspecified.
 *
 * @apiSuccess {Object[]} data/content/karas Array of `kara` objects
 * @apiSuccess {Number} data/infos/count Number of karaokes in playlist
 * @apiSuccess {Number} data/infos/from Starting position of listing
 * @apiSuccess {Number} data/infos/to End position of listing
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "data": {
 *       "content": [
 *           {
 *               "NORM_author": null,
 *               "NORM_creator": null,
 *               "NORM_pseudo_add": "Administrateur",
 *               "NORM_serie": "Dynasty Warriors 3",
 *               "NORM_serie_altname": "DW3/DW 3",
 *               "NORM_singer": null,
 *               "NORM_songwriter": null,
 *               "NORM_title": "Circuit",
 *               "author": null,
 *               "created_at": 1508423806,
 *               "creator": null,
 *               "duration": 0,
 *               "flag_blacklisted": 0,
 *               "flag_playing": 1,
 *               "flag_whitelisted": 0,
 *               "flag_dejavu": 0,
 *               "gain": 0,
 *               "kara_id": 176,
 *               "kid": "b0de301c-5756-49fb-b019-85a99a66586b",
 *               "language": "chi",
 *               "language_i18n": "Chinois",
 * 				 "lastplayed_at": null,
 *               "misc": "TAG_VIDEOGAME",
 *               "misc_i18n": "Jeu vidéo",
 *               "playlistcontent_id": 4946,
 *               "pos": 1,
 *               "pseudo_add": "Administrateur",
 *               "serie": "Dynasty Warriors 3",
 *               "serie_altname": "DW3/DW 3",
 *               "singer": null,
 *               "songorder": 0,
 *               "songtype": "TYPE_ED",
 *               "songtype_i18n": "Ending",
 *               "songtype_i18n_short": "ED",
 *               "songwriter": null,
 *               "title": "Circuit",
 * 				 "username": "admin",
 *               "videofile": "CHI - Dynasty Warriors 3 - GAME ED - Circuit.avi"
 *               "viewcount": 0,
 *               "year": ""
 *           },
 *           ...
 *       ],
 *       "infos": {
 *           "count": 3,
 * 			 "from": 0,
 * 			 "to": 120
 *       }
 *   }
 * }
 * @apiError PL_VIEW_SONGS_ERROR Unable to fetch list of karaokes in a playlist
 *
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 */
/**
 * @api {get} /admin/playlists/:pl_id/karas/:plc_id Get song info from a playlist
 * @apiName GetPlaylistPLC
 * @apiVersion 2.1.0
 * @apiGroup Playlists
 * @apiPermission admin
 *
 * @apiParam {Number} pl_id Target playlist ID. **Note :** Irrelevant since PLCIDs are unique in the table.
 * @apiParam {Number} plc_id Playlist content ID.
 * @apiParam {String} lang Lang in ISO639-2B.
 * @apiSuccess {String} data/NORM_author Normalized karaoke's author name
 * @apiSuccess {String} data/NORM_creator Normalized creator's name
 * @apiSuccess {String} data/NORM_pseudo_add Normalized name of person who added the karaoke to the playlist
 * @apiSuccess {String} data/NORM_serie Normalized name of series the karaoke is from
 * @apiSuccess {String} data/NORM_serie_altname Normalized names of alternative names to the series the karaoke is from. When there are more than one alternative name, they're separated by forward slashes (`/`)
 * @apiSuccess {String} data/NORM_singer Normalized name of singer.
 * @apiSuccess {String} data/NORM_songwriter Normalized name of songwriter.
 * @apiSuccess {String} data/NORM_title Normalized song title
 * @apiSuccess {String} data/author Karaoke author's name
 * @apiSuccess {Number} data/created_at UNIX timestamp of the karaoke's creation date in the base
 * @apiSuccess {String} data/creator Show's creator name
 * @apiSuccess {Number} data/duration Song duration in seconds
 * @apiSuccess {Number} data/flag_blacklisted Is the song in the blacklist ?
 * @apiSuccess {Number} data/flag_playing Is the song the one currently playing ?
 * @apiSuccess {Number} data/flag_whitelisted Is the song in the whitelist ?
 * @apiSuccess {Number} data/flag_dejavu Has the song been played in the last hour ? (`EngineMaxDejaVuTime` defaults to 60 minutes)
 * @apiSuccess {Number} data/flag_favorites 1 = the song is in your favorites, 0 = not.
 * @apiSuccess {Number} data/gain Calculated audio gain for the karaoke's video, in decibels (can be negative)
 * @apiSuccess {Number} data/kara_id Karaoke's ID in the main database
 * @apiSuccess {String} data/kid Karaoke's unique ID (survives accross database generations)
 * @apiSuccess {String} data/language Song's language in ISO639-2B format, separated by commas when a song has several languages
 * @apiSuccess {String} data/language_i18n Song's language translated in the client's native language
 * @apiSuccess {Number} data/lastplayed_at When the song has been played last, in unix timestamp
 * @apiSuccess {String} data/misc Internal tag list (`TAG_VIDEOGAME`, etc.)
 * @apiSuccess {String} data/misc_i18n Translated tag list
 * @apiSuccess {Number} data/playlist_id ID of playlist this song belongs to
 * @apiSuccess {Number} data/playlistcontent_ID PLC ID of this song.
 * @apiSuccess {Number} data/pos Position in the playlist. First song has a position of `1`
 * @apiSuccess {String} data/previewfile Filename of the preview file associated with the karaoke. Can be undefined if the preview hasn't been generated yet by the server.
 * @apiSuccess {String} data/pseudo_add Nickname of user who added/requested the song. this nickname can be changed (`username` cannot) hence why it is displayed here.
 * @apiSuccess {String} data/serie Name of series/show the song belongs to
 * @apiSuccess {String} data/serie_altname Alternative name(s) of series/show this song belongs to. Names are separated by forward slashes (`/`)
 * @apiSuccess {String} data/singer Singer's name, if known.
 * @apiSuccess {Number} data/songorder Song's order, relative to it's type. Opening 1, Opening 2, Ending 1, Ending 2, etc.
 * @apiSuccess {String} data/songtype Song's type internal tag (`TYPE_OP`, `TYPE_ED`, `TYPE_IN` ...)
 * @apiSuccess {String} data/songtype_i18n Translated song's type (`Opening`, `Ending`, `Insert Song`...)
 * @apiSuccess {String} data/songtype_i18n_short Short translated version of the song's type (`OP`, `ED`, `IN`, ...)
 * @apiSuccess {Number} data/time_before_play Estimated time remaining before the song is going to play (in seconds). `0` if the song is currently playing or if there is no song selected as currently playing in the playlist (thus making this estimate impossible)
 * @apiSuccess {String} data/title Song's title
 * @apiSuccess {String} data/username Username who submitted this karaoke. Can be different from `pseudo_add`.
 * @apiSuccess {String} data/videofile Video's filename
 * @apiSuccess {Number} data/viewcount Counts how many times the song has been played
 * @apiSuccess {String} data/year Song's creation year. Empty string is returned if no year is known.
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "data": [
 *       {
 *           "NORM_author": null,
 *           "NORM_creator": null,
 *           "NORM_pseudo_add": "Axel",
 *           "NORM_serie": "C3 ~ Cube X Cursed X Curious",
 *           "NORM_serie_altname": "C-Cube/CxCxC",
 *           "NORM_singer": null,
 *           "NORM_songwriter": null,
 *           "NORM_title": "Hana",
 *           "author": null,
 *           "created_at": 1508427958,
 *           "creator": null,
 *           "duration": 0,
 *           "flag_blacklisted": 0,
 *           "flag_playing": 0,
 *           "flag_whitelisted": 0,
 *           "flag_dejavu": 0,
 * 			 "flag_favorites": 0,
 *           "gain": 0,
 *           "kara_id": 1007,
 *           "kid": "c05e24eb-206b-4ff5-88d4-74e8d5ad6f75",
 *           "language": "jpn",
 *           "language_i18n": "Japonais",
 * 			 "lastplayed_at": null,
 *           "misc": null,
 *           "misc_i18n": null,
 *           "playlist_id": 2,
 *           "playlistcontent_id": 4961,
 *           "pos": 12,
 *           "previewfile": "JAP - C3 ~ Cube X Cursed X Curious.1201230.mp4"
 *           "pseudo_add": "Axel",
 *           "serie": "C3 ~ Cube X Cursed X Curious",
 *           "serie_altname": "C-Cube/CxCxC",
 *           "singer": null,
 *           "songorder": 1,
 *           "songtype": "TYPE_ED",
 *           "songtype_i18n": "Ending",
 *           "songtype_i18n_short": "ED",
 *           "songwriter": null,
 *           "time_before_play": 0,
 *           "title": "Hana",
 * 			 "username": "axelterizaki",
 *           "videofile": "JAP - C3 ~ Cube X Cursed X Curious - ED1 - Hana.avi",
 *           "viewcount": 0,
 *           "year": ""
 *       }
 *   ]
 * }
 * @apiError PL_VIEW_CONTENT_ERROR Unable to fetch playlist's content information
 *
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * {
 *   "code": "PL_VIEW_CONTENT_ERROR",
 *   "message": "PLCID unknown!"
 * }
 */
/**
 * @api {get} /public/playlists/:pl_id/karas Get list of karaokes in a playlist (public)
 * @apiName GetPlaylistKarasPublic
 * @apiVersion 2.1.0
 * @apiGroup Playlists
 * @apiPermission public
 * @apiDescription Contrary to the `/admin/playlists/` path, this one will not return playlists which have the `flag_visible` set to `0`.
 * @apiParam {Number} pl_id Target playlist ID.
 * @apiParam {String} [filter] Filter list by this string.
 * @apiParam {String} [lang] ISO639-2B code of client's language (to return translated text into the user's language) Defaults to engine's locale.
 * @apiParam {Number} [from=0] Return only the results starting from this position. Useful for continuous scrolling. 0 if unspecified
 * @apiParam {Number} [size=999999] Return only x number of results. Useful for continuous scrolling. 999999 if unspecified.
 *
 * @apiSuccess {Object[]} data/content/karas Array of `kara` objects
 * @apiSuccess {Number} data/infos/count Number of karaokes in playlist
 * @apiSuccess {Number} data/infos/from Starting position of listing
 * @apiSuccess {Number} data/infos/to End position of listing
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "data": {
 *       "content": [
 *           {
 *               "NORM_author": null,
 *               "NORM_creator": null,
 *               "NORM_pseudo_add": "Administrateur",
 *               "NORM_serie": "Dynasty Warriors 3",
 *               "NORM_serie_altname": "DW3/DW 3",
 *               "NORM_singer": null,
 *               "NORM_songwriter": null,
 *               "NORM_title": "Circuit",
 *               "author": null,
 *               "created_at": 1508423806,
 *               "creator": null,
 *               "duration": 0,
 *               "flag_blacklisted": 0,
 *               "flag_playing": 1,
 *               "flag_whitelisted": 0,
 * 	             "flag_dejavu": 0,
 *               "gain": 0,
 *               "kara_id": 176,
 *               "kid": "b0de301c-5756-49fb-b019-85a99a66586b",
 *               "language": "chi",
 *               "language_i18n": "Chinois",
 * 				 "lastplayed_at": null,
 *               "misc": "TAG_VIDEOGAME",
 *               "misc_i18n": "Jeu vidéo",
 *               "playlistcontent_id": 4946,
 *               "pos": 1,
 *               "pseudo_add": "Administrateur",
 *               "serie": "Dynasty Warriors 3",
 *               "serie_altname": "DW3/DW 3",
 *               "singer": null,
 *               "songorder": 0,
 *               "songtype": "TYPE_ED",
 *               "songtype_i18n": "Ending",
 *               "songtype_i18n_short": "ED",
 *               "songwriter": null,
 *               "title": "Circuit",
 * 				 "username": "admin",
 *               "videofile": "CHI - Dynasty Warriors 3 - GAME ED - Circuit.avi"
 *               "viewcount": 0,
 *               "year": ""
 *           },
 *           ...
 *       ],
 *       "infos": {
 *           "count": 3,
 * 			 "from": 0,
 * 			 "to": 120
 *       }
 *   }
 * }
 * @apiError PL_VIEW_SONGS_ERROR Unable to fetch list of karaokes in a playlist
 * @apiError WEBAPPMODE_CLOSED_API_MESSAGE API is disabled at the moment.
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * @apiErrorExample Error-Response:
 * HTTP/1.1 403 Forbidden
 */

/**
 * @api {put} /admin/settings Update settings
 * @apiName PutSettings
 * @apiVersion 2.1.0
 * @apiPermission admin
 * @apiGroup Main
 * @apiDescription **Note :** All settings must be sent at once in a single request.
 * @apiParam {Boolean} EngineAllowViewBlacklist Allow/disallow users to view blacklist contents from the guest interface
 * @apiParam {Boolean} EngineAllowViewWhitelist Allow/disallow users to view whitelist contents from the guest interface
 * @apiParam {Boolean} EngineAllowViewBlacklistCriterias Allow/disallow users to view blacklist criterias list from the guest interface
 * @apiParam {Boolean} EngineAllowAutoPlay Enable/disable AutoPlay feature (starts playing once a song is added to current playlist)
 * @apiParam {Boolean} EngineDisplayConnectionInfo Show/hide connection info during jingles or pauses (the "Go to http://" message)
 * @apiParam {String} EngineDisplayConnectionInfoHost Force IP/Hostname displayed during jingles or pauses in case autodetection returns the wrong IP
 * @apiParam {String} EngineDisplayConnectionInfoMessage Add a small message before the text showing the URL to connect to
 * @apiParam {Boolean} EngineDisplayConnectionInfoQRCode Enable/disable QR Code during pauses inbetween two songs.
 * @apiParam {Boolean} EngineDisplayNickname Enable/disable displaying the username who requested a song.
 * @apiParam {Boolean} EngineFreeUpvotes Enable/disable Free Songs By Upvotes feature
 * @apiParam {Number} EngineFreeUpvotesRequiredMin Minimum number of upvotes required to free a song
 * @apiParam {Number} EngineFreeUpvotesRequiredPercent Minimum percent of upvotes / online users required to free a song
 * @apiParam {Number} EngineJinglesInterval Interval in number of songs between two jingles. 0 to disable entirely.
 * @apiParam {Boolean} EnginePrivateMode `false` = Public Karaoke mode, `true` = Private Karaoke Mode. See documentation.
 * @apiParam {Boolean} EngineRepeatPlaylist Enable/disable auto repeat playlist when at end.
 * @apiParam {Boolean} EngineSmartInsert Enable/disable smart insert of songs in the playlist.
 * @apiParam {Number} EngineSongsPerUser Number of songs allowed per person.
 * @apiParam {Boolean} PlayerFullscreen Enable/disable full screen mode
 * @apiParam {Boolean} PlayerNoBar `true` = Hide progress bar / `false` = Show progress bar
 * @apiParam {Boolean} PlayerNoHud `true` = Hide HUD / `false` = Show HUD
 * @apiParam {Boolean} PlayerPIP Enable/disable Picture-in-picture mode
 * @apiParam {String=Left,Center,Right} PlayerPIPPositionX Horizontal position of PIP screen
 * @apiParam {String=Top,Center,Bottom} PlayerPIPPositionY Vertical position of PIP screen
 * @apiParam {Number} PlayerPIPSize Size in percentage of the PIP screen
 * @apiParam {Number} PlayerScreen Screen number to display the videos on. If screen number is not available, main screen is used. `9` means autodetection.
 * @apiParam {Boolean} PlayerStayOnTop Enable/disable stay on top of all windows.
 * @apiParam {Number} WebappMode Webapp public mode : `0` = closed, no public action available, `1` = only show song information and playlists, no karaoke can be added by the user, `2` = default, open mode.
 * @apiParam {Boolean} PlayerStayOnTop Enable/disable stay on top of all windows.
 * @apiSuccess {Object} data Contains all configuration settings. See example or documentation for what each setting does.
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 */
/**
 * @api {get} /public/settings Get settings (public)
 * @apiName GetSettingsPublic
 * @apiVersion 2.1.0
 * @apiGroup Main
 * @apiPermission public
 * @apiDescription Contrary to `admin/settings` path, this one doesn't return things like paths, binaries or admin password information.
 * @apiSuccess {Object} data Contains all configuration settings. See example or documentation for what each setting does.
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "data": {
 *       "EngineAllowNicknameChange": "1",
 *       "EngineAllowViewBlacklist": "1",
 *       "EngineAllowViewBlacklistCriterias": "1",
 *       "EngineAllowViewWhitelist": "1",
 *       "EngineAutoPlay": "0",
 *       "EngineDefaultLocale": "fr",
 *       "EngineDisplayConnectionInfo": "1",
 *       "EngineDisplayConnectionInfoHost": "",
 *       "EngineDisplayConnectionInfoMessage": "",
 *       "EngineDisplayConnectionInfoQRCode": "1",
 *       "EngineDisplayNickname": "1",
 * 		 "EngineFreeUpvotes": "1",
 * 		 "EngineFreeUpvotesPercent": "33",
 * 		 "EngineFreeUpvotesMin": "4",
 *       "EngineJinglesInterval": "1",
 *       "EnginePrivateMode": "1",
 *       "EngineRepeatPlaylist": "0",
 *       "EngineSmartInsert": "1",
 *       "EngineSongsPerUser": "10000",
 *       "PlayerBackground": "",
 *       "PlayerFullscreen": "0",
 *       "PlayerNoBar": "1",
 *       "PlayerNoHud": "1",
 *       "PlayerPIP": "1",
 *       "PlayerPIPPositionX": "Left",
 *       "PlayerPIPPositionY": "Bottom",
 *       "PlayerPIPSize": "30",
 *       "PlayerScreen": "0",
 *       "PlayerStayOnTop": "1",
 *       "VersionName": "Finé Fiévreuse",
 *       "VersionNo": "v2.0 Release Candidate 1",
 *       "mpvVideoOutput": "direct3d",
 * 		 "WebappMode": "2"
 *   }
 * }
 */
/**
 * @api {get} /public/stats Get statistics
 * @apiName GetStats
 * @apiVersion 2.0.0
 * @apiGroup Main
 * @apiPermission public
 * @apiDescription Returns various stats on the current Karaoke Mugen instance
 * @apiSuccess {Number} totalartists Total number of artists in database
 * @apiSuccess {Number} totalcount Total number of karaokes in database
 * @apiSuccess {Number} totalduration Sum of all karaoke durations in seconds.
 * @apiSuccess {Number} totallanguages Total number of different languages in database
 * @apiSuccess {Number} totalplaylists Total number of playlists in database
 * @apiSuccess {Number} totalseries Total number of series in database
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *    "data": {
 *        "totalartists": 542,
 *        "totalcount": 4924,
 *        "totalduration": 0,
 *        "totallanguages": 16,
 *        "totalplaylists": 5,
 *        "totalseries": 2525
 *    }
 * }
 */

/**
 * @api {post} /admin/shutdown Shutdown the entire application
 * @apiDescription
 * Shutdowns application completely. Kind of a self-destruct button.
 * @apiName PostShutdown
 * @apiGroup Main
 * @apiVersion 2.0.0
 *
 * @apiPermission admin
 * @apiSuccess {String} Shutdown in progress.
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * "Shutdown in progress."
 *
 */

/**
 * @api {post} /admin/playlists/ Create a playlist
 * @apiName PostPlaylist
 * @apiVersion 2.0.0
 * @apiGroup Playlists
 * @apiPermission admin
 *
 * @apiParam {String} name Name of playlist to create
 * @apiParam {Boolean} flag_public Is the playlist to create public? This unsets `flag_public` on the previous playlist which had it.
 * @apiParam {Boolean} flag_current Is the playlist to create current? This unsets `flag_current` on the previous playlist which had it.
 * @apiParam {Boolean} flag_visible Is the playlist to create visible to all users? If `false`, only admins can see it.
 *
 * @apiSuccess {String} args Name of playlist created
 * @apiSuccess {String} code Message to display
 * @apiSuccess {Number} data ID of newly created playlist
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 201 Created
 * {
 *   "args": "lol",
 *   "code": "PL_CREATED",
 *   "data": 4
 * }
 * @apiError PL_CREATE_ERROR Unable to create a playlist
 *
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 */


/**
 * @api {get} /admin/playlists/:pl_id Get playlist information
 * @apiName GetPlaylist
 * @apiGroup Playlists
 * @apiPermission admin
 * @apiVersion 2.0.0
 *
 * @apiParam {Number} pl_id Target playlist ID.
 * @apiSuccess {Number} data/created_at Playlist creation date in UNIX timestamp
 * @apiSuccess {Number} data/flag_current Is playlist the current one? Mutually exclusive with `flag_public`
 * @apiSuccess {Number} data/flag_public Is playlist the public one? Mutually exclusive with `flag_current`
 * @apiSuccess {Number} data/flag_visible Is playlist visible to normal users?
 * @apiSuccess {Number} data/length Duration of playlist in seconds
 * @apiSuccess {Number} data/modified_at Playlist last edit date in UNIX timestamp
 * @apiSuccess {String} data/name Name of playlist
 * @apiSuccess {Number} data/num_karas Number of karaoke songs in the playlist
 * @apiSuccess {Number} data/playlist_id Database's playlist ID
 * @apiSuccess {Number} data/time_left Time left in seconds before playlist ends, relative to the currently playing song's position.
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "data": {
 *       "created_at": 1508313440,
 *       "flag_current": 1,
 *       "flag_public": 0,
 *       "flag_visible": 1,
 *       "length": 0,
 *       "modified_at": 1508408078,
 *       "name": "Liste de lecture courante",
 *       "num_karas": 6,
 *       "playlist_id": 1,
 *       "time_left": 0
 *   }
 *}
 * @apiError PL_VIEW_ERROR Unable to fetch info from a playlist
 *
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 */

/**
 * @api {put} /admin/playlists/:pl_id Update a playlist's information
 * @apiName PutPlaylist
 * @apiVersion 2.0.0
 * @apiGroup Playlists
 * @apiPermission admin
 *
 * @apiParam {Number} pl_id Target playlist ID.
 * @apiParam {String} name Name of playlist to create
 * @apiParam {Boolean} flag_visible Is the playlist to create visible to all users? If `false`, only admins can see it.
 *
 * @apiSuccess {String} args ID of playlist updated
 * @apiSuccess {String} code Message to display
 * @apiSuccess {Number} data ID of playlist updated
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "args": 1,
 *   "code": "PL_UPDATED",
 *   "data": 1
 * }
 * @apiError PL_UPDATE_ERROR Unable to update a playlist
 *
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 */

/**
 * @api {delete} /admin/playlists/:pl_id Delete a playlist
 * @apiName DeletePlaylist
 * @apiVersion 2.0.0
 * @apiGroup Playlists
 * @apiPermission admin
 *
 * @apiParam {Number} pl_id Target playlist ID.
 * @apiSuccess {String} args ID of playlist deleted
 * @apiSuccess {String} code Message to display
 * @apiSuccess {Number} data ID of playlist deleted
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "args": 3,
 *   "code": "PL_DELETED",
 *   "data": 3
 * }
 * @apiError PL_DELETE_ERROR Unable to delete a playlist
 *
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 */

/**
 * @api {put} /admin/playlists/:pl_id/empty Empty a playlist
 * @apiName PutEmptyPlaylist
 * @apiVersion 2.0.0
 * @apiGroup Playlists
 * @apiPermission admin
 *
 * @apiParam {Number} pl_id Target playlist ID.
 * @apiSuccess {String} args ID of playlist emptied
 * @apiSuccess {String} code Message to display
 * @apiSuccess {Number} data ID of playlist emptied
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "args": 1,
 *   "code": "PL_EMPTIED",
 *   "data": 1
 * }
 * @apiError PL_EMPTY_ERROR Unable to empty a playlist
 *
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 */

/**
 * @api {put} /admin/whitelist/empty Empty whitelist
 * @apiName PutEmptyWhitelist
 * @apiVersion 2.0.0
 * @apiGroup Whitelist
 * @apiPermission admin
 *
 * @apiSuccess {String} code Message to display
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "code": "WL_EMPTIED"
 * }
 * @apiError WL_EMPTY_ERROR Unable to empty the whitelist
 *
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 */

/**
 * @api {put} /admin/blacklist/criterias/empty Empty list of blacklist criterias
 * @apiName PutEmptyBlacklist
 * @apiVersion 2.0.0
 * @apiGroup Blacklist
 * @apiPermission admin
 *
 * @apiSuccess {String} code Message to display
 * @apiSuccess {Number} data `null`
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "code": "BLC_EMPTIED",
 *   "data": null
 * }
 * @apiError BLC_EMPTY_ERROR Unable to empty list of blacklist criterias
 *
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 */

/**
 * @api {put} /admin/playlists/:pl_id/setCurrent Set playlist to current
 * @apiName PutSetCurrentPlaylist
 * @apiVersion 2.0.0
 * @apiGroup Playlists
 * @apiPermission admin
 *
 * @apiParam {Number} pl_id Target playlist ID.
 * @apiSuccess {String} args ID of playlist updated
 * @apiSuccess {String} code Message to display
 * @apiSuccess {Number} data `null`
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "args": 1,
 *   "code": "PL_SET_CURRENT",
 *   "data": null
 * }
 * @apiError PL_SET_CURRENT_ERROR Unable to set this playlist to current. The playlist is a public one and can't be set to current at the same time. First set another playlist as public so this playlist has no flags anymore and can be set current.
 *
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 */

/**
 * @api {put} /admin/playlists/:pl_id/setPublic Set playlist to public
 * @apiName PutSetPublicPlaylist
 * @apiVersion 2.0.0
 * @apiGroup Playlists
 * @apiPermission admin
 *
 * @apiParam {Number} pl_id Target playlist ID.
 * @apiSuccess {String} args ID of playlist updated
 * @apiSuccess {String} code Message to display
 * @apiSuccess {Number} data `null`
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "args": 1,
 *   "code": "PL_SET_PUBLIC",
 *   "data": null
 * }
 * @apiError PL_SET_PUBLIC_ERROR Unable to set this playlist to public. The playlist is a current one and can't be set to public at the same time. First set another playlist as current so this playlist has no flags anymore and can be set public.
 *
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 */

/**
 * @api {patch} /admin/playlists/:pl_id/karas Copy karaokes to another playlist
 * @apiName PatchPlaylistKaras
 * @apiVersion 2.0.0
 * @apiGroup Playlists
 * @apiPermission admin
 *
 * @apiParam {Number} pl_id Target playlist ID.
 * @apiParam {Number[]} plc_id List of `playlistcontent_id` separated by commas (`,`). Example : `1021,2209,44,872`
 * @apiParam {Number} [pos] Position in target playlist where to copy the karaoke to. If not specified, will place karaokes at the end of target playlist
 * @apiSuccess {String[]} args/plc_ids IDs of playlist contents copied
 * @apiSuccess {String} args/playlist_id ID of destinaton playlist
 * @apiSuccess {String} code Message to display
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "args": {
 *       "playlist": 2,
 *       "plc_ids": [
 * 			"4946",
 * 			"639"
 * 		 ]
 *   },
 *   "code": "PL_SONG_MOVED",
 *   "data": null
 * }
 * @apiError PL_MOVE_SONG_ERROR Unable to copy karaoke song to the destination playlist
 *
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * {
 *   "args": "Liste de lecture publique",
 *   "code": "PL_MOVE_SONG_ERROR",
 *   "message": "Karaoke song 176 is already in playlist 2"
 * }
 */

/**
 * @api {delete} /admin/playlists/:pl_id/karas Delete karaokes from playlist
 * @apiName DeletePlaylistKaras
 * @apiVersion 2.0.0
 * @apiGroup Playlists
 * @apiPermission admin
 *
 * @apiParam {Number} pl_id Target playlist ID.
 * @apiParam {Number[]} plc_id List of `plc_id` separated by commas (`,`). Example : `1021,2209,44,872`
 * @apiSuccess {String} args Name of playlist the song was deleted from
 * @apiSuccess {String} code Message to display
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "args": "Liste de lecture publique",
 *   "code": "PL_SONG_DELETED",
 *   "data": null
 * }
 * @apiError PL_DELETE_SONG_ERROR Unable to delete the song from the selected playlist
 *
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * {
 *   "args": "Liste de lecture publique",
 *   "code": "PL_DELETE_SONG_ERROR",
 *   "message": "[PLC] GetPLContentInfo : PLCID 4960 unknown"
 * }
 */

/**
 * @api {put} /admin/playlists/:pl_id/karas/:plc_id Update song in a playlist
 * @apiName PutPlaylistKara
 * @apiVersion 2.0.0
 * @apiGroup Playlists
 * @apiPermission admin
 *
 * @apiParam {Number} pl_id Playlist ID. **Note :** Irrelevant since `plc_id` is unique already.
 * @apiParam {Number} plc_id `playlistcontent_id` of the song to update
 * @apiParam {Number} [pos] Position in target playlist where to move the song to.
 * @apiParam {Number} [flag_playing] If set to 1, the select song will become the currently playing song.
 * @apiSuccess {String} code Message to display
 * @apiSuccess {String} data PLCID modified
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "code": "PL_CONTENT_MODIFIED",
 *   "data": "4962"
 * }
 * @apiError PL_MODIFY_CONTENT_ERROR Unable to modify content's position or playing status
 *
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * {
 *   "code": "PL_MODIFY_CONTENT_ERROR",
 *   "message": "PLCID unknown!"
 * }
 */

/**
 * @api {post} /admin/player/message Send a message to screen or users' devices
 * @apiName PostPlayerMessage
 * @apiVersion 2.0.0
 * @apiGroup Player
 * @apiPermission admin
 *
 * @apiParam {String} message Message to display
 * @apiParam {Number} [duration=10000] Duration of message in miliseconds
 * @apiParam {String="users","screen"} [destination="screen"] `users` for user's devices, or `screen` for the screen on which the karaoke is running. Default is `screen`.
 * @apiSuccess {String} code Message to display
 * @apiSuccess {String} data Data sent to the API
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "code": "MESSAGE_SENT",
 *   "data": {
 *       "destination": "screen",
 *       "duration": 10000,
 *       "message": "yolo"
 *   }
 * }
 * @apiError MESSAGE_SEND_ERROR Message couldn't be sent
 *
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * {
 *   "code": "MESSAGE_SEND_ERROR"
 * }
 */

/**
 * @api {post} /admin/whitelist Add song to whitelist
 * @apiName PostWhitelist
 * @apiVersion 2.0.0
 * @apiGroup Whitelist
 * @apiPermission admin
 *
 * @apiParam {Number[]} kara_id Karaoke song IDs, separated by commas
 * @apiSuccess {Number} args Arguments associated with message
 * @apiSuccess {Number} code Message to display
 * @apiSuccess {Number[]} data/kara_id List of karaoke IDs separated by commas
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 201 Created
 * {
 *   "args": "2",
 *   "code": "WL_SONG_ADDED",
 *   "data": {
 *       "kara_id": "2"
 *   }
 * }
 * @apiError WL_ADD_SONG_ERROR Karaoke couldn't be added to whitelist
 *
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * {
 *   "args": [
 *       "2"
 *   ],
 *   "code": "WL_ADD_SONG_ERROR",
 *   "message": "No karaoke could be added, all are in whitelist already"
 * }
 */
/**
 * @api {delete} /admin/whitelist Delete whitelist item
 * @apiName DeleteWhitelist
 * @apiVersion 2.0.0
 * @apiGroup Whitelist
 * @apiPermission admin
 *
 * @apiParam {Number[]} wlc_id Whitelist content IDs to delete from whitelist, separated by commas
 * @apiSuccess {Number} args Arguments associated with message
 * @apiSuccess {Number} code Message to display
 * @apiSuccess {Number[]} data List of Whitelist content IDs separated by commas
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "args": "1",
 *   "code": "WL_SONG_DELETED",
 *   "data": "1"
 * }
 * @apiError WL_DELETE_SONG_ERROR Whitelist item could not be deleted.
 *
 */

/**
 * @api {get} /admin/blacklist/criterias Get list of blacklist criterias
 * @apiName GetBlacklistCriterias
 * @apiVersion 2.0.0
 * @apiGroup Blacklist
 * @apiPermission admin
 *
 * @apiSuccess {Number} data/blcriteria_id Blacklist criteria's ID.
 * @apiSuccess {Number} data/type Blacklist criteria's type. Refer to dev documentation for more info on BLC types.
 * @apiSuccess {Number} data/value Value associated to balcklist criteria (what is being blacklisted)
 * @apiSuccess {String} data/value_i18n Translated value to display on screen.
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "data": [
 *       {
 *           "blcriteria_id": 2,
 *           "type": 6,
 *           "value": "241",
 *           "value_i18n": "Jean-Jacques Debout"
 *       }
 *   ]
 * }
 *
 * @apiError BLC_VIEW_ERROR Blacklist criterias could not be listed
 *
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * {
 *   "code": "BLC_VIEW_ERROR"
 * }
 */

/**
 * @api {post} /admin/blacklist/criterias Add a blacklist criteria
 * @apiName PostBlacklistCriterias
 * @apiVersion 2.0.0
 * @apiGroup Blacklist
 * @apiPermission admin
 *
 * @apiParam {Number} blcriteria_type Blacklist criteria type (refer to docs)
 * @apiParam {String} blcriteria_value Blacklist criteria value. Depending on type, can be number or string.
 * @apiSuccess {String} code Message to display
 * @apiSuccess {String} args arguments for the message
 * @apiSuccess {String} data Data returned from API
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 201 Created
 * {
 *   "args": {
 *       "blcriteria_type": "1000",
 *       "blcriteria_value": "lol"
 *   },
 *   "code": "BLC_ADDED",
 *   "data": {
 *       "blcriteria_type": "1000",
 *       "blcriteria_value": "lol"
 *   }
 * }
 * @apiError BLC_ADD_ERROR Blacklist criteria could not be added
 *
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * {
 *   "code": "BLC_ADD_ERROR",
 *   "message": {
 *       "code": "SQLITE_ERROR",
 *       "errno": 1
 *   }
 * }
 */

/**
 * @api {post} /admin/blacklist/criterias Add a blacklist criteria
 * @apiName PostBlacklistCriterias
 * @apiVersion 2.0.0
 * @apiGroup Blacklist
 * @apiPermission admin
 *
 * @apiParam {Number} blcriteria_type Blacklist criteria type (refer to docs)
 * @apiParam {String} blcriteria_value Blacklist criteria value. Depending on type, can be number or string.
 * @apiSuccess {String} code Message to display
 * @apiSuccess {String} args arguments for the message
 * @apiSuccess {String} data Data returned from API
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 201 Created
 * {
 *   "args": {
 *       "blcriteria_type": "1000",
 *       "blcriteria_value": "lol"
 *   },
 *   "code": "BLC_ADDED",
 *   "data": {
 *       "blcriteria_type": "1000",
 *       "blcriteria_value": "lol"
 *   }
 * }
 * @apiError BLC_ADD_ERROR Blacklist criteria could not be added
 *
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * {
 *   "code": "BLC_ADD_ERROR",
 *   "message": {
 *       "code": "SQLITE_ERROR",
 *       "errno": 1
 *   }
 * }
 */

/**
 * @api {delete} /admin/blacklist/criterias/:blc_id Delete a blacklist criteria
 * @apiName DeleteBlacklistCriterias
 * @apiVersion 2.0.0
 * @apiGroup Blacklist
 * @apiPermission admin
 *
 * @apiParam {Number} blc_id Blacklist criteria's ID to delete
 * @apiSuccess {String} code Message to display
 * @apiSuccess {String} args arguments for the message
 * @apiSuccess {String} data Data returned from API
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "args": "5",
 *   "code": "BLC_DELETED",
 *   "data": "5"
 * }
 * @apiError BLC_DELETE_ERROR Unable to delete Blacklist criteria
 *
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * {
 *   "code": "BLC_DELETE_ERROR",
 *   "message": "BLCID 5 unknown"
 * }
 */

/**
 * @api {put} /admin/blacklist/criterias/:blc_id Edit a blacklist criteria
 * @apiName PutBlacklistCriterias
 * @apiVersion 2.0.0
 * @apiGroup Blacklist
 * @apiPermission admin
 *
 * @apiParam {Number} blc_id Blacklist criteria's ID to delete
 * @apiParam {Number} blcriteria_type New blacklist criteria's type
 * @apiParam {String} blcriteria_value New blacklist criteria's value
 * @apiSuccess {String} code Message to display
 * @apiSuccess {String} args arguments for the message
 * @apiSuccess {String} data Data returned from API
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "args": "6",
 *   "code": "BLC_UPDATED",
 *   "data": {
 *       "blcriteria_type": "8",
 *       "blcriteria_value": "750"
 *   }
 * }
 * @apiError BLC_UPDATE_ERROR Unable to update Blacklist criteria
 *
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * {
 *   "code": "BLC_UPDATE_ERROR",
 *   "message": "BLCID 12309 unknown"
 * }
 */

/**
 * @api {put} /admin/player Send commands to player
 * @apiName PutPlayerCommando
 * @apiVersion 2.0.0
 * @apiGroup Player
 * @apiPermission admin
 *
 * @apiParam {String=play,pause,stopNow,stopAfter,skip,prev,toggleFullscreen,toggleAlwaysOnTop,seek,goTo,mute,unmute,setVolume,showSubs,hideSubs} command Command to send to player
 * @apiParam {String} [option] Parameter for the command being sent
 * @apiSuccess {String} code Message to display
 * @apiSuccess {String} args arguments for the message
 * @apiSuccess {String} data Data returned from API
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "args": {
 *       "command": "stopNow"
 *   },
 *   "code": "COMMAND_SENT",
 *   "data": {
 *       "command": "stopNow"
 *   }
 * }
 */

/**
 * @api {get} /admin/playlists/:pl_id/export Export a playlist
 * @apiDescription Export format is in JSON. You'll usually want to save it to a file for later use.
 * @apiName getPlaylistExport
 * @apiVersion 2.0.0
 * @apiGroup Playlists
 * @apiPermission admin
 * @apiParam {Number} pl_id Playlist ID to export
 * @apiSuccess {String} data Playlist in an exported format. See docs for more info.
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "data": {
 *       "Header": {
 *           "description": "Karaoke Mugen Playlist File",
 *           "version": 2
 *       },
 *       "PlaylistContents": [
 *           {
 *               "flag_playing": 1,
 *               "kid": "b0de301c-5756-49fb-b019-85a99a66586b"
 *           },
 *           {
 *               "kid": "6da96a7d-7159-4ea7-a5ee-1d78a6eb44dd"
 *           },
 *           {
 *               "kid": "5af7ba4c-2325-451d-a24f-e7fd7c2d3ba8"
 *           },
 *           {
 *               "kid": "e0206f48-0f51-44e3-bf9a-b651916d0c05"
 *           }
 *       ],
 *       "PlaylistInformation": {
 *           "created_at": 1508936812,
 *           "flag_visible": 0,
 *           "modified_at": 1508936821,
 *           "name": "Test",
 *           "time_left": 0
 *       }
 *   }
 * }
 * @apiError PL_EXPORT_ERROR Unable to export playlist
 *
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * {
 *   "args": "5",
 *   "code": "PL_EXPORT_ERROR",
 *   "message": "Playlist 5 unknown"
 * }
 */

/**
 * @api {post} /admin/playlists/import Import a playlist
 * @apiName postPlaylistImport
 * @apiVersion 2.0.0
 * @apiGroup Playlists
 * @apiPermission admin
 *
 * @apiSuccess {String} playlist Playlist in JSON form, following Karaoke Mugen's file format. See docs for more info.
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "args": 4,
 *   "code": "PL_IMPORTED",
 *   "data": {
 *       "message": "Playlist imported",
 *       "playlist_id": 4,
 *       "unknownKaras": []
 *   }
 * }
 * @apiError PL_IMPORT_ERROR Unable to import playlist
 *
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * {
 *   "code": "PL_IMPORT_ERROR",
 *   "message": "No header section"
 * }
 */

/**
 * @api {put} /admin/playlists/:pl_id/shuffle Shuffle a playlist
 * @apiDescription Playlist is shuffled in database. The shuffling only begins after the currently playing song. Songs before that one are unaffected.
 * @apiName putPlaylistShuffle
 * @apiVersion 2.0.0
 * @apiGroup Playlists
 * @apiPermission admin
 * @apiParam {Number} pl_id Playlist ID to shuffle
 * @apiSuccess {String} args ID of playlist shuffled
 * @apiSuccess {String} code Message to display
 * @apiSuccess {Number} data ID of playlist shuffled
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "args": "5",
 *   "code": "PL_SHUFFLED",
 *   "data": "5"
 * }
 * @apiError PL_SHUFFLE_ERROR Unable to shuffle playlist
 *
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * {
 *   "args": "10",
 *   "code": "PL_SHUFFLE_ERROR",
 *   "message": "Playlist 10 unknown"
 * }
 */

/**
 * @api {get} /public/stats Get statistics
 * @apiName GetStats
 * @apiVersion 2.0.0
 * @apiGroup Main
 * @apiPermission public
 * @apiDescription Returns various stats on the current Karaoke Mugen instance
 * @apiSuccess {Number} totalartists Total number of artists in database
 * @apiSuccess {Number} totalcount Total number of karaokes in database
 * @apiSuccess {Number} totalduration Sum of all karaoke durations in seconds.
 * @apiSuccess {Number} totallanguages Total number of different languages in database
 * @apiSuccess {Number} totalplaylists Total number of playlists in database
 * @apiSuccess {Number} totalseries Total number of series in database
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *    "data": {
 *        "totalartists": 542,
 *        "totalcount": 4924,
 *        "totalduration": 0,
 *        "totallanguages": 16,
 *        "totalplaylists": 5,
 *        "totalseries": 2525
 *    }
 * }
 */

/**
	* @api {get} /public/tags Get tag list
	* @apiName GetTags
	* @apiVersion 2.1.0
	* @apiGroup Karaokes
	* @apiPermission public
	* @apiHeader authorization Auth token received from logging in
	* @apiSuccess {String} data/name Name of tag
	* @apiSuccess {String} data/name_i18n Translated name of tag
	* @apiSuccess {Number} data/tag_id Tag ID number
	* @apiSuccess {Number} data/type Tag type number
	*
	* @apiSuccessExample Success-Response:
	* HTTP/1.1 200 OK
	* {
	*     "data": [
	*        {
	*          "name": "20th Century",
	*          "name_i18n": "20th Century",
	*          "tag_id": 371,
	*          "type": 2
	*        },
	*        {
	*		   "name": "TYPE_AMV",
	*          "name_i18n": "Anime Music Video",
	*          "tag_id": 15,
	*          "type": 3
	*        },
	*        {
	*          "name": "ita",
	*          "name_i18n": "Italien",
	*          "tag_id": 370,
	*          "type": 5
	*        }
	*		 ...
	*   ]
	* }
	* @apiError TAGS_LIST_ERROR Unable to get list of tags
	* @apiError WEBAPPMODE_CLOSED_API_MESSAGE API is disabled at the moment.
	* @apiErrorExample Error-Response:
	* HTTP/1.1 500 Internal Server Error
	* @apiErrorExample Error-Response:
    * HTTP/1.1 403 Forbidden
	*/

/**
 * @api {put} /admin/playlists/:pl_id/karas/:plc_id Update song in a playlist
 * @apiName PutPlaylistKara
 * @apiVersion 2.1.0
 * @apiGroup Playlists
 * @apiPermission admin
 * @apiHeader authorization Auth token received from logging in
 * @apiParam {Number} pl_id Playlist ID. **Note :** Irrelevant since `plc_id` is unique already.
 * @apiParam {Number} plc_id `playlistcontent_id` of the song to update
 * @apiParam {Number} [pos] Position in target playlist where to move the song to.
 * @apiParam {Number} [flag_playing] If set to 1, the selected song will become the currently playing song.
 * @apiSuccess {String} code Message to display
 * @apiSuccess {String} data PLCID modified
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "code": "PL_CONTENT_MODIFIED",
 *   "data": "4962"
 * }
 * @apiError PL_MODIFY_CONTENT_ERROR Unable to modify content's position or playing status
 *
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * {
 *   "code": "PL_MODIFY_CONTENT_ERROR",
 *   "message": "PLCID unknown!"
 * }
 */

/**
	 * @api {post} /public/playlists/public/karas/:plc_id/vote Up/downvote a song in public playlist
	 * @apiName PostVote
	 * @apiVersion 2.1.0
	 * @apiGroup Playlists
	 * @apiPermission public
	 * @apiHeader authorization Auth token received from logging in
	 * @apiParam {Number} plc_id Target playlist content ID
	 * @apiParam {String} [downvote] If anything is specified in this parameter, it'll be a downvote instead of upvote.
	 * @apiSuccess {String} code Return code
	 * @apiSuccess {String} args Name of song being upvoted
	 * @apiSuccessExample Success-Response:
	 * HTTP/1.1 200 OK
	 * {
	 *   "code": 'UPVOTE_DONE',
	 *   "args": 'Shoujo Kakumei Utena - Rinbu Revolution'
	 * }
	 * @apiError UPVOTE_FAILED Unable to upvote karaoke
	 * @apiError DOWNVOTE_FAILED Unable to downvote karaoke
	 * @apiError UPVOTE_ALREADY_DONE Karaoke has already been upvoted by this user
	 * @apiError DOWNVOTE_ALREADY_DONE Karaoke has already been downvoted by this user
	 *
	 * @apiErrorExample Error-Response:
	 * HTTP/1.1 500 Internal Server Error
	 */

/**
 * @api {get} /admin/playlists/:pl_id/karas/:plc_id Get song info from a playlist
 * @apiName GetPlaylistPLC
 * @apiVersion 2.2.0
 * @apiGroup Playlists
 * @apiPermission admin
 * @apiHeader authorization Auth token received from logging in
 * @apiParam {Number} pl_id Target playlist ID. **Note :** Irrelevant since PLCIDs are unique in the table.
 * @apiParam {Number} plc_id Playlist content ID.
 * @apiSuccess {String} data/NORM_author Normalized karaoke's author name
 * @apiSuccess {String} data/NORM_creator Normalized creator's name
 * @apiSuccess {String} data/NORM_pseudo_add Normalized name of person who added the karaoke to the playlist
 * @apiSuccess {String} data/NORM_serie Normalized name of series the karaoke is from
 * @apiSuccess {String} data/NORM_serie_altname Normalized names of alternative names to the series the karaoke is from. When there are more than one alternative name, they're separated by forward slashes (`/`)
 * @apiSuccess {String} data/NORM_singer Normalized name of singer.
 * @apiSuccess {String} data/NORM_songwriter Normalized name of songwriter.
 * @apiSuccess {String} data/NORM_title Normalized song title
 * @apiSuccess {String} data/author Karaoke author's name
 * @apiSuccess {Number} data/created_at UNIX timestamp of the karaoke's creation date in the base
 * @apiSuccess {String} data/creator Show's creator name
 * @apiSuccess {Number} data/duration Song duration in seconds
 * @apiSuccess {Number} data/flag_blacklisted Is the song in the blacklist ?
 * @apiSuccess {Number} data/flag_playing Is the song the one currently playing ?
 * @apiSuccess {Number} data/flag_whitelisted Is the song in the whitelist ?
 * @apiSuccess {Number} data/flag_dejavu Has the song been played in the last hour ? (`EngineMaxDejaVuTime` defaults to 60 minutes)
 * @apiSuccess {Number} data/flag_favorites 1 = the song is in your favorites, 0 = not.
 * @apiSuccess {Number} data/gain Calculated audio gain for the karaoke's video, in decibels (can be negative)
 * @apiSuccess {Number} data/kara_id Karaoke's ID in the main database
 * @apiSuccess {String} data/kid Karaoke's unique ID (survives accross database generations)
 * @apiSuccess {String} data/language Song's language in ISO639-2B format, separated by commas when a song has several languages
 * @apiSuccess {String} data/language_i18n Song's language translated in the client's native language
 * @apiSuccess {Number} data/lastplayed_at When the song has been played last, in unix timestamp
 * @apiSuccess {String} data/misc Internal tag list (`TAG_VIDEOGAME`, etc.)
 * @apiSuccess {String} data/misc_i18n Translated tag list
 * @apiSuccess {Number} data/playlist_id ID of playlist this song belongs to
 * @apiSuccess {Number} data/playlistcontent_ID PLC ID of this song.
 * @apiSuccess {Number} data/pos Position in the playlist. First song has a position of `1`
 * @apiSuccess {String} data/previewfile Filename of the preview file associated with the karaoke. Can be undefined if the preview hasn't been generated yet by the server.
 * @apiSuccess {String} data/pseudo_add Nickname of user who added/requested the song. this nickname can be changed (`username` cannot) hence why it is displayed here.
 * @apiSuccess {String} data/requested Number of times the song has been requested.
 * @apiSuccess {String} data/serie Name of series/show the song belongs to
 * @apiSuccess {Object} data/serie_i18n JSON object with series' names depending on their language.
 * @apiSuccess {String} data/serie_altname Alternative name(s) of series/show this song belongs to. Names are separated by forward slashes (`/`)
 * @apiSuccess {String} data/singer Singer's name, if known.
 * @apiSuccess {Number} data/songorder Song's order, relative to it's type. Opening 1, Opening 2, Ending 1, Ending 2, etc.
 * @apiSuccess {String} data/songtype Song's type internal tag (`TYPE_OP`, `TYPE_ED`, `TYPE_IN` ...)
 * @apiSuccess {String} data/songtype_i18n Translated song's type (`Opening`, `Ending`, `Insert Song`...)
 * @apiSuccess {String} data/songtype_i18n_short Short translated version of the song's type (`OP`, `ED`, `IN`, ...)
 * @apiSuccess {Number} data/time_before_play Estimated time remaining before the song is going to play (in seconds). `0` if the song is currently playing or if there is no song selected as currently playing in the playlist (thus making this estimate impossible)
 * @apiSuccess {String} data/title Song's title
 * @apiSuccess {String} data/username Username who submitted this karaoke. Can be different from `pseudo_add`.
 * @apiSuccess {String} data/mediafile Media's filename
 * @apiSuccess {Number} data/viewcount Counts how many times the song has been played
 * @apiSuccess {String} data/year Song's creation year. Empty string is returned if no year is known.
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "data": [
 *       {
 *           "NORM_author": null,
 *           "NORM_creator": null,
 *           "NORM_pseudo_add": "Axel",
 *           "NORM_serie": "C3 ~ Cube X Cursed X Curious",
 *           "NORM_serie_altname": "C-Cube/CxCxC",
 *           "NORM_singer": null,
 *           "NORM_songwriter": null,
 *           "NORM_title": "Hana",
 *           "author": null,
 *           "created_at": 1508427958,
 *           "creator": null,
 *           "duration": 0,
 *           "flag_blacklisted": 0,
 *           "flag_playing": 0,
 *           "flag_whitelisted": 0,
 *           "flag_dejavu": 0,
 * 			 "flag_favorites": 0,
 *           "gain": 0,
 *           "kara_id": 1007,
 *           "kid": "c05e24eb-206b-4ff5-88d4-74e8d5ad6f75",
 *           "language": "jpn",
 *           "language_i18n": "Japonais",
 * 			 "lastplayed_at": null,
 *           "mediafile": "JAP - C3 ~ Cube X Cursed X Curious - ED1 - Hana.avi",
 *           "misc": null,
 *           "misc_i18n": null,
 *           "playlist_id": 2,
 *           "playlistcontent_id": 4961,
 *           "pos": 12,
 *           "previewfile": "JAP - C3 ~ Cube X Cursed X Curious.1201230.mp4"
 *           "pseudo_add": "Axel",
 * 			 "requested": 20,
 *           "serie": "C3 ~ Cube X Cursed X Curious",
 *  		 "serie_i18n": {
 * 				"fre":"Guerriers de la Dynastie"
 *  			},
 *           "serie_altname": "C-Cube/CxCxC",
 *           "singer": null,
 *           "songorder": 1,
 *           "songtype": "TYPE_ED",
 *           "songtype_i18n": "Ending",
 *           "songtype_i18n_short": "ED",
 *           "songwriter": null,
 *           "time_before_play": 0,
 *           "title": "Hana",
 * 			 "username": "axelterizaki",
 *           "viewcount": 0,
 *           "year": ""
 *       }
 *   ]
 * }
 * @apiError PL_VIEW_CONTENT_ERROR Unable to fetch playlist's content information
 *
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * {
 *   "code": "PL_VIEW_CONTENT_ERROR",
 *   "message": "PLCID unknown!"
 * }
 */

 	/**
 * @api {get} /public/playlists/:pl_id/karas Get list of karaokes in a playlist (public)
 * @apiName GetPlaylistKarasPublic
 * @apiVersion 2.2.0
 * @apiGroup Playlists
 * @apiPermission public
 * @apiHeader authorization Auth token received from logging in
 * @apiDescription Contrary to the `/admin/playlists/` path, this one will not return playlists which have the `flag_visible` set to `0`.
 * @apiParam {Number} pl_id Target playlist ID.
 * @apiParam {String} [filter] Filter list by this string.
 * @apiParam {Number} [from=0] Return only the results starting from this position. Useful for continuous scrolling. 0 if unspecified
 * @apiParam {Number} [size=999999] Return only x number of results. Useful for continuous scrolling. 999999 if unspecified.
 *
 * @apiSuccess {Object[]} data/content/karas Array of `kara` objects
 * @apiSuccess {Number} data/infos/count Number of karaokes in playlist
 * @apiSuccess {Number} data/infos/from Starting position of listing
 * @apiSuccess {Number} data/infos/to End position of listing
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "data": {
 *       "content": [
 *           {
 *               "NORM_author": null,
 *               "NORM_creator": null,
 *               "NORM_pseudo_add": "Administrateur",
 *               "NORM_serie": "Dynasty Warriors 3",
 *               "NORM_serie_altname": "DW3/DW 3",
 *               "NORM_singer": null,
 *               "NORM_songwriter": null,
 *               "NORM_title": "Circuit",
 *               "author": null,
 *               "created_at": 1508423806,
 *               "creator": null,
 *               "duration": 0,
 *               "flag_blacklisted": 0,
 *               "flag_playing": 1,
 *               "flag_whitelisted": 0,
 * 	             "flag_dejavu": 0,
 *               "gain": 0,
 *               "kara_id": 176,
 *               "kid": "b0de301c-5756-49fb-b019-85a99a66586b",
 *               "language": "chi",
 *               "language_i18n": "Chinois",
 * 				 "lastplayed_at": null,
 *               "mediafile": "CHI - Dynasty Warriors 3 - GAME ED - Circuit.avi"
 *               "misc": "TAG_VIDEOGAME",
 *               "misc_i18n": "Jeu vidéo",
 *               "playlistcontent_id": 4946,
 *               "pos": 1,
 *               "pseudo_add": "Administrateur",
 * 				 "requested": 20,
 *               "serie": "Dynasty Warriors 3",
 * 				 "serie_i18n": {
 *					"fre":"Guerriers de la Dynastie"
 * 				}
 *               "serie_altname": "DW3/DW 3",
 *               "singer": null,
 *               "songorder": 0,
 *               "songtype": "TYPE_ED",
 *               "songtype_i18n": "Ending",
 *               "songtype_i18n_short": "ED",
 *               "songwriter": null,
 *               "title": "Circuit",
 * 				 "username": "admin",
 *               "viewcount": 0,
 *               "year": ""
 *           },
 *           ...
 *       ],
 *       "infos": {
 *           "count": 3,
 * 			 "from": 0,
 * 			 "to": 120
 *       }
 *   }
 * }
 * @apiError PL_VIEW_SONGS_ERROR Unable to fetch list of karaokes in a playlist
 * @apiError WEBAPPMODE_CLOSED_API_MESSAGE API is disabled at the moment.
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * @apiErrorExample Error-Response:
 * HTTP/1.1 403 Forbidden
 */

 	/**
 * @api {get} /public/playlists/:pl_id/karas/:plc_id Get song info from a playlist (public)
 * @apiName GetPlaylistPLCPublic
 * @apiVersion 2.2.0
 * @apiGroup Playlists
 * @apiPermission public
 * @apiHeader authorization Auth token received from logging in
 * @apiDescription Contrary to the `admin/playlists` path, this one won't return any karaoke info from a playlist the user has no access to.
 * @apiParam {Number} pl_id Target playlist ID. **Note :** Irrelevant since PLCIDs are unique in the table.
 * @apiParam {Number} plc_id Playlist content ID.
 * @apiSuccess {String} data/NORM_author Normalized karaoke's author name
 * @apiSuccess {String} data/NORM_creator Normalized creator's name
 * @apiSuccess {String} data/NORM_pseudo_add Normalized name of person who added the karaoke to the playlist
 * @apiSuccess {String} data/NORM_serie Normalized name of series the karaoke is from
 * @apiSuccess {String} data/NORM_serie_altname Normalized names of alternative names to the series the karaoke is from. When there are more than one alternative name, they're separated by forward slashes (`/`)
 * @apiSuccess {String} data/NORM_singer Normalized name of singer.
 * @apiSuccess {String} data/NORM_songwriter Normalized name of songwriter.
 * @apiSuccess {String} data/NORM_title Normalized song title
 * @apiSuccess {String} data/author Karaoke author's name
 * @apiSuccess {Number} data/created_at UNIX timestamp of the karaoke's creation date in the base
 * @apiSuccess {String} data/creator Show's creator name
 * @apiSuccess {Number} data/duration Song duration in seconds
 * @apiSuccess {Number} data/flag_blacklisted Is the song in the blacklist ?
 * @apiSuccess {Number} data/flag_favorites 1 = the song is in your favorites, 0 = not.
 * @apiSuccess {Number} data/flag_playing Is the song the one currently playing ?
 * @apiSuccess {Number} data/flag_whitelisted Is the song in the whitelist ?
 * @apiSuccess {Number} data/flag_dejavu Has the song been played in the last hour ? (by default, `EngineMaxDejaVuTime` is at 60 minutes)
 * @apiSuccess {Number} data/gain Calculated audio gain for the karaoke's video, in decibels (can be negative)
 * @apiSuccess {Number} data/kara_id Karaoke's ID in the main database
 * @apiSuccess {String} data/kid Karaoke's unique ID (survives accross database generations)
 * @apiSuccess {String} data/language Song's language in ISO639-2B format, separated by commas when a song has several languages
 * @apiSuccess {String} data/language_i18n Song's language translated in the client's native language
 * @apiSuccess {Number} data/lastplayed_at Time when the song was last played at in UNIX timestamp. `null` if never played before.
 * @apiSuccess {String} data/mediafile Video's filename
 * @apiSuccess {String} data/misc Internal tag list (`TAG_VIDEOGAME`, etc.)
 * @apiSuccess {String} data/misc_i18n Translated tag list
 * @apiSuccess {Number} data/playlist_id ID of playlist this song belongs to
 * @apiSuccess {Number} data/playlistcontent_ID PLC ID of this song.
 * @apiSuccess {Number} data/pos Position in the playlist. First song has a position of `1`
 * @apiSuccess {String} data/pseudo_add Nickname of user who added this song
 * @apiSuccess {String} data/requested Number of times the song has been requested.
 * @apiSuccess {String} data/serie Name of series/show the song belongs to
 * @apiSuccess {Object} data/serie_i18n JSON object with series' names depending on their language.
 * @apiSuccess {String} data/serie_altname Alternative name(s) of series/show this song belongs to. Names are separated by forward slashes (`/`)
 * @apiSuccess {String} data/singer Singer's name, if known.
 * @apiSuccess {Number} data/songorder Song's order, relative to it's type. Opening 1, Opening 2, Ending 1, Ending 2, etc.
 * @apiSuccess {String} data/songtype Song's type internal tag (`TYPE_OP`, `TYPE_ED`, `TYPE_IN` ...)
 * @apiSuccess {String} data/songtype_i18n Translated song's type (`Opening`, `Ending`, `Insert Song`...)
 * @apiSuccess {String} data/songtype_i18n_short Short translated version of the song's type (`OP`, `ED`, `IN`, ...)
 * @apiSuccess {Number} data/time_before_play Estimated time remaining before the song is going to play (in seconds). `0` if the song is currently playing or if there is no song selected as currently playing in the playlist (thus making this estimate impossible)
 * @apiSuccess {String} data/title Song's title
 * @apiSuccess {String} data/username Username who added that song
 * @apiSuccess {Number} data/viewcount Counts how many times the song has been played
 * @apiSuccess {String} data/year Song's creation year. Empty string is returned if no year is known.
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "data": [
 *       {
 *           "NORM_author": null,
 *           "NORM_creator": null,
 *           "NORM_pseudo_add": "Axel",
 *           "NORM_serie": "C3 ~ Cube X Cursed X Curious",
 *           "NORM_serie_altname": "C-Cube/CxCxC",
 *           "NORM_singer": null,
 *           "NORM_songwriter": null,
 *           "NORM_title": "Hana",
 *           "author": null,
 *           "created_at": 1508427958,
 *           "creator": null,
 *           "duration": 0,
 *           "flag_blacklisted": 0,
 *           "flag_playing": 0,
 * 			 "flag_favorites": 0,
 *           "flag_whitelisted": 0,
 * 	         "flag_dejavu": 0,
 *           "gain": 0,
 *           "kara_id": 1007,
 *           "kid": "c05e24eb-206b-4ff5-88d4-74e8d5ad6f75",
 *           "language": "jpn",
 *           "language_i18n": "Japonais",
 * 			 "lastplayed_at": null,
 *           "mediafile": "JAP - C3 ~ Cube X Cursed X Curious - ED1 - Hana.avi",
 *           "misc": null,
 *           "misc_i18n": null,
 *           "playlist_id": 2,
 *           "playlistcontent_id": 4961,
 *           "pos": 12,
 *           "pseudo_add": "Axel",
 * 			 "requested": 20,
 *           "serie": "C3 ~ Cube X Cursed X Curious",
 *           "serie_altname": "C-Cube/CxCxC",
 * 			 "serie_i18n": {
 * 				"fre":"Guerriers de la Dynastie"
 *  			}
 *           "singer": null,
 *           "songorder": 1,
 *           "songtype": "TYPE_ED",
 *           "songtype_i18n": "Ending",
 *           "songtype_i18n_short": "ED",
 *           "songwriter": null,
 *           "time_before_play": 0,
 *           "title": "Hana",
 * 			 "username": "axelterizaki",
 *           "viewcount": 0,
 *           "year": ""
 *       }
 *   ]
 * }
 * @apiError PL_VIEW_CONTENT_ERROR Unable to fetch playlist's content information
 * @apiError WEBAPPMODE_CLOSED_API_MESSAGE API is disabled at the moment.
 *
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * {
 *   "code": "PL_VIEW_CONTENT_ERROR",
 *   "message": "PLCID unknown!"
 * }
 * @apiErrorExample Error-Response:
 * HTTP/1.1 403 Forbidden
 */

 	/**
 * @api {get} /public/karas Get complete list of karaokes
 * @apiName GetKaras
 * @apiVersion 2.2.0
 * @apiGroup Karaokes
 * @apiPermission public
 * @apiHeader authorization Auth token received from logging in
 * @apiParam {String} [filter] Filter list by this string.
 * @apiParam {Number} [from=0] Return only the results starting from this position. Useful for continuous scrolling. 0 if unspecified
 * @apiParam {Number} [size=999999] Return only x number of results. Useful for continuous scrolling. 999999 if unspecified.
 *
 * @apiSuccess {Object[]} data/content/karas Array of `kara` objects
 * @apiSuccess {Number} data/infos/count Number of karaokes in playlist
 * @apiSuccess {Number} data/infos/from Starting position of listing
 * @apiSuccess {Number} data/infos/to End position of listing
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "data": {
 *       "content": [
 *           {
 *               "NORM_author": null,
 *               "NORM_creator": null,
 *               "NORM_serie": "Dynasty Warriors 3",
 *               "NORM_serie_altname": "DW3/DW 3",
 *               "NORM_singer": null,
 *               "NORM_songwriter": null,
 *               "NORM_title": "Circuit",
 *               "author": null,
 *               "created_at": 1508423806,
 *               "creator": null,
 *               "duration": 0,
 * 	             "flag_dejavu": 0,
 * 				 "flag_favorites": 1,
 *               "gain": 0,
 *               "kara_id": 176,
 *               "kid": "b0de301c-5756-49fb-b019-85a99a66586b",
 *               "language": "chi",
 *               "language_i18n": "Chinois",
 * 				 "lastplayed_at": null,
 *               "mediafile": "CHI - Dynasty Warriors 3 - GAME ED - Circuit.avi"
 *               "misc": "TAG_VIDEOGAME",
 *               "misc_i18n": "Jeu vidéo",
 * 				 "requested": 20
 *               "serie": "Dynasty Warriors 3",
 * 				 "serie_i18n": {
 * 								"fre":"Guerriers de la Dynastie"
 * 								}
 *               "serie_altname": "DW3/DW 3",
 *               "singer": null,
 *               "songorder": 0,
 *               "songtype": "TYPE_ED",
 *               "songtype_i18n": "Ending",
 *               "songtype_i18n_short": "ED",
 *               "songwriter": null,
 *               "title": "Circuit",
 *               "viewcount": 0,
 *               "year": ""
 *           },
 *           ...
 *       ],
 *       "infos": {
 *           "count": 3,
 * 			 "from": 0,
 * 			 "to": 120
 *       }
 *   }
 * }
 * @apiError SONG_LIST_ERROR Unable to fetch list of karaokes
 * @apiError WEBAPPMODE_CLOSED_API_MESSAGE API is disabled at the moment.
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * @apiErrorExample Error-Response:
 * HTTP/1.1 403 Forbidden
 */

/**
 * @api {get} /public/karas/:kara_id Get song info from database
 * @apiName GetKaraInfo
 * @apiVersion 2.2.0
 * @apiGroup Karaokes
 * @apiPermission public
 * @apiHeader authorization Auth token received from logging in
 * @apiParam {Number} kara_id Karaoke ID you want to fetch information from
 * @apiSuccess {String} data/NORM_author Normalized karaoke's author name
 * @apiSuccess {String} data/NORM_creator Normalized creator's name
 * @apiSuccess {String} data/NORM_serie Normalized name of series the karaoke is from
 * @apiSuccess {String} data/NORM_serie_altname Normalized names of alternative names to the series the karaoke is from. When there are more than one alternative name, they're separated by forward slashes (`/`)
 * @apiSuccess {String} data/NORM_singer Normalized name of singer.
 * @apiSuccess {String} data/NORM_songwriter Normalized name of songwriter.
 * @apiSuccess {String} data/NORM_title Normalized song title
 * @apiSuccess {String} data/author Karaoke author's name
 * @apiSuccess {Number} data/created_at UNIX timestamp of the karaoke's creation date in the base
 * @apiSuccess {String} data/creator Show's creator name
 * @apiSuccess {Number} data/duration Song duration in seconds
 * @apiSuccess {Number} data/flag_dejavu Has the song been played in the last hour ? (by default `EngineMaxDejaVuTime` is at 60 minutes)
 * @apiSuccess {Number} data/flag_favorites 1 = the song is in your favorites, 0 = not.
 * @apiSuccess {Number} data/gain Calculated audio gain for the karaoke's video, in decibels (can be negative)
 * @apiSuccess {String} data/kid Karaoke's unique ID (survives accross database generations)
 * @apiSuccess {String} data/language Song's language in ISO639-2B format, separated by commas when a song has several languages
 * @apiSuccess {String} data/language_i18n Song's language translated in the client's native language
 * @apiSuccess {Number} data/lastplayed_at Last time the song has been played in UNIX timestamp. `null` if never played before
 * @apiSuccess {String} data/mediafile Media's filename
 * @apiSuccess {String} data/misc Internal tag list (`TAG_VIDEOGAME`, etc.)
 * @apiSuccess {String} data/misc_i18n Translated tag list
 * @apiSuccess {String} data/requested Number of times the song has been requested.
 * @apiSuccess {String} data/serie Name of series/show the song belongs to
 * @apiSuccess {String} data/serie_altname Alternative name(s) of series/show this song belongs to. Names are separated by forward slashes (`/`)
 * @apiSuccess {String} data/singer Singer's name, if known.
 * @apiSuccess {Number} data/songorder Song's order, relative to it's type. Opening 1, Opening 2, Ending 1, Ending 2, etc.
 * @apiSuccess {String} data/songtype Song's type internal tag (`TYPE_OP`, `TYPE_ED`, `TYPE_IN` ...)
 * @apiSuccess {String} data/songtype_i18n Translated song's type (`Opening`, `Ending`, `Insert Song`...)
 * @apiSuccess {String} data/songtype_i18n_short Short translated version of the song's type (`OP`, `ED`, `IN`, ...)
 * @apiSuccess {Number} data/time_before_play Estimated time remaining before the song is going to play (in seconds). `0` if the song is currently playing or if there is no song selected as currently playing in the playlist (thus making this estimate impossible)
 * @apiSuccess {String} data/title Song's title
 * @apiSuccess {Number} data/viewcount Counts how many times the song has been played
 * @apiSuccess {String} data/year Song's creation year. Empty string is returned if no year is known.
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "data": [
 *       {
 *           "NORM_author": null,
 *           "NORM_creator": null,
 *           "NORM_serie": "C3 ~ Cube X Cursed X Curious",
 *           "NORM_serie_altname": "C-Cube/CxCxC",
 *           "NORM_singer": null,
 *           "NORM_songwriter": null,
 *           "NORM_title": "Hana",
 *           "author": null,
 *           "created_at": 1508427958,
 *           "creator": null,
 *           "duration": 0,
 * 	         "flag_dejavu": 0,
 * 		     "flag_favorites": 0,
 *           "gain": 0,
 *           "kid": "c05e24eb-206b-4ff5-88d4-74e8d5ad6f75",
 *           "language": "jpn",
 *           "language_i18n": "Japonais",
 * 			 "lastplayed_at": null,
 *           "mediafile": "JAP - C3 ~ Cube X Cursed X Curious - ED1 - Hana.avi",
 *           "misc": null,
 *           "misc_i18n": null,
 * 			 "requested": 20,
 *           "serie": "C3 ~ Cube X Cursed X Curious",
 *           "serie_altname": "C-Cube/CxCxC",
 *           "singer": null,
 *           "songorder": 1,
 *           "songtype": "TYPE_ED",
 *           "songtype_i18n": "Ending",
 *           "songtype_i18n_short": "ED",
 *           "songwriter": null,
 *           "time_before_play": 0,
 *           "title": "Hana",
 *           "viewcount": 0,
 *           "year": ""
 *       }
 *   ]
 * }
 * @apiError SONG_VIEW_ERROR Unable to list songs
 * @apiError WEBAPPMODE_CLOSED_API_MESSAGE API is disabled at the moment.
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * {
 *   "code": "SONG_VIEW_ERROR",
 *   "message": null
 * }
 * @apiErrorExample Error-Response:
 * HTTP/1.1 403 Forbidden
 */
/**
 * @api {get} /public/playlists/current/karas Get list of karaokes in the current playlist
 * @apiName GetPlaylistKarasCurrent
 * @apiVersion 2.2.0
 * @apiGroup Playlists
 * @apiPermission public
 * @apiHeader authorization Auth token received from logging in
 * @apiParam {Number} pl_id Target playlist ID.
 * @apiParam {String} [filter] Filter list by this string.
 * @apiParam {Number} [from=0] Return only the results starting from this position. Useful for continuous scrolling. 0 if unspecified
 * @apiParam {Number} [size=999999] Return only x number of results. Useful for continuous scrolling. 999999 if unspecified.
 *
 * @apiSuccess {Object[]} data/content/karas Array of `kara` objects
 * @apiSuccess {Number} data/infos/count Number of karaokes in playlist
 * @apiSuccess {Number} data/infos/from Starting position of listing
 * @apiSuccess {Number} data/infos/to End position of listing
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "data": {
 *       "content": [
 *           {
 *               "NORM_author": null,
 *               "NORM_creator": null,
 *               "NORM_pseudo_add": "Administrateur",
 *               "NORM_serie": "Dynasty Warriors 3",
 *               "NORM_serie_altname": "DW3/DW 3",
 *               "NORM_singer": null,
 *               "NORM_songwriter": null,
 *               "NORM_title": "Circuit",
 *               "author": null,
 *               "created_at": 1508423806,
 *               "creator": null,
 *               "duration": 0,
 *               "flag_blacklisted": 0,
 *               "flag_playing": 1,
 *               "flag_whitelisted": 0,
 * 	             "flag_dejavu": 0,
 *               "gain": 0,
 *               "kara_id": 176,
 *               "kid": "b0de301c-5756-49fb-b019-85a99a66586b",
 *               "language": "chi",
 *               "language_i18n": "Chinois",
 * 				 "lastplayed_at": null,
 *               "mediafile": "CHI - Dynasty Warriors 3 - GAME ED - Circuit.avi"
 *               "misc": "TAG_VIDEOGAME",
 *               "misc_i18n": "Jeu vidéo",
 *               "playlistcontent_id": 4946,
 *               "pos": 1,
 *               "pseudo_add": "Administrateur",
 * 				 "requested": 20,
 *               "serie": "Dynasty Warriors 3",
 * 				 "serie_i18n": {
 * 								"fre":"Guerriers de la Dynastie"
 * 								}
 *               "serie_altname": "DW3/DW 3",
 *               "singer": null,
 *               "songorder": 0,
 *               "songtype": "TYPE_ED",
 *               "songtype_i18n": "Ending",
 *               "songtype_i18n_short": "ED",
 *               "songwriter": null,
 *               "title": "Circuit",*
 * 				 "username": "admin",
 *               "viewcount": 0,
 *               "year": ""
 *           },
 *           ...
 *       ],
 *       "infos": {
 *           "count": 3,
 * 			 "from": 0,
 * 			 "to": 120
 *       }
 *   }
 * }
 * @apiError PL_VIEW_SONGS_CURRENT_ERROR Unable to fetch list of karaokes of current playlist
 * @apiError WEBAPPMODE_CLOSED_API_MESSAGE API is disabled at the moment.
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * @apiErrorExample Error-Response:
 * HTTP/1.1 403 Forbidden
 */

 	/**
 * @api {get} /public/playlists/public/karas Get list of karaokes in the public playlist
 * @apiName GetPlaylistKarasPublic
 * @apiVersion 2.2.0
 * @apiGroup Playlists
 * @apiPermission public
 * @apiHeader authorization Auth token received from logging in
 * @apiParam {Number} pl_id Target playlist ID.
 * @apiParam {String} [filter] Filter list by this string.
 * @apiParam {Number} [from=0] Return only the results starting from this position. Useful for continuous scrolling. 0 if unspecified
 * @apiParam {Number} [size=999999] Return only x number of results. Useful for continuous scrolling. 999999 if unspecified.
 *
 * @apiSuccess {Object[]} data/content/karas Array of `kara` objects
 * @apiSuccess {Number} data/infos/count Number of karaokes in playlist
 * @apiSuccess {Number} data/infos/from Starting position of listing
 * @apiSuccess {Number} data/infos/to End position of listing
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "data": {
 *       "content": [
 *           {
 *               "NORM_author": null,
 *               "NORM_creator": null,
 *               "NORM_pseudo_add": "Administrateur",
 *               "NORM_serie": "Dynasty Warriors 3",
 *               "NORM_serie_altname": "DW3/DW 3",
 *               "NORM_singer": null,
 *               "NORM_songwriter": null,
 *               "NORM_title": "Circuit",
 *               "author": null,
 *               "created_at": 1508423806,
 *               "creator": null,
 *               "duration": 0,
 *               "flag_blacklisted": 0,
 *               "flag_playing": 1,
 *               "flag_whitelisted": 0,
 * 	             "flag_dejavu": 0,
 *               "gain": 0,
 *               "kara_id": 176,
 *               "kid": "b0de301c-5756-49fb-b019-85a99a66586b",
 *               "language": "chi",
 *               "language_i18n": "Chinois",
 * 				 "lastplayed_at": null,
 *               "mediafile": "CHI - Dynasty Warriors 3 - GAME ED - Circuit.avi"
 *               "misc": "TAG_VIDEOGAME",
 *               "misc_i18n": "Jeu vidéo",
 *               "playlistcontent_id": 4946,
 *               "pos": 1,
 *               "pseudo_add": "Administrateur",
 * 				 "requested": 20
 *               "serie": "Dynasty Warriors 3",
 * 				 "serie_i18n": {
 * 								"fre":"Guerriers de la Dynastie"
 * 								}
 *               "serie_altname": "DW3/DW 3",
 *               "singer": null,
 *               "songorder": 0,
 *               "songtype": "TYPE_ED",
 *               "songtype_i18n": "Ending",
 *               "songtype_i18n_short": "ED",
 *               "songwriter": null,
 *               "title": "Circuit",
 * 				 "username": "admin",
 *               "viewcount": 0,
 *               "year": ""
 *           },
 *           ...
 *       ],
 *       "infos": {
 *           "count": 3,
 * 			 "from": 0,
 * 			 "to": 120
 *       }
 *   }
 * }
 * @apiError PL_VIEW_SONGS_PUBLIC_ERROR Unable to fetch list of karaokes of public playlist
 * @apiError WEBAPPMODE_CLOSED_API_MESSAGE API is disabled at the moment.
 *
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * @apiErrorExample Error-Response:
 * HTTP/1.1 403 Forbidden
 */

/**
* @api {put} /admin/playlists/:pl_id/shuffle Shuffle a playlist
* @apiDescription Playlist is shuffled in database. The shuffling only begins after the currently playing song. Songs before that one are unaffected.
* @apiName putPlaylistShuffle
* @apiVersion 2.1.3
* @apiGroup Playlists
* @apiPermission admin
* @apiHeader authorization Auth token received from logging in
* @apiParam {Number} pl_id Playlist ID to shuffle
* @apiSuccess {String} args ID of playlist shuffled
* @apiSuccess {String} code Message to display
* @apiSuccess {Number} data ID of playlist shuffled
* @apiSuccessExample Success-Response:
* HTTP/1.1 200 OK
* {
*   "args": "5",
*   "code": "PL_SHUFFLED",
*   "data": "5"
* }
* @apiError PL_SHUFFLE_ERROR Unable to shuffle playlist
*
* @apiErrorExample Error-Response:
* HTTP/1.1 500 Internal Server Error
* {
*   "args": "10",
*   "code": "PL_SHUFFLE_ERROR",
*   "message": "Playlist 10 unknown"
* }
*/

/**
 * @api {get} /admin/playlists/:pl_id/karas Get list of karaokes in a playlist
 * @apiName GetPlaylistKaras
 * @apiVersion 2.2.0
 * @apiGroup Playlists
 * @apiPermission admin
 * @apiHeader authorization Auth token received from logging in
 * @apiParam {Number} pl_id Target playlist ID.
 * @apiParam {String} [filter] Filter list by this string.
 * @apiParam {Number} [from=0] Return only the results starting from this position. Useful for continuous scrolling. 0 if unspecified
 * @apiParam {Number} [size=999999] Return only x number of results. Useful for continuous scrolling. 999999 if unspecified.
 *
 * @apiSuccess {Object[]} data/content/karas Array of `kara` objects
 * @apiSuccess {Number} data/infos/count Number of karaokes in playlist
 * @apiSuccess {Number} data/infos/from Starting position of listing
 * @apiSuccess {Number} data/infos/to End position of listing
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "data": {
 *       "content": [
 *           {
 *               "NORM_author": null,
 *               "NORM_creator": null,
 *               "NORM_pseudo_add": "Administrateur",
 *               "NORM_serie": "Dynasty Warriors 3",
 *               "NORM_serie_altname": "DW3/DW 3",
 *               "NORM_singer": null,
 *               "NORM_songwriter": null,
 *               "NORM_title": "Circuit",
 *               "author": "NO_TAG",
 *               "created_at": 1508423806,
 * 				 "modified_at": 1508423806,
 *               "creator": "NO_TAG",
 *               "duration": 0,
 *               "flag_blacklisted": 0,
 *               "flag_playing": 1,
 *               "flag_whitelisted": 0,
 *               "flag_dejavu": 0,
 *               "gain": 0,
 *               "kara_id": 176,
 *               "kid": "b0de301c-5756-49fb-b019-85a99a66586b",
 *               "language": "chi",
 *               "language_i18n": "Chinois",
 * 				 "lastplayed_at": null,
 *               "mediafile": "CHI - Dynasty Warriors 3 - GAME ED - Circuit.avi"
 *               "misc": "TAG_VIDEOGAME",
 *               "misc_i18n": "Jeu vidéo",
 *               "playlistcontent_id": 4946,
 *               "pos": 1,
 *               "pseudo_add": "Administrateur",
 * 				 "requested": 20,
 *               "serie": "Dynasty Warriors 3",
 * 				 "serie_i18n": {
 * 								"fre":"Guerriers de la Dynastie"
 * 								}
 *               "serie_altname": "DW3/DW 3",
 *               "singer": null,
 *               "songorder": 0,
 *               "songtype": "TYPE_ED",
 *               "songtype_i18n": "Ending",
 *               "songtype_i18n_short": "ED",
 *               "songwriter": null,
 *               "title": "Circuit",
 * 				 "username": "admin",
 *               "viewcount": 0,
 *               "year": ""
 *           },
 *           ...
 *       ],
 *       "infos": {
 *           "count": 3,
 * 			 "from": 0,
 * 			 "to": 120
 *       }
 *   }
 * }
 * @apiError PL_VIEW_SONGS_ERROR Unable to fetch list of karaokes in a playlist
 *
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 */

/**
 * @api {get} /admin/whitelist Get whitelist
 * @apiName GetWhitelist
 * @apiVersion 2.2.0
 * @apiGroup Whitelist
 * @apiPermission admin
 * @apiHeader authorization Auth token received from logging in
 * @apiParam {String} [filter] Filter list by this string.
 * @apiParam {Number} [from=0] Return only the results starting from this position. Useful for continuous scrolling. 0 if unspecified
 * @apiParam {Number} [size=999999] Return only x number of results. Useful for continuous scrolling. 999999 if unspecified.
 * @apiSuccess {String} code Message to display
 * @apiSuccess {Object[]} data/content List of karaoke objects
 * @apiSuccess {Number} data/infos/count Number of items in whitelist no matter which range was requested
 * @apiSuccess {Number} data/infos/from Items listed are from this position
 * @apiSuccess {Number} data/infos/size How many items listed.
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "data": {
 *       "content": [
 *           {
 *               "NORM_author": null,
 *               "NORM_creator": "Eurovision",
 *               "NORM_serie": null,
 *               "NORM_serie_altname": null,
 *               "NORM_singer": "Dschinghis Khan",
 *               "NORM_songwriter": "Ralph Siegel",
 *               "NORM_title": "Moskau",
 *               "author": "NO_TAG",
 *               "created_at": 1508921852,
 *               "creator": "Eurovision",
 *               "duration": 0,
 *               "kara_id": 1,
 *               "kid": "d9bb6a76-2b7d-469e-ba44-6acfc463202e",
 *               "language": "ger",
 *               "language_i18n": "Allemand",
 *               "misc": "TAG_CONCERT,TAG_REAL",
 *               "misc_i18n": "Concert,Non-anime",
 * 				 "requested": 20,
 *               "serie": null,
 * 				 "serie_i18n": {
 * 								"fre":"Guerriers de la Dynastie"
 * 								}
 *               "serie_altname": null,
 *               "singer": "Dschinghis Khan",
 *               "songorder": 0,
 *               "songtype": "TYPE_MUSIC",
 *               "songtype_i18n": "Music Video",
 *               "songtype_i18n_short": "MV",
 *               "songwriter": "Ralph Siegel",
 *               "title": "Moskau",
 *               "mediafile": "ALL - Dschinghis Khan - MV - Moskau.avi",
 *               "viewcount": 0,
 *               "whitelist_id": 1,
 *               "year": "1980"
 *           }
 *       ],
 *       "infos": {
 *           "count": 1,
 *           "from": 0,
 *           "to": 999999
 *       }
 *   }
 * }
 * @apiError WL_VIEW_ERROR Whitelist could not be viewed
 *
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * {
 *   "code": "WL_VIEW_ERROR"
 * }
 */

/**
 * @api {get} /admin/blacklist Get blacklist
 * @apiName GetBlacklist
 * @apiVersion 2.2.0
 * @apiGroup Blacklist
 * @apiPermission admin
 * @apiHeader authorization Auth token received from logging in
 * @apiParam {String} [filter] Filter list by this string.
 * @apiParam {Number} [from=0] Return only the results starting from this position. Useful for continuous scrolling. 0 if unspecified
 * @apiParam {Number} [size=999999] Return only x number of results. Useful for continuous scrolling. 999999 if unspecified.* @apiSuccess {String} code Message to display
 * @apiSuccess {Object[]} data/content List of karaoke objects
 * @apiSuccess {Number} data/infos/count Number of items in whitelist no matter which range was requested
 * @apiSuccess {Number} data/infos/from Items listed are from this position
 * @apiSuccess {Number} data/infos/size How many items listed.
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "data": {
 *       "content": [
 *           {
 *               "NORM_author": "Jean-Jacques Debout",
 *               "NORM_creator": null,
 *               "NORM_serie": "Capitaine Flam",
 *               "NORM_serie_altname": "Kyaputen Fyucha",
 *               "NORM_singer": "Richard Simon",
 *               "NORM_songwriter": "Roger Dumas",
 *               "NORM_title": "",
 *               "author": "Jean-Jacques Debout",
 *               "created_at": 1508924354,
 *               "creator": "NO_TAG",
 *               "duration": 0,
 *               "kara_id": 217,
 *               "kid": "1b8bca21-4d26-41bd-90b7-2afba74381ee",
 *               "language": "fre",
 *               "language_i18n": "Français",
 *               "misc": "NO_TAG",
 *               "misc_i18n": "No info",
 *               "reason_add": "Blacklisted Tag : Jean-Jacques Debout (type 6)",
 * 				 "requested": 20
 *               "serie": "Capitaine Flam",
 *               "serie_altname": "Kyaputen Fyucha",
 * 				 "serie_i18n": {
 * 					"fre":"Guerriers de la Dynastie"
 * 				 },
 *               "singer": "Richard Simon",
 *               "songorder": 0,
 *               "songtype": "TYPE_OP",
 *               "songtype_i18n": "Opening",
 *               "songtype_i18n_short": "OP",
 *               "songwriter": "Roger Dumas",
 *               "title": "",
 *               "mediafile": "FR - Capitaine Flam - OP.avi",
 *               "viewcount": 0,
 *               "year": "1981"
 *           }
 *       ],
 *       "infos": {
 *           "count": 1,
 *           "from": 0,
 *           "to": 999999
 *       }
 *   }
 * }
 * @apiError BL_VIEW_ERROR Blacklist could not be viewed
 *
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * {
 *   "code": "BL_VIEW_ERROR"
 * }
 */

/**
 * @api {get} /public/playlists/:pl_id/karas Get list of karaokes in a playlist (public)
 * @apiName GetPlaylistKarasPublic
 * @apiVersion 2.2.0
 * @apiGroup Playlists
 * @apiPermission public
 * @apiHeader authorization Auth token received from logging in
 * @apiDescription Contrary to the `/admin/playlists/` path, this one will not return playlists which have the `flag_visible` set to `0`.
 * @apiParam {Number} pl_id Target playlist ID.
 * @apiParam {String} [filter] Filter list by this string.
 * @apiParam {Number} [from=0] Return only the results starting from this position. Useful for continuous scrolling. 0 if unspecified
 * @apiParam {Number} [size=999999] Return only x number of results. Useful for continuous scrolling. 999999 if unspecified.
 *
 * @apiSuccess {Object[]} data/content/karas Array of `kara` objects
 * @apiSuccess {Number} data/infos/count Number of karaokes in playlist
 * @apiSuccess {Number} data/infos/from Starting position of listing
 * @apiSuccess {Number} data/infos/to End position of listing
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "data": {
 *       "content": [
 *           {
 *               "NORM_author": null,
 *               "NORM_creator": null,
 *               "NORM_pseudo_add": "Administrateur",
 *               "NORM_serie": "Dynasty Warriors 3",
 *               "NORM_serie_altname": "DW3/DW 3",
 *               "NORM_singer": null,
 *               "NORM_songwriter": null,
 *               "NORM_title": "Circuit",
 *               "author": "NO_TAG",
 *               "created_at": 1508423806,
 *               "kara_created_at": 1508423806,
 *               "kara_modified_at": 1508423806,
 *               "creator": null,
 *               "duration": 0,
 *               "flag_blacklisted": 0,
 *               "flag_playing": 1,
 *               "flag_whitelisted": 0,
 * 	             "flag_dejavu": 0,
 *               "gain": 0,
 *               "kara_id": 176,
 *               "kid": "b0de301c-5756-49fb-b019-85a99a66586b",
 *               "language": "chi",
 *               "language_i18n": "Chinois",
 * 				 "lastplayed_at": null,
 *               "mediafile": "CHI - Dynasty Warriors 3 - GAME ED - Circuit.avi"
 *               "misc": "TAG_VIDEOGAME",
 *               "misc_i18n": "Jeu vidéo",
 *               "playlistcontent_id": 4946,
 *               "pos": 1,
 *               "pseudo_add": "Administrateur",
 * 				 "requested": 20,
 *               "serie": "Dynasty Warriors 3",
 * 				 "serie_i18n": {
 *					"fre":"Guerriers de la Dynastie"
 * 				}
 *               "serie_altname": "DW3/DW 3",
 *               "singer": "NO_TAG",
 *               "songorder": 0,
 *               "songtype": "TYPE_ED",
 *               "songtype_i18n": "Ending",
 *               "songtype_i18n_short": "ED",
 *               "songwriter": "NO_TAG",
 *               "title": "Circuit",
 * 				 "username": "admin",
 *               "viewcount": 0,
 *               "year": ""
 *           },
 *           ...
 *       ],
 *       "infos": {
 *           "count": 3,
 * 			 "from": 0,
 * 			 "to": 120
 *       }
 *   }
 * }
 * @apiError PL_VIEW_SONGS_ERROR Unable to fetch list of karaokes in a playlist
 * @apiError WEBAPPMODE_CLOSED_API_MESSAGE API is disabled at the moment.
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * @apiErrorExample Error-Response:
 * HTTP/1.1 403 Forbidden
 */

/**
 * @api {get} /admin/playlists/:pl_id/karas/:plc_id Get song info from a playlist item
 * @apiName GetPlaylistPLC
 * @apiVersion 2.3.0
 * @apiGroup Playlists
 * @apiPermission admin
 * @apiHeader authorization Auth token received from logging in
 * @apiParam {Number} pl_id Target playlist ID. **Note :** Irrelevant since PLCIDs are unique in the table.
 * @apiParam {Number} plc_id Playlist content ID.
 * @apiSuccess {String} data/NORM_author Normalized karaoke's author name
 * @apiSuccess {String} data/NORM_creator Normalized creator's name
 * @apiSuccess {String} data/NORM_pseudo_add Normalized name of person who added the karaoke to the playlist
 * @apiSuccess {String} data/NORM_serie Normalized name of series the karaoke is from
 * @apiSuccess {String} data/NORM_serie_altname Normalized names of alternative names to the series the karaoke is from. When there are more than one alternative name, they're separated by forward slashes (`/`)
 * @apiSuccess {String} data/NORM_singer Normalized name of singer.
 * @apiSuccess {String} data/NORM_songwriter Normalized name of songwriter.
 * @apiSuccess {String} data/NORM_title Normalized song title
 * @apiSuccess {String} data/author Karaoke author's name
 * @apiSuccess {Number} data/kara_created_at UNIX timestamp of the karaoke's creation date in the base
 * @apiSuccess {Number} data/created_at UNIX timestamp of the karaoke's addition in the playlist
 * @apiSuccess {Number} data/kara_modified_at UNIX timestamp of the karaoke's creation date in the base
 * @apiSuccess {String} data/creator Show's creator name
 * @apiSuccess {Number} data/duration Song duration in seconds
 * @apiSuccess {Number} data/flag_blacklisted Is the song in the blacklist ?
 * @apiSuccess {Number} data/flag_playing Is the song the one currently playing ?
 * @apiSuccess {Number} data/flag_whitelisted Is the song in the whitelist ?
 * @apiSuccess {Number} data/flag_dejavu Has the song been played in the last hour ? (`EngineMaxDejaVuTime` defaults to 60 minutes)
 * @apiSuccess {Number} data/flag_favorites 1 = the song is in your favorites, 0 = not.
 * @apiSuccess {Number} data/flag_free Wether the song has been marked as free or not
 * @apiSuccess {Number} data/gain Calculated audio gain for the karaoke's video, in decibels (can be negative)
 * @apiSuccess {Number} data/kara_id Karaoke's ID in the main database
 * @apiSuccess {String} data/kid Karaoke's unique ID (survives accross database generations)
 * @apiSuccess {String} data/language Song's language in ISO639-2B format, separated by commas when a song has several languages
 * @apiSuccess {String} data/language_i18n Song's language translated in the client's native language
 * @apiSuccess {Number} data/lastplayed_at When the song has been played last, in unix timestamp
 * @apiSuccess {String} data/misc Internal tag list (`TAG_VIDEOGAME`, etc.)
 * @apiSuccess {String} data/misc_i18n Translated tag list
 * @apiSuccess {Number} data/playlist_id ID of playlist this song belongs to
 * @apiSuccess {Number} data/playlistcontent_ID PLC ID of this song.
 * @apiSuccess {Number} data/pos Position in the playlist. First song has a position of `1`
 * @apiSuccess {String} data/previewfile Filename of the preview file associated with the karaoke. Can be undefined if the preview hasn't been generated yet by the server.
 * @apiSuccess {String} data/pseudo_add Nickname of user who added/requested the song. this nickname can be changed (`username` cannot) hence why it is displayed here.
 * @apiSuccess {String} data/requested Number of times the song has been requested.
 * @apiSuccess {String} data/serie Name of series/show the song belongs to
 * @apiSuccess {Object} data/serie_i18n JSON object with series' names depending on their language.
 * @apiSuccess {String} data/serie_altname Alternative name(s) of series/show this song belongs to. Names are separated by forward slashes (`/`)
 * @apiSuccess {String} data/singer Singer's name, if known.
 * @apiSuccess {Number} data/songorder Song's order, relative to it's type. Opening 1, Opening 2, Ending 1, Ending 2, etc.
 * @apiSuccess {String} data/songtype Song's type internal tag (`TYPE_OP`, `TYPE_ED`, `TYPE_IN` ...)
 * @apiSuccess {String} data/songtype_i18n Translated song's type (`Opening`, `Ending`, `Insert Song`...)
 * @apiSuccess {String} data/songtype_i18n_short Short translated version of the song's type (`OP`, `ED`, `IN`, ...)
 * @apiSuccess {Number} data/time_before_play Estimated time remaining before the song is going to play (in seconds). `0` if the song is currently playing or if there is no song selected as currently playing in the playlist (thus making this estimate impossible)
 * @apiSuccess {String} data/title Song's title
 * @apiSuccess {String} data/username Username who submitted this karaoke. Can be different from `pseudo_add`.
 * @apiSuccess {String} data/mediafile Media's filename
 * @apiSuccess {Number} data/viewcount Counts how many times the song has been played
 * @apiSuccess {String} data/year Song's creation year. Empty string is returned if no year is known.
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "data": [
 *       {
 *           "NORM_author": null,
 *           "NORM_creator": null,
 *           "NORM_pseudo_add": "Axel",
 *           "NORM_serie": "C3 ~ Cube X Cursed X Curious",
 *           "NORM_serie_altname": "C-Cube/CxCxC",
 *           "NORM_singer": null,
 *           "NORM_songwriter": null,
 *           "NORM_title": "Hana",
 *           "author": "NO_TAG",
 *           "kara_created_at": 1508427958,
 *           "kara_modified_at": 1508427958,
 *           "created_at": 1508427958,
 *           "creator": "NO_TAG",
 *           "duration": 0,
 *           "flag_blacklisted": 0,
 *           "flag_playing": 0,
 *           "flag_whitelisted": 0,
 *           "flag_dejavu": 0,
 * 			 "flag_favorites": 0,
 *           "flag_free": 0,
 *           "gain": 0,
 *           "kara_id": 1007,
 *           "kid": "c05e24eb-206b-4ff5-88d4-74e8d5ad6f75",
 *           "language": "jpn",
 *           "language_i18n": "Japonais",
 * 			 "lastplayed_at": null,
 *           "mediafile": "JAP - C3 ~ Cube X Cursed X Curious - ED1 - Hana.avi",
 *           "misc": "NO_TAG",
 *           "misc_i18n": "No info",
 *           "playlist_id": 2,
 *           "playlistcontent_id": 4961,
 *           "pos": 12,
 *           "previewfile": "JAP - C3 ~ Cube X Cursed X Curious.1201230.mp4"
 *           "pseudo_add": "Axel",
 * 			 "requested": 20,
 *           "serie": "C3 ~ Cube X Cursed X Curious",
 *  		 "serie_i18n": {
 * 				"fre":"Guerriers de la Dynastie"
 *  			},
 *           "serie_altname": "C-Cube/CxCxC",
 *           "singer": "NO_TAG",
 *           "songorder": 1,
 *           "songtype": "TYPE_ED",
 *           "songtype_i18n": "Ending",
 *           "songtype_i18n_short": "ED",
 *           "songwriter": "NO_TAG",
 *           "time_before_play": 0,
 *           "title": "Hana",
 * 			 "username": "axelterizaki",
 *           "viewcount": 0,
 *           "year": ""
 *       }
 *   ]
 * }
 * @apiError PL_VIEW_CONTENT_ERROR Unable to fetch playlist's content information
 *
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * {
 *   "code": "PL_VIEW_CONTENT_ERROR",
 *   "message": "PLCID unknown!"
 * }
 */
/**
 * @api {get} /public/playlists/:pl_id/karas/:plc_id Get song info from a playlist (public)
 * @apiName GetPlaylistPLCPublic
 * @apiVersion 2.3.0
 * @apiGroup Playlists
 * @apiPermission public
 * @apiHeader authorization Auth token received from logging in
 * @apiDescription Contrary to the `admin/playlists` path, this one won't return any karaoke info from a playlist the user has no access to.
 * @apiParam {Number} pl_id Target playlist ID. **Note :** Irrelevant since PLCIDs are unique in the table.
 * @apiParam {Number} plc_id Playlist content ID.
 * @apiSuccess {String} data/NORM_author Normalized karaoke's author name
 * @apiSuccess {String} data/NORM_creator Normalized creator's name
 * @apiSuccess {String} data/NORM_pseudo_add Normalized name of person who added the karaoke to the playlist
 * @apiSuccess {String} data/NORM_serie Normalized name of series the karaoke is from
 * @apiSuccess {String} data/NORM_serie_altname Normalized names of alternative names to the series the karaoke is from. When there are more than one alternative name, they're separated by forward slashes (`/`)
 * @apiSuccess {String} data/NORM_singer Normalized name of singer.
 * @apiSuccess {String} data/NORM_songwriter Normalized name of songwriter.
 * @apiSuccess {String} data/NORM_title Normalized song title
 * @apiSuccess {String} data/author Karaoke author's name
 * @apiSuccess {Number} data/created_at UNIX timestamp of the karaoke's addition in the playlist
 * @apiSuccess {Number} data/kara_modified_at UNIX timestamp of the karaoke's last modification date in the base
 * @apiSuccess {Number} data/kara_created_at UNIX timestamp of the karaoke's creation date in the base
 * @apiSuccess {String} data/creator Show's creator name
 * @apiSuccess {Number} data/duration Song duration in seconds
 * @apiSuccess {Number} data/flag_blacklisted Is the song in the blacklist ?
 * @apiSuccess {Number} data/flag_favorites 1 = the song is in your favorites, 0 = not.
 * @apiSuccess {Number} data/flag_free Wether the song has been freed or not
 * @apiSuccess {Number} data/flag_playing Is the song the one currently playing ?
 * @apiSuccess {Number} data/flag_whitelisted Is the song in the whitelist ?
 * @apiSuccess {Number} data/flag_dejavu Has the song been played in the last hour ? (by default, `EngineMaxDejaVuTime` is at 60 minutes)
 * @apiSuccess {Number} data/gain Calculated audio gain for the karaoke's video, in decibels (can be negative)
 * @apiSuccess {Number} data/kara_id Karaoke's ID in the main database
 * @apiSuccess {String} data/kid Karaoke's unique ID (survives accross database generations)
 * @apiSuccess {String} data/language Song's language in ISO639-2B format, separated by commas when a song has several languages
 * @apiSuccess {String} data/language_i18n Song's language translated in the client's native language
 * @apiSuccess {Number} data/lastplayed_at Time when the song was last played at in UNIX timestamp. `null` if never played before.
 * @apiSuccess {String} data/mediafile Video's filename
 * @apiSuccess {String} data/misc Internal tag list (`TAG_VIDEOGAME`, etc.)
 * @apiSuccess {String} data/misc_i18n Translated tag list
 * @apiSuccess {Number} data/playlist_id ID of playlist this song belongs to
 * @apiSuccess {Number} data/playlistcontent_ID PLC ID of this song.
 * @apiSuccess {Number} data/pos Position in the playlist. First song has a position of `1`
 * @apiSuccess {String} data/pseudo_add Nickname of user who added this song
 * @apiSuccess {String} data/requested Number of times the song has been requested.
 * @apiSuccess {String} data/serie Name of series/show the song belongs to
 * @apiSuccess {Object} data/serie_i18n JSON object with series' names depending on their language.
 * @apiSuccess {String} data/serie_altname Alternative name(s) of series/show this song belongs to. Names are separated by forward slashes (`/`)
 * @apiSuccess {String} data/singer Singer's name, if known.
 * @apiSuccess {Number} data/songorder Song's order, relative to it's type. Opening 1, Opening 2, Ending 1, Ending 2, etc.
 * @apiSuccess {String} data/songtype Song's type internal tag (`TYPE_OP`, `TYPE_ED`, `TYPE_IN` ...)
 * @apiSuccess {String} data/songtype_i18n Translated song's type (`Opening`, `Ending`, `Insert Song`...)
 * @apiSuccess {String} data/songtype_i18n_short Short translated version of the song's type (`OP`, `ED`, `IN`, ...)
 * @apiSuccess {Number} data/time_before_play Estimated time remaining before the song is going to play (in seconds). `0` if the song is currently playing or if there is no song selected as currently playing in the playlist (thus making this estimate impossible)
 * @apiSuccess {String} data/title Song's title
 * @apiSuccess {String} data/username Username who added that song
 * @apiSuccess {Number} data/viewcount Counts how many times the song has been played
 * @apiSuccess {String} data/year Song's creation year. Empty string is returned if no year is known.
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "data": [
 *       {
 *           "NORM_author": null,
 *           "NORM_creator": null,
 *           "NORM_pseudo_add": "Axel",
 *           "NORM_serie": "C3 ~ Cube X Cursed X Curious",
 *           "NORM_serie_altname": "C-Cube/CxCxC",
 *           "NORM_singer": null,
 *           "NORM_songwriter": null,
 *           "NORM_title": "Hana",
 *           "author": "NO_TAG",
 *           "created_at": 1508427958,
 *           "kara_created_at": 1508427958,
 *           "kara_modified_at": 1508427958,
 *           "creator": null,
 *           "duration": 0,
 *           "flag_blacklisted": 0,
 *           "flag_playing": 0,
 * 			 "flag_favorites": 0,
 *           "flag_whitelisted": 0,
 * 	         "flag_dejavu": 0,
 *           "flag_free": 0,
 *           "gain": 0,
 *           "kara_id": 1007,
 *           "kid": "c05e24eb-206b-4ff5-88d4-74e8d5ad6f75",
 *           "language": "jpn",
 *           "language_i18n": "Japonais",
 * 			 "lastplayed_at": null,
 *           "mediafile": "JAP - C3 ~ Cube X Cursed X Curious - ED1 - Hana.avi",
 *           "misc": "NO_TAG",
 *           "misc_i18n": "No info",
 *           "playlist_id": 2,
 *           "playlistcontent_id": 4961,
 *           "pos": 12,
 *           "pseudo_add": "Axel",
 * 			 "requested": 20,
 *           "serie": "C3 ~ Cube X Cursed X Curious",
 *           "serie_altname": "C-Cube/CxCxC",
 * 			 "serie_i18n": {
 * 				"fre":"Guerriers de la Dynastie"
 *  			}
 *           "singer": "NO_TAG",
 *           "songorder": 1,
 *           "songtype": "TYPE_ED",
 *           "songtype_i18n": "Ending",
 *           "songtype_i18n_short": "ED",
 *           "songwriter": "NO_TAG",
 *           "time_before_play": 0,
 *           "title": "Hana",
 * 			 "username": "axelterizaki",
 *           "viewcount": 0,
 *           "year": ""
 *       }
 *   ]
 * }
 * @apiError PL_VIEW_CONTENT_ERROR Unable to fetch playlist's content information
 * @apiError WEBAPPMODE_CLOSED_API_MESSAGE API is disabled at the moment.
 *
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * {
 *   "code": "PL_VIEW_CONTENT_ERROR",
 *   "message": "PLCID unknown!"
 * }
 * @apiErrorExample Error-Response:
 * HTTP/1.1 403 Forbidden
 */

/**
 * @api {get} /public/karas Get complete list of karaokes
 * @apiName GetKaras
 * @apiVersion 2.3.0
 * @apiGroup Karaokes
 * @apiPermission public
 * @apiHeader authorization Auth token received from logging in
 * @apiParam {String} [filter] Filter list by this string.
 * @apiParam {Number} [from=0] Return only the results starting from this position. Useful for continuous scrolling. 0 if unspecified
 * @apiParam {Number} [size=999999] Return only x number of results. Useful for continuous scrolling. 999999 if unspecified.
 * @apiParam {String} [searchType] Can be `serie`, `year`, `popular`, `recent` or `tag`
 * @apiParam {String} [searchValue] Value to search for. For `series` or `tag` it's an ID, for `year` it's a 4-digit year.
 *
 * @apiSuccess {Object[]} data/content/karas Array of `kara` objects
 * @apiSuccess {Number} data/infos/count Number of karaokes in playlist
 * @apiSuccess {Number} data/infos/from Starting position of listing
 * @apiSuccess {Number} data/infos/to End position of listing
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "data": {
 *       "content": [
 *           {
 *               "NORM_author": null,
 *               "NORM_creator": null,
 * 				 "NORM_groups": null,
 *               "NORM_serie": "Dynasty Warriors 3",
 *               "NORM_serie_altname": "DW3/DW 3",
 *               "NORM_singer": null,
 *               "NORM_songwriter": null,
 *               "NORM_title": "Circuit",
 *               "author": "NO_TAG",
 *               "created_at": 1508423806,
 *               "modified_at": 1508423806,
 *               "creator": "NO_TAG",
 *               "duration": 0,
 * 	             "flag_dejavu": 0,
 * 				 "flag_favorites": 1,
 *               "gain": 0,
 * 				 "groups": null,
 *               "kara_id": 176,
 *               "kid": "b0de301c-5756-49fb-b019-85a99a66586b",
 *               "language": "chi",
 *               "language_i18n": "Chinois",
 * 				 "lastplayed_at": null,
 *               "mediafile": "CHI - Dynasty Warriors 3 - GAME ED - Circuit.avi"
 *               "misc": "TAG_VIDEOGAME",
 *               "misc_i18n": "Jeu vidéo",
 * 				 "requested": 20
 *               "serie": "Dynasty Warriors 3",
 * 				 "serie_i18n": {
 * 								"fre":"Guerriers de la Dynastie"
 * 								}
 *               "serie_altname": "DW3/DW 3",
 *               "singer": "NO_TAG",
 *               "songorder": 0,
 *               "songtype": "TYPE_ED",
 *               "songtype_i18n": "Ending",
 *               "songtype_i18n_short": "ED",
 *               "songwriter": "NO_TAG",
 *               "title": "Circuit",
 *               "viewcount": 0,
 *               "year": ""
 *           },
 *           ...
 *       ],
 *       "infos": {
 *           "count": 3,
 * 			 "from": 0,
 * 			 "to": 120
 *       }
 *   }
 * }
 * @apiError SONG_LIST_ERROR Unable to fetch list of karaokes
 * @apiError WEBAPPMODE_CLOSED_API_MESSAGE API is disabled at the moment.
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * @apiErrorExample Error-Response:
 * HTTP/1.1 403 Forbidden
 */

/**
 * @api {get} /public/playlists/current/karas Get list of karaokes in the current playlist
 * @apiName GetPlaylistKarasCurrent
 * @apiVersion 2.3.0
 * @apiGroup Playlists
 * @apiPermission public
 * @apiHeader authorization Auth token received from logging in
 * @apiParam {Number} pl_id Target playlist ID.
 * @apiParam {String} [filter] Filter list by this string.
 * @apiParam {Number} [from=0] Return only the results starting from this position. Useful for continuous scrolling. 0 if unspecified
 * @apiParam {Number} [size=999999] Return only x number of results. Useful for continuous scrolling. 999999 if unspecified.
 *
 * @apiSuccess {Object[]} data/content/karas Array of `kara` objects
 * @apiSuccess {Number} data/infos/count Number of karaokes in playlist
 * @apiSuccess {Number} data/infos/from Starting position of listing
 * @apiSuccess {Number} data/infos/to End position of listing
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "data": {
 *       "content": [
 *           {
 *               "NORM_author": null,
 *               "NORM_creator": null,
 *               "NORM_pseudo_add": "Administrateur",
 *               "NORM_serie": "Dynasty Warriors 3",
 *               "NORM_serie_altname": "DW3/DW 3",
 *               "NORM_singer": null,
 *               "NORM_songwriter": null,
 *               "NORM_title": "Circuit",
 *               "author": "NO_TAG",
 *               "created_at": 1508423806,
 *               "kara_modified_at": 1508423806,
 *               "kara_created_at": 1508423806,
 *               "creator": null,
 *               "duration": 0,
 *               "flag_blacklisted": 0,
 *               "flag_playing": 1,
 *               "flag_whitelisted": 0,
 * 	             "flag_dejavu": 0,
 *               "gain": 0,
 *               "kara_id": 176,
 *               "kid": "b0de301c-5756-49fb-b019-85a99a66586b",
 *               "language": "chi",
 *               "language_i18n": "Chinois",
 * 				 "lastplayed_at": null,
 *               "mediafile": "CHI - Dynasty Warriors 3 - GAME ED - Circuit.avi"
 *               "misc": "TAG_VIDEOGAME",
 *               "misc_i18n": "Jeu vidéo",
 *               "playlistcontent_id": 4946,
 *               "pos": 1,
 *               "pseudo_add": "Administrateur",
 * 				 "requested": 20,
 *               "serie": "Dynasty Warriors 3",
 * 				 "serie_i18n": {
 * 								"fre":"Guerriers de la Dynastie"
 * 								}
 *               "serie_altname": "DW3/DW 3",
 *               "singer": "NO_TAG",
 *               "songorder": 0,
 *               "songtype": "TYPE_ED",
 *               "songtype_i18n": "Ending",
 *               "songtype_i18n_short": "ED",
 *               "songwriter": "NO_TAG",
 *               "title": "Circuit",*
 * 				 "username": "admin",
 *               "viewcount": 0,
 *               "year": ""
 *           },
 *           ...
 *       ],
 *       "infos": {
 *           "count": 3,
 * 			 "from": 0,
 * 			 "to": 120
 *       }
 *   }
 * }
 * @apiError PL_VIEW_SONGS_CURRENT_ERROR Unable to fetch list of karaokes of current playlist
 * @apiError WEBAPPMODE_CLOSED_API_MESSAGE API is disabled at the moment.
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * @apiErrorExample Error-Response:
 * HTTP/1.1 403 Forbidden
 */

/**
 * @api {get} /public/playlists/public/karas Get list of karaokes in the public playlist
 * @apiName GetPlaylistKarasPublic
 * @apiVersion 2.3.0
 * @apiGroup Playlists
 * @apiPermission public
 * @apiHeader authorization Auth token received from logging in
 * @apiParam {Number} pl_id Target playlist ID.
 * @apiParam {String} [filter] Filter list by this string.
 * @apiParam {Number} [from=0] Return only the results starting from this position. Useful for continuous scrolling. 0 if unspecified
 * @apiParam {Number} [size=999999] Return only x number of results. Useful for continuous scrolling. 999999 if unspecified.
 *
 * @apiSuccess {Object[]} data/content/karas Array of `kara` objects
 * @apiSuccess {Number} data/infos/count Number of karaokes in playlist
 * @apiSuccess {Number} data/infos/from Starting position of listing
 * @apiSuccess {Number} data/infos/to End position of listing
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "data": {
 *       "content": [
 *           {
 *               "NORM_author": null,
 *               "NORM_creator": null,
 *               "NORM_pseudo_add": "Administrateur",
 *               "NORM_serie": "Dynasty Warriors 3",
 *               "NORM_serie_altname": "DW3/DW 3",
 *               "NORM_singer": null,
 *               "NORM_songwriter": null,
 *               "NORM_title": "Circuit",
 *               "author": "NO_TAG",
 *               "created_at": 1508423806,
 *               "kara_modified_at": 1508423806,
 *               "kara_created_at": 1508423806,
 *               "creator": null,
 *               "duration": 0,
 *               "flag_blacklisted": 0,
 *               "flag_playing": 1,
 *               "flag_whitelisted": 0,
 * 	             "flag_dejavu": 0,
 *               "gain": 0,
 *               "kara_id": 176,
 *               "kid": "b0de301c-5756-49fb-b019-85a99a66586b",
 *               "language": "chi",
 *               "language_i18n": "Chinois",
 * 				 "lastplayed_at": null,
 *               "mediafile": "CHI - Dynasty Warriors 3 - GAME ED - Circuit.avi"
 *               "misc": "TAG_VIDEOGAME",
 *               "misc_i18n": "Jeu vidéo",
 *               "playlistcontent_id": 4946,
 *               "pos": 1,
 *               "pseudo_add": "Administrateur",
 * 				 "requested": 20
 *               "serie": "Dynasty Warriors 3",
 * 				 "serie_i18n": {
 * 								"fre":"Guerriers de la Dynastie"
 * 								}
 *               "serie_altname": "DW3/DW 3",
 *               "singer": "NO_TAG",
 *               "songorder": 0,
 *               "songtype": "TYPE_ED",
 *               "songtype_i18n": "Ending",
 *               "songtype_i18n_short": "ED",
 *               "songwriter": "NO_TAG",
 *               "title": "Circuit",
 * 				 "username": "admin",
 *               "viewcount": 0,
 *               "year": ""
 *           },
 *           ...
 *       ],
 *       "infos": {
 *           "count": 3,
 * 			 "from": 0,
 * 			 "to": 120
 *       }
 *   }
 * }
 * @apiError PL_VIEW_SONGS_PUBLIC_ERROR Unable to fetch list of karaokes of public playlist
 * @apiError WEBAPPMODE_CLOSED_API_MESSAGE API is disabled at the moment.
 *
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * @apiErrorExample Error-Response:
 * HTTP/1.1 403 Forbidden
 */

/**
 * @api {get} /public/favorites View own favorites
 * @apiName GetFavorites
 * @apiVersion 2.2.0
 * @apiGroup Favorites
 * @apiPermission own
 * @apiHeader authorization Auth token received from logging in
 * @apiParam {String} [filter] Filter list by this string.
 * @apiParam {Number} [from=0] Return only the results starting from this position. Useful for continuous scrolling. 0 if unspecified
 * @apiParam {Number} [size=999999] Return only x number of results. Useful for continuous scrolling. 999999 if unspecified.
 *
 * @apiSuccess {Object[]} data/content/karas Array of `kara` objects
 * @apiSuccess {Number} data/infos/count Number of karaokes in playlist
 * @apiSuccess {Number} data/infos/from Starting position of listing
 * @apiSuccess {Number} data/infos/to End position of listing
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "data": {
 *       "content": [
 *           {
 *               "NORM_author": null,
 *               "NORM_creator": null,
 *               "NORM_pseudo_add": "Administrateur",
 *               "NORM_serie": "Dynasty Warriors 3",
 *               "NORM_serie_altname": "DW3/DW 3",
 *               "NORM_singer": null,
 *               "NORM_songwriter": null,
 *               "NORM_title": "Circuit",
 *               "author": "NO_TAG",
 *               "created_at": 1508423806,
 *               "creator": null,
 *               "duration": 0,
 *               "flag_blacklisted": 0,
 *               "flag_playing": 1,
 *               "flag_whitelisted": 0,
 *               "gain": 0,
 *               "kara_id": 176,
 *               "kid": "b0de301c-5756-49fb-b019-85a99a66586b",
 *               "language": "chi",
 *               "language_i18n": "Chinois",
 *               "mediafile": "CHI - Dynasty Warriors 3 - GAME ED - Circuit.avi"
 *               "misc": "TAG_VIDEOGAME",
 *               "misc_i18n": "Jeu vidéo",
 *               "playlistcontent_id": 4946,
 *               "pos": 1,
 *               "pseudo_add": "Administrateur",
 *               "serie": "Dynasty Warriors 3",
 * 				 "serie_i18n": {
 * 								"fre":"Guerriers de la Dynastie"
 * 								}
 *               "serie_altname": "DW3/DW 3",
 *               "singer": "NO_TAG",
 *               "songorder": 0,
 *               "songtype": "TYPE_ED",
 *               "songtype_i18n": "Ending",
 *               "songtype_i18n_short": "ED",
 *               "songwriter": "NO_TAG",
 *               "title": "Circuit",
 * 				 "username": "admin",
 *               "viewcount": 0,
 *               "year": ""
 *           },
 *           ...
 *       ],
 *       "infos": {
 *           "count": 3,
 * 			 "from": 0,
 * 			 "to": 120
 *       }
 *   }
 * }
 * @apiError FAVORITES_VIEW_ERROR Unable to fetch list of karaokes in favorites
 * @apiError WEBAPPMODE_CLOSED_API_MESSAGE API is disabled at the moment.
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * @apiErrorExample Error-Response:
 * HTTP/1.1 403 Forbidden
 */

/**
 * @api {get} /admin/settings Get settings
 * @apiName GetSettings
 * @apiVersion 2.2.0
 * @apiGroup Main
 * @apiPermission admin
 * @apiHeader authorization Auth token received from logging in
 * @apiSuccess {Object} data Contains all configuration settings. See example or documentation for what each setting does.
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "data": {
 *       "AdminPassword": "xxxx",
 *       "BinPlayerLinux": "/usr/bin/mpv",
 *       "BinPlayerOSX": "app/bin/mpv.app/Contents/MacOS/mpv",
 *       "BinPlayerWindows": "app/bin/mpv.exe",
 *       "BinffmpegLinux": "/usr/bin/ffmpeg",
 *       "BinffmpegOSX": "app/bin/ffmpeg",
 *       "BinffmpegPath": "D:\\perso\\karaokemugen-app\\app\\bin\\ffmpeg.exe",
 *       "BinffmpegWindows": "app/bin/ffmpeg.exe",
 *       "BinffprobeLinux": "/usr/bin/ffprobe",
 *       "BinffprobeOSX": "app/bin/ffprobe",
 *       "BinffprobePath": "D:\\perso\\karaokemugen-app\\app\\bin\\ffprobe.exe
 *       "BinffprobeWindows": "app/bin/ffprobe.exe",
 *       "BinmpvPath": "D:\\perso\\karaokemugen-app\\app\\bin\\mpv.exe",
 *       "EngineAllowViewBlacklist": "1",
 *       "EngineAllowViewBlacklistCriterias": "1",
 *       "EngineAllowViewWhitelist": "1",
 *       "EngineAutoPlay": "0",
 *       "EngineDefaultLocale": "fr",
 *       "EngineDisplayConnectionInfo": "1",
 *       "EngineDisplayConnectionInfoHost": "",
 *       "EngineDisplayConnectionInfoMessage": "",
 *       "EngineDisplayConnectionInfoQRCode": "1",
 *       "EngineDisplayNickname": "1",
 * 		 "EngineFreeUpvotes": "1",
 *       "EngineFreeUpvotesRequiredPercentage": "33",
 *       "EngineFreeUpvotesRequiredMin": "4",
 *       "EngineFreeAutoTime": "60",
 *       "EngineJinglesInterval": "1",
 *       "EnginePrivateMode": "1",
 * 		 "EngineRemovePublicOnPlay": "1",
 * 		 "EngineQuotaType": "1",
 *       "EngineRepeatPlaylist": "0",
 *       "EngineSmartInsert": "1",
 * 		 "EngineSongPoll": "0",
 * 		 "EngineSongPollChoices": "4",
 * 		 "EngineSongPollTimeout": "30",
 *       "EngineSongsPerUser": "10000",
 * 		 "EngineTimePerUser": "10000",
 *       "EngineCreatePreviews": "1",
 *       "PathAltname": "../times/series_altnames.csv",
 *       "PathBackgrounds": "app/backgrounds",
 *       "PathBin": "app/bin",
 *       "PathDB": "app/db",
 *       "PathDBKarasFile": "karas.sqlite3",
 *       "PathDBUserFile": "userdata.sqlite3",
 *       "PathJingles": "app/jingles",
 *       "PathKaras": "../times/karas",
 *       "PathSubs": "../times/lyrics",
 *       "PathTemp": "app/temp",
 *       "PathMedias": "app/data/medias",
 *       "PathMediasHTTP": "",
 *       "PlayerBackground": "",
 *       "PlayerFullscreen": "0",
 *       "PlayerMonitor": "0",
 *       "PlayerPIP": "1",
 *       "PlayerPIPPositionX": "Left",
 *       "PlayerPIPPositionY": "Bottom",
 *       "PlayerPIPSize": "30",
 *       "PlayerScreen": "0",
 *       "PlayerStayOnTop": "1",
 *       "VersionName": "Finé Fiévreuse",
 *       "VersionNo": "v2.0 Release Candidate 1",
 *       "appPath": "F:\\karaokemugen-app\\",
 *       "isTest": false,
 *       "mpvVideoOutput": "direct3d",
 *       "os": "win32",
 *       "osHost": "10.202.40.43",
 * 		 "WebappMode": "2",
 * 		 "WebappSongLanguageMode": "1"
 *   }
 * }
 */

/**
 * @api {put} /admin/settings Update settings
 * @apiName PutSettings
 * @apiVersion 2.2.0
 * @apiPermission admin
 * @apiHeader authorization Auth token received from logging in
 * @apiGroup Main
 * @apiDescription **Note :** All settings must be sent at once in a single request.
 * @apiParam {Boolean} EngineAllowViewBlacklist Allow/disallow users to view blacklist contents from the guest interface
 * @apiParam {Boolean} EngineAllowViewWhitelist Allow/disallow users to view whitelist contents from the guest interface
 * @apiParam {Boolean} EngineAllowViewBlacklistCriterias Allow/disallow users to view blacklist criterias list from the guest interface
 * @apiParam {Boolean} EngineAllowAutoPlay Enable/disable AutoPlay feature (starts playing once a song is added to current playlist)
 * @apiParam {Boolean} EngineDisplayConnectionInfo Show/hide connection info during jingles or pauses (the "Go to http://" message)
 * @apiParam {String} EngineDisplayConnectionInfoHost Force IP/Hostname displayed during jingles or pauses in case autodetection returns the wrong IP
 * @apiParam {String} EngineDisplayConnectionInfoMessage Add a small message before the text showing the URL to connect to
 * @apiParam {Boolean} EngineDisplayConnectionInfoQRCode Enable/disable QR Code during pauses inbetween two songs.
 * @apiParam {Boolean} EngineDisplayNickname Enable/disable displaying the username who requested a song.
 * @apiParam {Number} EngineFreeAutoTime Time in minutes before a song is automatically freed.
 * @apiParam {Boolean} EngineFreeUpvotes Enable/disable Free Songs By Upvotes feature
 * @apiParam {Number} EngineFreeUpvotesRequiredMin Minimum number of upvotes required to free a song
 * @apiParam {Number} EngineFreeUpvotesRequiredPercent Minimum percent of upvotes / online users required to free a song
 * @apiParam {Number} EngineJinglesInterval Interval in number of songs between two jingles. 0 to disable entirely.
 * @apiParam {Boolean} EnginePrivateMode `false` = Public Karaoke mode, `true` = Private Karaoke Mode. See documentation.
 * @apiParam {Boolean} EngineRemovePublicOnPlay Enable/disable auto removal of songs in public playlist if they've just been played
 * @apiParam {Number} EngineQuotaType Type of quota for users when adding songs. `0` = no quota, `1` = limited by number of songs, `2` = limited by total song duration.
 * @apiParam {Boolean} EngineRepeatPlaylist Enable/disable auto repeat playlist when at end.
 * @apiParam {Boolean} EngineSmartInsert Enable/disable smart insert of songs in the playlist.
 * @apiParam {Boolean} EngineSongPoll Enable/disable public song poll
 * @apiParam {Number} EngineSongPollChoices Number of songs the public can choose from during a public poll
 * @apiParam {Number} EngineSongPollTimeout Poll duration in seconds
 * @apiParam {Number} EngineSongsPerUser Number of songs allowed per person.
 * @apiParam {Number} EngineTimePerUser Song duration allowed per person.
 * @apiParam {Boolean} PlayerFullscreen Enable/disable full screen mode
 * @apiParam {Boolean} PlayerMonitor Enable/disable player's second screen (monitor)
 * @apiParam {Boolean} PlayerPIP Enable/disable Picture-in-picture mode
 * @apiParam {String=Left,Center,Right} PlayerPIPPositionX Horizontal position of PIP screen
 * @apiParam {String=Top,Center,Bottom} PlayerPIPPositionY Vertical position of PIP screen
 * @apiParam {Number} PlayerPIPSize Size in percentage of the PIP screen
 * @apiParam {Number} PlayerScreen Screen number to display the videos on. If screen number is not available, main screen is used. `9` means autodetection.
 * @apiParam {Boolean} PlayerStayOnTop Enable/disable stay on top of all windows.
 * @apiParam {Number} WebappMode Webapp public mode : `0` = closed, no public action available, `1` = only show song information and playlists, no karaoke can be added by the user, `2` = default, open mode.
 * @apiParam {Number} WebappSongLanguageMode How to display series : `0` = according to the original name, `1` = according to song's language, or defaults to the `series=` metadata, `2` = according to admin's language or fallbacks to english then original, `3` = according to user language or fallbacks to english then original
 * @apiParam {Boolean} PlayerStayOnTop Enable/disable stay on top of all windows.
 * @apiSuccess {Object} data Contains all configuration settings. See example or documentation for what each setting does.
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 */

/**
 * @api {post} /admin/whitelist Add song to whitelist
 * @apiName PostWhitelist
 * @apiVersion 2.1.0
 * @apiGroup Whitelist
 * @apiPermission admin
 * @apiHeader authorization Auth token received from logging in
 * @apiParam {Number[]} kara_id Karaoke song IDs, separated by commas
 * @apiSuccess {Number} args Arguments associated with message
 * @apiSuccess {Number} code Message to display
 * @apiSuccess {Number[]} data/kara_id List of karaoke IDs separated by commas
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 201 Created
 * {
 *   "args": "2",
 *   "code": "WL_SONG_ADDED",
 *   "data": {
 *       "kara_id": "2"
 *   }
 * }
 * @apiError WL_ADD_SONG_ERROR Karaoke couldn't be added to whitelist
 *
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * {
 *   "args": [
 *       "2"
 *   ],
 *   "code": "WL_ADD_SONG_ERROR",
 *   "message": "No karaoke could be added, all are in whitelist already"
 * }
 */

 	/**
 * @api {get} /admin/playlists/ Get list of playlists
 * @apiName GetPlaylists
 * @apiGroup Playlists
 * @apiVersion 2.1.0
 * @apiPermission admin
 * @apiHeader authorization Auth token received from logging in
 *
 * @apiSuccess {Object[]} playlists Playlists information
 *
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 * {
 *   "data": [
 *       {
 *           "created_at": 1508313440,
 *           "flag_current": 1,
 *           "flag_public": 0,
 *           "flag_visible": 1,
 * 			 "flag_favorites": 1,
 *           "length": 0,
 *           "modified_at": 1508408078,
 *           "name": "Liste de lecture courante",
 *           "num_karas": 6,
 *           "playlist_id": 1,
 *           "time_left": 0,
 * 			 "username": 'admin'
 *       }
 *   ]
 * }
 * @apiError PL_LIST_ERROR Unable to fetch a list of playlists
 *
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 */

/**
 * @api {get} /admin/playlists/:pl_id Get playlist information
 * @apiName GetPlaylist
 * @apiGroup Playlists
 * @apiPermission admin
 * @apiVersion 2.1.0
 *
 * @apiHeader authorization Auth token received from logging in
 * @apiParam {Number} pl_id Target playlist ID.
 * @apiSuccess {Number} data/created_at Playlist creation date in Date() format
 * @apiSuccess {Number} data/flag_current Is playlist the current one? Mutually exclusive with `flag_public`
 * @apiSuccess {Number} data/flag_public Is playlist the public one? Mutually exclusive with `flag_current`
 * @apiSuccess {Number} data/flag_visible Is playlist visible to normal users?
 * @apiSuccess {Number} data/duration Duration of playlist in seconds
 * @apiSuccess {Number} data/modified_at Playlist last edit date in Date() format
 * @apiSuccess {String} data/name Name of playlist
 * @apiSuccess {Number} data/karacount Number of karaoke songs in the playlist
 * @apiSuccess {Number} data/playlist_id Database's playlist ID
 * @apiSuccess {Number} data/time_left Time left in seconds before playlist ends, relative to the currently playing song's position.
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "data": {
 *       "created_at": 1508313440,
 *       "flag_current": 1,
 *       "flag_public": 0,
 *       "flag_visible": 1,
 *       "length": 0,
 *       "modified_at": 1508408078,
 *       "name": "Liste de lecture courante",
 *       "num_karas": 6,
 *       "playlist_id": 1,
 *       "time_left": 0
 *   }
 *}
 * @apiError PL_VIEW_ERROR Unable to fetch info from a playlist
 *
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 */

/**
 * @api {get} /admin/users/:username View user details (admin)
 * @apiName GetUserAdmin
 * @apiVersion 2.1.0
 * @apiGroup Users
 * @apiPermission Admin
 * @apiHeader authorization Auth token received from logging in
 *
 * @apiparam {String} username Username to get data from
 * @apiSuccess {String} data/login User's login
 * @apiSuccess {String} data/nickname User's nickname
 * @apiSuccess {String} data/NORM_nickname User's normalized nickname (deburr'ed)
 * @apiSuccess {String} [data/avatar_file] Directory and name of avatar image file. Can be empty if no avatar has been selected.
 * @apiSuccess {Number} data/flag_admin Is the user Admin ?
 * @apiSuccess {Number} data/flag_online Is the user an online account ?
 * @apiSuccess {Number} data/type Type of account (1 = user, 2 = guest)
 * @apiSuccess {Number} data/last_login Last login time in UNIX timestamp.
 * @apiSuccess {Number} data/user_id User's ID in the database
 * @apiSuccess {String} data/url User's URL in its profile
 * @apiSuccess {String} data/fingerprint User's fingerprint
 * @apiSuccess {String} data/bio User's bio
 * @apiSuccess {String} data/email User's email
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "data": [
 *       {
 *           "NORM_nickname": "Administrator",
 *           "avatar_file": "",
 *           "flag_admin": 1,
 *           "flag_online": 0,
 *           "type": 1,
 *           "last_login": 0,
 *           "login": "admin",
 *           "nickname": "Administrator",
 *           "user_id": 1,
 * 			 "url": null,
 * 			 "email": null,
 * 			 "bio": null,
 * 			 "fingerprint": null
 *       },
 *   ]
 * }
 * @apiError USER_VIEW_ERROR Unable to view user details
 *
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * {
 *   "code": "USER_VIEW_ERROR",
 *   "message": null
 * }
 */

/**
 * @api {get} /admin/playlists/:pl_id/karas Get list of karaokes in a playlist
 * @apiName GetPlaylistKaras
 * @apiVersion 2.3.1
 * @apiGroup Playlists
 * @apiPermission admin
 * @apiHeader authorization Auth token received from logging in
 * @apiParam {Number} pl_id Target playlist ID.
 * @apiParam {String} [filter] Filter list by this string.
 * @apiParam {Number} [from=0] Return only the results starting from this position. Useful for continuous scrolling. 0 if unspecified
 * @apiParam {Number} [size=999999] Return only x number of results. Useful for continuous scrolling. 999999 if unspecified.
 *
 * @apiSuccess {Object[]} data/content/karas Array of `kara` objects
 * @apiSuccess {Number} data/infos/count Number of karaokes in playlist
 * @apiSuccess {Number} data/infos/from Starting position of listing
 * @apiSuccess {Number} data/infos/to End position of listing
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "data": {
 *       "content": [
 *           {
 *               "NORM_author": null,
 *               "NORM_creator": null,
 *               "NORM_pseudo_add": "Administrateur",
 *               "NORM_serie": "Dynasty Warriors 3",
 *               "NORM_serie_altname": "DW3/DW 3",
 * 				 "NORM_serie_orig": "Dynasty Warriors",
 *               "NORM_singer": null,
 *               "NORM_songwriter": null,
 *               "NORM_title": "Circuit",
 *               "author": "NO_TAG",
 *               "created_at": 1508423806,
 * 				 "modified_at": 1508423806,
 *               "creator": "NO_TAG",
 *               "duration": 0,
 *               "flag_blacklisted": 0,
 *               "flag_playing": 1,
 *               "flag_whitelisted": 0,
 *               "flag_dejavu": 0,
 *               "gain": 0,
 *               "kara_id": 176,
 *               "kid": "b0de301c-5756-49fb-b019-85a99a66586b",
 *               "language": "chi",
 *               "language_i18n": "Chinois",
 * 				 "lastplayed_at": null,
 *               "mediafile": "CHI - Dynasty Warriors 3 - GAME ED - Circuit.avi"
 *               "misc": "TAG_VIDEOGAME",
 *               "misc_i18n": "Jeu vidéo",
 *               "playlistcontent_id": 4946,
 *               "pos": 1,
 *               "pseudo_add": "Administrateur",
 * 				 "requested": 20,
 *               "serie": "Dynasty Warriors 3",
 * 				 "serie_i18n": {
 * 								"fre":"Guerriers de la Dynastie"
 * 								}
 *               "serie_altname": "DW3/DW 3",
 * 				 "serie_orig": "Dynasty Warriors 3"
 *               "singer": null,
 *               "songorder": 0,
 *               "songtype": "TYPE_ED",
 *               "songtype_i18n": "Ending",
 *               "songtype_i18n_short": "ED",
 *               "songwriter": null,
 *               "title": "Circuit",
 * 				 "username": "admin",
 *               "viewcount": 0,
 *               "year": ""
 *           },
 *           ...
 *       ],
 *       "infos": {
 *           "count": 3,
 * 			 "from": 0,
 * 			 "to": 120
 *       }
 *   }
 * }
 * @apiError PL_VIEW_SONGS_ERROR Unable to fetch list of karaokes in a playlist
 *
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 */

 	/**
 * @api {get} /admin/playlists/:pl_id/karas/:plc_id Get song info from a playlist item
 * @apiName GetPlaylistPLC
 * @apiVersion 2.3.1
 * @apiGroup Playlists
 * @apiPermission admin
 * @apiHeader authorization Auth token received from logging in
 * @apiParam {Number} pl_id Target playlist ID. **Note :** Irrelevant since PLCIDs are unique in the table.
 * @apiParam {Number} plc_id Playlist content ID.
 * @apiSuccess {String} data/NORM_author Normalized karaoke's author name
 * @apiSuccess {String} data/NORM_creator Normalized creator's name
 * @apiSuccess {String} data/NORM_pseudo_add Normalized name of person who added the karaoke to the playlist
 * @apiSuccess {String} data/NORM_serie Normalized name of series the karaoke is from
 * @apiSuccess {String} data/NORM_serie_altname Normalized names of alternative names to the series the karaoke is from. When there are more than one alternative name, they're separated by forward slashes (`/`)
 * @apiSuccess {String} data/NORM_serie_orig Normalized original name for the series
 * @apiSuccess {String} data/NORM_singer Normalized name of singer.
 * @apiSuccess {String} data/NORM_songwriter Normalized name of songwriter.
 * @apiSuccess {String} data/NORM_title Normalized song title
 * @apiSuccess {String} data/author Karaoke author's name
 * @apiSuccess {Number} data/kara_created_at UNIX timestamp of the karaoke's creation date in the base
 * @apiSuccess {Number} data/created_at UNIX timestamp of the karaoke's addition in the playlist
 * @apiSuccess {Number} data/kara_modified_at UNIX timestamp of the karaoke's creation date in the base
 * @apiSuccess {String} data/creator Show's creator name
 * @apiSuccess {Number} data/duration Song duration in seconds
 * @apiSuccess {Number} data/flag_blacklisted Is the song in the blacklist ?
 * @apiSuccess {Number} data/flag_playing Is the song the one currently playing ?
 * @apiSuccess {Number} data/flag_whitelisted Is the song in the whitelist ?
 * @apiSuccess {Number} data/flag_dejavu Has the song been played in the last hour ? (`EngineMaxDejaVuTime` defaults to 60 minutes)
 * @apiSuccess {Number} data/flag_favorites 1 = the song is in your favorites, 0 = not.
 * @apiSuccess {Number} data/flag_free Wether the song has been marked as free or not
 * @apiSuccess {Number} data/gain Calculated audio gain for the karaoke's video, in decibels (can be negative)
 * @apiSuccess {Number} data/kara_id Karaoke's ID in the main database
 * @apiSuccess {String} data/kid Karaoke's unique ID (survives accross database generations)
 * @apiSuccess {String} data/language Song's language in ISO639-2B format, separated by commas when a song has several languages
 * @apiSuccess {String} data/language_i18n Song's language translated in the client's native language
 * @apiSuccess {Number} data/lastplayed_at When the song has been played last, in unix timestamp
 * @apiSuccess {String} data/misc Internal tag list (`TAG_VIDEOGAME`, etc.)
 * @apiSuccess {String} data/misc_i18n Translated tag list
 * @apiSuccess {Number} data/playlist_id ID of playlist this song belongs to
 * @apiSuccess {Number} data/playlistcontent_ID PLC ID of this song.
 * @apiSuccess {Number} data/pos Position in the playlist. First song has a position of `1`
 * @apiSuccess {String} data/previewfile Filename of the preview file associated with the karaoke. Can be undefined if the preview hasn't been generated yet by the server.
 * @apiSuccess {String} data/pseudo_add Nickname of user who added/requested the song. this nickname can be changed (`username` cannot) hence why it is displayed here.
 * @apiSuccess {String} data/requested Number of times the song has been requested.
 * @apiSuccess {String} data/serie Name of series/show the song belongs to
 * @apiSuccess {Object} data/serie_i18n JSON object with series' names depending on their language.
 * @apiSuccess {String} data/serie_altname Alternative name(s) of series/show this song belongs to. Names are separated by forward slashes (`/`)
 * @apiSuccess {String} data/serie_orig Original name for the series
 * @apiSuccess {String} data/singer Singer's name, if known.
 * @apiSuccess {Number} data/songorder Song's order, relative to it's type. Opening 1, Opening 2, Ending 1, Ending 2, etc.
 * @apiSuccess {String} data/songtype Song's type internal tag (`TYPE_OP`, `TYPE_ED`, `TYPE_IN` ...)
 * @apiSuccess {String} data/songtype_i18n Translated song's type (`Opening`, `Ending`, `Insert Song`...)
 * @apiSuccess {String} data/songtype_i18n_short Short translated version of the song's type (`OP`, `ED`, `IN`, ...)
 * @apiSuccess {Number} data/time_before_play Estimated time remaining before the song is going to play (in seconds). `0` if the song is currently playing or if there is no song selected as currently playing in the playlist (thus making this estimate impossible)
 * @apiSuccess {String} data/title Song's title
 * @apiSuccess {String} data/username Username who submitted this karaoke. Can be different from `pseudo_add`.
 * @apiSuccess {String} data/mediafile Media's filename
 * @apiSuccess {Number} data/viewcount Counts how many times the song has been played
 * @apiSuccess {String} data/year Song's creation year. Empty string is returned if no year is known.
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "data": [
 *       {
 *           "NORM_author": null,
 *           "NORM_creator": null,
 *           "NORM_pseudo_add": "Axel",
 *           "NORM_serie": "C3 ~ Cube X Cursed X Curious",
 *           "NORM_serie_altname": "C-Cube/CxCxC",
 *           "NORM_serie_orig": "C3 ~ Cube X Cursed X Curious",
 *           "NORM_singer": null,
 *           "NORM_songwriter": null,
 *           "NORM_title": "Hana",
 *           "author": "NO_TAG",
 *           "kara_created_at": 1508427958,
 *           "kara_modified_at": 1508427958,
 *           "created_at": 1508427958,
 *           "creator": "NO_TAG",
 *           "duration": 0,
 *           "flag_blacklisted": 0,
 *           "flag_playing": 0,
 *           "flag_whitelisted": 0,
 *           "flag_dejavu": 0,
 * 			 "flag_favorites": 0,
 *           "flag_free": 0,
 *           "gain": 0,
 *           "kara_id": 1007,
 *           "kid": "c05e24eb-206b-4ff5-88d4-74e8d5ad6f75",
 *           "language": "jpn",
 *           "language_i18n": "Japonais",
 * 			 "lastplayed_at": null,
 *           "mediafile": "JAP - C3 ~ Cube X Cursed X Curious - ED1 - Hana.avi",
 *           "misc": "NO_TAG",
 *           "misc_i18n": "No info",
 *           "playlist_id": 2,
 *           "playlistcontent_id": 4961,
 *           "pos": 12,
 *           "previewfile": "JAP - C3 ~ Cube X Cursed X Curious.1201230.mp4"
 *           "pseudo_add": "Axel",
 * 			 "requested": 20,
 *           "serie": "C3 ~ Cube X Cursed X Curious",
 *  		 "serie_i18n": {
 * 				"fre":"Guerriers de la Dynastie"
 *  			},
 *           "serie_altname": "C-Cube/CxCxC",
 *           "serie_orig": "C3 ~Cube X Cursed X Curious",
 *           "singer": "NO_TAG",
 *           "songorder": 1,
 *           "songtype": "TYPE_ED",
 *           "songtype_i18n": "Ending",
 *           "songtype_i18n_short": "ED",
 *           "songwriter": "NO_TAG",
 *           "time_before_play": 0,
 *           "title": "Hana",
 * 			 "username": "axelterizaki",
 *           "viewcount": 0,
 *           "year": ""
 *       }
 *   ]
 * }
 * @apiError PL_VIEW_CONTENT_ERROR Unable to fetch playlist's content information
 *
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * {
 *   "code": "PL_VIEW_CONTENT_ERROR",
 *   "message": "PLCID unknown!"
 * }
 */

 	/**
 * @api {get} /admin/whitelist Get whitelist
 * @apiName GetWhitelist
 * @apiVersion 2.3.1
 * @apiGroup Whitelist
 * @apiPermission admin
 * @apiHeader authorization Auth token received from logging in
 * @apiParam {String} [filter] Filter list by this string.
 * @apiParam {Number} [from=0] Return only the results starting from this position. Useful for continuous scrolling. 0 if unspecified
 * @apiParam {Number} [size=999999] Return only x number of results. Useful for continuous scrolling. 999999 if unspecified.
 * @apiSuccess {String} code Message to display
 * @apiSuccess {Object[]} data/content List of karaoke objects
 * @apiSuccess {Number} data/infos/count Number of items in whitelist no matter which range was requested
 * @apiSuccess {Number} data/infos/from Items listed are from this position
 * @apiSuccess {Number} data/infos/size How many items listed.
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "data": {
 *       "content": [
 *           {
 *               "NORM_author": null,
 *               "NORM_creator": "Eurovision",
 *               "NORM_serie": null,
 *               "NORM_serie_altname": null,
 * 				 "NORM_serie_orig": null,
 *               "NORM_singer": "Dschinghis Khan",
 *               "NORM_songwriter": "Ralph Siegel",
 *               "NORM_title": "Moskau",
 *               "author": "NO_TAG",
 *               "created_at": 1508921852,
 *               "creator": "Eurovision",
 *               "duration": 0,
 *               "kara_id": 1,
 *               "kid": "d9bb6a76-2b7d-469e-ba44-6acfc463202e",
 *               "language": "ger",
 *               "language_i18n": "Allemand",
 *               "misc": "TAG_CONCERT,TAG_REAL",
 *               "misc_i18n": "Concert,Non-anime",
 * 				 "requested": 20,
 *               "serie": null,
 * 				 "serie_i18n": {
 * 								"fre":"Guerriers de la Dynastie"
 * 								}
 *               "serie_altname": null,
 * 				 "serie_orig": null,
 *               "singer": "Dschinghis Khan",
 *               "songorder": 0,
 *               "songtype": "TYPE_MUSIC",
 *               "songtype_i18n": "Music Video",
 *               "songtype_i18n_short": "MV",
 *               "songwriter": "Ralph Siegel",
 *               "title": "Moskau",
 *               "mediafile": "ALL - Dschinghis Khan - MV - Moskau.avi",
 *               "viewcount": 0,
 *               "whitelist_id": 1,
 *               "year": "1980"
 *           }
 *       ],
 *       "infos": {
 *           "count": 1,
 *           "from": 0,
 *           "to": 999999
 *       }
 *   }
 * }
 * @apiError WL_VIEW_ERROR Whitelist could not be viewed
 *
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * {
 *   "code": "WL_VIEW_ERROR"
 * }
 */

 	/**
 * @api {get} /admin/blacklist Get blacklist
 * @apiName GetBlacklist
 * @apiVersion 2.3.1
 * @apiGroup Blacklist
 * @apiPermission admin
 * @apiHeader authorization Auth token received from logging in
 * @apiParam {String} [filter] Filter list by this string.
 * @apiParam {Number} [from=0] Return only the results starting from this position. Useful for continuous scrolling. 0 if unspecified
 * @apiParam {Number} [size=999999] Return only x number of results. Useful for continuous scrolling. 999999 if unspecified.* @apiSuccess {String} code Message to display
 * @apiSuccess {Object[]} data/content List of karaoke objects
 * @apiSuccess {Number} data/infos/count Number of items in whitelist no matter which range was requested
 * @apiSuccess {Number} data/infos/from Items listed are from this position
 * @apiSuccess {Number} data/infos/size How many items listed.
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "data": {
 *       "content": [
 *           {
 *               "NORM_author": "Jean-Jacques Debout",
 *               "NORM_creator": null,
 *               "NORM_serie": "Capitaine Flam",
 *               "NORM_serie_orig": "Captain Future",
 *               "NORM_serie_altname": "Kyaputen Fyucha",
 *               "NORM_singer": "Richard Simon",
 *               "NORM_songwriter": "Roger Dumas",
 *               "NORM_title": "",
 *               "author": "Jean-Jacques Debout",
 *               "created_at": 1508924354,
 *               "creator": "NO_TAG",
 *               "duration": 0,
 *               "kara_id": 217,
 *               "kid": "1b8bca21-4d26-41bd-90b7-2afba74381ee",
 *               "language": "fre",
 *               "language_i18n": "Français",
 *               "misc": "NO_TAG",
 *               "misc_i18n": "No info",
 *               "reason_add": "Blacklisted Tag : Jean-Jacques Debout (type 6)",
 * 				 "requested": 20
 *               "serie": "Capitaine Flam",
 * 				 "serie_orig": "Captain Future",
 *               "serie_altname": "Kyaputen Fyucha",
 * 				 "serie_i18n": {
 * 					"fre":"Guerriers de la Dynastie"
 * 				 },
 *               "singer": "Richard Simon",
 *               "songorder": 0,
 *               "songtype": "TYPE_OP",
 *               "songtype_i18n": "Opening",
 *               "songtype_i18n_short": "OP",
 *               "songwriter": "Roger Dumas",
 *               "title": "",
 *               "mediafile": "FR - Capitaine Flam - OP.avi",
 *               "viewcount": 0,
 *               "year": "1981"
 *           }
 *       ],
 *       "infos": {
 *           "count": 1,
 *           "from": 0,
 *           "to": 999999
 *       }
 *   }
 * }
 * @apiError BL_VIEW_ERROR Blacklist could not be viewed
 *
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * {
 *   "code": "BL_VIEW_ERROR"
 * }
 */

 	/**
 * @api {get} /admin/playlists/:pl_id/export Export a playlist
 * @apiDescription Export format is in JSON. You'll usually want to save it to a file for later use.
 * @apiName getPlaylistExport
 * @apiVersion 2.1.0
 * @apiGroup Playlists
 * @apiPermission admin
 * @apiHeader authorization Auth token received from logging in
 * @apiParam {Number} pl_id Playlist ID to export
 * @apiSuccess {String} data Playlist in an exported format. See docs for more info.
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "data": {
 *       "Header": {
 *           "description": "Karaoke Mugen Playlist File",
 *           "version": 2
 *       },
 *       "PlaylistContents": [
 *           {
 *               "flag_playing": 1,
 *               "kid": "b0de301c-5756-49fb-b019-85a99a66586b"
 *           },
 *           {
 *               "kid": "6da96a7d-7159-4ea7-a5ee-1d78a6eb44dd"
 *           },
 *           {
 *               "kid": "5af7ba4c-2325-451d-a24f-e7fd7c2d3ba8"
 *           },
 *           {
 *               "kid": "e0206f48-0f51-44e3-bf9a-b651916d0c05"
 *           }
 *       ],
 *       "PlaylistInformation": {
 *           "created_at": 1508936812,
 *           "flag_visible": 0,
 *           "modified_at": 1508936821,
 *           "name": "Test",
 *           "time_left": 0
 *       }
 *   }
 * }
 * @apiError PL_EXPORT_ERROR Unable to export playlist
 *
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * {
 *   "args": "5",
 *   "code": "PL_EXPORT_ERROR",
 *   "message": "Playlist 5 unknown"
 * }
 */

 	/**
 * @api {get} /public/playlists/ Get list of playlists (public)
 * @apiName GetPlaylistsPublic
 * @apiGroup Playlists
 * @apiVersion 2.1.0
 * @apiPermission public
 * @apiHeader authorization Auth token received from logging in
 * @apiDescription Contrary to the `/admin/playlists/` path, this one will not return playlists which have the `flag_visible` set to `0`.
 * @apiSuccess {Object[]} playlists Playlists information
 *
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 * {
 *   "data": [
 *       {
 *           "created_at": 1508313440,
 *           "flag_current": 1,
 *           "flag_public": 0,
 *           "flag_visible": 1,
 * 			 "flag_favorites": 0,
 *           "length": 0,
 *           "modified_at": 1508408078,
 *           "name": "Liste de lecture courante",
 *           "num_karas": 6,
 *           "playlist_id": 1,
 *           "time_left": 0,
 * 			 "username": 'admin'
 *       }
 *   ]
 * }
 * @apiError PL_LIST_ERROR Unable to fetch a list of playlists
 * @apiError WEBAPPMODE_CLOSED_API_MESSAGE API is disabled at the moment.
 *
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * @apiErrorExample Error-Response:
 * HTTP/1.1 403 Forbidden
 */

/**
 * @api {get} /public/playlists/:pl_id Get playlist information (public)
 * @apiName GetPlaylistPublic
 * @apiGroup Playlists
 * @apiPermission public
 * @apiVersion 2.1.0
 * @apiHeader authorization Auth token received from logging in
 * @apiDescription Contrary to the `/admin/playlists/` path, this one will not return playlists which have the `flag_visible` set to `0`.
 * @apiParam {Number} pl_id Target playlist ID.
 * @apiSuccess {Number} data/created_at Playlist creation date in UNIX timestamp
 * @apiSuccess {Number} data/flag_current Is playlist the current one? Mutually exclusive with `flag_public`
 * @apiSuccess {Number} data/flag_favorites Is playlist a favorites playlist? if displayed by a regular user, he'll only get to see his own favorites playlist.
 * @apiSuccess {Number} data/flag_public Is playlist the public one? Mutually exclusive with `flag_current`
 * @apiSuccess {Number} data/flag_visible Is playlist visible to normal users?
 * @apiSuccess {Number} data/length Duration of playlist in seconds
 * @apiSuccess {Number} data/modified_at Playlist last edit date in UNIX timestamp
 * @apiSuccess {String} data/name Name of playlist
 * @apiSuccess {Number} data/num_karas Number of karaoke songs in the playlist
 * @apiSuccess {Number} data/playlist_id Database's playlist ID
 * @apiSuccess {Number} data/time_left Time left in seconds before playlist ends, relative to the currently playing song's position.
 * @apiSuccess {Number} data/username User who created the playlist
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "data": {
 *       "created_at": 1508313440,
 *       "flag_current": 1,
 * 		 "flag_favorites": 0,
 *       "flag_public": 0,
 *       "flag_visible": 1,
 *       "length": 0,
 *       "modified_at": 1508408078,
 *       "name": "Liste de lecture courante",
 *       "num_karas": 6,
 *       "playlist_id": 1,
 *       "time_left": 0,
 * 		 "username": admin
 *   }
 *}
 * @apiError PL_VIEW_ERROR Unable to fetch info from a playlist
 * @apiError WEBAPPMODE_CLOSED_API_MESSAGE API is disabled at the moment.
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * @apiErrorExample Error-Response:
 * HTTP/1.1 403 Forbidden
 */

 	/**
 * @api {get} /public/playlists/:pl_id/karas Get list of karaokes in a playlist (public)
 * @apiName GetPlaylistKarasPublic
 * @apiVersion 2.3.1
 * @apiGroup Playlists
 * @apiPermission public
 * @apiHeader authorization Auth token received from logging in
 * @apiDescription Contrary to the `/admin/playlists/` path, this one will not return playlists which have the `flag_visible` set to `0`.
 * @apiParam {Number} pl_id Target playlist ID.
 * @apiParam {String} [filter] Filter list by this string.
 * @apiParam {Number} [from=0] Return only the results starting from this position. Useful for continuous scrolling. 0 if unspecified
 * @apiParam {Number} [size=999999] Return only x number of results. Useful for continuous scrolling. 999999 if unspecified.
 *
 * @apiSuccess {Object[]} data/content/karas Array of `kara` objects
 * @apiSuccess {Number} data/infos/count Number of karaokes in playlist
 * @apiSuccess {Number} data/infos/from Starting position of listing
 * @apiSuccess {Number} data/infos/to End position of listing
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "data": {
 *       "content": [
 *           {
 *               "NORM_author": null,
 *               "NORM_creator": null,
 *               "NORM_pseudo_add": "Administrateur",
 *               "NORM_serie": "Dynasty Warriors 3",
 *               "NORM_serie_altname": "DW3/DW 3",
 *               "NORM_serie_orig": "Dynasty Warriors 3",
 *               "NORM_singer": null,
 *               "NORM_songwriter": null,
 *               "NORM_title": "Circuit",
 *               "author": "NO_TAG",
 *               "created_at": 1508423806,
 *               "kara_created_at": 1508423806,
 *               "kara_modified_at": 1508423806,
 *               "creator": null,
 *               "duration": 0,
 *               "flag_blacklisted": 0,
 *               "flag_playing": 1,
 *               "flag_whitelisted": 0,
 * 	             "flag_dejavu": 0,
 *               "gain": 0,
 *               "kara_id": 176,
 *               "kid": "b0de301c-5756-49fb-b019-85a99a66586b",
 *               "language": "chi",
 *               "language_i18n": "Chinois",
 * 				 "lastplayed_at": null,
 *               "mediafile": "CHI - Dynasty Warriors 3 - GAME ED - Circuit.avi"
 *               "misc": "TAG_VIDEOGAME",
 *               "misc_i18n": "Jeu vidéo",
 *               "playlistcontent_id": 4946,
 *               "pos": 1,
 *               "pseudo_add": "Administrateur",
 * 				 "requested": 20,
 *               "serie": "Dynasty Warriors 3",
 * 				 "serie_i18n": {
 *					"fre":"Guerriers de la Dynastie"
 * 				}
 *               "serie_altname": "DW3/DW 3",
 *               "serie_orig": "Dynasty Warriors 3",
 *               "singer": "NO_TAG",
 *               "songorder": 0,
 *               "songtype": "TYPE_ED",
 *               "songtype_i18n": "Ending",
 *               "songtype_i18n_short": "ED",
 *               "songwriter": "NO_TAG",
 *               "title": "Circuit",
 * 				 "username": "admin",
 *               "viewcount": 0,
 *               "year": ""
 *           },
 *           ...
 *       ],
 *       "infos": {
 *           "count": 3,
 * 			 "from": 0,
 * 			 "to": 120
 *       }
 *   }
 * }
 * @apiError PL_VIEW_SONGS_ERROR Unable to fetch list of karaokes in a playlist
 * @apiError WEBAPPMODE_CLOSED_API_MESSAGE API is disabled at the moment.
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * @apiErrorExample Error-Response:
 * HTTP/1.1 403 Forbidden
 */

/**
 * @api {get} /public/playlists/:pl_id/karas/:plc_id Get song info from a playlist (public)
 * @apiName GetPlaylistPLCPublic
 * @apiVersion 2.3.1
 * @apiGroup Playlists
 * @apiPermission public
 * @apiHeader authorization Auth token received from logging in
 * @apiDescription Contrary to the `admin/playlists` path, this one won't return any karaoke info from a playlist the user has no access to.
 * @apiParam {Number} pl_id Target playlist ID. **Note :** Irrelevant since PLCIDs are unique in the table.
 * @apiParam {Number} plc_id Playlist content ID.
 * @apiSuccess {String} data/NORM_author Normalized karaoke's author name
 * @apiSuccess {String} data/NORM_creator Normalized creator's name
 * @apiSuccess {String} data/NORM_pseudo_add Normalized name of person who added the karaoke to the playlist
 * @apiSuccess {String} data/NORM_serie Normalized name of series the karaoke is from
 * @apiSuccess {String} data/NORM_serie_orig Normalized name of series the karaoke is from
 * @apiSuccess {String} data/NORM_serie_altname Normalized names of alternative names to the series the karaoke is from. When there are more than one alternative name, they're separated by forward slashes (`/`)
 * @apiSuccess {String} data/NORM_singer Normalized name of singer.
 * @apiSuccess {String} data/NORM_songwriter Normalized name of songwriter.
 * @apiSuccess {String} data/NORM_title Normalized song title
 * @apiSuccess {String} data/author Karaoke author's name
 * @apiSuccess {Number} data/created_at UNIX timestamp of the karaoke's addition in the playlist
 * @apiSuccess {Number} data/kara_modified_at UNIX timestamp of the karaoke's last modification date in the base
 * @apiSuccess {Number} data/kara_created_at UNIX timestamp of the karaoke's creation date in the base
 * @apiSuccess {String} data/creator Show's creator name
 * @apiSuccess {Number} data/duration Song duration in seconds
 * @apiSuccess {Number} data/flag_blacklisted Is the song in the blacklist ?
 * @apiSuccess {Number} data/flag_favorites 1 = the song is in your favorites, 0 = not.
 * @apiSuccess {Number} data/flag_free Wether the song has been freed or not
 * @apiSuccess {Number} data/flag_playing Is the song the one currently playing ?
 * @apiSuccess {Number} data/flag_whitelisted Is the song in the whitelist ?
 * @apiSuccess {Number} data/flag_dejavu Has the song been played in the last hour ? (by default, `EngineMaxDejaVuTime` is at 60 minutes)
 * @apiSuccess {Number} data/gain Calculated audio gain for the karaoke's video, in decibels (can be negative)
 * @apiSuccess {Number} data/kara_id Karaoke's ID in the main database
 * @apiSuccess {String} data/kid Karaoke's unique ID (survives accross database generations)
 * @apiSuccess {String} data/language Song's language in ISO639-2B format, separated by commas when a song has several languages
 * @apiSuccess {String} data/language_i18n Song's language translated in the client's native language
 * @apiSuccess {Number} data/lastplayed_at Time when the song was last played at in UNIX timestamp. `null` if never played before.
 * @apiSuccess {String} data/mediafile Video's filename
 * @apiSuccess {String} data/misc Internal tag list (`TAG_VIDEOGAME`, etc.)
 * @apiSuccess {String} data/misc_i18n Translated tag list
 * @apiSuccess {Number} data/playlist_id ID of playlist this song belongs to
 * @apiSuccess {Number} data/playlistcontent_ID PLC ID of this song.
 * @apiSuccess {Number} data/pos Position in the playlist. First song has a position of `1`
 * @apiSuccess {String} data/pseudo_add Nickname of user who added this song
 * @apiSuccess {String} data/requested Number of times the song has been requested.
 * @apiSuccess {String} data/serie Name of series/show the song belongs to
 * @apiSuccess {Object} data/serie_i18n JSON object with series' names depending on their language.
 * @apiSuccess {String} data/serie_orig Serie's original name
 * @apiSuccess {String} data/serie_altname Alternative name(s) of series/show this song belongs to. Names are separated by forward slashes (`/`)
 * @apiSuccess {String} data/singer Singer's name, if known.
 * @apiSuccess {Number} data/songorder Song's order, relative to it's type. Opening 1, Opening 2, Ending 1, Ending 2, etc.
 * @apiSuccess {String} data/songtype Song's type internal tag (`TYPE_OP`, `TYPE_ED`, `TYPE_IN` ...)
 * @apiSuccess {String} data/songtype_i18n Translated song's type (`Opening`, `Ending`, `Insert Song`...)
 * @apiSuccess {String} data/songtype_i18n_short Short translated version of the song's type (`OP`, `ED`, `IN`, ...)
 * @apiSuccess {Number} data/time_before_play Estimated time remaining before the song is going to play (in seconds). `0` if the song is currently playing or if there is no song selected as currently playing in the playlist (thus making this estimate impossible)
 * @apiSuccess {String} data/title Song's title
 * @apiSuccess {String} data/username Username who added that song
 * @apiSuccess {Number} data/viewcount Counts how many times the song has been played
 * @apiSuccess {String} data/year Song's creation year. Empty string is returned if no year is known.
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "data": [
 *       {
 *           "NORM_author": null,
 *           "NORM_creator": null,
 *           "NORM_pseudo_add": "Axel",
 *           "NORM_serie": "C3 ~ Cube X Cursed X Curious",
 *           "NORM_serie_altname": "C-Cube/CxCxC",
 * 			 "NORM_serie_orig": "C3 ~ Cube X Cursed X Curious"
 *           "NORM_singer": null,
 *           "NORM_songwriter": null,
 *           "NORM_title": "Hana",
 *           "author": "NO_TAG",
 *           "created_at": 1508427958,
 *           "kara_created_at": 1508427958,
 *           "kara_modified_at": 1508427958,
 *           "creator": null,
 *           "duration": 0,
 *           "flag_blacklisted": 0,
 *           "flag_playing": 0,
 * 			 "flag_favorites": 0,
 *           "flag_whitelisted": 0,
 * 	         "flag_dejavu": 0,
 *           "flag_free": 0,
 *           "gain": 0,
 *           "kara_id": 1007,
 *           "kid": "c05e24eb-206b-4ff5-88d4-74e8d5ad6f75",
 *           "language": "jpn",
 *           "language_i18n": "Japonais",
 * 			 "lastplayed_at": null,
 *           "mediafile": "JAP - C3 ~ Cube X Cursed X Curious - ED1 - Hana.avi",
 *           "misc": "NO_TAG",
 *           "misc_i18n": "No info",
 *           "playlist_id": 2,
 *           "playlistcontent_id": 4961,
 *           "pos": 12,
 *           "pseudo_add": "Axel",
 * 			 "requested": 20,
 *           "serie": "C3 ~ Cube X Cursed X Curious",
 *           "serie_altname": "C-Cube/CxCxC",
 * 			 "serie_i18n": {
 * 				"fre":"Guerriers de la Dynastie"
 *  			}
 * 			 "serie_orig": "C3 ~ Cube X Cursed X Curious",
 *           "singer": "NO_TAG",
 *           "songorder": 1,
 *           "songtype": "TYPE_ED",
 *           "songtype_i18n": "Ending",
 *           "songtype_i18n_short": "ED",
 *           "songwriter": "NO_TAG",
 *           "time_before_play": 0,
 *           "title": "Hana",
 * 			 "username": "axelterizaki",
 *           "viewcount": 0,
 *           "year": ""
 *       }
 *   ]
 * }
 * @apiError PL_VIEW_CONTENT_ERROR Unable to fetch playlist's content information
 * @apiError WEBAPPMODE_CLOSED_API_MESSAGE API is disabled at the moment.
 *
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * {
 *   "code": "PL_VIEW_CONTENT_ERROR",
 *   "message": "PLCID unknown!"
 * }
 * @apiErrorExample Error-Response:
 * HTTP/1.1 403 Forbidden
 */

/**
 * @api {get} /public/whitelist Get whitelist (public)
 * @apiName GetWhitelistPublic
 * @apiVersion 2.2.0
 * @apiGroup Whitelist
 * @apiPermission public
 * @apiHeader authorization Auth token received from logging in
 * @apiDescription If `EngineAllowViewWhitelist` is set to `0` in configuration, then returns an error message (see below)
 * @apiParam {String} [filter] Filter list by this string.
 * @apiParam {Number} [from=0] Return only the results starting from this position. Useful for continuous scrolling. 0 if unspecified
 * @apiParam {Number} [size=999999] Return only x number of results. Useful for continuous scrolling. 999999 if unspecified.* @apiSuccess {String} code Message to display
 * @apiSuccess {Object[]} data/content List of karaoke objects
 * @apiSuccess {Number} data/infos/count Number of items in whitelist no matter which range was requested
 * @apiSuccess {Number} data/infos/from Items listed are from this position
 * @apiSuccess {Number} data/infos/to Items listed end at this position
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "data": {
 *       "content": [
 *           {
 *               "NORM_author": null,
 *               "NORM_creator": "Eurovision",
 *               "NORM_serie": null,
 *               "NORM_serie_altname": null,
 *               "NORM_singer": "Dschinghis Khan",
 *               "NORM_songwriter": "Ralph Siegel",
 *               "NORM_title": "Moskau",
 *               "author": "NO_TAG",
 *               "created_at": 1508921852,
 *               "creator": "Eurovision",
 *               "duration": 0,
 *               "kara_id": 1,
 *               "kid": "d9bb6a76-2b7d-469e-ba44-6acfc463202e",
 *               "language": "ger",
 *               "language_i18n": "Allemand",
 *               "mediafile": "ALL - Dschinghis Khan - MV - Moskau.avi",
 *               "misc": "TAG_CONCERT,TAG_REAL",
 *               "misc_i18n": "Concert,Non-anime",
 * 				 "requested": 20,
 *               "serie": null,
 *               "serie_altname": null,
 *               "singer": "Dschinghis Khan",
 *               "songorder": 0,
 *               "songtype": "TYPE_MUSIC",
 *               "songtype_i18n": "Music Video",
 *               "songtype_i18n_short": "MV",
 *               "songwriter": "Ralph Siegel",
 *               "title": "Moskau",
 *               "viewcount": 0,
 *               "whitelist_id": 1,
 *               "year": "1980"
 *           }
 *       ],
 *       "infos": {
 *           "count": 1,
 *           "from": 0,
 *           "to": 999999
 *       }
 *   }
 * }
 * @apiError WL_VIEW_ERROR Whitelist could not be viewed
 * @apiError WL_VIEW_FORBIDDEN Whitelist view is not allowed for users
 * @apiError WEBAPPMODE_CLOSED_API_MESSAGE API is disabled at the moment.
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * {
 *   "code": "WL_VIEW_FORBIDDEN"
 * }
 * @apiErrorExample Error-Response:
 * HTTP/1.1 403 Forbidden
 */

 	/**
 * @api {get} /public/blacklist Get blacklist (public)
 * @apiName GetBlacklistPublic
 * @apiVersion 2.2.0
 * @apiGroup Blacklist
 * @apiPermission public
 * @apiHeader authorization Auth token received from logging in
 * @apiDescription If `EngineAllowViewBlacklist` is set to `0` in configuration, then returns an error message (see below)
 * @apiParam {String} [filter] Filter list by this string.
 * @apiParam {Number} [from=0] Return only the results starting from this position. Useful for continuous scrolling. 0 if unspecified
 * @apiParam {Number} [size=999999] Return only x number of results. Useful for continuous scrolling. 999999 if unspecified.* @apiSuccess {String} code Message to display
 * @apiSuccess {Object[]} data/content List of karaoke objects
 * @apiSuccess {Number} data/infos/count Number of items in whitelist no matter which range was requested
 * @apiSuccess {Number} data/infos/from Items listed are from this position
 * @apiSuccess {Number} data/infos/size How many items listed.
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "data": {
 *       "content": [
 *           {
 *               "NORM_author": null,
 *               "NORM_creator": "Eurovision",
 *               "NORM_serie": null,
 *               "NORM_serie_altname": null,
 *               "NORM_singer": "Dschinghis Khan",
 *               "NORM_songwriter": "Ralph Siegel",
 *               "NORM_title": "Moskau",
 *               "author": "NO_TAG",
 *               "created_at": 1508921852,
 *               "creator": "Eurovision",
 *               "duration": 0,
 *               "kara_id": 1,
 *               "kid": "d9bb6a76-2b7d-469e-ba44-6acfc463202e",
 *               "language": "ger",
 *               "language_i18n": "Allemand",
 *               "mediafile": "ALL - Dschinghis Khan - MV - Moskau.avi",
 *               "misc": "TAG_CONCERT,TAG_REAL",
 *               "misc_i18n": "Concert,Non-anime",
 * 				 "requested": 20,
 *               "serie": null,
 *               "serie_altname": null,
 *               "singer": "Dschinghis Khan",
 *               "songorder": 0,
 *               "songtype": "TYPE_MUSIC",
 *               "songtype_i18n": "Music Video",
 *               "songtype_i18n_short": "MV",
 *               "songwriter": "Ralph Siegel",
 *               "title": "Moskau",
 *               "viewcount": 0,
 *               "whitelist_id": 1,
 *               "year": "1980"
 *           }
 *       ],
 *       "infos": {
 *           "count": 1,
 *           "from": 0,
 *           "to": 999999
 *       }
 *   }
 * }
 * @apiError BL_VIEW_ERROR Blacklist could not be viewed
 * @apiError BL_VIEW_FORBIDDEN Blacklist view is not allowed for users
 * @apiError WEBAPPMODE_CLOSED_API_MESSAGE API is disabled at the moment.
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * {
 *   "code": "BL_VIEW_FORBIDDEN"
 * }
 * @apiErrorExample Error-Response:
 * HTTP/1.1 403 Forbidden
 */

/**
 * @api {get} /public/karas Get complete list of karaokes
 * @apiName GetKaras
 * @apiVersion 2.3.1
 * @apiGroup Karaokes
 * @apiPermission public
 * @apiHeader authorization Auth token received from logging in
 * @apiParam {String} [filter] Filter list by this string.
 * @apiParam {Number} [from=0] Return only the results starting from this position. Useful for continuous scrolling. 0 if unspecified
 * @apiParam {Number} [size=999999] Return only x number of results. Useful for continuous scrolling. 999999 if unspecified.
 * @apiParam {String} [searchType] Can be `serie`, `year`, `popular`, `recent` or `tag`
 * @apiParam {String} [searchValue] Value to search for. For `series` or `tag` it's an ID, for `year` it's a 4-digit year.
 *
 * @apiSuccess {Object[]} data/content/karas Array of `kara` objects
 * @apiSuccess {Number} data/infos/count Number of karaokes in playlist
 * @apiSuccess {Number} data/infos/from Starting position of listing
 * @apiSuccess {Number} data/infos/to End position of listing
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "data": {
 *       "content": [
 *           {
 *               "NORM_author": null,
 *               "NORM_creator": null,
 * 				 "NORM_groups": null,
 *               "NORM_serie": "Dynasty Warriors 3",
 *               "NORM_serie_altname": "DW3/DW 3",
 *               "NORM_serie_orig": "Dynasty Warriors 3",
 *               "NORM_singer": null,
 *               "NORM_songwriter": null,
 *               "NORM_title": "Circuit",
 *               "author": "NO_TAG",
 *               "created_at": 1508423806,
 *               "modified_at": 1508423806,
 *               "creator": "NO_TAG",
 *               "duration": 0,
 * 	             "flag_dejavu": 0,
 * 				 "flag_favorites": 1,
 *               "gain": 0,
 * 				 "groups": null,
 *               "kara_id": 176,
 *               "kid": "b0de301c-5756-49fb-b019-85a99a66586b",
 *               "language": "chi",
 *               "language_i18n": "Chinois",
 * 				 "lastplayed_at": null,
 *               "mediafile": "CHI - Dynasty Warriors 3 - GAME ED - Circuit.avi"
 *               "misc": "TAG_VIDEOGAME",
 *               "misc_i18n": "Jeu vidéo",
 * 				 "requested": 20
 *               "serie": "Dynasty Warriors 3",
 * 				 "serie_i18n": {
 * 								"fre":"Guerriers de la Dynastie"
 * 								}
 *               "serie_altname": "DW3/DW 3",
 *               "serie_orig": "Dynasty Warriors 3",
 *               "singer": "NO_TAG",
 *               "songorder": 0,
 *               "songtype": "TYPE_ED",
 *               "songtype_i18n": "Ending",
 *               "songtype_i18n_short": "ED",
 *               "songwriter": "NO_TAG",
 *               "title": "Circuit",
 *               "viewcount": 0,
 *               "year": ""
 *           },
 *           ...
 *       ],
 *       "infos": {
 *           "count": 3,
 * 			 "from": 0,
 * 			 "to": 120
 *       }
 *   }
 * }
 * @apiError SONG_LIST_ERROR Unable to fetch list of karaokes
 * @apiError WEBAPPMODE_CLOSED_API_MESSAGE API is disabled at the moment.
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * @apiErrorExample Error-Response:
 * HTTP/1.1 403 Forbidden
 */
/**
 * @api {get} /public/karas/:kara_id Get song info from database
 * @apiName GetKaraInfo
 * @apiVersion 2.3.0
 * @apiGroup Karaokes
 * @apiPermission public
 * @apiHeader authorization Auth token received from logging in
 * @apiParam {Number} kara_id Karaoke ID you want to fetch information from
 * @apiSuccess {String} data/NORM_author Normalized karaoke's author name
 * @apiSuccess {String} data/NORM_creator Normalized creator's name
 * @apiSuccess {String} data/NORM_groups Normalized groups names
 * @apiSuccess {String} data/NORM_serie Normalized name of series the karaoke is from
 * @apiSuccess {String} data/NORM_serie_altname Normalized names of alternative names to the series the karaoke is from. When there are more than one alternative name, they're separated by forward slashes (`/`)
 * @apiSuccess {String} data/NORM_singer Normalized name of singer.
 * @apiSuccess {String} data/NORM_songwriter Normalized name of songwriter.
 * @apiSuccess {String} data/NORM_title Normalized song title
 * @apiSuccess {String} data/author Karaoke author's name
 * @apiSuccess {Number} data/created_at UNIX timestamp of the karaoke's creation date in the base
 * @apiSuccess {Number} data/modified_at UNIX timestamp of the karaoke's last modification date in the base
 * @apiSuccess {String} data/creator Show's creator name
 * @apiSuccess {Number} data/duration Song duration in seconds
 * @apiSuccess {Number} data/flag_dejavu Has the song been played in the last hour ? (by default `EngineMaxDejaVuTime` is at 60 minutes)
 * @apiSuccess {Number} data/flag_favorites 1 = the song is in your favorites, 0 = not.
 * @apiSuccess {Number} data/gain Calculated audio gain for the karaoke's video, in decibels (can be negative)
 * @apiSuccess {String} data/groups List of groups this karaoke song belongs to
 * @apiSuccess {String} data/kid Karaoke's unique ID (survives accross database generations)
 * @apiSuccess {String} data/language Song's language in ISO639-2B format, separated by commas when a song has several languages
 * @apiSuccess {String} data/language_i18n Song's language translated in the client's native language
 * @apiSuccess {Number} data/lastplayed_at Last time the song has been played in UNIX timestamp. `null` if never played before
 * @apiSuccess {String} data/mediafile Media's filename
 * @apiSuccess {String} data/misc Internal tag list (`TAG_VIDEOGAME`, etc.)
 * @apiSuccess {String} data/misc_i18n Translated tag list
 * @apiSuccess {String} data/requested Number of times the song has been requested.
 * @apiSuccess {String} data/serie Name of series/show the song belongs to
 * @apiSuccess {String} data/serie_altname Alternative name(s) of series/show this song belongs to. Names are separated by forward slashes (`/`)
 * @apiSuccess {String} data/singer Singer's name, if known.
 * @apiSuccess {Number} data/songorder Song's order, relative to it's type. Opening 1, Opening 2, Ending 1, Ending 2, etc.
 * @apiSuccess {String} data/songtype Song's type internal tag (`TYPE_OP`, `TYPE_ED`, `TYPE_IN` ...)
 * @apiSuccess {String} data/songtype_i18n Translated song's type (`Opening`, `Ending`, `Insert Song`...)
 * @apiSuccess {String} data/songtype_i18n_short Short translated version of the song's type (`OP`, `ED`, `IN`, ...)
 * @apiSuccess {Number} data/time_before_play Estimated time remaining before the song is going to play (in seconds). `0` if the song is currently playing or if there is no song selected as currently playing in the playlist (thus making this estimate impossible)
 * @apiSuccess {String} data/title Song's title
 * @apiSuccess {Number} data/viewcount Counts how many times the song has been played
 * @apiSuccess {String} data/year Song's creation year. Empty string is returned if no year is known.
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "data": [
 *       {
 *           "NORM_author": null,
 *           "NORM_creator": null,
 *           "NORM_groups": null,
 *           "NORM_serie": "C3 ~ Cube X Cursed X Curious",
 *           "NORM_serie_altname": "C-Cube/CxCxC",
 *           "NORM_singer": null,
 *           "NORM_songwriter": null,
 *           "NORM_title": "Hana",
 *           "author": "NO_TAG",
 *           "created_at": 1508427958,
 *           "modified_at": 1508427958,
 *           "creator": "NO_TAG",
 *           "duration": 0,
 * 	         "flag_dejavu": 0,
 * 		     "flag_favorites": 0,
 *           "gain": 0,
 *           "groups": null,
 *           "kid": "c05e24eb-206b-4ff5-88d4-74e8d5ad6f75",
 *           "language": "jpn",
 *           "language_i18n": "Japonais",
 * 			 "lastplayed_at": null,
 *           "mediafile": "JAP - C3 ~ Cube X Cursed X Curious - ED1 - Hana.avi",
 *           "misc": "NO_TAG",
 *           "misc_i18n": "No info",
 * 			 "requested": 20,
 *           "serie": "C3 ~ Cube X Cursed X Curious",
 *           "serie_altname": "C-Cube/CxCxC",
 *           "singer": "NO_TAG",
 *           "songorder": 1,
 *           "songtype": "TYPE_ED",
 *           "songtype_i18n": "Ending",
 *           "songtype_i18n_short": "ED",
 *           "songwriter": "NO_TAG",
 *           "time_before_play": 0,
 *           "title": "Hana",
 *           "viewcount": 0,
 *           "year": ""
 *       }
 *   ]
 * }
 * @apiError SONG_VIEW_ERROR Unable to list songs
 * @apiError WEBAPPMODE_CLOSED_API_MESSAGE API is disabled at the moment.
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * {
 *   "code": "SONG_VIEW_ERROR",
 *   "message": null
 * }
 * @apiErrorExample Error-Response:
 * HTTP/1.1 403 Forbidden
 */

/**
 * @api {get} /public/playlists/current/karas Get list of karaokes in the current playlist
 * @apiName GetPlaylistKarasCurrent
 * @apiVersion 2.3.1
 * @apiGroup Playlists
 * @apiPermission public
 * @apiHeader authorization Auth token received from logging in
 * @apiParam {Number} pl_id Target playlist ID.
 * @apiParam {String} [filter] Filter list by this string.
 * @apiParam {Number} [from=0] Return only the results starting from this position. Useful for continuous scrolling. 0 if unspecified
 * @apiParam {Number} [size=999999] Return only x number of results. Useful for continuous scrolling. 999999 if unspecified.
 *
 * @apiSuccess {Object[]} data/content/karas Array of `kara` objects
 * @apiSuccess {Number} data/infos/count Number of karaokes in playlist
 * @apiSuccess {Number} data/infos/from Starting position of listing
 * @apiSuccess {Number} data/infos/to End position of listing
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "data": {
 *       "content": [
 *           {
 *               "NORM_author": null,
 *               "NORM_creator": null,
 *               "NORM_pseudo_add": "Administrateur",
 *               "NORM_serie": "Dynasty Warriors 3",
 *               "NORM_serie_altname": "DW3/DW 3",
 *               "NORM_serie_orig": "Dynasty Warriors 3",
 *               "NORM_singer": null,
 *               "NORM_songwriter": null,
 *               "NORM_title": "Circuit",
 *               "author": "NO_TAG",
 *               "created_at": 1508423806,
 *               "kara_modified_at": 1508423806,
 *               "kara_created_at": 1508423806,
 *               "creator": null,
 *               "duration": 0,
 *               "flag_blacklisted": 0,
 *               "flag_playing": 1,
 *               "flag_whitelisted": 0,
 * 	             "flag_dejavu": 0,
 *               "gain": 0,
 *               "kara_id": 176,
 *               "kid": "b0de301c-5756-49fb-b019-85a99a66586b",
 *               "language": "chi",
 *               "language_i18n": "Chinois",
 * 				 "lastplayed_at": null,
 *               "mediafile": "CHI - Dynasty Warriors 3 - GAME ED - Circuit.avi"
 *               "misc": "TAG_VIDEOGAME",
 *               "misc_i18n": "Jeu vidéo",
 *               "playlistcontent_id": 4946,
 *               "pos": 1,
 *               "pseudo_add": "Administrateur",
 * 				 "requested": 20,
 *               "serie": "Dynasty Warriors 3",
 * 				 "serie_i18n": {
 * 								"fre":"Guerriers de la Dynastie"
 * 								}
 *               "serie_altname": "DW3/DW 3",
 *               "serie_orig": "Dynasty Warriors 3",
 *               "singer": "NO_TAG",
 *               "songorder": 0,
 *               "songtype": "TYPE_ED",
 *               "songtype_i18n": "Ending",
 *               "songtype_i18n_short": "ED",
 *               "songwriter": "NO_TAG",
 *               "title": "Circuit",*
 * 				 "username": "admin",
 *               "viewcount": 0,
 *               "year": ""
 *           },
 *           ...
 *       ],
 *       "infos": {
 *           "count": 3,
 * 			 "from": 0,
 * 			 "to": 120
 *       }
 *   }
 * }
 * @apiError PL_VIEW_SONGS_CURRENT_ERROR Unable to fetch list of karaokes of current playlist
 * @apiError WEBAPPMODE_CLOSED_API_MESSAGE API is disabled at the moment.
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * @apiErrorExample Error-Response:
 * HTTP/1.1 403 Forbidden
 */

/**
 * @api {get} /public/playlists/current Get current playlist information
 * @apiName GetPlaylistCurrent
 * @apiGroup Playlists
 * @apiPermission public
 * @apiVersion 2.1.0
 * @apiHeader authorization Auth token received from logging in
 * @apiDescription This route allows to check basic information about the current playlist, no matter which ID it has (and without you having to know it)
 * @apiSuccess {Number} data/created_at Playlist creation date in UNIX timestamp
 * @apiSuccess {Number} data/flag_current Is playlist the current one? Mutually exclusive with `flag_public`
 * @apiSuccess {Number} data/flag_public Is playlist the public one? Mutually exclusive with `flag_current`
 * @apiSuccess {Number} data/flag_visible Is playlist visible to normal users?
 * @apiSuccess {Number} data/length Duration of playlist in seconds
 * @apiSuccess {Number} data/modified_at Playlist last edit date in UNIX timestamp
 * @apiSuccess {String} data/name Name of playlist
 * @apiSuccess {Number} data/num_karas Number of karaoke songs in the playlist
 * @apiSuccess {Number} data/playlist_id Database's playlist ID
 * @apiSuccess {Number} data/time_left Time left in seconds before playlist ends, relative to the currently playing song's position.
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "data": {
 *       "created_at": 1508313440,
 *       "flag_current": 1,
 *       "flag_public": 0,
 *       "flag_visible": 1,
 *       "length": 0,
 *       "modified_at": 1508408078,
 *       "name": "Liste de lecture courante",
 *       "num_karas": 6,
 *       "playlist_id": 1,
 *       "time_left": 0
 *   }
 *}
 * @apiError PL_VIEW_CURRENT_ERROR Unable to fetch info from current playlist
 * @apiError WEBAPPMODE_CLOSED_API_MESSAGE API is disabled at the moment.
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * @apiErrorExample Error-Response:
 * HTTP/1.1 403 Forbidden
 */

 	/**
 * @api {get} /public/playlists/public Get public playlist information
 * @apiName GetPlaylistPublic
 * @apiGroup Playlists
 * @apiPermission public
 * @apiVersion 2.1.0
 * @apiHeader authorization Auth token received from logging in
 * @apiDescription This route allows to check basic information about the public playlist, no matter which ID it has (and without you having to know it)
 * @apiSuccess {Number} data/created_at Playlist creation date in UNIX timestamp
 * @apiSuccess {Number} data/flag_current Is playlist the current one? Mutually exclusive with `flag_public`
 * @apiSuccess {Number} data/flag_public Is playlist the public one? Mutually exclusive with `flag_current`
 * @apiSuccess {Number} data/flag_visible Is playlist visible to normal users?
 * @apiSuccess {Number} data/length Duration of playlist in seconds
 * @apiSuccess {Number} data/modified_at Playlist last edit date in UNIX timestamp
 * @apiSuccess {String} data/name Name of playlist
 * @apiSuccess {Number} data/num_karas Number of karaoke songs in the playlist
 * @apiSuccess {Number} data/playlist_id Database's playlist ID
 * @apiSuccess {Number} data/time_left Time left in seconds before playlist ends, relative to the currently playing song's position.
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "data": {
 *       "created_at": 1508313440,
 *       "flag_current": 1,
 *       "flag_public": 0,
 *       "flag_visible": 1,
 *       "length": 0,
 *       "modified_at": 1508408078,
 *       "name": "Liste de lecture courante",
 *       "num_karas": 6,
 *       "playlist_id": 1,
 *       "time_left": 0
 *   }
 *}
 * @apiError PL_VIEW_PUBLIC_ERROR Unable to fetch info from public playlist
 * @apiError WEBAPPMODE_CLOSED_API_MESSAGE API is disabled at the moment.

 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * @apiErrorExample Error-Response:
 * HTTP/1.1 403 Forbidden
 */

/**
 * @api {get} /public/playlists/public/karas Get list of karaokes in the public playlist
 * @apiName GetPlaylistKarasPublic
 * @apiVersion 2.3.1
 * @apiGroup Playlists
 * @apiPermission public
 * @apiHeader authorization Auth token received from logging in
 * @apiParam {Number} pl_id Target playlist ID.
 * @apiParam {String} [filter] Filter list by this string.
 * @apiParam {Number} [from=0] Return only the results starting from this position. Useful for continuous scrolling. 0 if unspecified
 * @apiParam {Number} [size=999999] Return only x number of results. Useful for continuous scrolling. 999999 if unspecified.
 *
 * @apiSuccess {Object[]} data/content/karas Array of `kara` objects
 * @apiSuccess {Number} data/infos/count Number of karaokes in playlist
 * @apiSuccess {Number} data/infos/from Starting position of listing
 * @apiSuccess {Number} data/infos/to End position of listing
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "data": {
 *       "content": [
 *           {
 *               "NORM_author": null,
 *               "NORM_creator": null,
 *               "NORM_pseudo_add": "Administrateur",
 *               "NORM_serie": "Dynasty Warriors 3",
 *               "NORM_serie_altname": "DW3/DW 3",
 *               "NORM_serie_orig": "Dynasty Warriors 3",
 *               "NORM_singer": null,
 *               "NORM_songwriter": null,
 *               "NORM_title": "Circuit",
 *               "author": "NO_TAG",
 *               "created_at": 1508423806,
 *               "kara_modified_at": 1508423806,
 *               "kara_created_at": 1508423806,
 *               "creator": null,
 *               "duration": 0,
 *               "flag_blacklisted": 0,
 *               "flag_playing": 1,
 *               "flag_whitelisted": 0,
 * 	             "flag_dejavu": 0,
 *               "gain": 0,
 *               "kara_id": 176,
 *               "kid": "b0de301c-5756-49fb-b019-85a99a66586b",
 *               "language": "chi",
 *               "language_i18n": "Chinois",
 * 				 "lastplayed_at": null,
 *               "mediafile": "CHI - Dynasty Warriors 3 - GAME ED - Circuit.avi"
 *               "misc": "TAG_VIDEOGAME",
 *               "misc_i18n": "Jeu vidéo",
 *               "playlistcontent_id": 4946,
 *               "pos": 1,
 *               "pseudo_add": "Administrateur",
 * 				 "requested": 20
 *               "serie": "Dynasty Warriors 3",
 * 				 "serie_i18n": {
 * 								"fre":"Guerriers de la Dynastie"
 * 								}
 *               "serie_altname": "DW3/DW 3",
 *               "serie_orig": "Dynasty Warriors 3",
 *               "singer": "NO_TAG",
 *               "songorder": 0,
 *               "songtype": "TYPE_ED",
 *               "songtype_i18n": "Ending",
 *               "songtype_i18n_short": "ED",
 *               "songwriter": "NO_TAG",
 *               "title": "Circuit",
 * 				 "username": "admin",
 *               "viewcount": 0,
 *               "year": ""
 *           },
 *           ...
 *       ],
 *       "infos": {
 *           "count": 3,
 * 			 "from": 0,
 * 			 "to": 120
 *       }
 *   }
 * }
 * @apiError PL_VIEW_SONGS_PUBLIC_ERROR Unable to fetch list of karaokes of public playlist
 * @apiError WEBAPPMODE_CLOSED_API_MESSAGE API is disabled at the moment.
 *
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * @apiErrorExample Error-Response:
 * HTTP/1.1 403 Forbidden
 */

/**
	* @api {get} /public/tags Get tag list
	* @apiName GetTags
	* @apiVersion 2.3.0
	* @apiGroup Tags
	* @apiPermission public
	* @apiHeader authorization Auth token received from logging in
	* @apiParam {Number} [type] Type of tag to filter
	* @apiParam {String} [filter] Tag name to filter results
	* @apiParam {Number} [from] Where to start listing from
	* @apiParam {Number} [size] How many records to get.
	* @apiSuccess {String} data/name Name of tag
	* @apiSuccess {Number} data/tag_id Tag ID number
	* @apiSuccess {Number} data/type Tag type number
	* @apiSuccess {String} data/slug Slugified version of the tag
	* @apiSuccess {Object} data/i18n Translations in case of misc and song type tags
	*
	* @apiSuccessExample Success-Response:
	* HTTP/1.1 200 OK
	* {
	*     "data": {
	*		content: [
	*        {
    *            "i18n": {
	* 				"en": "TV Show",
	*				"fr": "Série TV"
	*			 },
    *            "name": "TAG_TVSHOW",
    *            "slug": "tag_tvshow",
    *            "tag_id": 2090,
    *            "type": 2
    *        },
	*        {
	*		   "name": "TYPE_AMV",
	*          "name_i18n": "Anime Music Video",
	*          "tag_id": 15,
	*          "type": 3
	*        },
	*        {
	*          "name": "ita",
	*          "name_i18n": "Italien",
	*          "tag_id": 370,
	*          "type": 5
	*        }
	*		 ...
	*   	],
	*       "infos": {
 	*           "count": 1000,
 	* 			"from": 0,
 	* 			"to": 120
 	*       }
	* }
	* @apiError TAGS_LIST_ERROR Unable to get list of tags
	* @apiError WEBAPPMODE_CLOSED_API_MESSAGE API is disabled at the moment.
	* @apiErrorExample Error-Response:
	* HTTP/1.1 500 Internal Server Error
	* @apiErrorExample Error-Response:
    * HTTP/1.1 403 Forbidden
	*/

/**
		* @api {get} /public/series Get series list
		* @apiName GetSeries
		* @apiVersion 2.3.0
		* @apiGroup Karaokes
		* @apiPermission public
		* @apiHeader authorization Auth token received from logging in
		* @apiParam {String} [filter] Text filter to search series for
		* @apiParam {Number} [from] Where to start listing from
		* @apiParam {Number} [size] How many records to get.
		* @apiSuccess {Array} data Array of series
		* @apiSuccess {Number} data/serie_id Serie ID in the database
		* @apiSuccess {String} data/name Serie's original name
		* @apiSuccess {String} data/i18n_name Serie's name according to language
		* @apiSuccess {String[]} data/aliases Array of aliases
		* @apiSuccess {Object} data/i18n JSON object for the series translations
		* @apiSuccessExample Success-Response:
		* HTTP/1.1 200 OK
		* {
		*     "data": {
		*        "contents": [
		*        {
		*			"name": "Hataraku Saibô",
		*			"i18n_name": "Les Brigades Immunitaires",
		*			"aliases": ["LBI"],
		*			"i18n": {
		*				"jpn": "Hataraku Saibô",
		*				"eng": "Cells at Work",
		*				"fre": "Les Brigades Immunitaires"
		*			},
		*			"serie_id": 2093
		*		},
		*		...
		*		],
		*       "infos": {
 		*           "count": 1000,
 		* 			"from": 0,
 		* 			"to": 120
 		*       }
		* }
		* @apiError SERIES_LIST_ERROR Unable to get series list
		* @apiError WEBAPPMODE_CLOSED_API_MESSAGE API is disabled at the moment.
		* @apiErrorExample Error-Response:
		* HTTP/1.1 500 Internal Server Error
		* @apiErrorExample Error-Response:
		* HTTP/1.1 403 Forbidden
		*/

/**
 * @api {get} /public/users/:username View user details (public)
 * @apiName GetUser
 * @apiVersion 2.1.0
 * @apiGroup Users
 * @apiPermission public
 * @apiHeader authorization Auth token received from logging in
 * @apiParam {String} username Username to check details for.
 * @apiSuccess {String} data/login User's login
 * @apiSuccess {String} data/nickname User's nickname
 * @apiSuccess {String} data/NORM_nickname User's normalized nickname (deburr'ed)
 * @apiSuccess {String} [data/avatar_file] Directory and name of avatar image file. Can be empty if no avatar has been selected.
 * @apiSuccess {Number} data/flag_admin Is the user Admin ?
 * @apiSuccess {Number} data/flag_online Is the user an online account ?
 * @apiSuccess {Number} data/type Type of account (1 = user, 2 = guest)
 * @apiSuccess {Number} data/last_login Last login time in UNIX timestamp.
 * @apiSuccess {Number} data/user_id User's ID in the database
 * @apiSuccess {String} data/url User's URL in its profile
 * @apiSuccess {String} data/bio User's bio
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "data": [
 *       {
 *           "NORM_nickname": "Administrator",
 *           "avatar_file": "",
 *           "flag_admin": 1,
 *           "flag_online": 0,
 *           "type": 1,
 *           "last_login": 0,
 *           "login": "admin",
 *           "nickname": "Administrator",
 *           "user_id": 1,
 * 			 "url": null,
 * 			 "bio": null,
 *       },
 *   ]
 * }
 * @apiError USER_VIEW_ERROR Unable to view user details
 * @apiError WEBAPPMODE_CLOSED_API_MESSAGE API is disabled at the moment.
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * {
 *   "code": "USER_VIEW_ERROR",
 *   "message": null
 * }
 * @apiErrorExample Error-Response:
 * HTTP/1.1 403 Forbidden
 */

 	/**
 * @api {put} /public/users/:username Edit a user
 * @apiName EditUser
 * @apiVersion 2.1.0
 * @apiGroup Users
 * @apiPermission admin
 * @apiHeader authorization Auth token received from logging in
 * @apiParam {String} username Username to edit
 * @apiParam {String} login New login for user
 * @apiParam {String} nickname New nickname for user
 * @apiParam {String} password New password. Can be empty (password won't be changed then)
 * @apiParam {String} bio User's bio info. Can be empty.
 * @apiParam {String} [email] User's mail. Can be empty.
 * @apiParam {String} [url] User's URL. Can be empty.
 * @apiSuccess {String} args ID of user deleted
 * @apiSuccess {String} code Message to display
 * @apiSuccess {Number} data ID of user deleted
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "args": "lol",
 *   "code": "USER_UPDATED",
 *   "data": {
 *       "NORM_nickname": "lol",
 *       "bio": "lol2",
 *       "email": "lol3@lol.fr",
 *       "id": "3",
 *       "login": "test2",
 *       "nickname": "lol",
 *       "url": "http://lol4"
 *   }
 * }
 * @apiError USER_UPDATE_ERROR Unable to edit user
 *
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 */

/**
 * @api {get} /public/top50 View Top 50 songs
 * @apiName GetTop50
 * @apiVersion 2.2.0
 * @apiGroup Karaokes
 * @apiPermission public
 * @apiHeader authorization Auth token received from logging in
 * @apiParam {String} [filter] Filter list by this string.
 * @apiParam {Number} [from=0] Return only the results starting from this position. Useful for continuous scrolling. 0 if unspecified
 * @apiParam {Number} [size=999999] Return only x number of results. Useful for continuous scrolling. 999999 if unspecified.
 *
 * @apiSuccess {Object[]} data/content/karas Array of `kara` objects
 * @apiSuccess {Number} data/infos/count Number of karaokes in playlist
 * @apiSuccess {Number} data/infos/from Starting position of listing
 * @apiSuccess {Number} data/infos/to End position of listing
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "data": {
 *       "content": [
 *           {
 *               "NORM_author": null,
 *               "NORM_creator": null,
 *               "NORM_serie": "Dynasty Warriors 3",
 *               "NORM_serie_altname": "DW3/DW 3",
 *               "NORM_singer": null,
 *               "NORM_songwriter": null,
 *               "NORM_title": "Circuit",
 *               "author": null,
 *               "created_at": 1508423806,
 *               "creator": null,
 *               "duration": 0,
 * 	             "flag_dejavu": 0,
 *               "gain": 0,
 *               "kara_id": 176,
 *               "kid": "b0de301c-5756-49fb-b019-85a99a66586b",
 *               "language": "chi",
 *               "language_i18n": "Chinois",
 * 				 "lastplayed_at": null,
 *               "misc": "TAG_VIDEOGAME",
 *               "misc_i18n": "Jeu vidéo",
 * 				 "requested": 20
 *               "serie": "Dynasty Warriors 3",
 * 				 "serie_i18n": {}
 *               "serie_altname": "DW3/DW 3",
 *               "singer": null,
 *               "songorder": 0,
 *               "songtype": "TYPE_ED",
 *               "songtype_i18n": "Ending",
 *               "songtype_i18n_short": "ED",
 *               "songwriter": null,
 *               "title": "Circuit",
 *               "videofile": "CHI - Dynasty Warriors 3 - GAME ED - Circuit.avi"
 *               "viewcount": 0,
 *               "year": ""
 *           },
 *           ...
 *       ],
 *       "infos": {
 *           "count": 3,
 * 			 "from": 0,
 * 			 "to": 120
 *       }
 *   }
 * }
 * @apiError TOP50_LIST_ERROR Unable to fetch list of karaokes
 *
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 */

/**
 * @api {get} /public/myaccount View own user details
 * @apiName GetMyAccount
 * @apiVersion 2.1.0
 * @apiGroup Users
 * @apiPermission own
 * @apiHeader authorization Auth token received from logging in
 * @apiSuccess {String} data/login User's login
 * @apiSuccess {String} data/nickname User's nickname
 * @apiSuccess {String} data/NORM_nickname User's normalized nickname (deburr'ed)
 * @apiSuccess {String} [data/avatar_file] Directory and name of avatar image file. Can be empty if no avatar has been selected.
 * @apiSuccess {Number} data/flag_admin Is the user Admin ?
 * @apiSuccess {Number} data/flag_online Is the user an online account ?
 * @apiSuccess {Number} data/type Type of account (1 = user, 2 = guest)
 * @apiSuccess {Number} data/last_login Last login time in UNIX timestamp.
 * @apiSuccess {Number} data/user_id User's ID in the database
 * @apiSuccess {String} data/url User's URL in its profile
 * @apiSuccess {String} data/fingerprint User's fingerprint
 * @apiSuccess {String} data/bio User's bio
 * @apiSuccess {String} data/email User's email
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "data": [
 *       {
 *           "NORM_nickname": "Administrator",
 *           "avatar_file": "",
 *           "flag_admin": 1,
 *           "flag_online": 0,
 *           "type": 1,
 *           "last_login": 0,
 *           "login": "admin",
 *           "nickname": "Administrator",
 *           "user_id": 1,
 * 			 "url": null,
 * 			 "email": null,
 * 			 "bio": null,
 * 			 "fingerprint": null
 *       },
 *   ]
 * }
 * @apiError USER_VIEW_ERROR Unable to view user details
 * @apiError WEBAPPMODE_CLOSED_API_MESSAGE API is disabled at the moment.
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * {
 *   "code": "USER_VIEW_ERROR",
 *   "message": null
 * }
 * @apiErrorExample Error-Response:
 * HTTP/1.1 403 Forbidden
 */

/**
 * @api {get} /public/favorites View own favorites
 * @apiName GetFavorites
 * @apiVersion 2.3.1
 * @apiGroup Favorites
 * @apiPermission own
 * @apiHeader authorization Auth token received from logging in
 * @apiParam {String} [filter] Filter list by this string.
 * @apiParam {Number} [from=0] Return only the results starting from this position. Useful for continuous scrolling. 0 if unspecified
 * @apiParam {Number} [size=999999] Return only x number of results. Useful for continuous scrolling. 999999 if unspecified.
 *
 * @apiSuccess {Object[]} data/content/karas Array of `kara` objects
 * @apiSuccess {Number} data/infos/count Number of karaokes in playlist
 * @apiSuccess {Number} data/infos/from Starting position of listing
 * @apiSuccess {Number} data/infos/to End position of listing
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "data": {
 *       "content": [
 *           {
 *               "NORM_author": null,
 *               "NORM_creator": null,
 *               "NORM_pseudo_add": "Administrateur",
 *               "NORM_serie": "Dynasty Warriors 3",
 *               "NORM_serie_altname": "DW3/DW 3",
 *               "NORM_serie_orig": "Dynasty Warriors 3",
 *               "NORM_singer": null,
 *               "NORM_songwriter": null,
 *               "NORM_title": "Circuit",
 *               "author": "NO_TAG",
 *               "created_at": 1508423806,
 *               "creator": null,
 *               "duration": 0,
 *               "flag_blacklisted": 0,
 *               "flag_playing": 1,
 *               "flag_whitelisted": 0,
 *               "gain": 0,
 *               "kara_id": 176,
 *               "kid": "b0de301c-5756-49fb-b019-85a99a66586b",
 *               "language": "chi",
 *               "language_i18n": "Chinois",
 *               "mediafile": "CHI - Dynasty Warriors 3 - GAME ED - Circuit.avi"
 *               "misc": "TAG_VIDEOGAME",
 *               "misc_i18n": "Jeu vidéo",
 *               "playlistcontent_id": 4946,
 *               "pos": 1,
 *               "pseudo_add": "Administrateur",
 *               "serie": "Dynasty Warriors 3",
 * 				 "serie_i18n": {
 * 								"fre":"Guerriers de la Dynastie"
 * 								}
 *               "serie_altname": "DW3/DW 3",
 *               "serie_orig": "Dynasty Warriors 3",
 *               "singer": "NO_TAG",
 *               "songorder": 0,
 *               "songtype": "TYPE_ED",
 *               "songtype_i18n": "Ending",
 *               "songtype_i18n_short": "ED",
 *               "songwriter": "NO_TAG",
 *               "title": "Circuit",
 * 				 "username": "admin",
 *               "viewcount": 0,
 *               "year": ""
 *           },
 *           ...
 *       ],
 *       "infos": {
 *           "count": 3,
 * 			 "from": 0,
 * 			 "to": 120
 *       }
 *   }
 * }
 * @apiError FAVORITES_VIEW_ERROR Unable to fetch list of karaokes in favorites
 * @apiError WEBAPPMODE_CLOSED_API_MESSAGE API is disabled at the moment.
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * @apiErrorExample Error-Response:
 * HTTP/1.1 403 Forbidden
 */

/**
 * @api {put} /public/users/:username Edit a user
 * @apiName EditUser
 * @apiVersion 2.5.0
 * @apiGroup Users
 * @apiPermission admin
 * @apiHeader authorization Auth token received from logging in
 * @apiParam {String} username Username to edit
 * @apiParam {String} login New login for user
 * @apiParam {String} nickname New nickname for user
 * @apiParam {String} password New password. Can be empty (password won't be changed then)
 * @apiParam {String} bio User's bio info. Can be empty.
 * @apiParam {String} [email] User's mail. Can be empty.
 * @apiParam {String} [url] User's URL. Can be empty.
 * @apiSuccess {String} args ID of user deleted
 * @apiSuccess {String} code Message to display
 * @apiSuccess {Number} data ID of user deleted
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "args": "lol",
 *   "code": "USER_UPDATED",
 *   "data": {
 *       "bio": "lol2",
 *       "email": "lol3@lol.fr",
 *       "id": "3",
 *       "login": "test2",
 *       "nickname": "lol",
 *       "url": "http://lol4"
 *   }
 * }
 * @apiError USER_UPDATE_ERROR Unable to edit user
 *
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 */

/**
 * @api {get} public/users/:username/requests View user's most requested songs
 * @apiName GetUserRequestedKaras
 * @apiVersion 2.1.0
 * @apiGroup Users
 * @apiPermission public
 * @apiHeader authorization Auth token received from logging in
 * @apiParam {String} username Username to check details for.
 * @apiSuccess {Object} data Kara object
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
* {
 *   "data": {
 *       "content": [
 *           {
 *               "NORM_author": null,
 *               "NORM_creator": null,
 *               "NORM_pseudo_add": "Administrateur",
 *               "NORM_serie": "Dynasty Warriors 3",
 *               "NORM_serie_altname": "DW3/DW 3",
 *               "NORM_singer": null,
 *               "NORM_songwriter": null,
 *               "NORM_title": "Circuit",
 *               "author": null,
 *               "created_at": 1508423806,
 *               "creator": null,
 *               "duration": 0,
 *               "flag_blacklisted": 0,
 *               "flag_playing": 1,
 *               "flag_whitelisted": 0,
 * 	             "flag_dejavu": 0,
 *               "gain": 0,
 *               "kara_id": 176,
 *               "kid": "b0de301c-5756-49fb-b019-85a99a66586b",
 *               "language": "chi",
 *               "language_i18n": "Chinois",
 * 				 "lastplayed_at": null,
 *               "misc": "TAG_VIDEOGAME",
 *               "misc_i18n": "Jeu vidéo",
 *               "playlistcontent_id": 4946,
 *               "pos": 1,
 *               "pseudo_add": "Administrateur",
 * 				 "requested": 20,
 *               "serie": "Dynasty Warriors 3",
 *               "serie_altname": "DW3/DW 3",
 *               "singer": null,
 *               "songorder": 0,
 *               "songtype": "TYPE_ED",
 *               "songtype_i18n": "Ending",
 *               "songtype_i18n_short": "ED",
 *               "songwriter": null,
 *               "title": "Circuit",*
 * 				 "username": "admin",
 *               "videofile": "CHI - Dynasty Warriors 3 - GAME ED - Circuit.avi"
 *               "viewcount": 0,
 *               "year": ""
 *           },
 *           ...
 *       ],
 *       "infos": {
 *           "count": 3,
 * 			 "from": 0,
 * 			 "to": 120
 *       }
 *   }
 * }
 * @apiError USER_REQUESTS_VIEW_ERROR Unable to view user requested karas
 *
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * {
 *   "code": "USER_REQUESTS_VIEW_ERROR",
 *   "message": null
 * }
 */

/**
 * @api {put} /public/myaccount Edit your own account
 * @apiName EditMyAccount
 * @apiVersion 2.1.0
 * @apiGroup Users
 * @apiPermission own
 * @apiHeader authorization Auth token received from logging in
 * @apiParam {String} nickname New nickname for user
 * @apiParam {String} [password] New password. Can be empty (password won't be changed then)
 * @apiParam {String} [bio] User's bio info. Can be empty.
 * @apiParam {String} [email] User's mail. Can be empty.
 * @apiParam {String} [url] User's URL. Can be empty.
 * @apiParam {ImageFile} [avatarfile] New avatar
 * @apiSuccess {String} args ID of user deleted
 * @apiSuccess {String} code Message to display
 * @apiSuccess {Number} data ID of user deleted
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "args": "lol",
 *   "code": "USER_UPDATED",
 *   "data": {
 *       "NORM_nickname": "lol",
 *       "bio": "lol2",
 *       "email": "lol3@lol.fr",
 *       "id": "3",
 *       "login": "test2",
 *       "nickname": "lol",
 *       "url": "http://lol4"
 *   }
 * }
 * @apiError USER_UPDATE_ERROR Unable to edit user
 * @apiError WEBAPPMODE_CLOSED_API_MESSAGE API is disabled at the moment.
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * @apiErrorExample Error-Response:
 * HTTP/1.1 403 Forbidden
 */

 	/**
 * @api {get} /public/favorites View own favorites
 * @apiName GetFavorites
 * @apiVersion 2.3.1
 * @apiGroup Favorites
 * @apiPermission own
 * @apiHeader authorization Auth token received from logging in
 * @apiParam {String} [filter] Filter list by this string.
 * @apiParam {Number} [from=0] Return only the results starting from this position. Useful for continuous scrolling. 0 if unspecified
 * @apiParam {Number} [size=999999] Return only x number of results. Useful for continuous scrolling. 999999 if unspecified.
 *
 * @apiSuccess {Object[]} data/content/karas Array of `kara` objects
 * @apiSuccess {Number} data/infos/count Number of karaokes in playlist
 * @apiSuccess {Number} data/infos/from Starting position of listing
 * @apiSuccess {Number} data/infos/to End position of listing
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "data": {
 *       "content": [
 *           {
 *               "NORM_author": null,
 *               "NORM_creator": null,
 *               "NORM_pseudo_add": "Administrateur",
 *               "NORM_serie": "Dynasty Warriors 3",
 *               "NORM_serie_altname": "DW3/DW 3",
 *               "NORM_serie_orig": "Dynasty Warriors 3",
 *               "NORM_singer": null,
 *               "NORM_songwriter": null,
 *               "NORM_title": "Circuit",
 *               "author": "NO_TAG",
 *               "created_at": 1508423806,
 *               "creator": null,
 *               "duration": 0,
 *               "flag_blacklisted": 0,
 *               "flag_playing": 1,
 *               "flag_whitelisted": 0,
 *               "gain": 0,
 *               "kara_id": 176,
 *               "kid": "b0de301c-5756-49fb-b019-85a99a66586b",
 *               "language": "chi",
 *               "language_i18n": "Chinois",
 *               "mediafile": "CHI - Dynasty Warriors 3 - GAME ED - Circuit.avi"
 *               "misc": "TAG_VIDEOGAME",
 *               "misc_i18n": "Jeu vidéo",
 *               "playlistcontent_id": 4946,
 *               "pos": 1,
 *               "pseudo_add": "Administrateur",
 *               "serie": "Dynasty Warriors 3",
 * 				 "serie_i18n": {
 * 								"fre":"Guerriers de la Dynastie"
 * 								}
 *               "serie_altname": "DW3/DW 3",
 *               "serie_orig": "Dynasty Warriors 3",
 *               "singer": "NO_TAG",
 *               "songorder": 0,
 *               "songtype": "TYPE_ED",
 *               "songtype_i18n": "Ending",
 *               "songtype_i18n_short": "ED",
 *               "songwriter": "NO_TAG",
 *               "title": "Circuit",
 * 				 "username": "admin",
 *               "viewcount": 0,
 *               "year": ""
 *           },
 *           ...
 *       ],
 *       "infos": {
 *           "count": 3,
 * 			 "from": 0,
 * 			 "to": 120
 *       }
 *   }
 * }
 * @apiError FAVORITES_VIEW_ERROR Unable to fetch list of karaokes in favorites
 * @apiError WEBAPPMODE_CLOSED_API_MESSAGE API is disabled at the moment.
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * @apiErrorExample Error-Response:
 * HTTP/1.1 403 Forbidden
 */

/**
 * @api {get} /favorites/export Export favorites
 * @apiDescription Export format is in JSON. You'll usually want to save it to a file for later use.
 * @apiName getFavoritesExport
 * @apiVersion 2.2.0
 * @apiGroup Favorites
 * @apiPermission public
 * @apiSuccess {String} data Playlist in an exported format. See docs for more info.
 * @apiHeader authorization Auth token received from logging in
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "data": {
 *       "Header": {
 *           "description": "Karaoke Mugen Playlist File",
 *           "version": 2
 *       },
 *       "PlaylistContents": [
 *           {
 *               "flag_playing": 1,
 *               "kid": "b0de301c-5756-49fb-b019-85a99a66586b"
 *           },
 *           {
 *               "kid": "6da96a7d-7159-4ea7-a5ee-1d78a6eb44dd"
 *           },
 *           {
 *               "kid": "5af7ba4c-2325-451d-a24f-e7fd7c2d3ba8"
 *           },
 *           {
 *               "kid": "e0206f48-0f51-44e3-bf9a-b651916d0c05"
 *           }
 *       ],
 *       "PlaylistInformation": {
 *           "created_at": 1508936812,
 *           "flag_visible": 0,
 *           "modified_at": 1508936821,
 *           "name": "Test",
 *           "time_left": 0
 *       }
 *   }
 * }
 * @apiError FAVORITES_EXPORT_ERROR Unable to export favorites
 *
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * {
 *   "code": "FAVORITES_EXPORT_ERROR"
 * }
 */

/**
 * @api {get} /public/users List users
 * @apiName GetUsers
 * @apiVersion 2.1.0
 * @apiGroup Users
 * @apiPermission public
 * @apiHeader authorization Auth token received from logging in
 * @apiSuccess {String} data/login User's login
 * @apiSuccess {String} data/nickname User's nickname
 * @apiSuccess {String} data/NORM_nickname User's normalized nickname (deburr'ed)
 * @apiSuccess {String} [data/avatar_file] Directory and name of avatar image file. Can be empty if no avatar has been selected.
 * @apiSuccess {Number} data/flag_admin Is the user Admin ?
 * @apiSuccess {Number} data/flag_online Is the user an online account ?
 * @apiSuccess {Number} data/type Type of account (1 = user, 2 = guest)
 * @apiSuccess {Number} data/last_login Last login time in UNIX timestamp.
 * @apiSuccess {Number} data/user_id User's ID in the database
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "data": [
 *       {
 *           "NORM_nickname": "Administrator",
 *           "avatar_file": "",
 *           "flag_admin": 1,
 *           "flag_online": 0,
 *           "type": 1,
 *           "last_login": 0,
 *           "login": "admin",
 *           "nickname": "Administrator",
 *           "user_id": 1
 *       },
 *       {
 *           "NORM_nickname": "test",
 *           "avatar_file": "user/3.jpg",
 *           "flag_admin": 0,
 *           "flag_online": 0,
 *           "type": 1,
 *           "last_login": 1511953198,
 *           "login": "test",
 *           "nickname": "test",
 *           "user_id": 3
 *       }
 *   ]
 * }
 * @apiError USER_LIST_ERROR Unable to list users
 * @apiError WEBAPPMODE_CLOSED_API_MESSAGE API is disabled at the moment.
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * {
 *   "code": "USER_LIST_ERROR",
 *   "message": null
 * }
 * @apiErrorExample Error-Response:
 * HTTP/1.1 403 Forbidden
 */

/**
 * @api {get} public/songpoll Get current poll status
 * @apiName GetPoll
 * @apiVersion 2.1.0
 * @apiGroup Song Poll
 * @apiPermission public
 * @apiHeader authorization Auth token received from logging in
 * @apiParam {Number} [from=0] Return only the results starting from this position. Useful for continuous scrolling. 0 if unspecified
 * @apiParam {Number} [size=999999] Return only x number of results. Useful for continuous scrolling. 999999 if unspecified.* @apiSuccess {String} code Message to display

 * @apiSuccess {Array} data/poll Array of Playlistcontents objects (see `/public/playlist/current/karas` for sample)
 * @apiSuccess {Number} data/poll/votes Number of votes this song has earned
 * @apiSuccess {Boolean} data/flag_uservoted Has the user already voted for this poll?
 * @apiSuccess {Number} data/timeLeft Miliseconds before vote ends
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "data": {
 *       "flag_uservoted": false,
 *       "infos": {
 *           "count": 4,
 *           "from": 0,
 *           "to": 999999
 *       },
 *       "poll": [
 *           {
 *               "NORM_author": null,
 *               "NORM_creator": "MADHOUSE",
 *               "NORM_pseudo_add": "Administrator",
 *               "NORM_serie": "Death Parade",
 *               "NORM_serie_altname": null,
 *               "NORM_singer": "NoisyCell",
 *               "NORM_songwriter": "Ryosuke,Ryo",
 *               "NORM_title": "Last Theater",
 *               "author": "NO_TAG",
 *               "created_at": 1520026875.38,
 *               "creator": "MADHOUSE",
 *               "duration": 71,
 *               "flag_blacklisted": 0,
 *               "flag_dejavu": 0,
 *               "flag_playing": 0,
 *               "flag_whitelisted": 0,
 *               "gain": -8.62,
 *               "kara_id": 1452,
 *               "kid": "75b80966-ac1e-42db-bf2f-b97e0d84fe1d",
 *               "language": "eng",
 *               "language_i18n": "Anglais",
 *               "lastplayed_at": null,
 *               "misc": "NO_TAG",
 *               "misc_i18n": "No info",
 *               "playlistcontent_id": 19,
 *               "pos": 14,
 *               "pseudo_add": "Administrator",
 *               "serie": "Death Parade",
 *               "serie_altname": null,
 *               "singer": "NoisyCell",
 *               "songorder": 1,
 *               "songtype": "TYPE_ED",
 *               "songtype_i18n": "Ending",
 *               "songtype_i18n_short": "ED",
 *               "songwriter": "Ryosuke,Ryo",
 *               "title": "Last Theater",
 *               "username": "admin",
 *               "videofile": "ANG - Death Parade - ED1 - Last Theater.avi",
 *               "viewcount": 0,
 *               "votes": 0,
 *               "year": "2015"
 *           },
 *           ...
 *       ],
 * 		 "timeLeft": 25498
 *   }
 * }
 * @apiError POLL_LIST_ERROR Unable to list current poll
 * @apiError POLL_NOT_ACTIVE No poll is in progress
 * @apiError POLL_ALREADY_VOTED This user has already voted
 *
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * {
 *   "code": "POLL_LIST_ERROR",
 *   "message": null
 * }
 */

 	/**
 * @api {post} public/songpoll Vote in a poll
 * @apiName PostPoll
 * @apiVersion 2.1.0
 * @apiGroup Song Poll
 * @apiPermission public
 * @apiHeader authorization Auth token received from logging in
 * @apiParam {Number} [playlistcontent_id] PLC ID to vote for

 * @apiSuccess {Array} data/poll Array of Playlistcontents objects (see `/public/playlist/current/karas` for sample)
 * @apiSuccess {Number} data/poll/votes Number of votes this song has earned
 * @apiSuccess {Boolean} data/flag_uservoted Has the user already voted for this poll?
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "data": {
 *       "flag_uservoted": false,
 *       "infos": {
 *           "count": 4,
 *           "from": 0,
 *           "to": 999999
 *       },
 *       "poll": [
 *           {
 *               "NORM_author": null,
 *               "NORM_creator": "MADHOUSE",
 *               "NORM_pseudo_add": "Administrator",
 *               "NORM_serie": "Death Parade",
 *               "NORM_serie_altname": null,
 *               "NORM_singer": "NoisyCell",
 *               "NORM_songwriter": "Ryosuke,Ryo",
 *               "NORM_title": "Last Theater",
 *               "author": "NO_TAG",
 *               "created_at": 1520026875.38,
 *               "creator": "MADHOUSE",
 *               "duration": 71,
 *               "flag_blacklisted": 0,
 *               "flag_dejavu": 0,
 *               "flag_playing": 0,
 *               "flag_whitelisted": 0,
 *               "gain": -8.62,
 *               "kara_id": 1452,
 *               "kid": "75b80966-ac1e-42db-bf2f-b97e0d84fe1d",
 *               "language": "eng",
 *               "language_i18n": "Anglais",
 *               "lastplayed_at": null,
 *               "misc": null,
 *               "misc_i18n": null,
 *               "playlistcontent_id": 19,
 *               "pos": 14,
 *               "pseudo_add": "Administrator",
 *               "serie": "Death Parade",
 *               "serie_altname": null,
 *               "singer": "NoisyCell",
 *               "songorder": 1,
 *               "songtype": "TYPE_ED",
 *               "songtype_i18n": "Ending",
 *               "songtype_i18n_short": "ED",
 *               "songwriter": "Ryosuke,Ryo",
 *               "title": "Last Theater",
 *               "username": "admin",
 *               "videofile": "ANG - Death Parade - ED1 - Last Theater.avi",
 *               "viewcount": 0,
 *               "votes": 0,
 *               "year": "2015"
 *           },
 *           ...
 *       ]
 *   }
 * }
 * @apiError POLL_LIST_ERROR Unable to list current poll
 * @apiError POLL_NOT_ACTIVE No poll is in progress
 * @apiError POLL_ALREADY_VOTED This user has already voted
 *
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * {
 *   "code": "POLL_LIST_ERROR",
 *   "message": null
 * }
 */

/**
 * @api {delete} /admin/users/:userID Delete an user
 * @apiName DeleteUser
 * @apiVersion 2.1.0
 * @apiGroup Users
 * @apiPermission admin
 * @apiHeader authorization Auth token received from logging in
 * @apiParam {Number} userID User ID to delete
 * @apiSuccess {String} args ID of user deleted
 * @apiSuccess {String} code Message to display
 * @apiSuccess {Number} data ID of user deleted
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "args": 3,
 *   "code": "USER_DELETED",
 *   "data": 3
 * }
 * @apiError USER_DELETE_ERROR Unable to delete a user
 *
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 */

/**
 * @api {post} /admin/playlists/:pl_id/karas Add karaokes to playlist
 * @apiName PatchPlaylistKaras
 * @apiVersion 2.1.0
 * @apiGroup Playlists
 * @apiPermission admin
 * @apiHeader authorization Auth token received from logging in
 * @apiParam {Number} pl_id Target playlist ID.
 * @apiParam {Number[]} kara_id List of `kara_id` separated by commas (`,`). Example : `1021,2209,44,872`
 * @apiParam {Number} [pos] Position in target playlist where to copy the karaoke to. If not specified, will place karaokes at the end of target playlist. `-1` adds karaokes after the currently playing song in target playlist.
 * @apiSuccess {String[]} args/plc_ids IDs of playlist contents copied
 * @apiSuccess {String} args/playlist_id ID of destinaton playlist
 * @apiSuccess {String} code Message to display
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "args": {
 *       "playlist": 2,
 *       "plc_ids": [
 * 			"4946",
 * 			"639"
 * 		 ]
 *   },
 *   "code": "PL_SONG_MOVED",
 *   "data": null
 * }
 * @apiError PL_ADD_SONG_ERROR Unable to add songs to the playlist
 *
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * {
 *   "args": "Liste de lecture publique",
 *   "code": "PL_ADD_SONG_ERROR",
 *   "message": "No karaoke could be added, all are in destination playlist already (PLID : 2)"
 * }
 */
/**
 * @api {delete} /admin/whitelist Delete whitelist item
 * @apiName DeleteWhitelist
 * @apiVersion 2.1.0
 * @apiGroup Whitelist
 * @apiPermission admin
 * @apiHeader authorization Auth token received from logging in
 * @apiParam {Number[]} wlc_id Whitelist content IDs to delete from whitelist, separated by commas
 * @apiSuccess {Number} args Arguments associated with message
 * @apiSuccess {Number} code Message to display
 * @apiSuccess {Number[]} data List of Whitelist content IDs separated by commas
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "args": "1",
 *   "code": "WL_SONG_DELETED",
 *   "data": "1"
 * }
 * @apiError WL_DELETE_SONG_ERROR Whitelist item could not be deleted.
 *
 */

/**
 * @api {get} /public/karas/random Get a random karaoke ID
 * @apiName GetKarasRandom
 * @apiVersion 2.1.0
 * @apiGroup Karaokes
 * @apiPermission public
 * @apiHeader authorization Auth token received from logging in
 * @apiDescription This selects a random karaoke from the database. What you will do with it depends entirely on you.
 * @apiSuccess {Number} data Random Karaoke ID
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "data": 4550
 * }
 * @apiError GET_UNLUCKY Unable to find a random karaoke
 * @apiError WEBAPPMODE_CLOSED_API_MESSAGE API is disabled at the moment.
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * @apiErrorExample Error-Response:
 * HTTP/1.1 403 Forbidden
 */
/**
 * @api {post} /public/karas/:kara_id Add karaoke to current/public playlist
 * @apiName PostKaras
 * @apiVersion 2.1.2
 * @apiGroup Playlists
 * @apiPermission public
 * @apiHeader authorization Auth token received from logging in
 * @apiDescription Contrary to the admin route, this adds a single karaoke song to either current or public playlist depending on private/public mode selected by admin in configuration.
 * @apiParam {Number} kara_id Karaoke ID to add to current/public playlist
 * @apiSuccess {String} args/kara Karaoke title added
 * @apiSuccess {Number} args/kara_id Karaoke ID added.
 * @apiSuccess {String} args/playlist Name of playlist the song was added to
 * @apiSuccess {Number} args/playlist_id Playlist ID the song was added to
 * @apiSuccess {String} code Message to display
 * @apiSuccess {String} data See `args` above.
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "args": {
 *       "kara": "Dragon Screamer",
 *       "kara_id": "1029",
 *       "playlist": "Courante",
 *       "playlist_id": 1
 *   },
 *   "code": "PLAYLIST_MODE_SONG_ADDED",
 *   "data": {
 *       "kara": "Dragon Screamer",
 *       "kara_id": "1029",
 *       "playlist": "Courante",
 *       "playlist_id": 1
 *   }
 * }
* @apiError PLAYLIST_MODE_ADD_SONG_ERROR_QUOTA_REACHED User asked for too many karaokes already.
* @apiError PLAYLIST_MODE_ADD_SONG_ERROR_ALREADY_ADDED All songs are already present in playlist
* @apiError PLAYLIST_MODE_ADD_SONG_ERROR_BLACKLISTED Song is blacklisted and cannot be added
* @apiError PLAYLIST_MODE_ADD_SONG_ERROR General error while adding song
* @apiError WEBAPPMODE_CLOSED_API_MESSAGE API is disabled at the moment.
* @apiErrorExample Error-Response:
* HTTP/1.1 500 Internal Server Error
* {
*   "args": {
*       "kara": "1033",
*       "playlist": 1,
*       "user": "Axel"
*   },
*   "code": "PLAYLIST_MODE_ADD_SONG_ERROR_QUOTA_REACHED",
*   "message": "User quota reached"
* }
* @apiErrorExample Error-Response:
* HTTP/1.1 403 Forbidden
*/
/**
 * @api {post} /public/karas/:kara_id/lyrics Get song lyrics
 * @apiName GetKarasLyrics
 * @apiVersion 2.1.0
 * @apiGroup Karaokes
 * @apiPermission public
 * @apiHeader authorization Auth token received from logging in
 * @apiParam {Number} kara_id Karaoke ID to get lyrics from
 * @apiSuccess {String[]} data Array of strings making the song's lyrics
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "data": "Lyrics for this song are not available"
 * }
 * @apiError LYRICS_VIEW_ERROR Unable to fetch lyrics data
 * @apiError WEBAPPMODE_CLOSED_API_MESSAGE API is disabled at the moment.
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * @apiErrorExample Error-Response:
 * HTTP/1.1 403 Forbidden
 * {
 *   "code": "PLAYLIST_MODE_ADD_SONG_ERROR_QUOTA_REACHED"
 * }
 */

/**
 * @api {get} /public/favorites View own favorites
 * @apiName GetFavorites
 * @apiVersion 2.3.1
 * @apiGroup Favorites
 * @apiPermission own
 * @apiHeader authorization Auth token received from logging in
 * @apiParam {String} [filter] Filter list by this string.
 * @apiParam {Number} [from=0] Return only the results starting from this position. Useful for continuous scrolling. 0 if unspecified
 * @apiParam {Number} [size=999999] Return only x number of results. Useful for continuous scrolling. 999999 if unspecified.
 *
 * @apiSuccess {Object[]} data/content/karas Array of `playlistcontents` objects
 * @apiSuccess {Number} data/infos/count Number of karaokes in playlist
 * @apiSuccess {Number} data/infos/from Starting position of listing
 * @apiSuccess {Number} data/infos/to End position of listing
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "data": {
 *       "content": [
 *           {
 *            <See admin/playlists/[id]/karas/[plc_id] object>
 *           },
 *           ...
 *       ],
 *       "infos": {
 *           "count": 3,
 * 			 "from": 0,
 * 			 "to": 120
 *       }
 *   }
 * }
 * @apiError FAVORITES_VIEW_ERROR Unable to fetch list of karaokes in favorites
 * @apiError WEBAPPMODE_CLOSED_API_MESSAGE API is disabled at the moment.
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * @apiErrorExample Error-Response:
 * HTTP/1.1 403 Forbidden
 */

/**
 * @api {post} /public/favorites Add karaoke to your favorites
 * @apiName PostFavorites
 * @apiVersion 2.1.0
 * @apiGroup Favorites
 * @apiPermission own
 * @apiHeader authorization Auth token received from logging in
 * @apiParam {Number} kara_id kara ID to add
 * @apiSuccess {Number} args/kara_id ID of kara added
 * @apiSuccess {Number} args/kara Name of kara added
 * @apiSuccess {Number} args/playlist_id ID of destinaton playlist
 * @apiSuccess {String} code Message to display
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "args": {
 * 		 "kara": "Les Nuls - MV - Vous me subirez",
 *       "playlist_id": 1,
 *       "kara_id": 4946
 *   },
 *   "code": "FAVORITES_ADDED",
 *   "data": null
 * }
 * @apiError FAVORITES_ADD_SONG_ERROR Unable to add songs to the playlist
 * @apiError WEBAPPMODE_CLOSED_API_MESSAGE API is disabled at the moment.
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * {
 *   "args": null,
 *   "code": "FAVORITES_ADD_SONG_ERROR",
 *   "message": "Karaoke unknown"
 * }
 * @apiErrorExample Error-Response:
 * HTTP/1.1 403 Forbidden
 */
/**
 * @api {delete} /public/favorites/ Delete karaoke from your favorites
 * @apiName DeleteFavorites
 * @apiVersion 2.1.0
 * @apiGroup Favorites
 * @apiPermission public
 * @apiHeader authorization Auth token received from logging in
 * @apiParam {Number} kara_id Kara ID to delete
 * @apiSuccess {String} code Message to display
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "args": null,
 *   "code": "FAVORITES_DELETED",
 *   "data": null
 * }
 * @apiError FAVORITES_DELETE_ERROR Unable to delete the favorited song
 * @apiError WEBAPPMODE_CLOSED_API_MESSAGE API is disabled at the moment.
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * {
 *   "args": null,
 *   "code": "FAVORITES_DELETE_ERROR",
 *   "message": "Kara ID unknown"
 * }
 * @apiErrorExample Error-Response:
 * HTTP/1.1 403 Forbidden
 */
/*
 * @api {post} /auth/login Login / Sign in
 * @apiName AuthLogin
 * @apiVersion 2.1.0
 * @apiGroup Auth
 * @apiPermission NoAuth
 * @apiHeader {String} Content-type Must be `application/x-www-form-urlencoded`
 * @apiHeader {String} charset Must be `UTF-8`
 * @apiParam {String} username Login name for the user
 * @apiParam {String} password Password for the user. Can be empty if user is a guest.
 * @apiSuccess {String} token Identification token for this session
 * @apiSuccess {String} username Username logged in
 * @apiSuccess {String} role Role of this user (`user` or `admin`)
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VybmFtZSI6InRlc3QiLCJpYXQiOjE1MTMxNjAxMTEzMjMsInJvbGUiOiJ1c2VyIn0.UWgsc5XEfFtk34IpUAQid_IEWCj2ffNjQ--FJ9eAYd0",
 *   "username": "Axel",
 *   "role": "admin"
 * }
 * @apiError 401 Unauthorized
 *
 * @apiErrorExample Error-Response:
 * HTTP/1.1 401 Unauthorized
 */

 	/**
 * @api {post} /public/favorites/import Import favorites
 * @apiName postFavoritesImport
 * @apiVersion 2.2.0
 * @apiGroup Favorites
 * @apiPermission public
 * @apiHeader authorization Auth token received from logging in
 * @apiSuccess {String} playlist Playlist in JSON form, following Karaoke Mugen's file format. See docs for more info.
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "code": "FAVORITES_IMPORTED",
 *   "data": {
 *       "message": "Favorites imported",
 *       "unknownKaras": []
 *   }
 * }
 * @apiError FAVORITES_IMPORT_ERROR Unable to import playlist
 *
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * {
 *   "code": "FAVORITES_IMPORT_ERROR",
 *   "message": "No header section"
 * }
 */

/**
 * @api {post} /public/karas/:kid Add karaoke to current/public playlist
 * @apiName PostKaras
 * @apiVersion 2.1.2
 * @apiGroup Playlists
 * @apiPermission public
 * @apiHeader authorization Auth token received from logging in
 * @apiDescription Contrary to the admin route, this adds a single karaoke song to either current or public playlist depending on private/public mode selected by admin in configuration.
 * @apiParam {Number} kara_id Karaoke ID to add to current/public playlist
 * @apiSuccess {String} args/kara Karaoke title added
 * @apiSuccess {Number} args/kara_id Karaoke ID added.
 * @apiSuccess {String} args/playlist Name of playlist the song was added to
 * @apiSuccess {Number} args/playlist_id Playlist ID the song was added to
 * @apiSuccess {String} code Message to display
 * @apiSuccess {String} data See `args` above.
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "args": {
 *       "kara": "Dragon Screamer",
 *       "kara_id": "1029",
 *       "playlist": "Courante",
 *       "playlist_id": 1
 *   },
 *   "code": "PLAYLIST_MODE_SONG_ADDED",
 *   "data": {
 *       "kara": "Dragon Screamer",
 *       "kara_id": "1029",
 *       "playlist": "Courante",
 *       "playlist_id": 1
 *   }
 * }
 */

/**
 * @api {put} /admin/playlists/:pl_id([0-9]+)/karas/:plc_id Update song in a playlist
 * @apiName PutPlaylistKara
 * @apiVersion 2.3.0
 * @apiGroup Playlists
 * @apiPermission admin
 * @apiHeader authorization Auth token received from logging in
 * @apiParam {Number} pl_id Playlist ID. **Note :** Irrelevant since `plc_id` is unique already.
 * @apiParam {Number} plc_id `playlistcontent_id` of the song to update
 * @apiParam {Number} [pos] Position in target playlist where to move the song to.
 * @apiParam {Number} [flag_playing] If set to 1, the selected song will become the currently playing song.
 * @apiParam {Number} [flag_free] If set to 1, the selected song will be marked as free. Setting it to 0 has no effect.
 * @apiSuccess {String} code Message to display
 * @apiSuccess {String} data PLCID modified
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "code": "PL_CONTENT_MODIFIED",
 *   "data": "4962"
 * }
 * @apiError PL_MODIFY_CONTENT_ERROR Unable to modify content's position or playing status
 *
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * {
 *   "code": "PL_MODIFY_CONTENT_ERROR",
 *   "message": "PLCID unknown!"
 * }
 */

/**
 * @api {get} /admin/settings Get settings
 * @apiName GetSettings
 * @apiVersion 2.4.1
 * @apiGroup Main
 * @apiPermission admin
 * @apiHeader authorization Auth token received from logging in
 * @apiSuccess {Object} data Contains all configuration settings. See example or documentation for what each setting does.
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "data": {
 *       "AdminPassword": "xxxx",
 *       "BinPlayerLinux": "/usr/bin/mpv",
 *       "BinPlayerOSX": "app/bin/mpv.app/Contents/MacOS/mpv",
 *       "BinPlayerWindows": "app/bin/mpv.exe",
 *       "BinffmpegLinux": "/usr/bin/ffmpeg",
 *       "BinffmpegOSX": "app/bin/ffmpeg",
 *       "BinffmpegPath": "D:\\perso\\karaokemugen-app\\app\\bin\\ffmpeg.exe",
 *       "BinffmpegWindows": "app/bin/ffmpeg.exe",
 *       "BinffprobeLinux": "/usr/bin/ffprobe",
 *       "BinffprobeOSX": "app/bin/ffprobe",
 *       "BinffprobePath": "D:\\perso\\karaokemugen-app\\app\\bin\\ffprobe.exe
 *       "BinffprobeWindows": "app/bin/ffprobe.exe",
 *       "BinmpvPath": "D:\\perso\\karaokemugen-app\\app\\bin\\mpv.exe",
 *       "EngineAllowViewBlacklist": "1",
 *       "EngineAllowViewBlacklistCriterias": "1",
 *       "EngineAllowViewWhitelist": "1",
 *       "EngineAutoPlay": "0",
 *       "EngineDefaultLocale": "fr",
 *       "EngineDisplayConnectionInfo": "1",
 *       "EngineDisplayConnectionInfoHost": "",
 *       "EngineDisplayConnectionInfoMessage": "",
 *       "EngineDisplayConnectionInfoQRCode": "1",
 *       "EngineDisplayNickname": "1",
 * 		 "EngineFreeUpvotes": "1",
 *       "EngineFreeUpvotesRequiredPercentage": "33",
 *       "EngineFreeUpvotesRequiredMin": "4",
 *       "EngineFreeAutoTime": "60",
 *       "EngineJinglesInterval": "1",
 *       "EnginePrivateMode": "1",
 * 		 "EngineRemovePublicOnPlay": "1",
 * 		 "EngineQuotaType": "1",
 *       "EngineRepeatPlaylist": "0",
 *       "EngineSmartInsert": "1",
 * 		 "EngineSongPoll": "0",
 * 		 "EngineSongPollChoices": "4",
 * 		 "EngineSongPollTimeout": "30",
 *       "EngineSongsPerUser": "10000",
 * 		 "EngineTimePerUser": "10000",
 *       "EngineCreatePreviews": "1",
 * 		 "OnlineStats": "0",
 *       "PathAltname": "../times/series_altnames.csv",
 *       "PathBackgrounds": "app/backgrounds",
 *       "PathBin": "app/bin",
 *       "PathDB": "app/db",
 *       "PathDBKarasFile": "karas.sqlite3",
 *       "PathDBUserFile": "userdata.sqlite3",
 *       "PathJingles": "app/jingles",
 *       "PathKaras": "../times/karas",
 *       "PathSubs": "../times/lyrics",
 *       "PathTemp": "app/temp",
 *       "PathMedias": "app/data/medias",
 *       "PathMediasHTTP": "",
 *       "PlayerBackground": "",
 *       "PlayerFullscreen": "0",
 *       "PlayerMonitor": "0",
 *       "PlayerPIP": "1",
 *       "PlayerPIPPositionX": "Left",
 *       "PlayerPIPPositionY": "Bottom",
 *       "PlayerPIPSize": "30",
 *       "PlayerScreen": "0",
 *       "PlayerStayOnTop": "1",
 *       "VersionName": "Finé Fiévreuse",
 *       "VersionNo": "v2.0 Release Candidate 1",
 *       "appPath": "F:\\karaokemugen-app\\",
 *       "isTest": false,
 *       "mpvVideoOutput": "direct3d",
 *       "os": "win32",
 *       "osHost": "10.202.40.43",
 * 		 "WebappMode": "2",
 * 		 "WebappSongLanguageMode": "1"
 *   }
 * }
 */

	/**
 * @api {get} /public/settings Get settings (public)
 * @apiName GetSettingsPublic
 * @apiVersion 2.2.0
 * @apiGroup Main
 * @apiPermission public
 * @apiHeader authorization Auth token received from logging in
 * @apiDescription Contrary to `admin/settings` path, this one doesn't return things like paths, binaries and other internal settings.
 * @apiSuccess {Object} data Contains all configuration settings. See example or documentation for what each setting does.
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "data": {
 *       "EngineAllowNicknameChange": "1",
 *       "EngineAllowViewBlacklist": "1",
 *       "EngineAllowViewBlacklistCriterias": "1",
 *       "EngineAllowViewWhitelist": "1",
 *       "EngineAutoPlay": "0",
 *       "EngineDefaultLocale": "fr",
 *       "EngineDisplayConnectionInfo": "1",
 *       "EngineDisplayConnectionInfoHost": "",
 *       "EngineDisplayConnectionInfoMessage": "",
 *       "EngineDisplayConnectionInfoQRCode": "1",
 *       "EngineDisplayNickname": "1",
 *       "EngineFreeAutoTime": "60",
 * 		 "EngineFreeUpvotes": "1",
 * 		 "EngineFreeUpvotesPercent": "33",
 * 		 "EngineFreeUpvotesMin": "4",
 *       "EngineJinglesInterval": "1",
 *       "EnginePrivateMode": "1",
 * 		 "EngineRemovePublicOnPlay": "1",
 *       "EngineQuotaType": "1",
 *       "EngineRepeatPlaylist": "0",
 *       "EngineSmartInsert": "1",
 * 		 "EngineSongPoll": "0",
 * 		 "EngineSongPollChoices": "4",
 * 		 "EngineSongPollTimeout": "30",
 *       "EngineSongsPerUser": "10000",
 *       "EngineTimePerUser": "10000",
 *       "PlayerBackground": "",
 *       "PlayerFullscreen": "0",
 *       "PlayerMonitor": "0",
 *       "PlayerPIP": "1",
 *       "PlayerPIPPositionX": "Left",
 *       "PlayerPIPPositionY": "Bottom",
 *       "PlayerPIPSize": "30",
 *       "PlayerScreen": "0",
 *       "PlayerStayOnTop": "1",
 *       "VersionName": "Finé Fiévreuse",
 *       "VersionNo": "v2.0 Release Candidate 1",
 *       "mpvVideoOutput": "direct3d",
 * 		 "WebappMode": "2",
 *       "WebappSongLanguageMode": "1"
 *   }
 * }
 */

	/**
 * @api {put} /admin/settings Update settings
 * @apiName PutSettings
 * @apiVersion 2.4.1
 * @apiPermission admin
 * @apiHeader authorization Auth token received from logging in
 * @apiGroup Main
 * @apiDescription **Note :** All settings must be sent at once in a single request.
 * @apiParam {Boolean} EngineAllowViewBlacklist Allow/disallow users to view blacklist contents from the guest interface
 * @apiParam {Boolean} EngineAllowViewWhitelist Allow/disallow users to view whitelist contents from the guest interface
 * @apiParam {Boolean} EngineAllowViewBlacklistCriterias Allow/disallow users to view blacklist criterias list from the guest interface
 * @apiParam {Boolean} EngineAllowAutoPlay Enable/disable AutoPlay feature (starts playing once a song is added to current playlist)
 * @apiParam {Boolean} EngineDisplayConnectionInfo Show/hide connection info during jingles or pauses (the "Go to http://" message)
 * @apiParam {String} EngineDisplayConnectionInfoHost Force IP/Hostname displayed during jingles or pauses in case autodetection returns the wrong IP
 * @apiParam {String} EngineDisplayConnectionInfoMessage Add a small message before the text showing the URL to connect to
 * @apiParam {Boolean} EngineDisplayConnectionInfoQRCode Enable/disable QR Code during pauses inbetween two songs.
 * @apiParam {Boolean} EngineDisplayNickname Enable/disable displaying the username who requested a song.
 * @apiParam {Number} EngineFreeAutoTime Time in minutes before a song is automatically freed.
 * @apiParam {Boolean} EngineFreeUpvotes Enable/disable Free Songs By Upvotes feature
 * @apiParam {Number} EngineFreeUpvotesRequiredMin Minimum number of upvotes required to free a song
 * @apiParam {Number} EngineFreeUpvotesRequiredPercent Minimum percent of upvotes / online users required to free a song
 * @apiParam {Number} EngineJinglesInterval Interval in number of songs between two jingles. 0 to disable entirely.
 * @apiParam {Boolean} EnginePrivateMode `false` = Public Karaoke mode, `true` = Private Karaoke Mode. See documentation.
 * @apiParam {Boolean} EngineRemovePublicOnPlay Enable/disable auto removal of songs in public playlist if they've just been played
 * @apiParam {Number} EngineQuotaType Type of quota for users when adding songs. `0` = no quota, `1` = limited by number of songs, `2` = limited by total song duration.
 * @apiParam {Boolean} EngineRepeatPlaylist Enable/disable auto repeat playlist when at end.
 * @apiParam {Boolean} EngineSmartInsert Enable/disable smart insert of songs in the playlist.
 * @apiParam {Boolean} EngineSongPoll Enable/disable public song poll
 * @apiParam {Number} EngineSongPollChoices Number of songs the public can choose from during a public poll
 * @apiParam {Number} EngineSongPollTimeout Poll duration in seconds
 * @apiParam {Number} EngineSongsPerUser Number of songs allowed per person.
 * @apiParam {Number} EngineTimePerUser Song duration allowed per person.
 * @apiParam {Boolean} OnlineStats Enable/Disable stats upload to Karaoke Mugen Online
 * @apiParam {Boolean} PlayerFullscreen Enable/disable full screen mode
 * @apiParam {Boolean} PlayerMonitor Enable/disable player's second screen (monitor)
 * @apiParam {Boolean} PlayerPIP Enable/disable Picture-in-picture mode
 * @apiParam {String=Left,Center,Right} PlayerPIPPositionX Horizontal position of PIP screen
 * @apiParam {String=Top,Center,Bottom} PlayerPIPPositionY Vertical position of PIP screen
 * @apiParam {Number} PlayerPIPSize Size in percentage of the PIP screen
 * @apiParam {Number} PlayerScreen Screen number to display the videos on. If screen number is not available, main screen is used. `9` means autodetection.
 * @apiParam {Boolean} PlayerStayOnTop Enable/disable stay on top of all windows.
 * @apiParam {Number} WebappMode Webapp public mode : `0` = closed, no public action available, `1` = only show song information and playlists, no karaoke can be added by the user, `2` = default, open mode.
 * @apiParam {Number} WebappSongLanguageMode How to display series : `0` = according to the original name, `1` = according to song's language, or defaults to the `series=` metadata, `2` = according to admin's language or fallbacks to english then original, `3` = according to user language or fallbacks to english then original
 * @apiParam {Boolean} PlayerStayOnTop Enable/disable stay on top of all windows.
 * @apiSuccess {Object} data Contains all configuration settings. See example or documentation for what each setting does.
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 */
 /**
 * @api {get} /public/myaccount View own user details
 * @apiName GetMyAccount
 * @apiVersion 2.5.0
 * @apiGroup Users
 * @apiPermission own
 * @apiHeader authorization Auth token received from logging in
 * @apiSuccess {String} data/login User's login
 * @apiSuccess {String} data/nickname User's nickname
 * @apiSuccess {String} [data/avatar_file] Directory and name of avatar image file. Can be empty if no avatar has been selected.
 * @apiSuccess {Number} data/flag_online Is the user an online account ?
 * @apiSuccess {Number} data/type Type of account (`0` = admin, `1` = user, `2` = guest)
 * @apiSuccess {Number} data/last_login_at Last login time in UNIX timestamp.
 * @apiSuccess {Number} data/user_id User's ID in the database
 * @apiSuccess {String} data/url User's URL in its profile
 * @apiSuccess {String} data/fingerprint User's fingerprint
 * @apiSuccess {String} data/bio User's bio
 * @apiSuccess {String} data/email User's email
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "data": [
 *       {
 *           "avatar_file": "",
 *           "flag_online": false,
 *           "type": 0,
 *           "last_login_at": null,
 *           "login": "admin",
 *           "nickname": "Administrator",
 * 			 "url": null,
 * 			 "email": null,
 * 			 "bio": null,
 * 			 "fingerprint": null
 *       },
 *   ]
 * }
 * @apiError USER_VIEW_ERROR Unable to view user details
 * @apiError WEBAPPMODE_CLOSED_API_MESSAGE API is disabled at the moment.
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * {
 *   "code": "USER_VIEW_ERROR",
 *   "message": null
 * }
 * @apiErrorExample Error-Response:
 * HTTP/1.1 403 Forbidden
 */

	/**
 * @api {put} /public/myaccount Edit your own account
 * @apiName EditMyAccount
 * @apiVersion 2.5.0
 * @apiGroup Users
 * @apiPermission own
 * @apiHeader authorization Auth token received from logging in
 * @apiParam {String} nickname New nickname for user
 * @apiParam {String} [password] New password. Can be empty (password won't be changed then)
 * @apiParam {String} [bio] User's bio info. Can be empty.
 * @apiParam {String} [email] User's mail. Can be empty.
 * @apiParam {String} [url] User's URL. Can be empty.
 * @apiParam {ImageFile} [avatarfile] New avatar
 * @apiSuccess {String} args Username
 * @apiSuccess {String} code Message to display
 * @apiSuccess {Number} user data edited
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "args": "lol",
 *   "code": "USER_UPDATED",
 *   "data": {
 *       "bio": "lol2",
 *       "email": "lol3@lol.fr",
 *       "login": "test2",
 *       "nickname": "lol",
 *       "url": "http://lol4"
 *   }
 * }
 * @apiError USER_UPDATE_ERROR Unable to edit user
 * @apiError WEBAPPMODE_CLOSED_API_MESSAGE API is disabled at the moment.
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * @apiErrorExample Error-Response:
 * HTTP/1.1 403 Forbidden
 */
/**
 * @api {get} /admin/users/:username View user details (admin)
 * @apiName GetUserAdmin
 * @apiVersion 2.5.0
 * @apiGroup Users
 * @apiPermission Admin
 * @apiHeader authorization Auth token received from logging in
 *
 * @apiparam {String} username Username to get data from
 * @apiSuccess {String} data/login User's login
 * @apiSuccess {String} data/nickname User's nickname
 * @apiSuccess {String} [data/avatar_file] Directory and name of avatar image file. Can be empty if no avatar has been selected.
 * @apiSuccess {Number} data/flag_online Is the user an online account ?
 * @apiSuccess {Number} data/type Type of account (0 = admin, 1 = user, 2 = guest)
 * @apiSuccess {Number} data/last_login Last login time in `Date()` format
 * @apiSuccess {Number} data/user_id User's ID in the database
 * @apiSuccess {String} data/url User's URL in its profile
 * @apiSuccess {String} data/fingerprint User's fingerprint
 * @apiSuccess {String} data/bio User's bio
 * @apiSuccess {String} data/email User's email
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "data": [
 *       {
 *           "avatar_file": "",
 *           "flag_online": false,
 *           "type": 0,
 *           "last_login": "2019-01-01T13:34:00.000Z",
 *           "login": "admin",
 *           "nickname": "Administrator",
 *           "user_id": 1,
 * 			 "url": null,
 * 			 "email": null,
 * 			 "bio": null,
 * 			 "fingerprint": null
 *       },
 *   ]
 * }
 * @apiError USER_VIEW_ERROR Unable to view user details
 *
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * {
 *   "code": "USER_VIEW_ERROR",
 *   "message": null
 * }
 */

 /**
<<<<<<< HEAD
	 * @api {get} /admin/blacklist/criterias Get list of blacklist criterias
	 * @apiName GetBlacklistCriterias
	 * @apiVersion 2.1.0
	 * @apiGroup Blacklist
	 * @apiPermission admin
	 * @apiHeader authorization Auth token received from logging in
	 * @apiSuccess {Number} data/blcriteria_id Blacklist criteria's ID.
	 * @apiSuccess {Number} data/type Blacklist criteria's type. Refer to dev documentation for more info on BLC types.
	 * @apiSuccess {Number} data/value Value associated to balcklist criteria (what is being blacklisted)
	 * @apiSuccess {String} data/value_i18n Translated value to display on screen.
	 *
	 * @apiSuccessExample Success-Response:
	 * HTTP/1.1 200 OK
	 * {
	 *   "data": [
	 *       {
	 *           "blcriteria_id": 2,
	 *           "type": 6,
	 *           "value": "241",
	 *           "value_i18n": "Jean-Jacques Debout"
	 *       }
	 *   ]
	 * }
	 * @apiError BLC_VIEW_ERROR Blacklist criterias could not be listed
	 *
	 * @apiErrorExample Error-Response:
	 * HTTP/1.1 500 Internal Server Error
	 * {
	 *   "code": "BLC_VIEW_ERROR"
	 * }
	 */

	 /**
=======
>>>>>>> next
	 * @api {put} /admin/blacklist/criterias/:blc_id Edit a blacklist criteria
	 * @apiName PutBlacklistCriterias
	 * @apiVersion 2.1.0
	 * @apiGroup Blacklist
	 * @apiPermission admin
	 * @apiHeader authorization Auth token received from logging in
	 * @apiParam {Number} blc_id Blacklist criteria's ID to delete
	 * @apiParam {Number} blcriteria_type New blacklist criteria's type
	 * @apiParam {String} blcriteria_value New blacklist criteria's value
	 * @apiSuccess {String} code Message to display
	 * @apiSuccess {String} args arguments for the message
	 * @apiSuccess {String} data Data returned from API
	 *
	 * @apiSuccessExample Success-Response:
	 * HTTP/1.1 200 OK
	 * {
	 *   "args": "6",
	 *   "code": "BLC_UPDATED",
	 *   "data": {
	 *       "blcriteria_type": "8",
	 *       "blcriteria_value": "750"
	 *   }
	 * }
	 * @apiError BLC_UPDATE_ERROR Unable to update Blacklist criteria
	 *
	 * @apiErrorExample Error-Response:
	 * HTTP/1.1 500 Internal Server Error
	 * {
	 *   "code": "BLC_UPDATE_ERROR",
	 *   "message": "BLCID 12309 unknown"
	 * }
<<<<<<< HEAD
	 */

/**
 * @api {get} /admin/settings Get settings
 * @apiName GetSettings
 * @apiVersion 2.5.0
 * @apiGroup Main
 * @apiPermission admin
 * @apiHeader authorization Auth token received from logging in
 * @apiSuccess {Object} data Contains all configuration settings. See example or documentation for what each setting does.
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *    "data": {
 *	"config": {
 *	 App: {
 *		FirstRun: true,
 *		InstanceID: 'Change me',
 *		JwtSecret: 'Change me'
 *	},
 *	Database: {
 *		'sql-file': true,
 *		defaultEnv: 'prod',
 *		prod: {
 *			driver: 'pg',
 *			user: 'karaokemugen_app',
 *			password: 'musubi',
 *			host: 'localhost',
 *			port: 6559,
 *			database: 'karaokemugen_app',
 *			schema: 'public',
 *			superuser: 'postgres',
 *			superuserPassword: null,
 *			bundledPostgresBinary: true
 *		}
 *	},
 *	Online: {
 *		Host: 'kara.moe',
 *		Stats: undefined,
 *		URL: true,
 *		Users: true
 *	},
 *	Frontend: {
 *		Port: 1337,
 *		AuthExpireTime: 15,
 *		Mode: 2,
 *		SeriesLanguageMode: 3,
 *		Permissions: {
 *			AllowViewBlacklist: true,
 *			AllowViewBlackListCriterias: true,
 *			AllowViewWhiteList: true,
 *		}
 *	},
 *	Karaoke: {
 *		Autoplay: false,
 *		CreatePreviews: false,
 *		JinglesInterval: 20,
 *		Private: true,
 *		RepeatPlaylist: false,
 *		SmartInsert: false,
 *		Display: {
 *			Nickname: false,
 *			ConnectionInfo: false,
 *			ConnectionInfoQRCode: false,
 *			ConnectionInfoMessage: '',
 *			ConnectionInfoHost: false
 *		},
 *		Poll: {
 *			Choices: 4,
 *			Enabled: false,
 *			Timeout: 30
 *		},
 *		Quota: {
 *			FreeAutoTime: 60,
 *			FreeUpVote: true,
 *			FreeUpVoteRequiredMin: 3,
 *			FreeUpVoteRequiredPercent: 33,
 *			Songs: 10000,
 *			Time: 10000,
 *			Type: 0,
 *		}
 *	},
 *	Player: {
 *		mpvVideoOutput: '',
 *		Background: '',
 *		FullScreen: false,
 *		Monitor: false,
 *		NoBar: true,
 *		NoHud: true,
 *		Screen: 0,
 *		StayOnTop: true,
 *		PIP: {
 *			Enabled: true,
 *			PositionX: 'Right',
 *			PositionY: 'Bottom',
 *			Size: 30,
 *		}
 *	},
 *	Playlist: {
 *		AllowDuplicates: false,
 *		MaxDejaVuTime: 60,
 *		RemovePublicOnPlay: false
 *	},
 *	System: {
 *		Binaries: {
 *			Player: {
 *				Linux: '/usr/bin/mpv',
 *				OSX: 'app/bin/mpv.app/Contents/MacOS/mpv',
 *				Windows: 'app/bin/mpv.exe'
 *			},
 *			ffmpeg: {
 *				Linux: '/usr/bin/ffmpeg',
 *				OSX: 'app/bin/ffmpeg',
 *				Windows: 'app/bin/ffmpeg.exe'
 *			},
 *			Postgres: {
 *				Windows: 'app/bin/postgres/bin/',
 *				OSX: 'app/bin/postgres/bin/',
 *				Linux: 'app/bin/postgres/bin/',
 *			}
 *		},
 *		Path: {
 *			Avatars: 'app/avatars',
 *			Backgrounds: 'app/backgrounds',
 *			Bin: 'app/bin',
 *			Import: 'app/import',
 *			Jingles: 'app/jingles',
 *			Karas: 'app/data/karas',
 *			Medias: 'app/data/medias',
 *			MediasHTTP: '',
 *			Previews: 'app/previews',
 *			Series: 'app/data/series',
 *			Subs: 'app/data/lyrics',
 * 			Temp: 'app/temp',
 *			DB: 'app/db'
 *		}
 *	}
 * },
 * version: {
 * 		number: '2.5-next',
 * 		name: 'Konata Karaokiste'
 * }
 * }
 */

/**
 * @api {get} /public/karas/:kid Get song info from database
 * @apiName GetKaraInfo
 * @apiVersion 2.5.0
 * @apiGroup Karaokes
 * @apiPermission public
 * @apiHeader authorization Auth token received from logging in
 * @apiParam {uuid} kid Karaoke ID you want to fetch information from
 * @apiSuccess {Object[]} data/authors Karaoke authors' names
 * @apiSuccess {Number} data/created_at In `Date()` format
 * @apiSuccess {Object[]} data/creators Show's creators names
 * @apiSuccess {Number} data/duration Song duration in seconds
 * @apiSuccess {Number} data/flag_dejavu Has the song been played in the last hour ? (`EngineMaxDejaVuTime` defaults to 60 minutes)
 * @apiSuccess {Number} data/flag_favorites `true` if the song is in the user's favorites, `false`if not.
 * @apiSuccess {Number} data/gain Calculated audio gain for the karaoke's video, in decibels (can be negative)
 * @apiSuccess {uuid} data/kid Karaoke's unique ID (survives accross database generations)
 * @apiSuccess {Object[]} data/languages Song's languages in ISO639-2B format
 * @apiSuccess {String} data/language_i18n Song's language translated in the client's native language
 * @apiSuccess {Date} data/lastplayed_at When the song has been played last, in `Date()` format
 * @apiSuccess {Interval} data/lastplayed_ago When the song has been played last, in hours/minutes/seconds ago
 * @apiSuccess {Object[]} data/misc_tags Internal tag list (`TAG_VIDEOGAME`, etc.)
 * @apiSuccess {String} data/previewfile Filename of the preview file associated with the karaoke. Can be undefined if the preview hasn't been generated yet by the server.
 * @apiSuccess {String} data/requested Number of times the song has been requested.
 * @apiSuccess {String} data/serie Name of series/show the song belongs to
 * @apiSuccess {Object[][]} data/serie_i18n array of array of JSON objects with series' names depending on their language.
 * @apiSuccess {String[]} data/serie_altname Alternative name(s) of series/show this song belongs to
 * @apiSuccess {String} data/serie_orig Original name for the series
 * @apiSuccess {Object[]} data/singers Singers' names, if known.
 * @apiSuccess {Number} data/songorder Song's order, relative to it's type. Opening 1, Opening 2, Ending 1, Ending 2, etc.
 * @apiSuccess {Object[]} data/songtype Song's type internal tag (`TYPE_OP`, `TYPE_ED`, `TYPE_IN` ...)
 * @apiSuccess {String} data/title Song's title
 * @apiSuccess {String} data/mediafile Media's filename
 * @apiSuccess {Number} data/played Counts how many times the song has been played
 * @apiSuccess {String} data/year Song's creation year. Empty string is returned if no year is known.
 * HTTP/1.1 200 OK
 * {
 *   "data": [
 *       {
 *           "authors": [
 *               {
 *                   "i18n": {},
 *                   "name": "Nock",
 *                   "pk_id_tag": 144,
 *                   "slug": "nock",
 *                   "tagtype": 6
 *               }
 *           ],
 *           "created_at": "2018-09-12T08:41:38.000Z",
 *           "creators": [
 *               {
 *                   "i18n": {},
 *                   "name": "Toei Animation",
 *                   "pk_id_tag": 55,
 *                   "slug": "toei-animation",
 *                   "tagtype": 4
 *               },
 *               {
 *                   "i18n": {},
 *                   "name": "Saban",
 *                   "pk_id_tag": 226,
 *                   "slug": "saban",
 *                   "tagtype": 4
 *               }
 *           ],
 *           "duration": 29,
 *           "flag_dejavu": false,
 *           "flag_favorites": false,
 *           "gain": 6.34,
 *           "karafile": "ENG - Dokidoki! PreCure - OP - Glitter Force Doki Doki Theme Song.kara",
 *           "kid": "aa252a23-c5b5-43f3-978e-f960b6bb1ef1",
 *           "languages": [
 *               {
 *                   "i18n": {},
 *                   "name": "eng",
 *                   "pk_id_tag": 47,
 *                   "slug": "eng",
 *                   "tagtype": 5
 *               }
 *           ],
 *           "languages_i18n": [
 *               "Anglais"
 *           ],
 *           "lastplayed_at": null,
 *           "lastplayed_ago": null,
 *           "mediafile": "ENG - Dokidoki! PreCure - OP - Glitter Force Doki Doki Theme Song.mp4",
 * 			 "mediasize": 29375831,
 *           "misc_tags": [
 *               {
 *                   "i18n": {
 *                       "en": "Anime",
 *                       "fr": "Anime"
 *                   },
 *                   "name": "TAG_ANIME",
 *                   "pk_id_tag": 3,
 *                   "slug": "tag_anime",
 *                   "tagtype": 7
 *               },
 *               {
 *                   "i18n": {
 *                       "en": "TV Show",
 *                       "fr": "Série TV"
 *                   },
 *                   "name": "TAG_TVSHOW",
 *                   "pk_id_tag": 4,
 *                   "slug": "tag_tvshow",
 *                   "tagtype": 7
 *               },
 *               {
 *                   "i18n": {
 *                       "en": "Magical girl",
 *                       "fr": "Magical girl"
 *                   },
 *                   "name": "TAG_MAGICALGIRL",
 *                   "pk_id_tag": 225,
 *                   "slug": "tag_magicalgirl",
 *                   "tagtype": 7
 *               },
 *               {
 *                   "i18n": {
 *                       "en": "Creditless",
 *                       "fr": "Creditless"
 *                   },
 *                   "name": "TAG_CREDITLESS",
 *                   "pk_id_tag": 14,
 *                   "slug": "tag_creditless",
 *                   "tagtype": 7
 *               }
 *           ],
 *           "modified_at": "2018-11-14T21:31:36.000Z",
 *           "played": "0",
 * 			 "previewfile": "abcdef.1023.mp4"
 *           "requested": "0",
 *           "serie": "Dokidoki! PreCure",
 *           "serie_altname": [
 *               [
 *                   "Glitter Force Doki Doki",
 *                   "precure10"
 *               ]
 *           ],
 *           "serie_i18n": [
 *               [
 *                   {
 *                       "lang": "eng",
 *                       "name": "Dokidoki! PreCure"
 *                   },
 *                   {
 *                       "lang": "kor",
 *                       "name": "????! ????"
 *                   },
 *                   {
 *                       "lang": "jpn",
 *                       "name": "????! ?????"
 *                   }
 *               ]
 *           ],
 *           "serie_id": [
 *               43
 *           ],
 *           "seriefiles": [
 *               "Dokidoki! PreCure.series.json"
 *           ],
 *           "singers": [
 *               {
 *                   "i18n": {},
 *                   "name": "Blush",
 *                   "pk_id_tag": 224,
 *                   "slug": "blush",
 *                   "tagtype": 2
 *               }
 *           ],
 *           "songorder": null,
 *           "songtype": [
 *               {
 *                   "i18n": {
 *                       "en": "Opening",
 *                       "fr": "Opening"
 *                   },
 *                   "name": "TYPE_OP",
 *                   "pk_id_tag": 10,
 *                   "slug": "type_op",
 *                   "tagtype": 3
 *               }
 *           ],
 *           "songwriters": [
 *               {
 *                   "i18n": {},
 *                   "name": "Noam Kaniel",
 *                   "pk_id_tag": 227,
 *                   "slug": "noam-kaniel",
 *                   "tagtype": 8
 *               }
 *           ],
 *           "subfile": "ENG - Dokidoki! PreCure - OP - Glitter Force Doki Doki Theme Song.ass",
 *           "title": "Glitter Force Doki Doki Theme Song",
 *           "year": 2017
 *       }
 *   ]
 * }
 * @apiError SONG_VIEW_ERROR Unable to list songs
 * @apiError WEBAPPMODE_CLOSED_API_MESSAGE API is disabled at the moment.
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * {
 *   "code": "SONG_VIEW_ERROR",
 *   "message": null
 * }
 * @apiErrorExample Error-Response:
 * HTTP/1.1 403 Forbidden
 */

		/**
		* @api {get} /public/tags Get tag list
		* @apiName GetTags
		* @apiVersion 2.5.0
		* @apiGroup Tags
		* @apiPermission public
		* @apiHeader authorization Auth token received from logging in
		* @apiParam {Number} [type] Type of tag to filter
		* @apiParam {String} [filter] Tag name to filter results
		* @apiParam {Number} [from] Where to start listing from
		* @apiParam {Number} [size] How many records to get.
		* @apiSuccess {String} data/name Name of tag
		* @apiSuccess {Number} data/tag_id Tag ID number
		* @apiSuccess {Number} data/type Tag type number
		* @apiSuccess {String} data/slug Slugified version of the tag
		* @apiSuccess {Object} data/i18n Translations in case of misc, languages and song type tags
		*
		* @apiSuccessExample Success-Response:
		* HTTP/1.1 200 OK
		* {
		*     "data": {
		*		content: [
		*        {
		*            "i18n": {
		* 				"en": "TV Show",
		*				"fr": "Série TV"
		*			 },
		*            "name": "TAG_TVSHOW",
		*            "slug": "tag_tvshow",
		*            "tag_id": 2090,
		*            "type": 2
		*        },
		*		 ...
		*   	],
		*       "infos": {
		*           "count": 1000,
		* 			"from": 0,
		* 			"to": 120
		*       }
		* }
		* @apiError TAGS_LIST_ERROR Unable to get list of tags
		* @apiError WEBAPPMODE_CLOSED_API_MESSAGE API is disabled at the moment.
		* @apiErrorExample Error-Response:
		* HTTP/1.1 500 Internal Server Error
		* @apiErrorExample Error-Response:
		* HTTP/1.1 403 Forbidden
		*/

		/**
	 * @api {get} /admin/playlists/:pl_id/karas Get list of karaokes in a playlist
	 * @apiName GetPlaylistKaras
	 * @apiVersion 2.5.0
	 * @apiGroup Playlists
	 * @apiPermission admin
	 * @apiHeader authorization Auth token received from logging in
	 * @apiParam {Number} pl_id Target playlist ID.
	 * @apiParam {String} [filter] Filter list by this string.
	 * @apiParam {Number} [from=0] Return only the results starting from this position. Useful for continuous scrolling. 0 if unspecified
	 * @apiParam {Number} [size=999999] Return only x number of results. Useful for continuous scrolling. 999999 if unspecified.
	 * @apiParam {Number} [random=0] Return a [random] number of karaokes from that playlist.
	 *
	 * @apiSuccess {Object[]} data/content/plc Array of `playlistcontent` objects
	 * @apiSuccess {Number} data/infos/count Number of karaokes in playlist
	 * @apiSuccess {Number} data/infos/from Starting position of listing
	 * @apiSuccess {Number} data/infos/to End position of listing
	 *
	 * @apiSuccessExample Success-Response:
	 * HTTP/1.1 200 OK
	 * {
	 *   "data": {
	 *       "content": [
	 *           <see admin/playlists/[id]/karas/[plc_id] for example>
	 *       ],
	 *       "infos": {
	 *           "count": 3,
	 * 			 "from": 0,
	 * 			 "to": 120
	 *       }
	 *   }
	 * }
	 * @apiError PL_VIEW_SONGS_ERROR Unable to fetch list of karaokes in a playlist
	 *
	 * @apiErrorExample Error-Response:
	 * HTTP/1.1 500 Internal Server Error
	 */

		/**
	 * @api {get} /admin/blacklist Get blacklist
	 * @apiName GetBlacklist
	 * @apiVersion 2.3.1
	 * @apiGroup Blacklist
	 * @apiPermission admin
	 * @apiHeader authorization Auth token received from logging in
	 * @apiParam {String} [filter] Filter list by this string.
	 * @apiParam {Number} [from=0] Return only the results starting from this position. Useful for continuous scrolling. 0 if unspecified
	 * @apiParam {Number} [size=999999] Return only x number of results. Useful for continuous scrolling. 999999 if unspecified.* @apiSuccess {String} code Message to display
	 * @apiSuccess {Object[]} data/content List of karaoke objects
	 * @apiSuccess {Number} data/infos/count Number of items in whitelist no matter which range was requested
	 * @apiSuccess {Number} data/infos/from Items listed are from this position
	 * @apiSuccess {Number} data/infos/size How many items listed.
	 *
	 * @apiSuccessExample Success-Response:
	 * HTTP/1.1 200 OK
	 * {
	 *   "data": {
	 *       "content": [
	 *           {
	 * 				<see public/karas/[id]>,
	 * 				"blacklisted_at": "2019-01-01T21:21:00.000Z",
	 * 				"reason": "Your waifu is shit"
	 *           }
	 *       ],
	 *       "infos": {
	 *           "count": 1,
	 *           "from": 0,
	 *           "to": 999999
	 *       }
	 *   }
	 * }
	 * @apiError BL_VIEW_ERROR Blacklist could not be viewed
	 *
	 * @apiErrorExample Error-Response:
	 * HTTP/1.1 500 Internal Server Error
	 * {
	 *   "code": "BL_VIEW_ERROR"
	 * }
	 */

	/**
	 * @api {get} /admin/favorites Get favorites of any user (as admin)
	 * @apiName GetFavoritesAdmin
	 * @apiVersion 2.5.0
	 * @apiGroup Favorites
	 * @apiPermission admin
	 * @apiHeader authorization Auth token received from logging in
	 *
	 * @apiParam {String} username Username favorites
	 * @apiParam {String} [filter] Filter list by this string.
	 * @apiParam {Number} [from=0] Return only the results starting from this position. Useful for continuous scrolling. 0 if unspecified
	 * @apiParam {Number} [size=999999] Return only x number of results. Useful for continuous scrolling. 999999 if unspecified.
	 * @apiSuccess {String} code Message to display
	 * @apiSuccess {Object[]} data/content List of karaoke objects
	 * @apiSuccess {Number} data/infos/count Number of items in favorites no matter which range was requested
	 * @apiSuccess {Number} data/infos/from Items listed are from this position
	 * @apiSuccess {Number} data/infos/size How many items listed.
	 *
	 * @apiSuccessExample Success-Response:
	 * HTTP/1.1 200 OK
	 * {
	 *   "data": {
	 *       "content": [
	 *           {
	 * 				<see Kara object>,
	 *           }
	 *       ],
	 *       "infos": {
	 *           "count": 1,
	 *           "from": 0,
	 *           "to": 999999
	 *       }
	 *   }
	 * }
	 * @apiError FAV_VIEW_ERROR Favorites could not be viewed
	 *
	 * @apiErrorExample Error-Response:
	 * HTTP/1.1 500 Internal Server Error
	 * {
	 *   "code": "FAV_VIEW_ERROR"
	 * }
	 */
	/**
 * @api {get} /admin/whitelist Get whitelist
 * @apiName GetWhitelist
 * @apiVersion 2.5.0
 * @apiGroup Whitelist
 * @apiPermission admin
 * @apiHeader authorization Auth token received from logging in
 * @apiParam {String} [filter] Filter list by this string.
 * @apiParam {Number} [from=0] Return only the results starting from this position. Useful for continuous scrolling. 0 if unspecified
 * @apiParam {Number} [size=999999] Return only x number of results. Useful for continuous scrolling. 999999 if unspecified.
 * @apiSuccess {String} code Message to display
 * @apiSuccess {Object[]} data/content List of karaoke objects
 * @apiSuccess {Number} data/infos/count Number of items in whitelist no matter which range was requested
 * @apiSuccess {Number} data/infos/from Items listed are from this position
 * @apiSuccess {Number} data/infos/size How many items listed.
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "data": {
 *       "content": [
 *           {
 * 				<see Kara object>,
 * 				 "reason": "No reason",
 * 				 "whitelisted_at": "2019-01-01T01:01:01.000Z"
 *           }
 *       ],
 *       "infos": {
 *           "count": 1,
 *           "from": 0,
 *           "to": 999999
 *       }
 *   }
 * }
 * @apiError WL_VIEW_ERROR Whitelist could not be viewed
 *
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * {
 *   "code": "WL_VIEW_ERROR"
 * }
 */

	/**
 * @api {get} /public/blacklist Get blacklist (public)
 * @apiName GetBlacklistPublic
 * @apiVersion 2.5.0
 * @apiGroup Blacklist
 * @apiPermission public
 * @apiHeader authorization Auth token received from logging in
 * @apiDescription If `EngineAllowViewBlacklist` is set to `0` in configuration, then returns an error message (see below)
 * @apiParam {String} [filter] Filter list by this string.
 * @apiParam {Number} [from=0] Return only the results starting from this position. Useful for continuous scrolling. 0 if unspecified
 * @apiParam {Number} [size=999999] Return only x number of results. Useful for continuous scrolling. 999999 if unspecified.* @apiSuccess {String} code Message to display
 * @apiSuccess {Object[]} data/content List of karaoke objects
 * @apiSuccess {Number} data/infos/count Number of items in whitelist no matter which range was requested
 * @apiSuccess {Number} data/infos/from Items listed are from this position
 * @apiSuccess {Number} data/infos/size How many items listed.
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "data": {
 *       "content": [
 *           {
 *              <See admin/blacklist object>
 *           }
 *       ],
 *       "infos": {
 *           "count": 1,
 *           "from": 0,
 *           "to": 999999
 *       }
 *   }
 * }
 * @apiError BL_VIEW_ERROR Blacklist could not be viewed
 * @apiError BL_VIEW_FORBIDDEN Blacklist view is not allowed for users
 * @apiError WEBAPPMODE_CLOSED_API_MESSAGE API is disabled at the moment.
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * {
 *   "code": "BL_VIEW_FORBIDDEN"
 * }
 * @apiErrorExample Error-Response:
 * HTTP/1.1 403 Forbidden
 */
	/**
 * @api {get} /public/favorites View own favorites
 * @apiName GetFavorites
 * @apiVersion 2.5.0
 * @apiGroup Favorites
 * @apiPermission own
 * @apiHeader authorization Auth token received from logging in
 * @apiParam {String} [filter] Filter list by this string.
 * @apiParam {Number} [from=0] Return only the results starting from this position. Useful for continuous scrolling. 0 if unspecified
 * @apiParam {Number} [size=999999] Return only x number of results. Useful for continuous scrolling. 999999 if unspecified.
 *
 * @apiSuccess {Object[]} data/content/karas Array of `kara` objects
 * @apiSuccess {Number} data/infos/count Number of karaokes in playlist
 * @apiSuccess {Number} data/infos/from Starting position of listing
 * @apiSuccess {Number} data/infos/to End position of listing
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "data": {
 *       "content": [
 *           {
 *            <See public/karas/[id] object>
 *           },
 *           ...
 *       ],
 *       "infos": {
 *           "count": 3,
 * 			 "from": 0,
 * 			 "to": 120
 *       }
 *   }
 * }
 * @apiError FAVORITES_VIEW_ERROR Unable to fetch list of karaokes in favorites
 * @apiError WEBAPPMODE_CLOSED_API_MESSAGE API is disabled at the moment.
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * @apiErrorExample Error-Response:
 * HTTP/1.1 403 Forbidden
 */

		/**
	 * @api {get} /public/playlists/current/karas Get list of karaokes in the current playlist
	 * @apiName GetPlaylistKarasCurrent
	 * @apiVersion 2.5.0
	 * @apiGroup Playlists
	 * @apiPermission public
	 * @apiHeader authorization Auth token received from logging in
	 * @apiParam {Number} pl_id Target playlist ID.
	 * @apiParam {String} [filter] Filter list by this string.
	 * @apiParam {Number} [from=0] Return only the results starting from this position. Useful for continuous scrolling. 0 if unspecified
	 * @apiParam {Number} [size=999999] Return only x number of results. Useful for continuous scrolling. 999999 if unspecified.
	 *
	 * @apiSuccess {Object[]} data/content/karas Array of `playlistcontent` objects
	 * @apiSuccess {Number} data/infos/count Number of karaokes in playlist
	 * @apiSuccess {Number} data/infos/from Starting position of listing
	 * @apiSuccess {Number} data/infos/to End position of listing
	 *
	 * @apiSuccessExample Success-Response:
	 * HTTP/1.1 200 OK
	 * {
	 *   "data": {
	 *       "content": [
	 *           {
	 *                <See admin/playlists/[id]/karas/[plc_id] object>
	 *           }
	 *       ],
	 *       "infos": {
	 *           "count": 3,
	 * 			 "from": 0,
	 * 			 "to": 120
	 *       }
	 *   }
	 * }
	 * @apiError PL_VIEW_SONGS_CURRENT_ERROR Unable to fetch list of karaokes of current playlist
	 * @apiError WEBAPPMODE_CLOSED_API_MESSAGE API is disabled at the moment.
	 * @apiErrorExample Error-Response:
	 * HTTP/1.1 500 Internal Server Error
	 * @apiErrorExample Error-Response:
	 * HTTP/1.1 403 Forbidden
	 */

/**
	 * @api {get} /public/playlists/current/karas Get list of karaokes in the current playlist
	 * @apiName GetPlaylistKarasCurrent
	 * @apiVersion 2.5.0
	 * @apiGroup Playlists
	 * @apiPermission public
	 * @apiHeader authorization Auth token received from logging in
	 * @apiParam {Number} pl_id Target playlist ID.
	 * @apiParam {String} [filter] Filter list by this string.
	 * @apiParam {Number} [from=0] Return only the results starting from this position. Useful for continuous scrolling. 0 if unspecified
	 * @apiParam {Number} [size=999999] Return only x number of results. Useful for continuous scrolling. 999999 if unspecified.
	 *
	 * @apiSuccess {Object[]} data/content/karas Array of `playlistcontent` objects
	 * @apiSuccess {Number} data/infos/count Number of karaokes in playlist
	 * @apiSuccess {Number} data/infos/from Starting position of listing
	 * @apiSuccess {Number} data/infos/to End position of listing
	 *
	 * @apiSuccessExample Success-Response:
	 * HTTP/1.1 200 OK
	 * {
	 *   "data": {
	 *       "content": [
	 *           {
	 *                <See admin/playlists/[id]/karas/[plc_id] object>
	 *           }
	 *       ],
	 *       "infos": {
	 *           "count": 3,
	 * 			 "from": 0,
	 * 			 "to": 120
	 *       }
	 *   }
	 * }
	 * @apiError PL_VIEW_SONGS_CURRENT_ERROR Unable to fetch list of karaokes of current playlist
	 * @apiError WEBAPPMODE_CLOSED_API_MESSAGE API is disabled at the moment.
	 * @apiErrorExample Error-Response:
	 * HTTP/1.1 500 Internal Server Error
	 * @apiErrorExample Error-Response:
	 * HTTP/1.1 403 Forbidden
	 */
	/**
 * @api {get} /public/karas Get complete list of karaokes
 * @apiName GetKaras
 * @apiVersion 2.5.0
 * @apiGroup Karaokes
 * @apiPermission public
 * @apiHeader authorization Auth token received from logging in
 * @apiParam {String} [filter] Filter list by this string.
 * @apiParam {Number} [from=0] Return only the results starting from this position. Useful for continuous scrolling. 0 if unspecified
 * @apiParam {Number} [size=999999] Return only x number of results. Useful for continuous scrolling. 999999 if unspecified.
 * @apiParam {String} [searchType] Can be `search`, `kid`, `requested`, `recent` or `played`
 * @apiParam {String} [searchValue] Value to search for. For `kid` it's a UUID, for `search` it's a string comprised of criterias separated by `!`. Criterias are `s:` for series, `y:` for year et `t:` for tag. Example, all songs with tags 53 and 1022 and year 1990 is `t:53,1022!y:1990`
 * @apiParam {Number} [random] If specified, will return a `number` random list of songs
 *
 * @apiSuccess {Object[]} data/content/karas Array of `kara` objects
 * @apiSuccess {Number} data/infos/count Number of karaokes in playlist
 * @apiSuccess {Number} data/infos/from Starting position of listing
 * @apiSuccess {Number} data/infos/to End position of listing
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "data": {
 *       "content": [
 *           {
 *               <See public/karas/:id object>
 *           },
 *           ...
 *       ],
 *       "infos": {
 *           "count": 3,
 * 			 "from": 0,
 * 			 "to": 120
 *       }
 *   }
 * }
 * @apiError SONG_LIST_ERROR Unable to fetch list of karaokes
 * @apiError WEBAPPMODE_CLOSED_API_MESSAGE API is disabled at the moment.
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * @apiErrorExample Error-Response:
 * HTTP/1.1 403 Forbidden
 */

 /**
 * @api {get} /public/playlists/:pl_id/karas Get list of karaokes in a playlist (public)
 * @apiName GetPlaylistKarasPublic
 * @apiVersion 2.5.0
 * @apiGroup Playlists
 * @apiPermission public
 * @apiHeader authorization Auth token received from logging in
 * @apiDescription Contrary to the `/admin/playlists/` path, this one will not return playlists which have the `flag_visible` set to `false`.
 * @apiParam {Number} pl_id Target playlist ID.
 * @apiParam {String} [filter] Filter list by this string.
 * @apiParam {Number} [from=0] Return only the results starting from this position. Useful for continuous scrolling. 0 if unspecified
 * @apiParam {Number} [size=999999] Return only x number of results. Useful for continuous scrolling. 999999 if unspecified.
 *
 * @apiSuccess {Object[]} data/content/karas Array of `kara` objects
 * @apiSuccess {Number} data/infos/count Number of karaokes in playlist
 * @apiSuccess {Number} data/infos/from Starting position of listing
 * @apiSuccess {Number} data/infos/to End position of listing
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "data": {
 *       "content": [
 *           {
 * 				<See admin/playlists/[id]/karas/[kara_id] object>
 *           },
 *           ...
 *       ],
 *       "infos": {
 *           "count": 3,
 * 			 "from": 0,
 * 			 "to": 120
 *       }
 *   }
 * }
 * @apiError PL_VIEW_SONGS_ERROR Unable to fetch list of karaokes in a playlist
 * @apiError WEBAPPMODE_CLOSED_API_MESSAGE API is disabled at the moment.
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * @apiErrorExample Error-Response:
 * HTTP/1.1 403 Forbidden
 */
/**
	 * @api {get} /public/playlists/current/karas Get list of karaokes in the current playlist
	 * @apiName GetPlaylistKarasCurrent
	 * @apiVersion 2.5.0
	 * @apiGroup Playlists
	 * @apiPermission public
	 * @apiHeader authorization Auth token received from logging in
	 * @apiParam {Number} pl_id Target playlist ID.
	 * @apiParam {String} [filter] Filter list by this string.
	 * @apiParam {Number} [from=0] Return only the results starting from this position. Useful for continuous scrolling. 0 if unspecified
	 * @apiParam {Number} [size=999999] Return only x number of results. Useful for continuous scrolling. 999999 if unspecified.
	 *
	 * @apiSuccess {Object[]} data/content/karas Array of `playlistcontent` objects
	 * @apiSuccess {Number} data/infos/count Number of karaokes in playlist
	 * @apiSuccess {Number} data/infos/from Starting position of listing
	 * @apiSuccess {Number} data/infos/to End position of listing
	 *
	 * @apiSuccessExample Success-Response:
	 * HTTP/1.1 200 OK
	 * {
	 *   "data": {
	 *       "content": [
	 *           {
	 *                <See admin/playlists/[id]/karas/[plc_id] object>
	 *           }
	 *       ],
	 *       "infos": {
	 *           "count": 3,
	 * 			 "from": 0,
	 * 			 "to": 120
	 *       }
	 *   }
	 * }
	 * @apiError PL_VIEW_SONGS_CURRENT_ERROR Unable to fetch list of karaokes of current playlist
	 * @apiError WEBAPPMODE_CLOSED_API_MESSAGE API is disabled at the moment.
	 * @apiErrorExample Error-Response:
	 * HTTP/1.1 500 Internal Server Error
	 * @apiErrorExample Error-Response:
	 * HTTP/1.1 403 Forbidden
	 */
		/**
	 * @api {get} /public/playlists/public/karas Get list of karaokes in the public playlist
	 * @apiName GetPlaylistKarasPublic
	 * @apiVersion 2.3.1
	 * @apiGroup Playlists
	 * @apiPermission public
	 * @apiHeader authorization Auth token received from logging in
	 * @apiParam {Number} pl_id Target playlist ID.
	 * @apiParam {String} [filter] Filter list by this string.
	 * @apiParam {Number} [from=0] Return only the results starting from this position. Useful for continuous scrolling. 0 if unspecified
	 * @apiParam {Number} [size=999999] Return only x number of results. Useful for continuous scrolling. 999999 if unspecified.
	 *
	 * @apiSuccess {Object[]} data/content Array of `Playlist` objects
	 *
	 * @apiSuccessExample Success-Response:
	 * HTTP/1.1 200 OK
	 * {
	 *   "data": {
	 *       "content": [
	 *           {
	 * 				<See /admin/playlists/[id]/karas/[plc_id] object>
	 *           },
	 *           ...
	 *       ],
	 *       "infos": {
	 *           "count": 3,
	 * 			 "from": 0,
	 * 			 "to": 120
	 *       }
	 *   }
	 * }
	 * @apiError PL_VIEW_SONGS_PUBLIC_ERROR Unable to fetch list of karaokes of public playlist
	 * @apiError WEBAPPMODE_CLOSED_API_MESSAGE API is disabled at the moment.
	 *
	 * @apiErrorExample Error-Response:
	 * HTTP/1.1 500 Internal Server Error
	 * @apiErrorExample Error-Response:
	 * HTTP/1.1 403 Forbidden
	 */

	/**
 * @api {post} /public/songpoll Vote in a poll
 * @apiName PostPoll
 * @apiVersion 2.5.0
 * @apiGroup Song Poll
 * @apiPermission public
 * @apiHeader authorization Auth token received from logging in
 * @apiParam {Number} [playlistcontent_id] PLC ID to vote for

 * @apiSuccess {Array} data/poll Array of `playlistcontents` objects (see `/public/playlist/current/karas` for sample)
 * @apiSuccess {Number} data/poll/votes Number of votes this song has earned
 * @apiSuccess {Boolean} data/flag_uservoted Has the user already voted for this poll?
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "data": {
 *       "flag_uservoted": false,
 *       "infos": {
 *           "count": 4,
 *           "from": 0,
 *           "to": 999999
 *       },
 *       "poll": [
 *           {
 * 				<See admin/playlists/[id]/karas/[plc_id] object>
 *               "votes": 1,
 *           },
 *           ...
 *       ]
 *   }
 * }
 * @apiError POLL_LIST_ERROR Unable to list current poll
 * @apiError POLL_NOT_ACTIVE No poll is in progress
 * @apiError POLL_ALREADY_VOTED This user has already voted
 *
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * {
 *   "code": "POLL_LIST_ERROR",
 *   "message": null
 * }
 */
	/**
 * @api {get} /public/whitelist Get whitelist (public)
 * @apiName GetWhitelistPublic
 * @apiVersion 2.5.0
 * @apiGroup Whitelist
 * @apiPermission public
 * @apiHeader authorization Auth token received from logging in
 * @apiDescription If `EngineAllowViewWhitelist` is set to `0` in configuration, then returns an error message (see below)
 * @apiParam {String} [filter] Filter list by this string.
 * @apiParam {Number} [from=0] Return only the results starting from this position. Useful for continuous scrolling. 0 if unspecified
 * @apiParam {Number} [size=999999] Return only x number of results. Useful for continuous scrolling. 999999 if unspecified.* @apiSuccess {String} code Message to display
 * @apiSuccess {Object[]} data/content List of karaoke objects
 * @apiSuccess {Number} data/infos/count Number of items in whitelist no matter which range was requested
 * @apiSuccess {Number} data/infos/from Items listed are from this position
 * @apiSuccess {Number} data/infos/to Items listed end at this position
 *
 * @apiSuccessExample Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "data": {
 *       "content": [
 *           {
 * 				 <See admin/whitelist object>
 *           }
 *       ],
 *       "infos": {
 *           "count": 1,
 *           "from": 0,
 *           "to": 999999
 *       }
 *   }
 * }
 * @apiError WL_VIEW_ERROR Whitelist could not be viewed
 * @apiError WL_VIEW_FORBIDDEN Whitelist view is not allowed for users
 * @apiError WEBAPPMODE_CLOSED_API_MESSAGE API is disabled at the moment.
 * @apiErrorExample Error-Response:
 * HTTP/1.1 500 Internal Server Error
 * {
 *   "code": "WL_VIEW_FORBIDDEN"
 * }
 * @apiErrorExample Error-Response:
 * HTTP/1.1 403 Forbidden
 */

 /**
	 * @api {put} /admin/favorites/:username/empty Empty favorites (as admin)
	 * @apiName PutEmptyFavoritesAdmin
	 * @apiVersion 2.5.0
	 * @apiGroup Favorites
	 * @apiPermission admin
	 * @apiHeader authorization Auth token received from logging in
	 * @apiSuccess {String} code Message to display
	 *
	 * @apiSuccessExample Success-Response:
	 * HTTP/1.1 200 OK
	 * {
	 *   "code": "FAV_EMPTIED"
	 * }
	 * @apiError FAV_EMPTY_ERROR Unable to empty favorites
	 *
	 * @apiErrorExample Error-Response:
	 * HTTP/1.1 500 Internal Server Error
	 */

/**
	* @api {delete} /admin/favorites/:username Delete favorite items (as admin)
	* @apiName DeleteFavoritesAdmin
	* @apiVersion 2.5.0
	* @apiGroup Favorites
	* @apiPermission admin
	* @apiHeader authorization Auth token received from logging in
	* @apiParam {uuid[]} kid Karaoke IDs to delete from favorites, separated by commas
	* @apiSuccess {Number} args Arguments associated with message
	* @apiSuccess {Number} code Message to display
	* @apiSuccess {uuid[]} data List of favorites KIDs separated by commas
	*
	* @apiSuccessExample Success-Response:
	* HTTP/1.1 200 OK
	* {
	*   "args": "1",
	*   "code": "FAV_SONG_DELETED",
	*   "data": "uuid"
	* }
	* @apiError FAV_DELETE_SONG_ERROR Favorites item could not be deleted.
	*
	*/

		/**
	* @api {post} /admin/favorites/:username Add song to a user's favorites (as admin)
	* @apiName PostFavoritesAdmin
	* @apiVersion 2.5.0
	* @apiGroup Favorites
	* @apiPermission admin
	* @apiHeader authorization Auth token received from logging in
	* @apiParam {String} username Username to add favorites to
	* @apiParam {uuid[]} kid Karaoke song IDs, separated by commas
	* @apiParam {String} [reason] Reason the song was added
	* @apiSuccess {Number} args Arguments associated with message
	* @apiSuccess {Number} code Message to display
	* @apiSuccess {uuid[]} data/kid List of karaoke IDs separated by commas
	*
	* @apiSuccessExample Success-Response:
	* HTTP/1.1 201 Created
	* {
	*   "args": "2",
	*   "code": "FAV_SONG_ADDED",
	*   "data": [
	*       "kid"
	*   ]
	* }
	* @apiError FAV_ADD_SONG_ERROR Karaoke couldn't be added to favorites
	*
	* @apiErrorExample Error-Response:
	* HTTP/1.1 500 Internal Server Error
	* {
	*   "args": [
	*       "2"
	*   ],
	*   "code": "FAV_ADD_SONG_ERROR",
	*   "message": null
	* }
	*/
