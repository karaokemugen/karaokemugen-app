import { QuestionCircleOutlined } from '@ant-design/icons';
import { Form, FormInstance, Input, Modal, Select, Tooltip } from 'antd';
import i18next from 'i18next';
import { useRef, useState } from 'react';

import type { DBKaraTag } from '../../../../src/lib/types/database/kara';
import type { TagTypeNum } from '../../../../src/lib/types/tag';
import { commandBackend } from '../../utils/socket';
import { tagTypes } from '../../utils/tagTypes';
import { WS_CMD } from '../../utils/ws.mjs';

interface CreateTagModalProps {
	initialTagTypes?: TagTypeNum[];
	initialName?: string;
	onClose: () => void;
	onCreate: (tag: DBKaraTag) => void;
	repo: string;
}

export function CreateTagModal(props: CreateTagModalProps) {
	const [loading, setLoading] = useState(false);
	const formRef = useRef<FormInstance<{ name: string; types: TagTypeNum[] }>>(undefined);

	return (
		<Modal
			title={i18next.t('MODAL.CREATE_TAG.TITLE')}
			cancelText={i18next.t('CANCEL')}
			confirmLoading={loading}
			onCancel={props.onClose}
			onOk={() => {
				formRef.current.submit();
			}}
			open={true}
		>
			<Form
				ref={formRef}
				initialValues={{
					name: props.initialName,
					types: props.initialTagTypes,
				}}
				onFinish={async tag => {
					try {
						setLoading(true);
						const response = await commandBackend(WS_CMD.ADD_TAG, {
							...tag,
							repository: props.repo,
							i18n: { eng: tag.name },
						});
						const created = response.message.data;
						props.onCreate({
							...created,
							type_in_kara: created.types[0],
							i18n: created.i18n,
							repository: created.repository,
							priority: created.priority,
						});
						props.onClose();
					} finally {
						setLoading(false);
					}
				}}
			>
				<Form.Item
					label={
						<span>
							{i18next.t('TAGS.NAME')}&nbsp;
							<Tooltip title={i18next.t('TAGS.NAME_TOOLTIP')}>
								<QuestionCircleOutlined />
							</Tooltip>
						</span>
					}
					name="name"
					rules={[
						{
							required: true,
							message: i18next.t('TAGS.NAME_REQUIRED'),
						},
					]}
				>
					<Input placeholder={i18next.t('TAGS.NAME')} />
				</Form.Item>
				<Form.Item
					label={
						<span>
							{i18next.t('TAGS.TYPES')}&nbsp;
							<Tooltip title={i18next.t('TAGS.TYPES_TOOLTIP')}>
								<QuestionCircleOutlined />
							</Tooltip>
						</span>
					}
					name="types"
					rules={[
						{
							required: true,
							message: i18next.t('TAGS.TYPES_REQUIRED'),
						},
					]}
				>
					<Select
						mode="multiple"
						placeholder={i18next.t('TAGS.TYPES')}
						showSearch={false}
						options={Object.keys(tagTypes).map(type => {
							return { value: tagTypes[type].type, label: i18next.t(`TAG_TYPES.${type}_other`) };
						})}
					/>
				</Form.Item>
			</Form>
		</Modal>
	);
}
