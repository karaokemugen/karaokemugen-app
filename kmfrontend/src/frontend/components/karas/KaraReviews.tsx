import { useContext, useEffect, useState } from 'react';

import { DBPL } from '../../../../../src/lib/types/database/playlist';
import { DBPLC } from '../../../../../src/types/database/playlist';
import { closeModal } from '../../../store/actions/modal';
import GlobalContext from '../../../store/context';
import { getPlaylistInfo } from '../../../utils/kara';
import { commandBackend } from '../../../utils/socket';
import KaraDetail from './KaraDetail';

interface Props {
	side: 'left' | 'right';
}

interface CompactKara {
	kid: string;
	plcid: number;
}

export default function KaraReviews(props: Props) {
	// Queue management
	const [queue, setQueue] = useState<CompactKara[]>([]);
	const [i, setI] = useState(0);
	const [end, setEnd] = useState(false);
	const context = useContext(GlobalContext);
	// Stats
	const [accepted, setAccepted] = useState(0);
	const [refused, setRefused] = useState(0);
	const [timeRemaining, setTimeRemaining] = useState(0);
	const playlist = getPlaylistInfo(props.side, context);

	const fetchTimeRemaining = async () => {
		const playlistList: DBPL[] = await commandBackend('getPlaylists');
		setTimeRemaining(playlistList.find(pl => pl?.flag_current).time_left);
	};

	useEffect(() => {
		fetchTimeRemaining();
	}, [queue.length]);

	const fetchKaraokes = async () => {
		if (end) return;
		const karaokes: CompactKara[] = [];
		let localI = i;
		while (karaokes.length < 20) {
			if (localI * 20 > playlist.karacount) {
				setEnd(true);
				break;
			}
			const res: { content: DBPLC[]; infos: { count: number } } = await commandBackend('getPlaylistContents', {
				plaid: playlist.plaid,
				from: localI * 20,
				size: 20,
			});
			if (res.infos.count === 0) {
				closeModal(context.globalDispatch);
				break;
			}
			for (const kara of res.content) {
				if (!(kara.flag_accepted || kara.flag_refused)) {
					karaokes.push({ kid: kara.kid, plcid: kara.plcid });
				}
			}
			localI++;
		}
		setI(localI);
		setQueue([...queue, ...karaokes]);
	};

	const nextKaraoke = async (accepted: boolean) => {
		if (accepted) {
			await commandBackend('editPLC', {
				plc_ids: [queue[0].plcid],
				flag_accepted: true,
			});
			setAccepted(acc => acc + 1);
		} else {
			await commandBackend('editPLC', {
				plc_ids: [queue[0].plcid],
				flag_refused: true,
			});
			setRefused(ref => ref + 1);
		}
		setQueue(oldQueue => oldQueue.slice(1));
	};

	useEffect(() => {
		fetchKaraokes();
	}, []);

	useEffect(() => {
		if (end && queue.length === 0) {
			closeModal(context.globalDispatch);
		} else if (!end && queue.length < 5) {
			fetchKaraokes();
		}
	}, [queue]);

	return queue.length >= 1 ? (
		<KaraDetail
			kid={queue[0].kid}
			plaid={playlist.plaid}
			playlistcontentId={queue[0].plcid}
			scope="admin"
			karoulette={{
				next: nextKaraoke,
				accepted,
				refused,
				timeRemaining,
			}}
		/>
	) : (
		<div className="modal modalPage">
			<div className="modal-dialog">
				<div className="modal-content">
					<div className="loader" />
				</div>
			</div>
		</div>
	);
}
