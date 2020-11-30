import './LyricsBox.scss';

import i18next from 'i18next';
import React, { Component } from 'react';

import {ASSLine} from '../../../../../src/lib/types/ass';
import {PublicPlayerState} from '../../../../../src/types/state';
import {commandBackend, getSocket} from '../../../utils/socket';
import {is_touch_device} from '../../../utils/tools';

enum LyricsStatus {
	hide,
	compact,
	full
}

interface IProps {
	kid?: string
	mobile?: boolean
}

interface IState {
	lyrics: ASSLine[],
	showLyrics: LyricsStatus,
	timePosition: number
}

class LyricsBox extends Component<IProps, IState> {
	constructor(props) {
		super(props);
		this.state = {
			lyrics: [],
			showLyrics: is_touch_device() ? LyricsStatus.hide:LyricsStatus.compact,
			timePosition: -1
		};
	}

	static formatLyrics(lyrics: ASSLine[]) {
		// Merge lines with the same text in it to mitigate karaokes with many effects
		const map = new Map<string, ASSLine[][]>();
		for (const lyric of lyrics) {
			if (map.has(lyric.text)) {
				const val = map.get(lyric.text);
				const lastLines = val[val.length-1];
				const lastLine = lastLines[lastLines.length-1];
				if (lyric.start - lastLine.end < 0.1) {
					lastLines.push(lyric);
					val[val.length-1] = lastLines;
				} else {
					val.push([lyric]);
				}
				map.set(lyric.text, val);
			} else {
				map.set(lyric.text, [[lyric]]);
			}
		}
		console.log(map);
		// Unwrap and sort
		const fixedLyrics: ASSLine[] = [];
		for (const [lyric, lyricGroups] of map.entries()) {
			for (const lyricGroup of lyricGroups) {
				fixedLyrics.push({ start: lyricGroup[0].start, text: lyric, end: lyricGroup[lyricGroup.length-1].end });
			}
		}
		fixedLyrics.sort((el1, el2) => {
			return el1.start - el2.start;
		});
		return fixedLyrics;
	}

	static i18nText(actualMode: LyricsStatus) {
		// eslint-disable-next-line default-case
		switch (actualMode) {
		case LyricsStatus.hide:
			return i18next.t('PUBLIC_HOMEPAGE.SHOW_LYRICS');
		case LyricsStatus.compact:
			return i18next.t('PUBLIC_HOMEPAGE.SHOW_ALL_LYRICS');
		case LyricsStatus.full:
			return i18next.t('PUBLIC_HOMEPAGE.HIDE_LYRICS');
		}
	}

	protected genClasses(lyric: ASSLine) {
		if ((lyric.start+0.4 < this.state.timePosition) && (this.state.timePosition < lyric.end-0.5)) {
			return 'current';
		}
		if (this.state.showLyrics === LyricsStatus.compact) {
			// Hide lyrics that are too far away
			if (((lyric.start) < this.state.timePosition) && (this.state.timePosition < lyric.start+0.4)) {
				return 'incoming';
			} else if (
				(this.state.timePosition < lyric.start)
			) {
				return 'greyed';
			} else {
				return 'hidden';
			}
		} else if (this.state.showLyrics === LyricsStatus.full) {
			if (((lyric.start-0.15) < this.state.timePosition) && (this.state.timePosition < lyric.start+0.4)) {
				return 'incoming';
			}
		}
	}

	fetchLyrics = async () => {
		if (this.props.kid) {
			let lyrics: ASSLine[] = await commandBackend('getKaraLyrics', {kid: this.props.kid});
			if (lyrics?.length > 100) {
				lyrics = LyricsBox.formatLyrics(lyrics);
			}
			this.setState({ lyrics: lyrics || [] });
		} else {
			this.setState({ lyrics: [] });
		}
	}

	refreshTimePosition = (data: Partial<PublicPlayerState>) => {
		if (data.timeposition) {
			this.setState({ timePosition: data.timeposition });
		}
	}

	componentDidMount() {
		getSocket().on('playerStatus', this.refreshTimePosition);
		this.fetchLyrics();
	}

	componentWillUnmount() {
		getSocket().off('playerStatus', this.refreshTimePosition);
	}

	componentDidUpdate(prevProps: Readonly<IProps>) {
		if (prevProps.kid !== this.props.kid) {
			this.fetchLyrics();
		}
	}

	render() {
		return (<div className={`lyrics-box${this.props.mobile ? ' mobile':''}`}>
			<div className="toggle" onClick={() => this.setState(
				{
					showLyrics: this.state.showLyrics === LyricsStatus.full ? LyricsStatus.hide:this.state.showLyrics+1
				})} tabIndex={0}>
				{LyricsBox.i18nText(this.state.showLyrics)}
				<i className={this.state.showLyrics > 1 ? 'fa fa-fw fa-arrow-up' : 'fa fa-fw fa-arrow-down'}/></div>
			{this.state.showLyrics > 0 ?
				<div className="lyrics">
					{
						this.state.lyrics.map((val, index) => {
							return <div
								className={this.genClasses(val)}
								key={index}
							>{val.text.replace(/\\N/g, ' ')}</div>;
						})
					}
				</div> : null}
		</div>);
	}
}

export default LyricsBox;
