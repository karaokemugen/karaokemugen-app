// Karaoke Mugen App Constants

import { Repository } from '../lib/types/repo.js';
import { OldJWTToken } from '../lib/types/user.js';
import { QuizGameConfig } from '../types/config.js';

export const discordClientID = '718211141033263145';

export const requiredMPVVersion = '>=0.33.0';
export const requiredMPVFFmpegVersion = '>=7.1';
// We don't know if it's the right version it starts to work with, but hey.
export const requiredMPVFFmpegMasterVersion = 115182;
export const expectedPGVersion = 16;

export const supportedLanguages = ['en', 'fr', 'es', 'id', 'pt', 'de', 'it', 'pl', 'ta'];

/** Default guest names used to fill up the database */
export const defaultGuestNames = [
	'Sakura du 93',
	'Dark Kirito 64',
	'MC-kun',
	'La Castafiore',
	'xXNarutoSasukeXx',
	'Dark Flame Master',
	'MAGI System',
	'NinaFMA',
	'Sephir0th69',
	'Brigade SOS',
	'THE GAME',
	'Haruhi Suzumiya',
	'Char Aznable',
	'Kira "Jesus" Yamato',
	'Mahoro',
	'Laughing Man',
	'Norio Wakamoto',
	'Nanami Ando',
	'Ayako Suzumiya',
	'Keikaku-kun',
	'Random imouto',
	'Onii-chan',
	'Lelouch',
	'Phantom Thieves',
	'Hôôin Kyôma',
	'Blue Accordéon',
	'Yellow Baguette',
	'Pink A La Mode',
	'Red Fromage',
	'Black Beaujolais',
	'Silver Mousquetaire',
	'Kyonko',
	"My karaoke can't be this cute",
	'The guy with a white t-shirt over there',
	'David Goodenough',
	'Kiss-Shot Acerola-Orion Heart-Under-Blade',
	'BATMAN',
	'Segata Sanshiro',
	'A mother with a braid on her shoulder',
	'El Psy Kongroo',
	'Dike Spies',
	'Urakawa Minori',
	'Tomino "Big Bald Man" Yoshiyuki',
	"Hideaki Anno's depression",
	'Lina Inverse',
	'DIO BRANDO',
	'Goblin Slayer-kun',
	'Giga Drill Breaker',
	'Sailor Moon',
	'Ranma',
	'Goku',
	'Vegeta',
	'Gohan',
	'Yui Hirasawa',
	'Mio Akiyama',
	'Ritsu Tainaka',
	'Tsumugi Kotobuki',
	'Ui Hirasawa',
	'Azusa Nakano',
	'Maquia',
	'Zombie Number 0',
	'Zombie Number 1',
	'Zombie Number 2',
	'Zombie Number 3',
	'Zombie Number 4',
	'Zombie Number 5',
	'Zombie Number 6',
	'Batman Ninja',
	'Darling',
	'Yuri Katsuki',
	'Victor-kun',
	'Kumiko Ômae',
	'Utena',
	'Eren Jäger',
	'Mikasa Ackerman',
	'Mikasa es tu casa',
	'Armin Arlelt',
	'Kaori Miyazono',
	'Kôsei Arima',
	'Masa-san <3',
	'Hibiki Tachibana',
	'Tsubasa Kazanari',
	'Chris Yukine',
	'Mitsuha Miyamizu',
	'Taki Tachibana',
	'Holo',
	'Lawrence',
	'Yuki Nagato',
	'Mikuru Asahina',
	'Kyon-kun denwa',
	'Chika-Chika',
	'Giorgio Vanni <3',
	'Truck-kun',
	'One Song Man',
	'SAIDO CHESTO',
	'Slime',
	'Nepu',
	'Ganbaru Beam',
	'Kappa of ass',
	'Rimi Choco Cornet',
	'Doraemon',
	'Popuko',
	'Pipimi',
	'Bananya',
	'CONTRACT?',
	'Michelle',
	'Tubacabra',
	'Hideyoshi',
	'POÏ',
	'Madeline',
	'Badeline',
	'Nezuko',
	'Boss',
	'Great Mighty Poo',
	'Totoro',
	'A member of 346 Production',
	'A member of Aqours',
	'A member of Liella!',
	'A member of STARISH',
	'A member of Trickstar',
	'A member of the AKB0048',
	'A member of the Elite Beat Agents',
	'Aoi Aioi',
	'Aoi Kiriya',
	'Aya Maruyama',
	'BELLE',
	'Black Yuna',
	'Carole',
	'Cloche Leythal Pastalia',
	'Cyan Hijirikawa',
	'DIVA',
	'Doppo Kannonzaka',
	'Eiko Tsukimi',
	'Freyja Wion',
	'Full Moon',
	'Hatsune Miku',
	'Hatsune Miku from Leo/need',
	'Hatsune Miku from MORE MORE JUMP!',
	'Hatsune Miku from Nightcord at 25',
	'Hatsune Miku from Vivid Bad Squad',
	'Hatsune Miku from Wonderlands x Showtime',
	'Ichigo Hoshimiya',
	'Kana Fujii',
	'Kanon Nakagawa',
	'Karen Aijou',
	'Kasumi Toyama',
	'Kazusa Touma',
	'Kokoro Tsurumaki',
	'Kyoka Jiro',
	'Lala Manaka',
	'Laura La Mer',
	'Luca Trulyworth',
	'Lucia Nanami',
	'Lynn Minmey',
	'Mafuyu Satou',
	'Mars',
	'Maya Tendou',
	'Mikumo Guynemer',
	'Miss Monochrome',
	'Miyuki Shirogane',
	'Nana Osaki',
	'Octave',
	'Parappa',
	'Princess of the Crystal',
	'Ramuda Amemura',
	'Ran Mitake',
	'Ran Shibuki',
	'Riku Nanase',
	'Rise Kujikawa',
	'Ryuichi Sakuma',
	'Setsuna Ogiso',
	'Sharon Apple',
	'Sun Seto',
	'Suzune Miyama',
	'Tuesday',
	'Wakana Sakai',
	'Yukina Minato',
	'Yukio Tanaka',
	'Yuna',
	'Yuu Takasaki',
	'Mai Sakurajima',
	'A member of 765PRO ALLSTARS',
	'Emilia',
	'TETSUO',
	'KANEDA',
	'Asuna Yuuki',
	'Levi',
	"A member of u's",
	'Umibouzu',
	'Hayao Miyazaki',
	'Anti Bully Ranger',
	'Nekki Basara',
	'Ram',
	'Rem',
	'Ranka Lee',
	'Sheryl Nome',
	'Raphtalia',
	'Rei Ayanami',
	'Asuka Langley Soryu',
	'Rin Tohsaka',
	'Saber',
	'Erin Solstice',
];

