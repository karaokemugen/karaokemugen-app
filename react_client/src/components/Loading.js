import React from 'react';

import {Alert, Spin} from 'antd';

export default function Loading() {
	return (
		<Spin tip="Loading...">
			<Alert
				message="Loading"
				description="Please wait..."
				type="info"
			/>
		</Spin>
	);
}