import i18next from 'i18next';
import { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router';

import { Tag } from '../../../../../src/lib/types/tag';
import GlobalContext from '../../../store/context';
import { getDescriptionInLocale } from '../../../utils/kara';
import { commandBackend } from '../../../utils/socket';
import Switch from '../generic/Switch';

function SetupPageCollections() {
	const context = useContext(GlobalContext);
	const navigate = useNavigate();

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

	const getCollections = async () => setCollections(await commandBackend('getCollections'));

	useEffect(() => {
		getCollections();
	}, []);

	return (
		<>
			{collections ? (
				<section className="step step-repo">
					<p>{i18next.t('SETUP_PAGE.COLLECTIONS_CHOICE_DESC_1')}</p>
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
										<div>
											{getDescriptionInLocale(
												context.globalState.settings.data,
												collection.description
											)}
										</div>
									</label>
								</div>
							))}
						</div>
					</div>
					<p>{i18next.t('SETUP_PAGE.COLLECTIONS_CHOICE_DESC_2')}</p>
				</section>
			) : null}
			<section className="step step-choice">
				<div className="actions">
					<label className="error">{error}</label>
					<button
						type="button"
						onClick={async () => {
							navigate('/setup/stats');
						}}
					>
						{i18next.t('SETUP_PAGE.SAVE_PARAMETER')}
					</button>
				</div>
			</section>
		</>
	);
}

export default SetupPageCollections;