/** Initialization catchphrases. We need more of them. */
export const initializationCatchphrases = [
	'"Karaoke Mugen is combat-ready!" ‒Nanamin',
	'"Karaoke Mugen, ikôzo!" ‒Nanamin',
	'"Smile! Sweet! Sister! Sadistic! Surprise! SING!" ‒The Karaoke Mugen Dev Team',
	'"Let us achieve world domination through karaoke!" ‒Axel Terizaki',
	'"Listen to my song!" ‒Every Macross Idol',
	'"Regenerate the DATABASE DATABASE WOW WOW" ‒MAN WITH A KARAOKE',
	'"Shinji, get in the f*cking karaoke room!" ‒Gendô Ikari',
	'"Everything is going according to the purerisuto. (Translator note : purerisuto means playlist)" ‒Bad Fansubs 101',
	'"Are people silent when they stop singing?" ‒Shirô',
	'"I am the handle of my mic. Rhythm is my body and lyrics are my blood. I have created over a thousand karaokes. Unknown to Silence, Nor known to Noise. Have withstood pain to create many Times. Yet, those hands will never hold anything. So as I sing, Unlimited Karaoke Works." ‒Archer',
	'"Take this microphone, mongrel, and let me judge if your voice is worth of joining that treasure of mine!" ‒Gilgamesh',
	'"You are already singing." ‒Kenshiro',
	'"Karaoke is not beautiful, and that is why it is beautiful." ‒Kino',
	'"Hey, want to become a karaoke maker?" ‒／人◕ ‿‿ ◕人＼',
	'"IT\'S JJ STYLE! ‒King J.J."',
	'"A microphone has no strength, unless the hand that holds it has courage." ‒Link',
	'"I AM THE GREAT MAD SINGER, HÔÔIN KYÔMA!" ‒Okabe Rintarô',
	'"If you are not singing with you, sing with me who sings with you!" ‒Kamina',
	'"Do you remember the number of songs you have sung in your life?" ‒Dio Brando',
	'"Let\'s make a strawberry parfait from this karaoke!" ‒Ichigo Hoshimiya',
	'"Karaoke... has changed." ‒Solid "Old" Snake',
	'"Karaoke Start!" ‒Yurippe',
	'"ALL HAIL KARAOKE MUGEN!" ‒Lelouch',
	'"It\'s over 9000!" ‒Someone in 2020 about the Karaoke Mugen database',
	'"This karaoke is corrupt!" ‒Il Palazzo-sama',
	'"Karaoke Mugen, launching!" ‒Amuro Ray',
	'"I am the man who makes the unsingable singable." ‒Mu la Fraga',
	'"Karaoke Mugen Standby, Ready." ‒Raising Heart',
	'"Not singing would tarnish the reputation of the Seto mermen!" ‒Sun Seto',
	'"I must not run away from karaoke..." ‒Shinji Ikari',
	'"Karaoke is top priority!" ‒Mizuho Kazami',
	'"Darkness beyond twilight. Crimson beyond blood that flows. Buried in the flow of time. In thy great name, I pledge myself to darkness. Let all the fools who stand in our way be destroyed, by the power you and I possess... DRAGON SLAVE!" ‒Lina Inverse (after someone requested the song "Otome no Inori")',
	'"My microphone is the one that will pierce the heavens!" ‒Kamina',
	'"Karaoke is an insult to life itself." ‒Hayao Miyazaki',
	'"KARAOKE SENRYAKUUUUUUU!" ‒Princess of the Crystal',
	'"Fun karaokes are fun." ‒Yui Hirasawa',
	'"Karaoke nano wa ikenai to omoimasu." ‒Mahoro',
	'"Don\'t forget the karaoke of Oct 3rd 11." ‒Edward Elric',
	'"I think it\'s time we sing this karaoke. Get everybody and the mic together. Ok, three, two, one, let\'s sing." ‒Spike Spiegel',
	'"I don\'t sing everything, I\'m just singing the karaoke that I know." ‒Tsubasa Hanekawa',
	'"This karaoke can only be executed a single time. Once it starts, it will be deleted. If you have chosen not to run the playlist, it will delete itself without executing. Ｒｅａｄｙ？" ‒YUKI.N',
	'"We still don\'t know the name of the karaoke we sang that day." ‒Super Peace Buster\'s members',
	'"DEJA FAIT! I just sang this karaoke before!" ‒Guy in Trueno GT APEX AE86',
	'"Pirikaraoke Royal !" ‒Doremi Harukaze',
	'"Karaoke that conceals the power of darkness, reveal your true timing to me! By my power, I command you, release!" ‒Sakura Kinomoto',
	'"I hold the mic with my right hand, and with my left, I\'ll write the name of the next karaoke. I\'ll take a potato chip... AND EAT IT!" ‒Light Yagami',
	'"You can listen anytime, but singing takes true courage." ‒Kenshin Himura',
	'"Karaoke is not a game of luck. If you want to win, sing hard." ‒Sora',
	'"Whatever you sing, enjoy it to the fullest. That is the secret of karaoke." ‒Rider',
	'"If you don\'t like your song, don\'t accept it. Instead, have the courage to change it the way you want to be." ‒Naruto Uzumaki',
	'"If you can\'t find a reason to sing, then you shouldn\'t be singing." ‒Akame',
	"\"Karaoke is like a tube of toothpaste. When you've used all the toothpaste, that's when you've really sang. Sing with all your might, and struggle as long as you have your voice.\" ‒Mion Sonozaki",
	'"Sing exactly as you like. That is the true meaning of karaoke. Karaoke leads to joy and joy leads to happiness." ‒Gilgamesh',
	'"If you can\'t sing something, then don\'t. Focus on what you can sing." ‒Shiroe',
	'"When you lose sight of the lyrics, listen to the karaoke in your heart." ‒Allen Walker',
	'"A karaoke is worth less than nothing if you don\'t have someone to share it." ‒Dôsan Saitô',
	'"What you can\'t sing alone, becomes singable when you\'re with someone else." ‒Taichi Yaegashi',
	'"Even if you\'re a bad singer, there are miracles you can seize with your voice if you sing on to the very end." ‒Uryû Minene',
	'"You\'re singing in Japanese! If you must sing, do it in German!" ‒Asuka Langley Soryu',
	'"A russian karaoke is fine too." ‒Shiki Tohno',
	'"Let\'s save the world by overloading it with karaoke!" ‒Haruhi Suzumiya',
	'"Let us begin, Rei. Release your voice, the barrier of your mind. Make our imperfect voices whole again. Discard this unnecessary physical microphone. Merge all voice into one. And then, take me to Yui\'s side." ‒Gendo Ikari',
	'"It\'s time to k-k-k-k-k-k-k-k-k-k-kara!" ‒Yûgi Mutô',
];

