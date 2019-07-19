import {resolve, join} from 'path';
import {asyncWriteFile, asyncReadDir, asyncReadFile, sanitizeFile} from '../../src/lib/utils/files';
import uuidV4 from 'uuid/V4';
import {KaraFileV4} from '../../src/lib/types/kara';
import langs from 'langs';
import {getSupportedLangs, getLanguage} from 'iso-countries-languages';
const kpath = '../times/karaokes';
const tpath = '../times/tags';
const source = '../times/karaokes'

const tagCategorized = {
	families: ['ANIME', 'REAL', 'VIDEOGAME'],
	platforms: ['3DS', 'DREAMCAST', 'DS', 'GAMECUBE', 'N64', 'PC', 'PSX', 'PS2', 'PS3', 'PS4', 'PSV', 'PSP', 'SATURN', 'SEGACD', 'SWITCH', 'WII', 'WIIU', 'XBOX360', 'XBOXONE'],
	genres: ['IDOL', 'MAGICALGIRL', 'MECHA', 'SHOUJO', 'SHOUNEN', 'YAOI', 'YURI'],
	origins: ['MOBAGE', 'DRAMA', 'MOVIE', 'VN', 'ONA', 'OVA', 'TOKU', 'TVSHOW', 'VOCALOID', 'SPECIAL'],
	misc: ['SOUNDONLY', 'DUO', 'GROUP', 'CREDITLESS', 'HARDMODE', 'HUMOR', 'LONG', 'PARODY', 'R18', 'COVER', 'FANDUB', 'REMIX', 'SPOIL'],
}

interface Tag {
	filename?: string
	header: {
		description: string,
		version: number
	}
	tag: {
		aliases?: string[],
		i18n?: any,
		name: string
		types: string[],
		short?: string
		tid: string
	}
}

let AllTags: Tag[] = [];

async function readTags() {
	const dir = await asyncReadDir(tpath);
	for (const file of dir) {
		const data = await asyncReadFile(resolve(tpath, file), 'utf-8');
		const tag = JSON.parse(data);
		tag.filename = file;
		AllTags.push(tag);
	}
}

function setLangs() {
	// Initialize our tags with languages
	const header = {
		description: 'Karaoke Mugen Tag File',
		version: 1
	};
	for (const lang of langs.all()) {
		const i18n = {};
		const name = lang['2B'];
		const tid = uuidV4();
		const languages = getSupportedLangs();
		for (const language of languages) {
			const langdata = langs.where('1', language);
			try {
				i18n[langdata['2B']] = getLanguage(language, lang['1']);
			} catch(err) {
				// Do nothing;
			}
		}
		AllTags.push({
			filename: resolve(tpath, `${name}.${tid.substring(0, 8)}.tag.json`),
			header: header,
			tag: {
				i18n: i18n,
				name: name,
				tid: tid,
				types: ['langs']
			}
		});
	}
	// Create mul, und and zxx
	let tid = uuidV4();
	AllTags.push({
		filename: resolve(tpath, `und.${tid.substring(0, 8)}.tag.json`),
		header: header,
		tag: {
			i18n: {
				fre: 'Langue inconnue',
				eng: 'Undefined language'
			},
			name: 'und',
			tid: tid,
			types: ['langs']
		}
	});
	tid = uuidV4();
	AllTags.push({
		filename: resolve(tpath, `mul.${tid.substring(0, 8)}.tag.json`),
		header: header,
		tag: {
			i18n: {
				fre: 'Multi-langues',
				eng: 'Multiple languages'
			},
			name: 'mul',
			tid: tid,
			types: ['langs']
		}
	});
	tid = uuidV4();
	AllTags.push({
		filename: resolve(tpath, `zxx.${tid.substring(0, 8)}.tag.json`),
		header: header,
		tag: {
			i18n: {
				fre: 'Pas de contenu linguistique',
				eng: 'No linguistic content'
			},
			name: 'zxx',
			tid: tid,
			types: ['langs']
		}
	});
}

