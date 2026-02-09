import './LyricsBox.scss';

import i18next from 'i18next';
import { useEffect, useState } from 'react';

import { ASSEvent, ASSLine } from '../../../../../src/lib/types/ass';
import { PublicPlayerState } from '../../../../../src/types/state';
import { formatLyrics } from '../../../utils/kara';
import { commandBackend, getSocket } from '../../../utils/socket';
import { is_touch_device } from '../../../utils/tools';
import { WS_CMD } from '../../../utils/ws';

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
	const [showLyrics, setShowLyrics] = useState<LyricsStatus>(
		is_touch_device() ? LyricsStatus.hide : LyricsStatus.compact
	);
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
		if (typeof block.tags[0]?.k === 'number' && line.start + block.tags[0].k < timePosition + 0.125) {
			return 'singing';
		}
	};

	const fetchLyrics = async () => {
		if (props.kid) {
			try {
				const lyrics: ASSLine[] = formatLyrics(
					await commandBackend(WS_CMD.GET_KARA_LYRICS, { kid: props.kid })
				);
				setLyrics(lyrics || []);
			} catch (_) {
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
		return () => {
			getSocket().off('playerStatus', refreshTimePosition);
		};
	}, []);

	return (
		<div className={`lyrics-box${props.mobile ? ' mobile' : ''}`}>
			<div
				className="toggle"
				onClick={() => setShowLyrics(showLyrics === LyricsStatus.full ? LyricsStatus.hide : showLyrics + 1)}
				onKeyDown={() => setShowLyrics(showLyrics === LyricsStatus.full ? LyricsStatus.hide : showLyrics + 1)}
				tabIndex={0}
			>
				{LyricsBox.i18nText(showLyrics)}
				<i className={showLyrics > 1 ? 'fa fa-arrow-up' : 'fa fa-arrow-down'} />
			</div>
			{showLyrics > 0 ? (
				lyrics.length > 0 ? (
					<div className="lyrics">
						{lyrics.map((line, index) => {
							const parsedSyllables =
								line.fullText?.map(event =>
									event.text.replace('｜', '|').replace('|!', '|').replace('|<', '|')
								) ?? [];
							const rubifiedArray: { text: string; rubys: string[]; cumulativeNumberOfSyl: number }[] =
								[];
							parsedSyllables.forEach(syl => {
								if (syl.match(/#\|.*/g)) {
									const lastElement = rubifiedArray.pop();
									if (lastElement) {
										lastElement.rubys.push(syl.substring(2));
										rubifiedArray.push(lastElement);
									}
								} else if (syl.match(/.*\|.*/g)) {
									rubifiedArray.push({
										text: syl.split('|')[0],
										rubys: [syl.split('|')[1]],
										cumulativeNumberOfSyl: 0,
									});
								} else {
									rubifiedArray.push({
										text: syl,
										rubys: [],
										cumulativeNumberOfSyl: 0,
									});
								}
							});
							rubifiedArray.forEach((val, index) => {
								if (index == 0) {
									val.cumulativeNumberOfSyl = 0;
								} else {
									const previousVal = rubifiedArray[index - 1];
									val.cumulativeNumberOfSyl =
										previousVal.cumulativeNumberOfSyl + Math.max(previousVal.rubys.length, 1);
								}
							});
							const classes = genClasses(line);
							return (
								<div className={classes} key={index}>
									{line.fullText && classes === 'current'
										? rubifiedArray.map((val, index) =>
												val.rubys.length ? (
													<ruby key={index}>
														{val.text}
														<rp>(</rp>
														<rt>
															{val.rubys.map((syl, sylIndex) => (
																<span
																	key={sylIndex + val.cumulativeNumberOfSyl}
																	className={genBlockClasses(
																		line.fullText[
																			val.cumulativeNumberOfSyl + sylIndex
																		],
																		line
																	)}
																>
																	{syl}
																</span>
															))}
														</rt>
														<rp>)</rp>
													</ruby>
												) : (
													<span
														key={index}
														className={genBlockClasses(
															line.fullText[val.cumulativeNumberOfSyl],
															line
														)}
													>
														{val.text}
													</span>
												)
											)
										: rubifiedArray.map((val, index) =>
												val.rubys.length ? (
													<ruby key={index}>
														{val.text}
														<rp>(</rp>
														<rt>{val.rubys.flat()}</rt>
														<rp>)</rp>
													</ruby>
												) : (
													val.text
												)
											)}
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
