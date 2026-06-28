import { Form, FormInstance, Input, Modal, Popconfirm } from 'antd';
import i18next from 'i18next';
import { useContext, useEffect, useRef, useState } from 'react';

import { commandBackend } from '../../utils/socket';
import { WS_CMD } from '../../utils/ws';
import type { DBInbox, InboxActions } from '../../../../src/lib/types/inbox';
import type { Repository } from '../../../../src/lib/types/repo';
import { getLanguagesInLocaleFromCode } from '../../utils/isoLanguages';
import GlobalContext from '../../store/context';
import type { User } from '../../../../src/lib/types/user';

interface ChangeStatusInboxModalProps {
	open: boolean;
	inbox: DBInbox;
	instance: Repository;
	status: InboxActions;
	close: () => void;
}

export function ChangeStatusInboxModal(props: ChangeStatusInboxModalProps) {
	const context = useContext(GlobalContext);
	const [loading, setLoading] = useState(false);
	const [popupOpen, setPopupOpen] = useState(false);
	const [authorLanguage, setAuthorLanguage] = useState<string>();
	const [stylePopConfirm, setStylePopConfirm] = useState<unknown>();
	const formRef = useRef<FormInstance<{ reason: string }>>(undefined);

	const changeStatus = async values => {
		if ((props.status === 'changes_requested' || props.status === 'rejected') && !values.reason) return;
		try {
			setLoading(true);
			await commandBackend(WS_CMD.CHANGE_INBOX_STATUS, {
				inid: props.inbox.inid,
				repoName: props.instance.Name,
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

	const fetchContactInformations = async () => {
		if (props.inbox.contact?.endsWith(`@${props.instance.Name}`)) {
			const userDetails: User = await fetch(
				`http${props.instance.Secure && 's'}://${props.instance.Name}/api/users/${encodeURIComponent(props.inbox.contact?.replace(`@${props.instance.Name}`, ''))}?forcePublic=true`,
				{
					headers: {
						authorization: localStorage.getItem('kmOnlineToken'),
					},
				}
			).then(res => res.json());
			setAuthorLanguage(
				getLanguagesInLocaleFromCode(userDetails.language, context.globalState.settings.data.user.language)
			);
		} else {
			setAuthorLanguage(undefined);
		}
	};

	useEffect(() => {
		fetchContactInformations();
	}, [props.inbox]);

	const handleCancel = event => {
		if (formRef.current.getFieldValue('reason')) {
			setStylePopConfirm({
				root: {
					left: event.clientX > 600 ? `${event.clientX - 575}px` : '0%',
					top: event.clientY > 100 ? `${event.clientY - 100}px` : '0%',
				},
			});
			setPopupOpen(true);
		} else {
			closeModal();
		}
	};

	const handlePopupConfirm = () => {
		setPopupOpen(false);
		closeModal();
	};

	const handlePopupCancel = () => {
		setPopupOpen(false);
	};

	return (
		<Modal
			title={i18next.t('MODAL.CHANGE_STATUS_INBOX.TITLE', {
				status: i18next.t(`INBOX.STATUS.${props.status?.toUpperCase()}`),
			})}
			cancelText={i18next.t('CANCEL')}
			okText={i18next.t('CONFIRM')}
			confirmLoading={loading}
			onCancel={handleCancel}
			onOk={() => {
				formRef.current.submit();
			}}
			open={props.open}
			closeIcon={false}
		>
			<Popconfirm
				title={i18next.t('MODAL.CHANGE_STATUS_INBOX.CONFIRM_CLOSING')}
				styles={stylePopConfirm}
				open={popupOpen}
				onConfirm={handlePopupConfirm}
				onCancel={handlePopupCancel}
				okText={i18next.t('YES')}
				cancelText={i18next.t('NO')}
			/>
			<div className="mt-4 mb-2">{i18next.t('MODAL.CHANGE_STATUS_INBOX.NAME', { name: props.inbox?.name })}</div>
			{authorLanguage ? (
				<div className="mt-2 mb-4">
					{i18next.t('MODAL.CHANGE_STATUS_INBOX.LANGUAGE_AUTHOR_INBOX', { language: authorLanguage })}
				</div>
			) : null}
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
