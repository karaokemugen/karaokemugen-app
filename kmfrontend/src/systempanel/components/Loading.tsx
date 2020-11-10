import {Alert, Spin} from 'antd';
import i18next from 'i18next';
import React from 'react';

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