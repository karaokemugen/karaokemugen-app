export interface UploadedFile {
	fieldname: string;
	originalname: string;
	encoding: string;
	mimetype: string;
	destination: string;
	filename: string;
	path: string;
	size: number;
}

export type KMFileType =
	| 'Karaoke Mugen Karaoke Bundle File'
	| 'Karaoke Mugen Karaoke Data File'
	| 'Karaoke Mugen Favorites List File'
	| 'Karaoke Mugen Playlist File';
