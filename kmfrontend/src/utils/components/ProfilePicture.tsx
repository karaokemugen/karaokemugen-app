import { ImgHTMLAttributes, memo, useContext, useEffect, useState } from 'react';

import { User } from '../../../../src/lib/types/user';
import blankAvatar from '../../assets/blank.png';
import GlobalContext from '../../store/context';
import { generateProfilePicLink, syncGenerateProfilePicLink, updateCache } from '../profilePics';

interface IProps extends ImgHTMLAttributes<HTMLImageElement> {
	user: User;
}

function ProfilePicture(props: IProps) {
	const [url, setUrl] = useState(syncGenerateProfilePicLink(props.user));
	const context = useContext(GlobalContext);

	const updateUrl = async () => {
		const newUrl = await generateProfilePicLink(props.user, context);
		setUrl(newUrl);
	};

	useEffect(() => {
		if (props.user?.login) {
			updateUrl();
		}
	}, []);

	useEffect(() => {
		updateUrl();
	}, [props.user.avatar_file, props.user.login]);

	const htmlProps = { ...props, user: undefined };
	return (
		<img
			src={url}
			alt={props.user?.nickname}
			title={props.user?.nickname}
			onError={() => {
				setUrl(blankAvatar);
				updateCache(props.user, blankAvatar);
			}}
			{...htmlProps}
		/>
	);
}

export default memo(
	ProfilePicture,
	(prev, next) => prev.user.avatar_file === next.user.avatar_file && prev.user.login === next.user.login
);
