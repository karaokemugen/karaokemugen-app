import React from 'react';
import { Radio, Input, Modal, Button } from 'antd';
import i18next from 'i18next';
import FileSystem from './FileSystem';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import GlobalContext from '../../store/context';
import { isElectron } from '../../utils/electron';

interface FoldersElementProps {
	onChange: any,
	value?: any[],
	keyModal?: string,
	openFile? : boolean,
	openDirectory?: boolean
}

interface FoldersElementState {
	value: any[] | string,
	visibleModal: boolean;
	indexModal?: number;
	keyModal?: string;
	itemModal?: Array<string>;
	newValueModal?:string;
}

export default class FoldersElement extends React.Component<FoldersElementProps, FoldersElementState> {
	static contextType = GlobalContext
	context: React.ContextType<typeof GlobalContext>
	
	input: any;
	currentVal: any;

	constructor(props) {
		super(props);
		this.state = {
			value: this.props.value || [],
			keyModal: this.props.keyModal,
			visibleModal: false
		};
	}

	async openFileSystemModal(item, index?:number, key?: string) {
		if (isElectron()) {
			await this.setState({itemModal: item, indexModal: index, keyModal: key});
			const {ipcRenderer: ipc} = window.require('electron');
			const path = `${this.getPathForFileSystem(Array.isArray(item) ? item[index] : item, key)}${index === -1 
				? '/' :	(this.context.globalState.settings.data.state.os === 'win32' ? (Array.isArray(item) ? item[index] : item).replace(/\//g, '\\') : (Array.isArray(item) ? item[index] : item))}`;
			const options = {
				defaultPath: path,
				title: this.getTitleModal(),
				buttonLabel: this.getButtonLabel(),
				properties: ['createDirectory']
			};
			if (this.props.openFile) options.properties.push('openFile');
			if (this.props.openDirectory) options.properties.push('openDirectory');
			ipc.send('get-file-paths', options);
			ipc.once('get-file-paths-response', async (event, filepaths) => {
				if (filepaths.length > 0) {
					await this.setState({newValueModal: filepaths[0]});
					this.saveFolders();
				}
			});
		} else {
			this.setState({itemModal: item, indexModal: index, keyModal: key, visibleModal: true})
		}
	}
	
	saveFolders () {
		let value = this.state.value;
		if (this.state.newValueModal) {
			if (this.state.indexModal === undefined) {
				value = this.state.newValueModal.replace('\\', '/');
			} else if (this.state.indexModal === -1) {
				(value as any[]).push(this.state.newValueModal.replace('\\', '/'));
			} else {
				(value as any[])[this.state.indexModal] = this.state.newValueModal.replace(/\\/g, '/')
			}
			this.setState({value: value});
			this.props.onChange && this.props.onChange(value);
		}
	}

	getPathForFileSystem(value:string, key?: string) {
		let regexp = this.context.globalState.settings.data.state.os === 'win32' ? '^[a-zA-Z]:' : '^/';
		if ((Array.isArray(value) && value[0].match(regexp) === null)
		|| (value && !Array.isArray(value) && value.match(regexp) === null)) {
			let path = key?.includes('System.Binaries') ? this.context.globalState.settings.data.state.appPath : this.context.globalState.settings.data.state.dataPath
			return `${path}${this.context.globalState.settings.data.state.os === 'win32' ? '\\' : '/'}`
		} else {
			return ''
		}
	}

	getTitleModal() {
		if (this.state.itemModal 
			&& (this.state.keyModal?.includes('System.Binaries.ffmpeg') 
			|| this.state.keyModal?.includes('System.Binaries.Player'))) {
			return i18next.t('CONFIG.CHOOSE_FILE');
		} else {
			return i18next.t('CONFIG.CHOOSE_DIRECTORY');
		}
	}

	getButtonLabel() {
		return this.props.openDirectory ? i18next.t('CONFIG.ADD_DIRECTORY') : i18next.t('CONFIG.ADD_FILE');
	}

	render() {
			return (
				<div>
					{Array.isArray(this.state.value) ? 
						<React.Fragment>
							{this.state.value.map((element, index) =>
								<div key={element} style={{ display: 'flex', marginBottom: '10px'}}>
									{this.state.value.length > 1 ?
										<React.Fragment>
											<Radio style={{ width: '150px'}} checked={this.state.value[0] === element} 
												onChange={() => {
													let value = (this.state.value as Array<string>).filter(val => val === element)
													.concat((this.state.value as Array<string>).filter(val => val !== element));
													this.setState({ value: value});
													this.props.onChange && this.props.onChange(value);
													}}>
												{this.state.value[0] === element ? i18next.t('CONFIG.PRIMARY_DIRECTORY') : null}
											</Radio>
											<div style={{ width: '50px'}}> 
												<Button type="primary" danger icon={<DeleteOutlined />}
													onClick={() => {
														let value = (this.state.value as any[]);
														value.splice(index, 1);
														this.setState({ value: value});
													}} />
											</div>
										</React.Fragment> : null
									}
									<Input onClick={() => this.openFileSystemModal(this.state.value, index, this.props.keyModal)} 
										style={{maxWidth: this.state.value.length > 1 ? '500px' : '700px'}} defaultValue={element} />
								</div>
							)}
							<Button type='primary' onClick={() => this.openFileSystemModal(this.state.value, -1, this.props.keyModal)}>
								<PlusOutlined />{this.getButtonLabel()}
							</Button>
						</React.Fragment> : 
						<Input onClick={() => this.openFileSystemModal(this.state.value, undefined, this.props.keyModal)} defaultValue={this.state.value} />
					}

					<Modal
						title={this.getTitleModal()}
						visible={this.state.visibleModal}
						onOk={() => {
							this.saveFolders();
							this.setState({visibleModal: false});
						}}
						onCancel={() => this.setState({visibleModal: false})}
						okText={i18next.t('CONFIG.SAVE')}
						cancelText={i18next.t('NO')}
						> 
						{this.state.visibleModal ? <FileSystem saveValueModal={(value) => this.setState({newValueModal: value})} 
							fileRequired={this.state.keyModal?.includes('System.Binaries.ffmpeg') 
							|| this.state.keyModal?.includes('System.Binaries.Player')} os={this.context.globalState.settings.data.state.os}
							path={`${this.getPathForFileSystem(this.state.itemModal[this.state.indexModal], this.state.keyModal)}${this.state.indexModal === -1 
								? '/' :	(Array.isArray(this.state.itemModal) ? this.state.itemModal[this.state.indexModal] : this.state.itemModal)}`
							} /> : null}
					</Modal>
				</div>
            );

	}
}
