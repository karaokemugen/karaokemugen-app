import { memo, useEffect, useState } from 'react';

import { User } from '../../../../src/lib/types/user';
import { generateProfilePicLink, syncGenerateProfilePicLink } from '../profilePics';

interface IProps extends React.ImgHTMLAttributes<HTMLImageElement> {
	user: User;
}

function ProfilePicture(props: IProps) {
	const [url, setUrl] = useState(syncGenerateProfilePicLink(props.user));

	const updateUrl = async () => {
		const newUrl = await generateProfilePicLink(props.user);
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
	return <img src={url} alt={props.user?.nickname} title={props.user?.nickname} {...htmlProps} />;
}

export default memo(ProfilePicture, (prev, next) => prev.user.avatar_file === next.user.avatar_file);