function getOrAddTID(tagtype: string, tag: string, short?: string): string {
	// Find a tag with the same name
	// If it's a compatible type, add type to the tag, return the Tag
	// If it's a non-compatible type, make a new tag
	const slug = sanitizeFile(tag);
	let tid = uuidV4();
	const tagfile = resolve(tpath, `${slug}.${tid.substring(0, 8)}.tag.json`);
	const tagdata: Tag = {
		filename: tagfile,
		header: {
			description: 'Karaoke Mugen Tag File',
			version: 1
		},
		tag: {
			i18n: {
				eng: tag
			},
			name: tag,
			tid: tid,
			types: [tagtype]
		}
	}
	if (short) tagdata.tag.short = short;
	const i = AllTags.findIndex((t, index) => {
		if (tag === t.tag.name) {
			if (t.tag.types.includes(tagtype)) {
				return true;
			}
			if ((tagtype === 'singers' || tagtype === 'songwriters' || tagtype === 'creators') && (t.tag.types.includes('singers') || t.tag.types.includes('songwriters') || t.tag.types.includes('creators'))) {
				AllTags[index].tag.types.push(tagtype);
				return true;
			}
		}
	})
	if (i > -1) {
		tid = AllTags[i].tag.tid;
		tagdata.filename = resolve(tpath, `${slug}.${tid.substring(0, 7)}.tag.json`);
	} else {
		AllTags.push(tagdata);
	}
	return tid;
}

async function parseTags(data: KaraFileV4, tagtype: string) {
	const tags = data.data[tagtype];
	for (const tag of tags) {
		const tid = getOrAddTID(tagtype, tag);
		for (const i in tags) {
			if (tags[i] === tag) tags[i] = tid;
		}
		data.data[tagtype] = tags;
	}
}

async function parseMiscTags(data: any) {
	const tags = data.data.tags;
	for (let tag of tags) {
		tag = tag.replace('TAG_','')
		let slug = sanitizeFile(tag);
		let tagtype: string;
		if (tagCategorized.families.includes(slug)) tagtype = 'families';
		if (tagCategorized.platforms.includes(slug)) tagtype = 'platforms';
		if (tagCategorized.genres.includes(slug)) tagtype = 'genres';
		if (tagCategorized.misc.includes(slug)) tagtype = 'misc';
		if (tagCategorized.origins.includes(slug)) tagtype = 'origins';
		if (!tagtype) throw 'Unknown tag '+tag;
		let short = slug;
		if (slug === 'ANIME') {
			slug = 'Anime';
			short = 'ANI'
		}
		if (slug === 'CREDITLESS') {
			slug = 'Creditless';
			short = 'CRE';
		}
		if (slug === 'COVER') { slug = 'Cover'; short = 'COV'; }
		if (slug === 'DUB') {slug = 'Fandub' ; short = 'DUB'; }
		if (slug === 'DRAMA') {slug = 'Drama' ; short = 'DRM'; }
		if (slug === 'DUO') {slug = 'Duet'; short = 'DUO'; }
		if (slug === 'DREAMCAST') {slug = 'Dreamcast'; ; short = 'DC'; }
		if (slug === 'GAMECUBE') {slug = 'Gamecube'; short = 'GC';}
		if (slug === 'HUMOR') {slug = 'Humor'; short = 'HUM'}
		if (slug === 'IDOL') {slug = 'Idol'; short = 'IDL'}
		if (slug === 'HARDMODE') {slug = 'Hard Mode'; short = 'HRD'}
		if (slug === 'LONG') {slug = 'Long' ; short = 'LON';}
		if (slug === 'MAGICALGIRL') {slug = 'Magical Girl'; short = 'MAG'}
		if (slug === 'MECHA') {slug = 'Mecha'; short = 'MCH';}
		if (slug === 'MOBAGE') {slug = 'Mobage'; short = 'MOB';}
		if (slug === 'MOVIE') {slug = 'Movie'; short = 'MOV';}
		if (slug === 'PARODY') {slug = 'Parody'; short = 'PAR';}
		if (slug === 'PS2') {slug = 'Playstation 2'; short = 'PS2';}
		if (slug === 'PSX') {slug = 'Playstation'; short = 'PSX';}
		if (slug === 'PS3') {slug = 'Playstation 3'; short = 'PS3';}
		if (slug === 'PS4') {slug = 'Playstation 4'; short = 'PS4';}
		if (slug === 'PSP') {slug = 'Playstation Portable'; short = 'PSP';}
		if (slug === 'PSV') {slug = 'Playstation Vita'; short = 'PSV';}
		if (slug === 'REAL') {slug = 'Real'; short = 'REA';}
		if (slug === 'REMIX') {slug = 'Remix'; short = 'RMX';}
		if (slug === 'SATURN') {slug = 'Saturn'; short = 'SAT';}
		if (slug === 'SEGACD') {slug = 'Sega CD'; short = 'SCD';}
		if (slug === 'SHOUJO') {slug = 'Shoujo'; short = 'SHJ';}
		if (slug === 'SHOUNEN') {slug = 'Shounen'; short = 'SHN';}
		if (slug === 'SOUNDONLY') {slug = 'Audio Only'; short = 'MP3';}
		if (slug === 'SPECIAL') {slug = 'Special'; short = 'SPE';}
		if (slug === 'SPOIL') {slug = 'Spoiler'; short = 'SPL';}
		if (slug === 'SWITCH') {slug = 'Switch'; short = 'SWI';}
		if (slug === 'TOKU') {slug = 'Tokusatsu'; short = 'TKU';}
		if (slug === 'TVSHOW') {slug = 'TV Show'; short = 'TV';}
		if (slug === 'VIDEOGAME') {slug = 'Video Game'; short = 'VG';}
		if (slug === 'VN') slug = 'Visual Novel';
		if (slug === 'VOCALOID') {slug = 'Vocaloid'; short = 'VOC';}
		if (slug === 'WII') slug = 'Wii';
		if (slug === 'WIIU') { slug = 'Wii U'; short = 'WIU'}
		if (slug === 'YAOI') { slug = 'Boys\' love'; short = 'BL'}
		if (slug === 'YURI') { slug = 'Shoujo Ai'; short = 'SA'}
		if (slug === 'XBOX360') { slug = 'XBOX 360'; short = '360'}
		if (slug === 'XBOXONE') { slug = 'XBOX ONE'; short = 'XBO'}
		if (slug === 'GROUP') { slug = 'Group'; short = 'GRP' }
		const tid = getOrAddTID(tagtype, slug, short);
		if (!data.data[tagtype]) data.data[tagtype] = [];
		data.data[tagtype].push(tid);
	}
}

