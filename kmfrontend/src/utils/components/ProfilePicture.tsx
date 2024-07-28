import { ImgHTMLAttributes, memo, useContext, useEffect, useState } from 'react';

import { User } from '../../../../src/lib/types/user';
import { generateProfilePicLink, syncGenerateProfilePicLink } from '../profilePics';
import GlobalContext from '../../store/context';
import blankAvatar from '../../assets/blank.png';

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
	}, [props.user.avatar_file]);

	const htmlProps = { ...props, user: undefined };
	return (
		<img
			src={url}
			alt={props.user?.nickname}
			title={props.user?.nickname}
			onError={() => setUrl(blankAvatar)}
			{...htmlProps}
		/>
	);
}

export default memo(ProfilePicture, (prev, next) => prev.user.avatar_file === next.user.avatar_file);
