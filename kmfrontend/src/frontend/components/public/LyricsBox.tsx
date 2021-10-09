import './LyricsBox.scss';

import i18next from 'i18next';
import React, { useEffect, useState } from 'react';

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

function LyricsBox(props: IProps) {
	const [lyrics, setLyrics] = useState<ASSLine[]>([]);
	const [showLyrics, setShowLyrics] = useState<LyricsStatus>(is_touch_device() ? LyricsStatus.hide : LyricsStatus.compact);
	const [timePosition, setTimePosition] = useState(-1);

	const genClasses = (lyric: ASSLine) => {
		if (lyric.start + 0.4 < timePosition && timePosition < lyric.end - 0.5) {
			return 'current';
		}
		if (showLyrics === LyricsStatus.compact) {
			// Hide lyrics that are too far away
			if (lyric.start < timePosition && timePosition < lyric.start + 0.4) {
				return 'incoming';
			} else if (timePosition < lyric.start) {
				return 'greyed';
			} else {
				return 'hidden';
			}
		} else if (showLyrics === LyricsStatus.full) {
			if (lyric.start - 0.15 < timePosition && timePosition < lyric.start + 0.4) {
				return 'incoming';
			}
		}
	};

	const genBlockClasses = (block: ASSEvent, line: ASSLine) => {
		if (block.tags[0]?.k && line.start + block.tags[0].k < timePosition + 0.125) {
			return 'singing';
		}
	};

	const fetchLyrics = async () => {
		if (props.kid) {
			try {
				const lyrics: ASSLine[] = formatLyrics(await commandBackend('getKaraLyrics', { kid: props.kid }));
				setLyrics(lyrics || []);
			} catch (e) {
				// already display
			}
		} else {
			setLyrics([]);
		}
	};

	const refreshTimePosition = (data: Partial<PublicPlayerState>) => {
		if (data.timeposition) {
			setTimePosition(data.timeposition);
		}
	};

	useEffect(() => {
		fetchLyrics();
	}, [props.kid]);

	useEffect(() => {
		getSocket().on('playerStatus', refreshTimePosition);
		fetchLyrics();
		return () => {
			getSocket().off('playerStatus', refreshTimePosition);
		};
	}, []);

	return (
		<div className={`lyrics-box${props.mobile ? ' mobile' : ''}`}>
			<div
				className="toggle"
				onClick={() => setShowLyrics(showLyrics === LyricsStatus.full
					? LyricsStatus.hide
					: showLyrics + 1)
				}
				onKeyPress={() => setShowLyrics(showLyrics === LyricsStatus.full
					? LyricsStatus.hide
					: showLyrics + 1)
				}
				tabIndex={0}
			>
				{LyricsBox.i18nText(showLyrics)}
				<i className={showLyrics > 1 ? 'fa fa-fw fa-arrow-up' : 'fa fa-fw fa-arrow-down'} />
			</div>
			{showLyrics > 0 ? (
				lyrics.length > 0 ? (
					<div className="lyrics">
						{lyrics.map((val, index) => {
							const classes = genClasses(val);
							return (
								<div className={classes} key={index}>
									{val.fullText && classes === 'current'
										? val.fullText.map((block, index) => (
											<span key={index} className={genBlockClasses(block, val)}>
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

LyricsBox.i18nText = (actualMode: LyricsStatus) => {
	// eslint-disable-next-line default-case
	switch (actualMode) {
		case LyricsStatus.hide:
			return i18next.t('PUBLIC_HOMEPAGE.SHOW_LYRICS');
		case LyricsStatus.compact:
			return i18next.t('PUBLIC_HOMEPAGE.SHOW_ALL_LYRICS');
		case LyricsStatus.full:
			return i18next.t('PUBLIC_HOMEPAGE.HIDE_LYRICS');
	}
};

export default LyricsBox;
