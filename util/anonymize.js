const fs = require('fs');
const {v4} = require('uuid');
const data = fs.readFileSync('../users_favorites.csv', 'utf-8');
const newData = [];
const userMap = new Map();


for (const line of data.split('\n')) {
	if (!line) continue;
	const user = line.split(',')[1].replace(/"/g,'');
	let userID = '';
	if (!userMap.has(user)) {
		userID = v4();
		userMap.set(user, userID);
	} else {
		userID = userMap.get(user);
	}
	newData.push(`${line.split(',')[0]},"${userID}"`);
}

fs.writeFileSync('../users_favorites_anonymous.csv', newData.join('\n'), 'utf-8');
