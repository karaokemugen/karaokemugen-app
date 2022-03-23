import i18next from 'i18next';
import { useContext } from 'react';
import { toast } from 'react-toastify';

import nanamiSingPng from '../../../../assets/nanami-sing.png';
import nanamiSingWebP from '../../../../assets/nanami-sing.webp';
import GlobalContext from '../../../../store/context';
import { commandBackend } from '../../../../utils/socket';
import { displayMessage, secondsTimeSpanToHMS } from '../../../../utils/tools';
import { getTitleInLocale } from '../../../../utils/kara';
import { DBKara } from '../../../../../../src/lib/types/database/kara';

interface Props {
	kara: DBKara;
}

export default function AddKaraButton(props: Props) {
	const context = useContext(GlobalContext);

	const addKara = async () => {
		let response;
		try {
			response = await commandBackend('addKaraToPublicPlaylist', {
				requestedby: context.globalState.auth.data.username,
				kids: [props.kara.kid],
			});
		} catch (e) {
			// already display
		}
		if (response && response.code && response.data?.plc) {
			let message;
			if (response.data?.plc.time_before_play) {
				const playTime = new Date(Date.now() + response.data.plc.time_before_play * 1000);
				const playTimeDate = playTime.getHours() + 'h' + ('0' + playTime.getMinutes()).slice(-2);
				const beforePlayTime = secondsTimeSpanToHMS(response.data.plc.time_before_play, 'hm');
				message = (
					<>
						{i18next.t(`SUCCESS_CODES.${response.code}`, {
							song: getTitleInLocale(
								context.globalState.settings.data,
								props.kara.titles,
								props.kara.titles_default_language
							),
						})}
						<br />
						{i18next.t('KARA_DETAIL.TIME_BEFORE_PLAY', {
							time: beforePlayTime,
							date: playTimeDate,
						})}
					</>
				);
			} else {
				message = (
					<>
						{i18next.t(`SUCCESS_CODES.${response.code}`, {
							song: getTitleInLocale(
								context.globalState.settings.data,
								props.kara.titles,
								props.kara.titles_default_language
							),
						})}
					</>
				);
			}
			displayMessage(
				'success',
				<div className="toast-with-img">
					<picture>
						<source type="image/webp" srcSet={nanamiSingWebP} />
						<source type="image/png" srcSet={nanamiSingPng} />
						<img src={nanamiSingPng} alt="Nanami is singing!" />
					</picture>
					<span>
						{message}
						<br />
						<button
							className="btn"
							onClick={e => {
								e.preventDefault();
								e.stopPropagation();
								commandBackend('deleteKaraFromPlaylist', { plc_ids: [response.data.plc.plcid] })
									.then(() => {
										toast.dismiss(response.data.plc.plcid);
										displayMessage('success', i18next.t('SUCCESS_CODES.KARA_DELETED'));
									})
									.catch(() => {
										toast.dismiss(response.data.plc.plcid);
									});
							}}
						>
							{i18next.t('CANCEL')}
						</button>
					</span>
				</div>,
				10000,
				'top-left',
				response.data.plc.plcid
			);
		}
	};

	return (
		<button type="button" onClick={addKara} className="btn btn-action">
			<i className="fas fa-fw fa-plus" />
			<span>{i18next.t('TOOLTIP_ADDKARA')}</span>
		</button>
	);
}