// Default headers for HTTP client
export const userAgent = 'KaraokeMugenApp';

export const webappModes = Object.freeze({
	closed: 0,
	limited: 1,
	open: 2,
});

export const logo = `
 ___ ___                        __              ___ ___
|   Y   .---.-.----.---.-.-----|  |--.-----.   |   Y   .--.--.-----.-----.-----.
|.  1  /|  _  |   _|  _  |  _  |    <|  -__|   |.      |  |  |  _  |  -__|     |
|.  _  \\|___._|__| |___._|_____|__|__|_____|   |. \\_/  |_____|___  |_____|__|__|
|:  |   \\                                      |:  |   |     |_____|
|::.| .  )                                     |::.|:. |
\`--- ---'                                      \`--- ---'
`;

export const mpvRegex = /mpv ([A-Za-z0-9.]+)/;
export const FFmpegRegex = /FFmpeg version: n?(N?[A-Za-z0-9-.]+)/;
export const pgctlRegex = /pg_ctl \(PostgreSQL\) ([A-Za-z0-9.]+)/;

export const adminToken: OldJWTToken = {
	username: 'admin',
	role: 'admin',
	iat: new Date().getTime().toString(),
	passwordLastModifiedAt: new Date().getTime().toString(),
};

export const defaultQuizSettings: QuizGameConfig = {
	EndGame: {
		MaxScore: {
			Enabled: false,
			Score: 10,
		},
		MaxSongs: {
			Enabled: true,
			Songs: 30,
		},
		Duration: {
			Enabled: true,
			Minutes: 60,
		},
	},
	Players: {
		Twitch: false,
		Guests: true,
	},
	TimeSettings: {
		WhenToStartSong: 33,
		GuessingTime: 30,
		QuickGuessingTime: 15,
		AnswerTime: 30,
	},
	Answers: {
		Accepted: {
			title: {
				Enabled: true,
				Points: 2,
			},
			series: {
				Enabled: true,
				Points: 1,
			},
		},
		QuickAnswer: {
			Enabled: true,
			Points: 1,
		},
		SimilarityPercentageNeeded: 70,
	},
	Modifiers: {
		Mute: false,
		Blind: 'blur',
		NoLyrics: false,
	},
	// This is undefined because we allow it to be an empty string too and we need to knwo when to apply the i18next string
	PlayerMessage: undefined,
};

export const systemRepo: Repository = {
	Name: 'System',
	Online: false,
	Enabled: true,
	MaintainerMode: false,
	BaseDir: null,
	Path: { Medias: null },
	System: true,
};
