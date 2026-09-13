import i18next from 'i18next';
import { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router';

import { Tag } from '../../../../../src/lib/types/tag';
import GlobalContext from '../../../store/context';
import { getDescriptionInLocale } from '../../../utils/kara';
import { commandBackend } from '../../../utils/socket';
import Switch from '../../components/generic/Switch';
import { WS_CMD } from '../../../utils/ws.mjs';

function SetupPageCollections() {
	const context = useContext(GlobalContext);
	const navigate = useNavigate();

	const [error, setError] = useState<string>();
	const [collections, setCollections] = useState<Tag[]>();
	const [collectionsEnabled, setCollectionsEnabled] = useState<Record<string, boolean>>();

	const enableCollection = (tid: string) => {
		try {
			const collectionsUpdated = collectionsEnabled;
			collectionsUpdated[tid] = !collectionsUpdated[tid];
			setCollectionsEnabled(collectionsUpdated);
			commandBackend(WS_CMD.UPDATE_SETTINGS, {
				setting: {
					Karaoke: {
						Collections: collectionsUpdated,
					},
				},
			});
		} catch (err: any) {
			const error = err?.message ? i18next.t(`ERROR_CODES.${err.message.code}`) : JSON.stringify(err);
			setError(error);
		}
	};

	const getCollections = async () => {
		const result = await commandBackend(WS_CMD.GET_COLLECTIONS);
		setCollections(result.availableCollections);
		setCollectionsEnabled(result.defaults);
	};

	useEffect(() => {
		getCollections();
	}, []);

	return (
		<>
			{collections ? (
				<section className="step step-repo">
					<div className="intro">
						<h2>{i18next.t('SETUP_PAGE.COLLECTIONS.CHOICE')}</h2>
						<p>{i18next.t('SETUP_PAGE.COLLECTIONS.CHOICE_DESC_1')}</p>
					</div>
					<div className="input-group">
						<div className="input-control">
							{collections.map(collection => (
								<div className="input-checkbox" key={collection.tid}>
									<div className="input-checkbox-switch">
										<Switch
											handleChange={() => enableCollection(collection.tid)}
											disabled={
												Object.values(collectionsEnabled).filter(c => c).length === 1 &&
												collectionsEnabled[collection.tid]
											}
											isChecked={collectionsEnabled[collection.tid] || false}
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
					<p>{i18next.t('SETUP_PAGE.COLLECTIONS.CHOICE_DESC_2')}</p>
				</section>
			) : (
				<section className="step step-repo">{i18next.t('LOADING')}</section>
			)}
			<section className="step step-choice">
				<div className="actions">
					<label className="error">{error}</label>
					<button
						type="button"
						onClick={async () => {
							navigate('/setup/remote');
						}}
					>
						{i18next.t('ACTIONS.CONTINUE')}
					</button>
				</div>
			</section>
		</>
	);
}

export default SetupPageCollections;
