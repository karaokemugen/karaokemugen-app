import id3 from 'node-id3';

export function readID3(fileBuffer, options) {
	return new Promise(
		(resolve, reject) =>
			id3.read(
				fileBuffer,
				options,
				(err, tags) => {
					if (err) {
						reject(err);
					} else {
						resolve(tags);
					}
				}
			)
	);
}


export async function getID3(file) {
	try {
		return await readID3(file);
	} catch (err) {
		throw err;
	}
}