async function main() {
	await readTags();
	if (AllTags.length === 0) setLangs();
	const dir = await asyncReadDir(source);
	for (const file of dir) {
		console.log(file);
		let data = await asyncReadFile(join(source, file), 'utf8');
		data = JSON.parse(data);
		if (data.data.authors) await parseTags(data, 'authors');
		if (data.data.creators) await parseTags(data, 'creators');
		if (data.data.groups) await parseTags(data, 'groups');
		if (data.data.singers) await parseTags(data, 'singers');
		if (data.data.songwriters) await parseTags(data, 'songwriters');
		if (data.data.langs) await parseTags(data, 'langs');
		data.data.songtype = getOrAddTID('songtypes', data.data.songtype);
		if (data.data.tags) await parseMiscTags(data);
		const langs = data.data.langs;
		const authors = data.data.authors;
		const creators = data.data.creators;
		const groups = data.data.groups;
		const singers = data.data.singers;
		const songwriters = data.data.songwriters;
		const platforms = data.data.platforms;
		const genres = data.data.genres;
		const families = data.data.families;
		const misc = data.data.misc;
		const origins = data.data.origins;
		const songtypes = [data.data.songtype];

		const tags = {
			authors: authors,
			creators: creators,
			families: families,
			genres: genres,
			groups: groups,
			langs: langs,
			misc: misc,
			origins: origins,
			platforms: platforms,
			singers: singers,
			songtypes: songtypes,
			songwriters: songwriters
		}
		delete data.data.tags;
		delete data.data.langs;
		delete data.data.authors;
		delete data.data.creators;
		delete data.data.groups;
		delete data.data.singers;
		delete data.data.songwriters;
		delete data.data.families;
		delete data.data.genres;
		delete data.data.origins;
		delete data.data.misc;
		delete data.data.platforms;
		delete data.data.songtype;
		data.data.tags = tags;
		const title = data.data.title;
		delete data.data.title;
		data.data.title = title;
		const year = data.data.year;
		delete data.data.year;
		data.data.year = year;
		for (const type of Object.keys(data.data.tags)) {
			if (data.data.tags[type] && data.data.tags[type].length === 0) delete data.data.tags[type];
		}
		await asyncWriteFile(resolve(kpath, file), JSON.stringify(data, null, 2), 'utf-8');
	}
	//Write all tags
	for (const tag of AllTags) {
		const filename = tag.filename;
		delete tag.filename;
		await asyncWriteFile(resolve(tpath, filename), JSON.stringify(tag, null, 2), 'utf-8');
	}
}

main().catch(err => console.log(err));

