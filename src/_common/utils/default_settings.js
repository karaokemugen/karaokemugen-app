// Karaoke Mugen default configuration file 

// this file is overwritten during updates, editing is ill-advised .
// you can change the default settings by using config.ini to bypass the default value .
export const defaults = { 

// JWT secret key: {string}
// This is an encryption authentication token . Please change this to a random string to avoid token abuse .
JwtSecret: "change me",

// Display nickname: {boolean}
// Display/hide nickname in the bottom right corner of the screen during first 8 seconds of playback .
EngineDisplayNickname : 1,

// Display connection info: {boolean}
// Enable/Disable connection info display .
// Implies EngineQRCode: 0
EngineDisplayConnectionInfo: 1,

// Display QR code: {boolean}
// Display/hide QR Code or not
EngineDisplayConnectionInfoQRCode: 1,

// Display Connection Info Message: {string}
// Adds additional message to display upon connection .
EngineDisplayConnectionInfoMessage: "",

// Display Connection Info of Host: {string}
// Displays IP/Host name to connect to Karaoke Mugen .
// Leave blank for auto-detection .
// Provide a host if auto-detection fails .
EngineDisplayConnectionInfoHost: "",

// Private Mode: {boolean}
// {1} songs will be added to current playlist directly
// {0} songs will be added to public playlist, leaving it up to the admin to put them in current or not .
EnginePrivateMode: 1,

// Values: {boolean}
// Allow users to view whitelist, blacklist and blacklist criterias .
EngineAllowViewWhitelist: 1,
EngineAllowViewBlacklist: 1,
EngineAllowViewBlacklistCriterias: 1,

// Number of songs per user: {integer}
// Number of songs a user can add to the playlist at a once .
// Songs already played don't count towards this limit .
EngineSongsPerUser: 10000,

//Free upvotes: {boolean}
// enable/disable Upvote free mechanic .
// Make us free na splash kasaneta...NO
// Disable this if you don't want to allow users to free songs via upvotes .
// Songs will only be freed once played, if you disable this .
EngineFreeUpvotes: 1,

// Percentage: value range: 0<={double}<=100
// Minimum percentage of upvotes / online users required to free a song .
// Change this number as your karaoke session goes .
EngineFreeUpvotesRequiredPercent: 33,

// Percentage: value range: 0<={double}<=100
// Minimum number of votes required to free a song .
// You need at least this many votes to free a song, no matter the percentage of online users reached .
EngineFreeUpvotesRequiredMin: 4,

// AutoPlay: {boolean}
// AutoPlay : if a karaoke song is added to the current playlist, start playing immediately if the karaoke is stopped .
EngineAutoPlay: 0,

// Repeat playlist: {boolean}
// RepeatPlaylist : when at the end of playlist, go back to position 1 and keep playing .
EngineRepeatPlaylist: 0,

// Max DejaVu time =
// Time in minutes before a song isn't considered  repeat insert anymore .
// insert dejaVu lyrics from initial D by Dave Rodgers
// I've just been in this place before, higher on the street,
// and I know it's my time to come home!
EngineMaxDejaVuTime: 60,

// Smart Insert: {boolean} 
// SmartInsert : gives priority to people who have not enqueued a lot of songs .
EngineSmartInsert: 0,

// Value: {integer}
// Number of songs between two jingles/break cards. 0 to disable .
// 20 songs: about 30 minutes of openings/endings .
EngineJinglesInterval: 20,

// Create previews: {boolean}
// Activate the creation of previews .
EngineCreatePreviews: 0,

// Background: {"filename"}
// Set the player's background .
// Specify the filename, it will be searched in the app/backgrounds folder .
PlayerBackground: "",

// Monitor choice: 0<={integer}<=9 
// Set the player to a different screen .
// {0}: Main screen
// {1}: Second screen
//  ...
// {9}: No screen specified (let mpv decide)
PlayerScreen: 0,

// Full screen: {boolean}
// Set player to full screen .
PlayerFullscreen: 0,

// Stay on top: {boolean}
// Set player to stay on top of other windows .
PlayerStayOnTop: 1,

// player HUD/OSD: {boolean}
// Disable player's HUD/OSD .
PlayerNoHud: 1,

// player progress bar: {boolean}
// Disable player's progressbar/Seeker inside video .
PlayerNoBar: 1,

// Picture in Picture mode puts the player's video window in a corner of your screen (decided by position X/Y) .
// and scales the window to PlayerPIPSize percent, by default 35% .
// The player will take up this percentage of screen size no matter how big the video resolution is .
//picture in picture mode: {boolean}
PlayerPIP: 1,
// Percentage: value range: 0<={double}<=100
PlayerPIPSize: 35,
//position in X/Y coordinate quarters
PlayerPIPPositionX: "Right",
PlayerPIPPositionY: "Bottom",

// Paths to binaries for mpv. These are the defaults .
// Don't modify these unless you want to use another mpv binary .
BinPlayerWindows: "app/bin/mpv.exe",
BinPlayerOSX: "app/bin/mpv.app/Contents/MacOS/mpv",
BinPlayerLinux: "/usr/bin/mpv",
BinffmpegWindows: "app/bin/ffmpeg.exe",
BinffprobeWindows: "app/bin/ffprobe.exe",
BinffmpegLinux: "/usr/bin/ffmpeg",
BinffprobeLinux: "/usr/bin/ffprobe",
BinffmpegOSX: "app/bin/ffmpeg",
BinffprobeOSX: "app/bin/ffprobe",

// Paths - don't touch these unless you know what you're doing .
PathBin: "app/bin",
PathKaras: "app/data/karas",
PathVideos: "app/data/videos",
PathSubs: "app/data/lyrics",
PathDB: "app/db",
PathDBKarasFile: "karas.sqlite3",
PathDBUserFile: "userdata.sqlite3",
PathAltname: "app/data/series_altnames.csv",
PathBackgrounds: "app/backgrounds",
PathJingles: "app/jingles",
PathTemp: "app/temp",
PathPreviews: "app/previews",
PathImport: "app/import",
PathAvatars: "app/avatars",

// Value: {url}
// Videos can be streamed from the following URL if not found on the local paths .
// BEWARE : some videos with a high bitrate won't play well on an average connection .
// This is meant to be used as a last resort. Leave blank if you don't wish to use it .
PathVideosHTTP: "",

// Value: {string} "codec"
// Video output driver for mpv .
// If you have blue window issues in Windows, set mpvVideoOutput to "direct3d", otherwise don't touch this .
// mpv should detect automatically which video output driver to use .
mpvVideoOutput: "",

// Value: {integer}
// Auth configuration .
// Time (in minutes) before a user account is set to expire after its last login/action .
AuthExpireTime: 15, 

// Value: {boolean}
// App's first run. Overriden in config.ini .
appFirstRun: 1

};