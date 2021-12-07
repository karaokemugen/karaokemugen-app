import i18next from 'i18next';
import { useCallback, useContext, useMemo } from 'react';

import GlobalContext from '../../../../store/context';
import { commandBackend } from '../../../../utils/socket';
import { displayMessage } from '../../../../utils/tools';

interface Props {
	kid: string;
}

export default function MakeFavButton(props: Props) {
	const context = useContext(GlobalContext);
	const isFavorite = useMemo<boolean>(() => {
		return context.globalState.settings.data.favorites.has(props.kid);
	}, [context.globalState.settings.data.favorites.size]);
	const makeFavorite = useCallback(() => {
		if (context.globalState.auth.data.onlineAvailable !== false) {
			isFavorite
				? commandBackend('deleteFavorites', {
						kids: [props.kid],
				  })
				: commandBackend('addFavorites', {
						kids: [props.kid],
				  });
		} else {
			displayMessage('warning', i18next.t('ERROR_CODES.FAVORITES_ONLINE_NOINTERNET'), 5000);
			return;
		}
	}, [isFavorite]);

	return (
		<button
			type="button"
			onClick={makeFavorite}
			className={`makeFav btn btn-action${isFavorite ? ' currentFav' : ''}`}
		>
			<i className="fas fa-fw fa-star" />
			<span>{isFavorite ? i18next.t('KARA_MENU.FAV_DEL') : i18next.t('KARA_MENU.FAV')}</span>
		</button>
	);
}
