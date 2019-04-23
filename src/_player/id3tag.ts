import id3 from 'node-id3';

interface ID3 {
	image?: string,
}

export function readID3(fileBuffer: string, options?: object): Promise<ID3> {
	return new Promise(
		(resolve, reject) =>
			id3.read(
				fileBuffer,
				options,
				(err: Error, tags: object) => {
					if (err) {
						reject(err);
					} else {
						resolve(tags);
					}
				}
			)
	);
}


export async function getID3(file: string): Promise<ID3> {
	try {
		return await readID3(file);
	} catch (err) {
		throw err;
	}
}
