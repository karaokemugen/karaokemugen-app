import { useContext } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';

import GlobalContext from '../store/context';
import { setLastLocation } from './tools';

interface Props {
	component: any;
}

function PrivateRoute(props: Props) {
	const context = useContext(GlobalContext);
	const location = useLocation();

	setLastLocation(location.pathname);
	return context.globalState.auth.isAuthenticated ? (
		props.component
	) : (
		<Routes>
			<Route path="*" element={<Navigate to={`/login${location.search}`} />} />
		</Routes>
	);
}

export default PrivateRoute;
