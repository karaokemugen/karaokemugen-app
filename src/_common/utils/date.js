
export function date() {
	const d = new Date();
	let day = d.getDate();
	let month = d.getMonth() + 1;
	const year = d.getFullYear();
	if (day < 10) day = '0'+day;
	if (month < 10) month = '0'+month;
	return `${day}-${month}-${year}`;
}

export function timeToSeconds(time) {	
	const a = time.split(':'); // split it at the colons
	a[2] = Math.floor(a[2]); // Seconds can have miliseconds
	// minutes are worth 60 seconds. Hours are worth 60 minutes.
	return (+a[0]) * 60 * 60 + (+a[1]) * 60 + (+a[2]);
}

export function duration(duration) {
	
	// calculate (and subtract) whole days
	const days = Math.floor(duration / 86400);

	duration -= days * 86400;

	// calculate (and subtract) whole hours
	const hours = Math.floor(duration / 3600) % 24;
	duration -= hours * 3600;

	// calculate (and subtract) whole minutes
	const minutes = Math.floor(duration / 60) % 60;
	duration -= minutes * 60;

	// what's left is seconds
	const seconds = duration % 60;  // in theory the modulus is not required
	let returnString = '';
	if (days !== 0) returnString = returnString + `${days} ${__('DAY')} `;
	if (hours !== 0) returnString = returnString + `${hours} ${__('HOUR')} `;
	if (minutes !== 0) returnString = returnString + `${minutes} ${__('MINUTE')} `;
	if (seconds !== 0) returnString = returnString + `${seconds} ${__('SECOND')} `;
	return returnString;
}
