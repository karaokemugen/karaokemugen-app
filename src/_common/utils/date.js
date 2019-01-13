
export function date() {
	const d = new Date();
	let day = d.getDate();
	let month = d.getMonth() + 1;
	const year = d.getFullYear();
	if (day < 10) day = '0'+day;
	if (month < 10) month = '0'+month;
	return `${day}-${month}-${year}`;
}

export function time() {
	const date = new Date();
	let hour = date.getHours();
	hour = (hour < 10 ? '0' : '') + hour;
	let min  = date.getMinutes();
	min = (min < 10 ? '0' : '') + min;
	let sec  = date.getSeconds();
	sec = (sec < 10 ? '0' : '') + sec;
	return hour + ':' + min + ':' + sec;
}

export function timeToSeconds(time) {
	if(typeof time !== 'string'){
		throw `The parameter ${time} is supposed to be a string !`;
	}

	if(!time.match(/\d+:\d{1,2}:\d+\.?\d*/)){
		throw `The parameter ${time} is in a wrong format '00:00:00.000' .`;
	}

	const a = time.split(':'); // split it at the colons

	if(+a[1] >= 60 || +a[2] >= 60){
		throw `The parameter ${time} is impossible, please follow the format "Hours:Minutes:Seconds.Milliseconds`;
	}

	a[2] = Math.floor(a[2]); // Seconds can have miliseconds
	// minutes are worth 60 seconds. Hours are worth 60 minutes.

	return (+a[0]) * 60 * 60 + (+a[1]) * 60 + (+a[2]);
}

//FormatDateString From Duration in Seconds
export function duration(duration) {
	if(typeof duration !== 'number'){
		throw `The parameter ${duration} is supposed to be a number !`;
	}

	if(Math.floor(duration) !== duration || duration <= 0){
		throw `The parameter ${duration} is supposed to be "entier" and be superior to 0`;
	}

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
