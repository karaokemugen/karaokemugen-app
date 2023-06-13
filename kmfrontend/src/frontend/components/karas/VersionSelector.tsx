import i18next from 'i18next';
import { useCallback, useContext, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { DBKara } from '../../../../../src/lib/types/database/kara';
import { KaraList as IKaraList } from '../../../../../src/lib/types/kara';
import GlobalContext from '../../../store/context';
import { getTitleInLocale } from '../../../utils/kara';
import { commandBackend, getSocket } from '../../../utils/socket';
import { PLCCallback } from '../../../utils/tools';
import KaraList from './KaraList';

interface Props {
	kid: string;
	scope: 'admin' | 'public';
}

async function fetchKaras(kid): Promise<IKaraList<DBKara>> {
	const karaParent: DBKara = await commandBackend('getKara', { kid });
	const karaChildren: IKaraList = await commandBackend('getKaras', {
		q: `k:${karaParent.children.join(',')}`,
	});
	return {
		infos: { count: karaChildren.content.length + 1, from: 0, to: karaChildren.content.length },
		content: [karaParent, ...karaChildren.content],
		i18n: karaChildren.i18n,
	};
}

export default function VersionSelector(props: Props) {
	const [karas, setKaras] = useState<IKaraList<DBKara>>();
	const context = useContext(GlobalContext);
	const navigate = useNavigate();
	const { kid: id } = useParams();

	const addKara = async (e, kara) => {
		try {
			e.stopPropagation();
			const res = await commandBackend('addKaraToPublicPlaylist', {
				requestedby: context.globalState.auth.data.username,
				kids: [kara.kid],
			});
			PLCCallback(res, context, kara);
		} catch (e) {
			// already display
		}
	};

	const getKaras = useCallback(() => fetchKaras(id).then(setKaras), [id]);

	useEffect(() => {
		const refreshKaras = updated => {
			for (const k of updated) {
				if (karas.content?.findIndex(dbk => dbk.kid === k.kid) !== -1) {
					getKaras();
					break;
				}
			}
		};

		getSocket().on('KIDUpdated', refreshKaras);
		return () => {
			getSocket().off('KIDUpdated', refreshKaras);
		};
	}, [getKaras, karas]);

	useEffect(() => {
		getKaras();
	}, [getKaras]);

	return (
		<div>
			{karas?.content ? (
				<div className="modal-content">
					<div className="modal-header public-modal">
						<button className="closeModal" type="button" onClick={() => navigate(-1)}>
							<i className="fas fa-arrow-left" />
						</button>
						<h4 className="modal-title">
							{getTitleInLocale(
								context.globalState.settings.data,
								karas.content[0].titles,
								karas.content[0].titles_default_language
							)}
						</h4>
					</div>
					<div className="modal-body">
						<p>{i18next.t('PUBLIC_HOMEPAGE.KARA_VERSIONS', { length: karas.content.length })}</p>
						<KaraList karas={karas} scope={props.scope} addKara={addKara} />
					</div>
				</div>
			) : (
				<div className="modal-content">
					<div className="loader" />
				</div>
			)}
		</div>
	);
}
