import i18next from 'i18next';

import { commandBackend } from '../../../utils/socket';
import useMigration from './Migration';
import { useContext, useEffect, useState } from 'react';
import GlobalContext from '../../../store/context';
import { Tag } from '../../../../../src/lib/types/tag';
import { getLanguageIn3B, langSupport } from '../../../utils/isoLanguages';
import Switch from '../generic/Switch';

interface Props {
	onEnd: () => void;
}

export default function Collections(props: Props) {
	const end = async () => {
		props.onEnd();
	};

	const [EndButton] = useMigration('Collections', end);

	const context = useContext(GlobalContext);

	const [error, setError] = useState<string>();
	const [collections, setCollections] = useState<Tag[]>();

	const enableCollection = (tid: string) => {
		try {
			const collections = context.globalState.settings.data.config.Karaoke.Collections;
			collections[tid] = !collections[tid];
			commandBackend('updateSettings', {
				setting: {
					Karaoke: {
						Collections: collections,
					},
				},
			});
		} catch (err: any) {
			const error = err?.message ? i18next.t(`ERROR_CODES.${err.message.code}`) : JSON.stringify(err);
			setError(error);
		}
	};

	const getDescriptionInLocale = (description: Record<string, string>): string => {
		const user = context.globalState.settings.data?.user;
		if (user?.main_series_lang && user?.fallback_series_lang) {
			return description[user.main_series_lang]
				? description[user.main_series_lang]
				: description[user.fallback_series_lang]
				? description[user.fallback_series_lang]
				: description.eng;
		} else {
			return description[getLanguageIn3B(langSupport)]
				? description[getLanguageIn3B(langSupport)]
				: description.eng;
		}
	};

	const getCollections = async () => setCollections(await commandBackend('getCollections'));

	useEffect(() => {
		getCollections();
	}, []);

	return (
		<div className="limited-width justified">
			<h2>{i18next.t('COLLECTIONS_MIGRATION.TITLE')}</h2>
			<p>{i18next.t('COLLECTIONS_MIGRATION.P1')}</p>
			<p>{i18next.t('COLLECTIONS_MIGRATION.P2')}</p>
			{collections ? (
				<>
					<div className="input-group">
						<div className="input-control">
							<label>{i18next.t('SETUP_PAGE.COLLECTIONS_CHOICE')}</label>
							{collections.map(collection => (
								<div className="input-checkbox" key={collection.tid}>
									<div className="input-checkbox-switch">
										<Switch
											handleChange={() => enableCollection(collection.tid)}
											disabled={
												Object.values(
													context.globalState.settings.data.config.Karaoke.Collections
												).filter(c => c).length === 1 &&
												context.globalState.settings.data.config.Karaoke.Collections[
													collection.tid
												]
											}
											isChecked={
												context.globalState.settings.data.config.Karaoke.Collections[
													collection.tid
												]
											}
										/>
									</div>
									<label>
										<div className="name">{collection.name}</div>
										<div>{getDescriptionInLocale(collection.description)}</div>
									</label>
								</div>
							))}
						</div>
					</div>
					<p>{error}</p>
				</>
			) : null}
			<EndButton />
		</div>
	);
}
