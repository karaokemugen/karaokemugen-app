import i18next from 'i18next';
import { useContext, useEffect, useState } from 'react';

import GlobalContext from '../../../store/context';
import { isElectron, sendIPC } from '../../../utils/electron';
import { commandBackend } from '../../../utils/socket';
import { displayMessage, dotify, expand } from '../../../utils/tools';
import Switch from '../generic/Switch';
import RemoteStatus from './RemoteStatus';
import { sanitizeSettingsSearchValue } from './Options';

interface IProps {
	onChange: (e: any) => void;
	filterValue: string;
}

function KaraokeOptions(props: IProps) {
	const context = useContext(GlobalContext);
	const [config, setConfig] = useState(dotify(context.globalState.settings.data.config));
	const [mysterySongLabel, setMysterySongLabel] = useState('');
	const { filterValue } = props;

	const addMysterySongLabel = () => {
		if (mysterySongLabel) {
			const mysterySongsLabels = config['Playlist.MysterySongs.Labels'];
			mysterySongsLabels.push(mysterySongLabel);
			config['Playlist.MysterySongs.Labels'] = mysterySongsLabels;
			saveMysterySongsLabels(mysterySongsLabels);
			setMysterySongLabel('');
		}
	};

	const deleteMysterySongLabel = (value: string) => {
		config['Playlist.MysterySongs.Labels'].splice(config['Playlist.MysterySongs.Labels'].indexOf(value), 1, null);
		saveMysterySongsLabels(config['Playlist.MysterySongs.Labels']);
	};

	const saveMysterySongsLabels = (labels: string[]) => {
		const data = expand('Playlist.MysterySongs.Labels', labels);
		commandBackend('updateSettings', { setting: data }).catch(() => {});
	};

	const parseTwitch = () => {
		const input = document.getElementById('Karaoke.StreamerMode.Twitch.OAuth') as unknown as HTMLInputElement;
		let value = input.value;
		if (value.startsWith('oauth:')) {
			// remove oauth: as it's added by the chat library
			value = value.slice(6);
		}
		fetch('https://id.twitch.tv/oauth2/validate', {
			headers: { Authorization: `Bearer ${value}` },
		})
			.then(
				res => res.json(),
				() => {
					displayMessage('error', 'jsp');
				}
			)
			.then(data => {
				if (data.login) {
					commandBackend('updateSettings', {
						setting: {
							Karaoke: {
								StreamerMode: {
									Twitch: {
										OAuth: value,
										Channel: data.login,
									},
								},
							},
						},
					}).then(() => {
						displayMessage(
							'success',
							i18next.t('SETTINGS.KARAOKE.STREAM_TWITCH_OAUTH_SUCCESS', { login: data.login })
						);
					});
				} else {
					displayMessage('error', i18next.t('SETTINGS.KARAOKE.STREAM_TWITCH_OAUTH_ERROR'));
				}
			});
	};

	const onChange = (e: any) => {
		let value =
			e.target.type === 'checkbox'
				? e.target.checked
				: !isNaN(Number(e.target.value))
					? Number(e.target.value)
					: e.target.value;
		if (value === 'true') {
			value = true;
		} else if (value === 'false') {
			value = false;
		}
		if (e.target.type === 'number' && !value) value = e.target.placeHolder || e.target.min || 0;
		config[e.target.id] = value;
		if (e.target.type !== 'number' || !isNaN(Number(e.target.value))) props.onChange(e);
	};

	const foldOptions = e => {
		const div = (e.target as HTMLElement).closest('.settings-line');
		div.classList.toggle('fold');
	};

	useEffect(() => {
		setConfig(dotify(context.globalState.settings.data.config));
	}, [context.globalState.settings.data.config]);

	return config ? (
		<>
			<div id="nav-karaokeAllMode">
				{filterValue ? null : (
					<div
						tabIndex={0}
						onClick={foldOptions}
						onKeyUp={foldOptions}
						className="settings-line subCategoryGroupPanel fold"
					>
						<span className="title">
							<i className="fas fa-fw fa-chevron-right" />
							<i className="fas fa-fw fa-chevron-down" />
							{i18next.t('SETTINGS.KARAOKE.QUOTA_SETTINGS')}
						</span>
						<span className="tooltip">{i18next.t('SETTINGS.KARAOKE.QUOTA_SETTINGS_TOOLTIP')}</span>
					</div>
				)}
				<div className="settings-group">
					{filterValue === undefined ||
						(sanitizeSettingsSearchValue(i18next.t('SETTINGS.KARAOKE.QUOTA_TYPE')).includes(
							filterValue
						) && (
							<div className="settings-line">
								<label htmlFor="Karaoke.Quota.Type">
									<span className="title">{i18next.t('SETTINGS.KARAOKE.QUOTA_TYPE')}</span>
									<br />
									<span className="tooltip">{i18next.t('SETTINGS.KARAOKE.QUOTA_TYPE_TOOLTIP')}</span>
								</label>
								<div>
									<select
										id="Karaoke.Quota.Type"
										onChange={onChange}
										value={config['Karaoke.Quota.Type']}
									>
										<option value="0"> {i18next.t('SETTINGS.KARAOKE.QUOTA_TYPE_ZERO')} </option>
										<option value="1"> {i18next.t('SETTINGS.KARAOKE.QUOTA_TYPE_ONE')} </option>
										<option value="2"> {i18next.t('SETTINGS.KARAOKE.QUOTA_TYPE_TWO')} </option>
									</select>
								</div>
							</div>
						))}

					{config['Karaoke.Quota.Type'] === 2
						? filterValue === undefined ||
							(sanitizeSettingsSearchValue(i18next.t('SETTINGS.KARAOKE.TIME_BY_USER')).includes(
								filterValue
							) && (
								<div className="settings-line">
									<label htmlFor="Karaoke.Quota.Time">
										<span className="title">{i18next.t('SETTINGS.KARAOKE.TIME_BY_USER')}</span>
										<br />
										<span className="tooltip">
											{i18next.t('SETTINGS.KARAOKE.TIME_BY_USER_TOOLTIP')}
										</span>
									</label>
									<div>
										<input
											min={1}
											type="number"
											data-exclude="true"
											id="Karaoke.Quota.Time"
											placeholder="1000"
											onBlur={(e: any) => {
												if (!e.target.value) e.target.value = 1;
												onChange(e);
											}}
											defaultValue={config['Karaoke.Quota.Time']}
										/>
									</div>
								</div>
							))
						: null}

					{config['Karaoke.Quota.Type'] === 1
						? filterValue === undefined ||
							(sanitizeSettingsSearchValue(i18next.t('SETTINGS.KARAOKE.SONGS_BY_USER')).includes(
								filterValue
							) && (
								<div className="settings-line">
									<label htmlFor="Karaoke.Quota.Songs">
										<span className="title">{i18next.t('SETTINGS.KARAOKE.SONGS_BY_USER')}</span>
										<br />
										<span className="tooltip">
											{i18next.t('SETTINGS.KARAOKE.SONGS_BY_USER_TOOLTIP')}
										</span>
									</label>
									<div>
										<input
											type="number"
											data-exclude="true"
											id="Karaoke.Quota.Songs"
											placeholder="1000"
											onBlur={onChange}
											defaultValue={config['Karaoke.Quota.Songs']}
										/>
									</div>
								</div>
							))
						: null}

					{config['Karaoke.Quota.Type'] !== 0
						? filterValue === undefined ||
							(sanitizeSettingsSearchValue(i18next.t('SETTINGS.KARAOKE.FREE_AUTO_TIME')).includes(
								filterValue
							) && (
								<div className="settings-line">
									<label htmlFor="Karaoke.Quota.FreeAutoTime">
										<span className="title">{i18next.t('SETTINGS.KARAOKE.FREE_AUTO_TIME')}</span>
										<br />
										<span className="tooltip">
											{i18next.t('SETTINGS.KARAOKE.FREE_AUTO_TIME_TOOLTIP')}
										</span>
									</label>
									<div>
										<input
											type="number"
											data-exclude="true"
											id="Karaoke.Quota.FreeAutoTime"
											placeholder="0"
											onBlur={(e: any) => {
												if (!e.target.value) e.target.value = 0;
												onChange(e);
											}}
											min={0}
											defaultValue={config['Karaoke.Quota.FreeAutoTime'] || 0}
										/>
									</div>
								</div>
							))
						: null}

					{filterValue === undefined ||
						(sanitizeSettingsSearchValue(i18next.t('SETTINGS.KARAOKE.FREE_ACCEPTED_SONGS')).includes(
							filterValue
						) && (
							<div className="settings-line">
								<label htmlFor="Karaoke.Quota.FreeAcceptedSongs">
									<span className="title">{i18next.t('SETTINGS.KARAOKE.FREE_ACCEPTED_SONGS')}</span>
									<br />
									<span className="tooltip">
										{i18next.t('SETTINGS.KARAOKE.FREE_ACCEPTED_SONGS_TOOLTIP')}
									</span>
								</label>
								<div>
									<Switch
										idInput="Karaoke.Quota.FreeAcceptedSongs"
										handleChange={onChange}
										isChecked={config['Karaoke.Quota.FreeAcceptedSongs']}
									/>
								</div>
							</div>
						))}

					{filterValue === undefined ||
						(sanitizeSettingsSearchValue(i18next.t('SETTINGS.KARAOKE.FREE_UPVOTES')).includes(
							filterValue
						) && (
							<div className="settings-line">
								<label htmlFor="Karaoke.Quota.FreeUpVote">
									<span className="title">{i18next.t('SETTINGS.KARAOKE.FREE_UPVOTES')}</span>
									<br />
									<span className="tooltip">
										{i18next.t('SETTINGS.KARAOKE.FREE_UPVOTES_TOOLTIP')}
									</span>
								</label>
								<div>
									<Switch
										idInput="Karaoke.Quota.FreeUpVote"
										handleChange={onChange}
										isChecked={config['Karaoke.Quota.FreeUpVote']}
									/>
								</div>
							</div>
						))}

					{config['Karaoke.Quota.FreeUpVote'] ? (
						<div id="freeUpvotesSettings" className="settingsGroupPanel">
							{filterValue === undefined ||
								(sanitizeSettingsSearchValue(
									i18next.t('SETTINGS.KARAOKE.FREE_UPVOTES_REQUIREDMIN')
								).includes(filterValue) && (
									<div className="settings-line">
										<label htmlFor="Karaoke.Quota.FreeUpVotesRequiredMin">
											<span className="title">
												{i18next.t('SETTINGS.KARAOKE.FREE_UPVOTES_REQUIREDMIN')}
											</span>
											<br />
											<span className="tooltip">
												{i18next.t('SETTINGS.KARAOKE.FREE_UPVOTES_REQUIREDMIN_TOOLTIP')}
											</span>
										</label>
										<div>
											<input
												min={1}
												type="number"
												data-exclude="true"
												id="Karaoke.Quota.FreeUpVotesRequiredMin"
												onBlur={(e: any) => {
													if (!e.target.value) e.target.value = 1;
													onChange(e);
												}}
												defaultValue={config['Karaoke.Quota.FreeUpVotesRequiredMin']}
											/>
										</div>
									</div>
								))}
							{filterValue === undefined ||
								(sanitizeSettingsSearchValue(
									i18next.t('SETTINGS.KARAOKE.FREE_UPVOTES_REQUIREDPERCENT')
								).includes(filterValue) && (
									<div className="settings-line">
										<label htmlFor="Karaoke.Quota.FreeUpVotesRequiredPercent">
											<span className="title">
												{i18next.t('SETTINGS.KARAOKE.FREE_UPVOTES_REQUIREDPERCENT')}
											</span>
											<br />
											<span className="tooltip">
												{i18next.t('SETTINGS.KARAOKE.FREE_UPVOTES_REQUIREDPERCENT_TOOLTIP')}
											</span>
										</label>
										<div>
											<input
												type="number"
												data-exclude="true"
												id="Karaoke.Quota.FreeUpVotesRequiredPercent"
												onBlur={onChange}
												defaultValue={config['Karaoke.Quota.FreeUpVotesRequiredPercent']}
											/>
										</div>
									</div>
								))}
						</div>
					) : null}
				</div>

				{filterValue ? null : (
					<div
						tabIndex={0}
						onClick={foldOptions}
						onKeyUp={foldOptions}
						className="settings-line subCategoryGroupPanel fold"
					>
						<span className="title">
							<i className="fas fa-fw fa-chevron-right" />
							<i className="fas fa-fw fa-chevron-down" />
							{i18next.t('SETTINGS.PLAYLIST.PLAYLIST_SETTINGS')}
						</span>
						<span className="tooltip">{i18next.t('SETTINGS.PLAYLIST.PLAYLIST_SETTINGS_TOOLTIP')}</span>
					</div>
				)}
				<div className="settings-group">
					{filterValue === undefined ||
						(sanitizeSettingsSearchValue(i18next.t('SETTINGS.KARAOKE.ENABLE_AUTOBALANCE')).includes(
							filterValue
						) && (
							<div className="settings-line">
								<label htmlFor="Karaoke.AutoBalance">
									<span className="title">{i18next.t('SETTINGS.KARAOKE.ENABLE_AUTOBALANCE')}</span>
									<br />
									<span className="tooltip">
										{i18next.t('SETTINGS.KARAOKE.ENABLE_AUTOBALANCE_TOOLTIP')}
									</span>
								</label>
								<div>
									<Switch
										idInput="Karaoke.AutoBalance"
										handleChange={onChange}
										isChecked={config['Karaoke.AutoBalance']}
									/>
								</div>
							</div>
						))}

					{filterValue === undefined ||
						(sanitizeSettingsSearchValue(i18next.t('SETTINGS.KARAOKE.AUTOPLAY')).includes(filterValue) && (
							<div className="settings-line">
								<label htmlFor="Karaoke.AutoPlay">
									<span className="title">{i18next.t('SETTINGS.KARAOKE.AUTOPLAY')}</span>
									<br />
									<span className="tooltip">{i18next.t('SETTINGS.KARAOKE.AUTOPLAY_TOOLTIP')}</span>
								</label>
								<div>
									<Switch
										idInput="Karaoke.Autoplay"
										handleChange={onChange}
										isChecked={config['Karaoke.Autoplay']}
									/>
								</div>
							</div>
						))}

					{filterValue === undefined ||
						(sanitizeSettingsSearchValue(i18next.t('SETTINGS.PLAYLIST.ENDOFPLAYLISTACTION.NAME')).includes(
							filterValue
						) && (
							<div className="settings-line">
								<label htmlFor="Playlist.EndOfPlaylistAction">
									<span className="title">
										{i18next.t('SETTINGS.PLAYLIST.ENDOFPLAYLISTACTION.NAME')}
									</span>
									<br />
									<span className="tooltip">
										{i18next.t('SETTINGS.PLAYLIST.ENDOFPLAYLISTACTION.TOOLTIP')}
									</span>
								</label>
								<div>
									<select
										id="Playlist.EndOfPlaylistAction"
										onChange={onChange}
										value={config['Playlist.EndOfPlaylistAction']}
									>
										<option value="none">
											{' '}
											{i18next.t('SETTINGS.PLAYLIST.ENDOFPLAYLISTACTION.OPTIONS.NONE')}{' '}
										</option>
										<option value="repeat">
											{' '}
											{i18next.t('SETTINGS.PLAYLIST.ENDOFPLAYLISTACTION.OPTIONS.REPEAT')}{' '}
										</option>
										<option value="random">
											{' '}
											{i18next.t('SETTINGS.PLAYLIST.ENDOFPLAYLISTACTION.OPTIONS.RANDOM')}{' '}
										</option>
										<option value="random_fallback">
											{' '}
											{i18next.t(
												'SETTINGS.PLAYLIST.ENDOFPLAYLISTACTION.OPTIONS.RANDOM_FALLBACK'
											)}{' '}
										</option>
										<option value="play_fallback">
											{' '}
											{i18next.t(
												'SETTINGS.PLAYLIST.ENDOFPLAYLISTACTION.OPTIONS.PLAY_FALLBACK'
											)}{' '}
										</option>
									</select>
								</div>
							</div>
						))}

					{['random', 'random_fallback'].includes(config['Playlist.EndOfPlaylistAction'])
						? filterValue === undefined ||
							(sanitizeSettingsSearchValue(
								i18next.t('SETTINGS.KARAOKE.PLAYLIST_RANDOMSONGSAFTERENDMESSAGE')
							).includes(filterValue) && (
								<div className="settings-line">
									<label htmlFor="Playlist.RandomSongsAfterEndMessage">
										<span className="title">
											{i18next.t('SETTINGS.KARAOKE.PLAYLIST_RANDOMSONGSAFTERENDMESSAGE')}
										</span>
										<br />
										<span className="tooltip">
											{i18next.t('SETTINGS.KARAOKE.PLAYLIST_RANDOMSONGSAFTERENDMESSAGE_TOOLTIP')}
										</span>
									</label>
									<div>
										<Switch
											idInput="Playlist.RandomSongsAfterEndMessage"
											handleChange={onChange}
											isChecked={config['Playlist.RandomSongsAfterEndMessage']}
										/>
									</div>
								</div>
							))
						: null}

					{filterValue === undefined ||
						(sanitizeSettingsSearchValue(i18next.t('SETTINGS.KARAOKE.ALLOW_DUPLICATES')).includes(
							filterValue
						) && (
							<div className="settings-line">
								<label htmlFor="Playlist.AllowDuplicates">
									<span className="title">{i18next.t('SETTINGS.KARAOKE.ALLOW_DUPLICATES')}</span>
									<br />
									<span className="tooltip">
										{i18next.t('SETTINGS.KARAOKE.ALLOW_DUPLICATES_TOOLTIP')}
									</span>
								</label>
								<div>
									<Switch
										idInput="Playlist.AllowDuplicates"
										handleChange={onChange}
										isChecked={config['Playlist.AllowDuplicates']}
									/>
								</div>
							</div>
						))}

					{filterValue === undefined ||
						(sanitizeSettingsSearchValue(i18next.t('SETTINGS.KARAOKE.ALLOW_PUBLIC_DUPLICATES')).includes(
							filterValue
						) && (
							<div className="settings-line">
								<label htmlFor="Playlist.AllowPublicDuplicates">
									<span className="title">
										{i18next.t('SETTINGS.KARAOKE.ALLOW_PUBLIC_DUPLICATES')}
									</span>
									<br />
									<span className="tooltip">
										{i18next.t('SETTINGS.KARAOKE.ALLOW_PUBLIC_DUPLICATES_TOOLTIP')}
									</span>
								</label>
								<div>
									<select
										id="Playlist.AllowPublicDuplicates"
										onChange={onChange}
										value={config['Playlist.AllowPublicDuplicates']}
									>
										<option value="allowed">
											{i18next.t('SETTINGS.KARAOKE.ALLOW_PUBLIC_DUPLICATES_OPTIONS.ALLOWED')}
										</option>
										<option value="upvotes">
											{i18next.t('SETTINGS.KARAOKE.ALLOW_PUBLIC_DUPLICATES_OPTIONS.UPVOTES_ONLY')}
										</option>
										<option value="disallowed">
											{i18next.t('SETTINGS.KARAOKE.ALLOW_PUBLIC_DUPLICATES_OPTIONS.DISALLOWED')}
										</option>
									</select>
								</div>
							</div>
						))}

					{filterValue === undefined ||
						(sanitizeSettingsSearchValue(i18next.t('SETTINGS.KARAOKE.ALLOW_PLAYLIST_ITEM_SWAP')).includes(
							filterValue
						) && (
							<div className="settings-line">
								<label htmlFor="Playlist.AllowPublicCurrentPlaylistItemSwap">
									<span className="title">
										{i18next.t('SETTINGS.KARAOKE.ALLOW_PLAYLIST_ITEM_SWAP')}
									</span>
									<br />
									<span className="tooltip">
										{i18next.t('SETTINGS.KARAOKE.ALLOW_PLAYLIST_ITEM_SWAP_TOOLTIP')}
									</span>
								</label>
								<div>
									<Switch
										idInput="Playlist.AllowPublicCurrentPlaylistItemSwap"
										handleChange={onChange}
										isChecked={config['Playlist.AllowPublicCurrentPlaylistItemSwap']}
									/>
								</div>
							</div>
						))}

					{filterValue === undefined ||
						(sanitizeSettingsSearchValue(
							i18next.t('SETTINGS.KARAOKE.MINUTES_BEFORE_SESSION_ENDS_WARNING')
						).includes(filterValue) && (
							<div className="settings-line">
								<label htmlFor="Karaoke.MinutesBeforeSessionEndsWarning">
									<span className="title">
										{i18next.t('SETTINGS.KARAOKE.MINUTES_BEFORE_SESSION_ENDS_WARNING')}
									</span>
									<br />
									<span className="tooltip">
										{i18next.t('SETTINGS.KARAOKE.MINUTES_BEFORE_SESSION_ENDS_WARNING_TOOLTIP')}
									</span>
								</label>
								<div>
									<input
										type="number"
										data-exclude="true"
										id="Karaoke.MinutesBeforeSessionEndsWarning"
										placeholder="15"
										onBlur={onChange}
										defaultValue={config['Karaoke.MinutesBeforeSessionEndsWarning']}
									/>
								</div>
							</div>
						))}
				</div>

				{filterValue ? null : (
					<div
						tabIndex={0}
						onClick={foldOptions}
						onKeyUp={foldOptions}
						className="settings-line subCategoryGroupPanel fold"
					>
						<span className="title">
							<i className="fas fa-fw fa-chevron-right" />
							<i className="fas fa-fw fa-chevron-down" />
							{i18next.t('SETTINGS.KARAOKE.MEDIAS_SETTINGS')}
						</span>
						<span className="tooltip">{i18next.t('SETTINGS.KARAOKE.MEDIAS_SETTINGS_TOOLTIP')}</span>
					</div>
				)}
				<div className="settings-group">
					{filterValue === undefined ||
						(sanitizeSettingsSearchValue(i18next.t('SETTINGS.KARAOKE.PLAYLIST_JINGLES_VIDEOS')).includes(
							filterValue
						) && (
							<div className="settings-line">
								<label htmlFor="Playlist.Medias.Jingles.Enabled">
									<span className="title">
										{i18next.t('SETTINGS.KARAOKE.PLAYLIST_JINGLES_VIDEOS')}
									</span>
									<br />
									<span className="tooltip">
										{i18next.t('SETTINGS.KARAOKE.PLAYLIST_JINGLES_VIDEOS_TOOLTIP')}
									</span>
								</label>
								<div>
									<Switch
										idInput="Playlist.Medias.Jingles.Enabled"
										handleChange={onChange}
										isChecked={config['Playlist.Medias.Jingles.Enabled']}
									/>
									{config['Playlist.Medias.Jingles.Enabled'] ? (
										<>
											<label className="label-input-options">
												{i18next.t('SETTINGS.KARAOKE.EVERY')}
											</label>
											<input
												min={1}
												type="number"
												data-exclude="true"
												className="input-number-options"
												id="Playlist.Medias.Jingles.Interval"
												placeholder="20"
												onBlur={(e: any) => {
													if (!e.target.value) e.target.value = 1;
													onChange(e);
												}}
												defaultValue={config['Playlist.Medias.Jingles.Interval']}
											/>
											<label className="label-input-options">
												{i18next.t('SETTINGS.KARAOKE.SONGS')}
											</label>
										</>
									) : null}
								</div>
							</div>
						))}

					{filterValue === undefined ||
						(sanitizeSettingsSearchValue(i18next.t('SETTINGS.KARAOKE.PLAYLIST_SPONSORS_VIDEOS')).includes(
							filterValue
						) && (
							<div className="settings-line">
								<label htmlFor="Playlist.Medias.Sponsors.Enabled">
									<span className="title">
										{i18next.t('SETTINGS.KARAOKE.PLAYLIST_SPONSORS_VIDEOS')}
									</span>
									<br />
									<span className="tooltip">
										{i18next.t('SETTINGS.KARAOKE.PLAYLIST_SPONSORS_VIDEOS_TOOLTIP')}
									</span>
								</label>
								<div>
									<Switch
										idInput="Playlist.Medias.Sponsors.Enabled"
										handleChange={onChange}
										isChecked={config['Playlist.Medias.Sponsors.Enabled']}
									/>
									{config['Playlist.Medias.Sponsors.Enabled'] ? (
										<>
											<label className="label-input-options">
												{i18next.t('SETTINGS.KARAOKE.EVERY')}
											</label>
											<input
												type="number"
												data-exclude="true"
												className="input-number-options"
												id="Playlist.Medias.Sponsors.Interval"
												placeholder="50"
												onBlur={onChange}
												defaultValue={config['Playlist.Medias.Sponsors.Interval']}
											/>
											<label className="label-input-options">
												{i18next.t('SETTINGS.KARAOKE.SONGS')}
											</label>
										</>
									) : null}
								</div>
							</div>
						))}

					{filterValue === undefined ||
						(sanitizeSettingsSearchValue(i18next.t('SETTINGS.KARAOKE.PLAYLIST_INTRO_VIDEOS')).includes(
							filterValue
						) && (
							<div className="settings-line">
								<label htmlFor="Playlist.Medias.Intros.Enabled">
									<span className="title">{i18next.t('SETTINGS.KARAOKE.PLAYLIST_INTRO_VIDEOS')}</span>
									<br />
									<span className="tooltip">
										{i18next.t('SETTINGS.KARAOKE.PLAYLIST_INTRO_VIDEOS_TOOLTIP')}
									</span>
								</label>
								<div>
									<Switch
										idInput="Playlist.Medias.Intros.Enabled"
										handleChange={onChange}
										isChecked={config['Playlist.Medias.Intros.Enabled']}
									/>
									{config['Playlist.Medias.Intros.Enabled'] ? (
										<>
											<label className="label-input-options">
												{i18next.t('SETTINGS.KARAOKE.WITH')}
											</label>
											<input
												className="input-options"
												id="Playlist.Medias.Intros.Message"
												onBlur={onChange}
												defaultValue={config['Playlist.Medias.Intros.Message'] || ''}
											/>
											<label className="label-input-options">
												{i18next.t('SETTINGS.KARAOKE.MESSAGE')}
											</label>
										</>
									) : null}
								</div>
							</div>
						))}

					{filterValue === undefined ||
						(sanitizeSettingsSearchValue(i18next.t('SETTINGS.KARAOKE.PLAYLIST_OUTRO_VIDEOS')).includes(
							filterValue
						) && (
							<div className="settings-line">
								<label htmlFor="Playlist.Medias.Outros.Enabled">
									<span className="title">{i18next.t('SETTINGS.KARAOKE.PLAYLIST_OUTRO_VIDEOS')}</span>
									<br />
									<span className="tooltip">
										{i18next.t('SETTINGS.KARAOKE.PLAYLIST_OUTRO_VIDEOS_TOOLTIP')}
									</span>
								</label>
								<div>
									<Switch
										idInput="Playlist.Medias.Outros.Enabled"
										handleChange={onChange}
										isChecked={config['Playlist.Medias.Outros.Enabled']}
									/>
									{config['Playlist.Medias.Outros.Enabled'] ? (
										<>
											<label className="label-input-options">
												{i18next.t('SETTINGS.KARAOKE.WITH')}
											</label>
											<input
												className="input-options"
												id="Playlist.Medias.Outros.Message"
												onBlur={onChange}
												defaultValue={config['Playlist.Medias.Outros.Message'] || ''}
											/>
											<label className="label-input-options">
												{i18next.t('SETTINGS.KARAOKE.MESSAGE')}
											</label>
										</>
									) : null}
								</div>
							</div>
						))}

					{filterValue === undefined ||
						(sanitizeSettingsSearchValue(i18next.t('SETTINGS.KARAOKE.PLAYLIST_ENCORES_VIDEOS')).includes(
							filterValue
						) && (
							<div className="settings-line">
								<label htmlFor="Playlist.Medias.Encores.Enabled">
									<span className="title">
										{i18next.t('SETTINGS.KARAOKE.PLAYLIST_ENCORES_VIDEOS')}
									</span>
									<br />
									<span className="tooltip">
										{i18next.t('SETTINGS.KARAOKE.PLAYLIST_ENCORES_VIDEOS_TOOLTIP')}
									</span>
								</label>
								<div>
									<Switch
										idInput="Playlist.Medias.Encores.Enabled"
										handleChange={onChange}
										isChecked={config['Playlist.Medias.Encores.Enabled']}
									/>
									{config['Playlist.Medias.Encores.Enabled'] ? (
										<>
											<label className="label-input-options">
												{i18next.t('SETTINGS.KARAOKE.WITH')}
											</label>
											<input
												className="input-options"
												id="Playlist.Medias.Encores.Message"
												onBlur={onChange}
												defaultValue={config['Playlist.Medias.Encores.Message'] || ''}
											/>
											<label className="label-input-options">
												{i18next.t('SETTINGS.KARAOKE.MESSAGE')}
											</label>
										</>
									) : null}
								</div>
							</div>
						))}
				</div>

				{filterValue ? null : (
					<div
						tabIndex={0}
						onClick={foldOptions}
						onKeyUp={foldOptions}
						className="settings-line subCategoryGroupPanel fold"
					>
						<span className="title">
							<i className="fas fa-fw fa-chevron-right" />
							<i className="fas fa-fw fa-chevron-down" />
							{i18next.t('SETTINGS.KARAOKE.SESSION_SETTINGS')}
						</span>
						<span className="tooltip">{i18next.t('SETTINGS.KARAOKE.SESSION_SETTINGS_TOOLTIP')}</span>
					</div>
				)}
				<div className="settings-group">
					{filterValue === undefined ||
						(sanitizeSettingsSearchValue(i18next.t('SETTINGS.KARAOKE.CLASSIC_MODE')).includes(
							filterValue
						) && (
							<div className="settings-line">
								<label htmlFor="Karaoke.ClassicMode">
									<span className="title">{i18next.t('SETTINGS.KARAOKE.CLASSIC_MODE')}</span>
									<br />
									<span className="tooltip">
										{i18next.t('SETTINGS.KARAOKE.CLASSIC_MODE_TOOLTIP')}
									</span>
									{config['Karaoke.StreamerMode.Enabled'] ? (
										<>
											<br />
											<span className="warning">
												{i18next.t('SETTINGS.KARAOKE.CLASSIC_MODE_LOCKED')}
											</span>
										</>
									) : null}
								</label>
								<div>
									<Switch
										idInput="Karaoke.ClassicMode"
										handleChange={onChange}
										isChecked={config['Karaoke.ClassicMode']}
										disabled={config['Karaoke.StreamerMode.Enabled']}
									/>
								</div>
							</div>
						))}

					{filterValue === undefined ||
						(sanitizeSettingsSearchValue(i18next.t('SETTINGS.KARAOKE.SONGPOLL')).includes(filterValue) && (
							<div className="settings-line">
								<label htmlFor="Karaoke.Poll.Enabled">
									<span className="title">{i18next.t('SETTINGS.KARAOKE.SONGPOLL')}</span>
									<br />
									<span className="tooltip">{i18next.t('SETTINGS.KARAOKE.SONGPOLL_TOOLTIP')}</span>
								</label>
								<div>
									<Switch
										idInput="Karaoke.Poll.Enabled"
										handleChange={onChange}
										isChecked={config['Karaoke.Poll.Enabled']}
									/>
								</div>
							</div>
						))}

					{config['Karaoke.Poll.Enabled'] ? (
						<div id="songPollSettings" className="settingsGroupPanel">
							{filterValue === undefined ||
								(sanitizeSettingsSearchValue(i18next.t('SETTINGS.KARAOKE.SONGPOLLCHOICES')).includes(
									filterValue
								) && (
									<div className="settings-line">
										<label htmlFor="Karaoke.Poll.Choices">
											<span className="title">
												{i18next.t('SETTINGS.KARAOKE.SONGPOLLCHOICES')}
											</span>
											<br />
											<span className="tooltip">
												{i18next.t('SETTINGS.KARAOKE.SONGPOLLCHOICES_TOOLTIP')}
											</span>
										</label>
										<div>
											<input
												type="number"
												data-exclude="true"
												id="Karaoke.Poll.Choices"
												onBlur={onChange}
												defaultValue={config['Karaoke.Poll.Choices']}
											/>
										</div>
									</div>
								))}
							{filterValue === undefined ||
								(sanitizeSettingsSearchValue(i18next.t('SETTINGS.KARAOKE.SONGPOLLTIMEOUT')).includes(
									filterValue
								) && (
									<div className="settings-line">
										<label htmlFor="Karaoke.Poll.Choices">
											<span className="title">
												{i18next.t('SETTINGS.KARAOKE.SONGPOLLTIMEOUT')}
											</span>
											<br />
											<span className="tooltip">
												{i18next.t('SETTINGS.KARAOKE.SONGPOLLTIMEOUT_TOOLTIP')}
											</span>
										</label>
										<div>
											<input
												type="number"
												data-exclude="true"
												id="Karaoke.Poll.Timeout"
												onBlur={onChange}
												defaultValue={config['Karaoke.Poll.Timeout']}
											/>
										</div>
									</div>
								))}
						</div>
					) : null}
				</div>
				{filterValue ? null : (
					<div
						tabIndex={0}
						onClick={foldOptions}
						onKeyUp={foldOptions}
						className="settings-line subCategoryGroupPanel fold"
					>
						<span className="title">
							<i className="fas fa-fw fa-chevron-right" />
							<i className="fas fa-fw fa-chevron-down" />
							{i18next.t('SETTINGS.KARAOKE.STREAM_SETTINGS')}
						</span>
						<span className="tooltip">{i18next.t('SETTINGS.KARAOKE.STREAM_SETTINGS_TOOLTIP')}</span>
					</div>
				)}
				<div className="settings-group">
					{filterValue === undefined ||
						(sanitizeSettingsSearchValue(i18next.t('SETTINGS.KARAOKE.STREAMER_MODE_LABEL')).includes(
							filterValue
						) && (
							<div className="settings-line">
								<p>
									{i18next.t('SETTINGS.KARAOKE.STREAMER_MODE_LABEL')}&nbsp;
									{isElectron() ? (
										<a
											href="#"
											onClick={e => {
												e.preventDefault();
												sendIPC('openFolder', { type: 'streamFiles' });
											}}
										>
											{i18next.t('SETTINGS.KARAOKE.OPEN_STREAMER_FILES')}
										</a>
									) : null}
								</p>
							</div>
						))}

					{filterValue === undefined ||
						(sanitizeSettingsSearchValue(i18next.t('SETTINGS.KARAOKE.STREAM_MODE')).includes(
							filterValue
						) && (
							<div className="settings-line">
								<label htmlFor="Karaoke.StreamerMode.Enabled">
									<span className="title">{i18next.t('SETTINGS.KARAOKE.STREAM_MODE')}</span>
									<br />
									<span className="tooltip">{i18next.t('SETTINGS.KARAOKE.STREAM_MODE_TOOLTIP')}</span>
									{config['Karaoke.ClassicMode'] ? (
										<>
											<br />
											<span className="warning">
												{i18next.t('SETTINGS.KARAOKE.STREAM_MODE_LOCKED')}
											</span>
										</>
									) : null}
								</label>
								<div>
									<Switch
										idInput="Karaoke.StreamerMode.Enabled"
										handleChange={onChange}
										isChecked={config['Karaoke.StreamerMode.Enabled']}
										disabled={config['Karaoke.ClassicMode']}
									/>
								</div>
							</div>
						))}
					{config['Karaoke.StreamerMode.Enabled'] ? (
						<div id="streamSettings" className="settingsGroupPanel">
							{filterValue === undefined ||
								(sanitizeSettingsSearchValue(
									i18next.t('SETTINGS.KARAOKE.STREAM_PAUSE_DURATION')
								).includes(filterValue) && (
									<div className="settings-line">
										<label htmlFor="Karaoke.StreamerMode.PauseDuration">
											<span className="title">
												{i18next.t('SETTINGS.KARAOKE.STREAM_PAUSE_DURATION')}
											</span>
											<br />
											<span className="tooltip">
												{i18next.t('SETTINGS.KARAOKE.STREAM_PAUSE_DURATION_TOOLTIP')}
											</span>
										</label>
										<div>
											<input
												min={0}
												type="number"
												data-exclude="true"
												id="Karaoke.StreamerMode.PauseDuration"
												placeholder="20"
												onBlur={(e: any) => {
													if (!e.target.value) e.target.value = 0;
													onChange(e);
												}}
												defaultValue={config['Karaoke.StreamerMode.PauseDuration']}
											/>
										</div>
									</div>
								))}
						</div>
					) : null}

					{filterValue === undefined ||
						(sanitizeSettingsSearchValue(i18next.t('SETTINGS.KARAOKE.STREAM_TWITCH')).includes(
							filterValue
						) && (
							<div className="settings-line">
								<label htmlFor="Karaoke.StreamerMode.Twitch.Enabled">
									<span className="title">{i18next.t('SETTINGS.KARAOKE.STREAM_TWITCH')}</span>
									<br />
									<span className="tooltip">
										{i18next.t('SETTINGS.KARAOKE.STREAM_TWITCH_TOOLTIP')}
									</span>
								</label>
								<div>
									<Switch
										idInput="Karaoke.StreamerMode.Twitch.Enabled"
										handleChange={onChange}
										isChecked={config['Karaoke.StreamerMode.Twitch.Enabled']}
									/>
								</div>
							</div>
						))}
					{config['Karaoke.StreamerMode.Twitch.Enabled'] ? (
						<div id="twitchSettings" className="settingsGroupPanel">
							<div className="settings-line">
								<a href="https://twitchapps.com/tmi/" rel="noreferrer noopener">
									{i18next.t('SETTINGS.KARAOKE.STREAM_TWITCH_OAUTH_TOKEN_GET')}
								</a>
							</div>
							{filterValue === undefined ||
								(sanitizeSettingsSearchValue(
									i18next.t('SETTINGS.KARAOKE.STREAM_TWITCH_OAUTH_TOKEN')
								).includes(filterValue) && (
									<div className="settings-line">
										<label htmlFor="Karaoke.StreamerMode.Twitch.OAuth">
											<span className="title">
												{i18next.t('SETTINGS.KARAOKE.STREAM_TWITCH_OAUTH_TOKEN')}
											</span>
										</label>
										<div>
											<input
												type="password"
												data-exclude="true"
												id="Karaoke.StreamerMode.Twitch.OAuth"
												defaultValue={config['Karaoke.StreamerMode.Twitch.OAuth']}
											/>
											<button className="btn" onClick={parseTwitch}>
												{i18next.t('LOG_IN')}
											</button>
										</div>
									</div>
								))}
							<div className="settings-line">
								<label htmlFor="Karaoke.StreamerMode.Twitch.Channel">
									<span className="title">{i18next.t('SETTINGS.KARAOKE.STREAM_TWITCH_CHANNEL')}</span>
								</label>
								<div>{config['Karaoke.StreamerMode.Twitch.Channel']}</div>
							</div>
							{filterValue === undefined ||
								(sanitizeSettingsSearchValue(i18next.t('SETTINGS.KARAOKE.LIVE_COMMENTS')).includes(
									filterValue
								) && (
									<div className="settings-line">
										<label htmlFor="Player.LiveComments">
											<span className="title">{i18next.t('SETTINGS.PLAYER.LIVE_COMMENTS')}</span>
											<br />
											<span className="tooltip">
												{i18next.t('SETTINGS.PLAYER.LIVE_COMMENTS_TOOLTIP')}
											</span>
										</label>
										<div>
											<Switch
												idInput="Player.LiveComments"
												handleChange={onChange}
												isChecked={config['Player.LiveComments']}
											/>
										</div>
									</div>
								))}
						</div>
					) : null}
				</div>
				{filterValue ? null : (
					<div
						tabIndex={0}
						onClick={foldOptions}
						onKeyUp={foldOptions}
						className="settings-line subCategoryGroupPanel fold"
					>
						<span className="title">
							<i className="fas fa-fw fa-chevron-right" />
							<i className="fas fa-fw fa-chevron-down" />
							{i18next.t('SETTINGS.KARAOKE.ONLINE_SETTINGS')}
						</span>
						<span className="tooltip">{i18next.t('SETTINGS.KARAOKE.ONLINE_SETTINGS_TOOLTIP')}</span>
					</div>
				)}
				{filterValue === undefined ||
					(sanitizeSettingsSearchValue(
						i18next.t('SETTINGS.KARAOKE.REMOTE', {
							instance: context.globalState.settings.data.config.Online.Host,
						})
					).includes(filterValue) && (
						<div className="settings-group">
							<div className="settings-line">
								<label htmlFor="Online.Remote">
									<span className="title">
										{i18next.t('SETTINGS.KARAOKE.REMOTE', {
											instance: context.globalState.settings.data.config.Online.Host,
										})}
									</span>
									<br />
									<span className="tooltip">{i18next.t('SETTINGS.KARAOKE.REMOTE_TOOLTIP')}</span>
								</label>
								<div>
									<Switch
										idInput="Online.Remote"
										handleChange={onChange}
										isChecked={config['Online.Remote']}
									/>
								</div>
							</div>

							{config['Online.Remote'] ? <RemoteStatus /> : null}
						</div>
					))}
				{filterValue ? null : (
					<div
						tabIndex={0}
						onClick={foldOptions}
						onKeyUp={foldOptions}
						className="settings-line subCategoryGroupPanel fold"
					>
						<span className="title">
							<i className="fas fa-fw fa-chevron-right" />
							<i className="fas fa-fw fa-chevron-down" />
							{i18next.t('SETTINGS.KARAOKE.MYSTERY_SONG_SETTINGS')}
						</span>
						<span className="tooltip">{i18next.t('SETTINGS.KARAOKE.MYSTERY_SONG_SETTINGS_TOOLTIP')}</span>
					</div>
				)}
				<div className="settings-group">
					{filterValue === undefined ||
						(sanitizeSettingsSearchValue(i18next.t('SETTINGS.KARAOKE.HIDE_INVISIBLE_SONGS')).includes(
							filterValue
						) && (
							<div className="settings-line">
								<label htmlFor="Playlist.MysterySongs.Hide">
									<span className="title">{i18next.t('SETTINGS.KARAOKE.HIDE_INVISIBLE_SONGS')}</span>
									<br />
									<span className="tooltip">
										{i18next.t('SETTINGS.KARAOKE.HIDE_INVISIBLE_SONGS_TOOLTIP')}
									</span>
								</label>
								<div>
									<select
										id="Playlist.MysterySongs.Hide"
										onChange={onChange}
										value={config['Playlist.MysterySongs.Hide']}
									>
										<option value="true">
											{' '}
											{i18next.t('SETTINGS.KARAOKE.HIDE_INVISIBLE_SONGS_HIDDEN_OPTION')}{' '}
										</option>
										<option value="false">
											{i18next.t('SETTINGS.KARAOKE.HIDE_INVISIBLE_SONGS_VISIBLE_OPTION')}
										</option>
									</select>
								</div>
							</div>
						))}

					{filterValue === undefined ||
						(sanitizeSettingsSearchValue(
							i18next.t('SETTINGS.KARAOKE.ADDED_SONG_VISIBILITY_ADMIN')
						).includes(filterValue) && (
							<div className="settings-line">
								<label htmlFor="Playlist.MysterySongs.AddedSongVisibilityAdmin">
									<span className="title">
										{i18next.t('SETTINGS.KARAOKE.ADDED_SONG_VISIBILITY_ADMIN')}
									</span>
									<br />
									<span className="tooltip">
										{i18next.t('SETTINGS.KARAOKE.ADDED_SONG_VISIBILITY_ADMIN_TOOLTIP')}
									</span>
								</label>
								<div>
									<select
										id="Playlist.MysterySongs.AddedSongVisibilityAdmin"
										onChange={onChange}
										value={config['Playlist.MysterySongs.AddedSongVisibilityAdmin']}
									>
										<option value="false">
											{' '}
											{i18next.t('SETTINGS.KARAOKE.ADDED_SONG_VISIBILITY_MYSTERY_OPTION')}{' '}
										</option>
										<option value="true">
											{' '}
											{i18next.t('SETTINGS.KARAOKE.ADDED_SONG_VISIBILITY_NORMAL_OPTION')}{' '}
										</option>
									</select>
								</div>
							</div>
						))}

					{filterValue === undefined ||
						(sanitizeSettingsSearchValue(
							i18next.t('SETTINGS.KARAOKE.ADDED_SONG_VISIBILITY_PUBLIC')
						).includes(filterValue) && (
							<div className="settings-line">
								<label htmlFor="Playlist.MysterySongs.AddedSongVisibilityPublic">
									<span className="title">
										{i18next.t('SETTINGS.KARAOKE.ADDED_SONG_VISIBILITY_PUBLIC')}
									</span>
									<br />
									<span className="tooltip">
										{i18next.t('SETTINGS.KARAOKE.ADDED_SONG_VISIBILITY_PUBLIC_TOOLTIP')}
									</span>
								</label>
								<div>
									<select
										id="Playlist.MysterySongs.AddedSongVisibilityPublic"
										onChange={onChange}
										value={config['Playlist.MysterySongs.AddedSongVisibilityPublic']}
									>
										<option value="false">
											{' '}
											{i18next.t('SETTINGS.KARAOKE.ADDED_SONG_VISIBILITY_MYSTERY_OPTION')}{' '}
										</option>
										<option value="true">
											{' '}
											{i18next.t('SETTINGS.KARAOKE.ADDED_SONG_VISIBILITY_NORMAL_OPTION')}{' '}
										</option>
									</select>
								</div>
							</div>
						))}

					{filterValue === undefined ||
						(sanitizeSettingsSearchValue(i18next.t('SETTINGS.KARAOKE.LABELS_MYSTERY_SONGS')).includes(
							filterValue
						) && (
							<div className="settings-line">
								<label>
									<span className="title">{i18next.t('SETTINGS.KARAOKE.LABELS_MYSTERY_SONGS')}</span>
									<br />
									<span className="tooltip">
										{i18next.t('SETTINGS.KARAOKE.LABELS_MYSTERY_SONGS_TOOLTIP')}
									</span>
								</label>
								<div className="mysterySongs">
									{config['Playlist.MysterySongs.Labels']?.map((value: string) => {
										return (
											<div key={value}>
												<label>{value}</label>
												{config['Playlist.MysterySongs.Labels'].length > 1 ? (
													<button
														type="button"
														className="btn btn-default"
														onClick={() => deleteMysterySongLabel(value)}
													>
														{i18next.t('SETTINGS.KARAOKE.LABELS_MYSTERY_SONGS_DELETE')}
													</button>
												) : null}
											</div>
										);
									})}
									<div>
										<input
											defaultValue={mysterySongLabel}
											onBlur={e => setMysterySongLabel(e.target.value)}
										/>
										<button type="button" className="btn btn-default" onClick={addMysterySongLabel}>
											{i18next.t('SETTINGS.KARAOKE.LABELS_MYSTERY_SONGS_ADD')}
										</button>
									</div>
								</div>
							</div>
						))}
				</div>
			</div>
		</>
	) : null;
}

export default KaraokeOptions;
