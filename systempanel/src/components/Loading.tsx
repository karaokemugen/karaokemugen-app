import React from 'react';

import {Alert, Spin} from 'antd';
import i18next from 'i18next';

export default function Loading() {
	return (
		<Spin tip={i18next.t('LOADING')}>
			<Alert
				message="Loading"
				description="Please wait..."
				type="info"
			/>
		</Spin>
	);
}