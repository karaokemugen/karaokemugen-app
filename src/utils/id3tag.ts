import id3 from 'node-id3';

interface ID3 {
	image?: string,
}

export function readID3(fileBuffer: string): Promise<ID3> {
	return new Promise(
		(resolve, reject) =>
			id3.read(
				fileBuffer,
				(err: Error, tags: any) => {
					if (err) {
						reject(err);
					} else {
						resolve(tags);
					}
				}
			)
	);
}


export function getID3(file: string): Promise<ID3> {
	return readID3(file);
}
