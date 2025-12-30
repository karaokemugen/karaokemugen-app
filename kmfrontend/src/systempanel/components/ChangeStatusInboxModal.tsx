import { Form, FormInstance, Input, Modal } from 'antd';
import i18next from 'i18next';
import { useRef, useState } from 'react';

import { commandBackend } from '../../utils/socket';
import { WS_CMD } from '../../utils/ws';
import type { DBInbox, InboxActions } from '../../../../src/lib/types/inbox';

interface ChangeStatusInboxModalProps {
	open: boolean;
	inbox: DBInbox;
	repoName: string;
	status: InboxActions;
	close: () => void;
}

export function ChangeStatusInboxModal(props: ChangeStatusInboxModalProps) {
	const [loading, setLoading] = useState(false);
	const formRef = useRef<FormInstance<{ reason: string }>>(undefined);

	const changeStatus = async values => {
		if ((props.status === 'changes_requested' || props.status === 'rejected') && !values.reason) return;
		try {
			setLoading(true);
			await commandBackend(WS_CMD.CHANGE_INBOX_STATUS, {
				inid: props.inbox.inid,
				repoName: props.repoName,
				status: props.status,
				reason: values.reason,
			});
			closeModal();
		} finally {
			setLoading(false);
		}
	};

	const closeModal = () => {
		formRef.current.resetFields();
		props.close();
	};

	return (
		<Modal
			title={i18next.t('MODAL.CHANGE_STATUS_INBOX.TITLE')}
			cancelText={i18next.t('CANCEL')}
			okText={i18next.t('CONFIRM')}
			confirmLoading={loading}
			onCancel={closeModal}
			onOk={() => {
				formRef.current.submit();
			}}
			open={props.open}
		>
			<Form ref={formRef} onFinish={changeStatus}>
				<Form.Item
					label={i18next.t('MODAL.CHANGE_STATUS_INBOX.REASON')}
					name="reason"
					required={props.status === 'changes_requested' || props.status === 'rejected'}
				>
					<Input.TextArea autoSize placeholder={i18next.t('MODAL.CHANGE_STATUS_INBOX.REASON')} />
				</Form.Item>
			</Form>
		</Modal>
	);
}
