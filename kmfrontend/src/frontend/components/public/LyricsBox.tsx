import './LyricsBox.scss';

import i18next from 'i18next';
import React, { Component } from 'react';

import { ASSEvent, ASSLine } from '../../../../../src/lib/types/ass';
import { PublicPlayerState } from '../../../../../src/types/state';
import { formatLyrics } from '../../../utils/kara';
import { commandBackend, getSocket } from '../../../utils/socket';
import { is_touch_device } from '../../../utils/tools';

enum LyricsStatus {
	hide,
	compact,
	full,
}

interface IProps {
	kid?: string;
	mobile?: boolean;
}

interface IState {
	lyrics: ASSLine[];
	showLyrics: LyricsStatus;
	timePosition: number;
}

class LyricsBox extends Component<IProps, IState> {
	constructor(props) {
		super(props);
		this.state = {
			lyrics: [],
			showLyrics: is_touch_device() ? LyricsStatus.hide : LyricsStatus.compact,
			timePosition: -1,
		};
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
		if (lyric.start + 0.4 < this.state.timePosition && this.state.timePosition < lyric.end - 0.5) {
			return 'current';
		}
		if (this.state.showLyrics === LyricsStatus.compact) {
			// Hide lyrics that are too far away
			if (lyric.start < this.state.timePosition && this.state.timePosition < lyric.start + 0.4) {
				return 'incoming';
			} else if (this.state.timePosition < lyric.start) {
				return 'greyed';
			} else {
				return 'hidden';
			}
		} else if (this.state.showLyrics === LyricsStatus.full) {
			if (lyric.start - 0.15 < this.state.timePosition && this.state.timePosition < lyric.start + 0.4) {
				return 'incoming';
			}
		}
	}

	protected genBlockClasses(block: ASSEvent, line: ASSLine) {
		if (block.tags[0]?.k && line.start + block.tags[0].k < this.state.timePosition + 0.125) {
			return 'singing';
		}
	}

	fetchLyrics = async () => {
		if (this.props.kid) {
			try {
				const lyrics: ASSLine[] = formatLyrics(await commandBackend('getKaraLyrics', { kid: this.props.kid }));
				this.setState({ lyrics: lyrics || [] });
			} catch (e) {
				// already display
			}
		} else {
			this.setState({ lyrics: [] });
		}
	};

	refreshTimePosition = (data: Partial<PublicPlayerState>) => {
		if (data.timeposition) {
			this.setState({ timePosition: data.timeposition });
		}
	};

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
		return (
			<div className={`lyrics-box${this.props.mobile ? ' mobile' : ''}`}>
				<div
					className="toggle"
					onClick={() =>
						this.setState({
							showLyrics:
								this.state.showLyrics === LyricsStatus.full
									? LyricsStatus.hide
									: this.state.showLyrics + 1,
						})
					}
					onKeyPress={() =>
						this.setState({
							showLyrics:
								this.state.showLyrics === LyricsStatus.full
									? LyricsStatus.hide
									: this.state.showLyrics + 1,
						})
					}
					tabIndex={0}
				>
					{LyricsBox.i18nText(this.state.showLyrics)}
					<i className={this.state.showLyrics > 1 ? 'fa fa-fw fa-arrow-up' : 'fa fa-fw fa-arrow-down'} />
				</div>
				{this.state.showLyrics > 0 ? (
					this.state.lyrics.length > 0 ? (
						<div className="lyrics">
							{this.state.lyrics.map((val, index) => {
								const classes = this.genClasses(val);
								return (
									<div className={classes} key={index}>
										{val.fullText && classes === 'current'
											? val.fullText.map((block, index) => (
												<span key={index} className={this.genBlockClasses(block, val)}>
													{block.text}
												</span>
											  ))
											: val.text.replace(/\\N/g, ' ')}
									</div>
								);
							})}
						</div>
					) : (
						<div className="lyrics">
							<div>{i18next.t('PUBLIC_HOMEPAGE.LYRICS_EXPL.LINES')}</div>
							<div className="current">{i18next.t('PUBLIC_HOMEPAGE.LYRICS_EXPL.CURRENT')}</div>
						</div>
					)
				) : null}
			</div>
		);
	}
}

export default LyricsBox;
