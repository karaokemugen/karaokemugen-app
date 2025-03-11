import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Input, Modal, Radio } from 'antd';
import i18next from 'i18next';
import { Component } from 'react';

import GlobalContext from '../../store/context';
import { isElectron } from '../../utils/electron';
import FileSystem from './FileSystem';

interface FoldersElementProps {
	onChange: (string) => void;
	value?: string[] | string;
	keyModal?: string;
	openFile?: boolean;
	openDirectory?: boolean;
}

interface FoldersElementState {
	value: string[] | string;
	visibleModal: boolean;
	indexModal?: number;
	keyModal?: string;
	itemModal?: string[];
	newValueModal?: string;
}

export default class FoldersElement extends Component<FoldersElementProps, FoldersElementState> {
	static contextType = GlobalContext;
	context: React.ContextType<typeof GlobalContext>;

	constructor(props) {
		super(props);
		this.state = {
			value: this.props.value || [],
			keyModal: this.props.keyModal,
			visibleModal: false,
		};
	}

	componentDidUpdate(prevProps: FoldersElementProps) {
		if (prevProps.value !== this.props.value) this.setState({ value: this.props.value || [] });
	}

	async openFileSystemModal(item, index?: number, key?: string) {
		if (isElectron()) {
			this.setState({ itemModal: item, indexModal: index, keyModal: key });
			const { ipcRenderer: ipc } = window.require('electron');
			const value = Array.isArray(item) ? item[index] : item;
			const path = `${this.getPathForFileSystem(value, key)}${
				index === -1 || !value
					? '/'
					: this.context.globalState.settings.data.state.os === 'win32'
						? value?.replace(/\//g, '\\')
						: value
			}`;
			const options = {
				defaultPath: path,
				title: this.getTitleModal(),
				buttonLabel: this.getButtonLabel(),
				properties: ['createDirectory'],
			};
			if (this.props.openFile) options.properties.push('openFile');
			if (this.props.openDirectory) options.properties.push('openDirectory');
			ipc.send('get-file-paths', options);
			ipc.once('get-file-paths-response', async (_event, filepaths) => {
				if (filepaths.length > 0) {
					this.setState({ newValueModal: filepaths[0] }, this.saveFolders);
				}
			});
		} else {
			this.setState({ itemModal: item, indexModal: index, keyModal: key, visibleModal: true });
		}
	}

	saveFolders() {
		let value: string | string[] = this.state.value;
		if (this.state.newValueModal) {
			if (this.state.indexModal === undefined) {
				value = this.state.newValueModal.replace(/\\/g, '/');
			} else if (this.state.indexModal === -1) {
				(value as string[]).push(this.state.newValueModal.replace(/\\/g, '/'));
			} else {
				(value as string[])[this.state.indexModal] = this.state.newValueModal.replace(/\\/g, '/');
			}
			this.setState({ value: value });
			if (this.props.onChange) this.props.onChange(value);
		}
	}

	getPathForFileSystem(value: string[] | string, key?: string) {
		const regexp = this.context.globalState.settings.data.state.os === 'win32' ? '^[a-zA-Z]:' : '^/';
		if (
			(Array.isArray(value) && value[0].match(regexp) === null) ||
			(value && !Array.isArray(value) && value.match(regexp) === null)
		) {
			const path = key?.includes('System.Binaries')
				? this.context.globalState.settings.data.state.appPath
				: this.context.globalState.settings.data.state.dataPath;
			return `${path}${this.context.globalState.settings.data.state.os === 'win32' ? '\\' : '/'}`;
		} else {
			return '';
		}
	}

	getTitleModal() {
		if (
			this.state.itemModal &&
			(this.state.keyModal?.includes('System.Binaries.ffmpeg') ||
				this.state.keyModal?.includes('System.Binaries.Player'))
		) {
			return i18next.t('CONFIG.CHOOSE_FILE');
		} else {
			return i18next.t('CONFIG.CHOOSE_DIRECTORY');
		}
	}

	getButtonLabel() {
		return this.props.openDirectory ? i18next.t('CONFIG.ADD_DIRECTORY') : i18next.t('CONFIG.ADD_FILE');
	}

	render() {
		const item = Array.isArray(this.state.itemModal)
			? this.state.itemModal[this.state.indexModal]
			: this.state.itemModal;
		return (
			<div>
				{Array.isArray(this.props.value) ? (
					<>
						{this.props.value.map((element, index) => (
							<div key={element} style={{ display: 'flex', marginBottom: '10px' }}>
								{this.props.value.length > 1 ? (
									<>
										<Radio
											style={{ width: '150px' }}
											checked={this.props.value[0] === element}
											onChange={() => {
												const value = (this.state.value as string[])
													.filter(val => val === element)
													.concat(
														(this.state.value as string[]).filter(val => val !== element)
													);
												this.setState({ value: value });
												if (this.props.onChange) this.props.onChange(value);
											}}
										>
											{this.props.value[0] === element
												? i18next.t('CONFIG.PRIMARY_DIRECTORY')
												: null}
										</Radio>
										<div style={{ width: '50px' }}>
											<Button
												type="primary"
												danger
												icon={<DeleteOutlined />}
												onClick={() => {
													const value = this.state.value as string[];
													value.splice(index, 1);
													this.setState({ value: value });
												}}
											/>
										</div>
									</>
								) : null}
								<Input
									onClick={() =>
										this.openFileSystemModal(this.state.value, index, this.props.keyModal)
									}
									style={{ maxWidth: this.state.value.length > 1 ? '500px' : '700px' }}
									defaultValue={element}
								/>
							</div>
						))}
						<Button
							type="primary"
							onClick={() => this.openFileSystemModal(this.state.value, -1, this.props.keyModal)}
						>
							<PlusOutlined />
							{this.getButtonLabel()}
						</Button>
					</>
				) : (
					<Input
						onClick={() => this.openFileSystemModal(this.props.value, undefined, this.props.keyModal)}
						value={this.state.value}
					/>
				)}

				<Modal
					title={this.getTitleModal()}
					open={this.state.visibleModal}
					onOk={() => {
						this.saveFolders();
						this.setState({ visibleModal: false });
					}}
					onCancel={() => this.setState({ visibleModal: false })}
					okText={i18next.t('CONFIG.SAVE')}
					cancelText={i18next.t('NO')}
				>
					{this.state.visibleModal ? (
						<FileSystem
							saveValueModal={value => this.setState({ newValueModal: value })}
							fileRequired={
								this.state.keyModal?.includes('System.Binaries.ffmpeg') ||
								this.state.keyModal?.includes('System.Binaries.Player')
							}
							os={this.context.globalState.settings.data.state.os}
							path={`${this.getPathForFileSystem(item, this.state.keyModal)}${
								this.state.indexModal === -1 || !item ? '/' : item
							}`}
						/>
					) : null}
				</Modal>
			</div>
		);
	}
}
