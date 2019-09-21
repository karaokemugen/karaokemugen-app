
import EventEmmiter from 'events';
let filterValue1 = '';
let filterValue2 = '';
let posPlaying = undefined;
let timer;

class Store extends EventEmmiter {

	emitChange(event, data) {
		this.emit(event, data);
	}

	addChangeListener(event, callback) {
		this.on(event, callback);
	}

	removeChangeListener(event, callback) {
		this.removeListener(event, callback);
	}

	setFilterValue(value, side, idPlaylist) {
		clearTimeout(timer);
		timer = setTimeout(() => {
			this.emitChange('playlistContentsUpdated', idPlaylist);
		}, 1000);
		if (side === 1) {
			filterValue1 = value;
		} else {
			filterValue2 = value;
		}
	}

	getFilterValue(side) {
		if (side === 1) {
			return filterValue1;
		} else {
			return filterValue2;
		}
	}

	getPosPlaying() {
		return posPlaying;
	}

	setPosPlaying(pos) {
		posPlaying = pos;
	}
}

const store = new Store();

export default store;