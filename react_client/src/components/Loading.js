import React from 'react';

import {Alert, Spin} from 'antd';

export default function Loading() {
	return (
		<Spin tip="Chargement en cours...">
			<Alert
				message="Chargement"
				description="Merci de patientier quelques instants."
				type="info"
			/>
		</Spin>
	);
}