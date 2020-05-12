import React from 'react';
import {Icon, Radio, Input, Modal, Button} from 'antd';
import axios from 'axios/index';
import i18next from 'i18next';
import FileSystem from './FileSystem';

interface FoldersElementProps {
	onChange: any,
	value?: any[],
	keyModal?: string,
	openFile? : boolean,
	openDirectory?: boolean
}

interface FoldersElementState {
	value: any[] | string,
	dataPath: string,
	appPath: string,
	os: string;
	visibleModal: boolean;
	indexModal?: number;
	keyModal?: string;
	itemModal?: Array<string>;
	newValueModal?:string;
}

export default class FoldersElement extends React.Component<FoldersElementProps, FoldersElementState> {

	input: any;
	currentVal: any;

	constructor(props) {
		super(props);
		this.state = {
			value: this.props.value || [],
			keyModal: this.props.keyModal || undefined,
			dataPath: '',
			appPath: '',
			os: '',
			visibleModal: false
		};
	}

	async componentDidMount() {
		await this.refresh();
	}

	async refresh() {
		await axios.get('/api/settings')
			.then(res => this.setState({dataPath: res.data.state.dataPath, os: res.data.state.os, appPath: res.data.state.appPath}))
	}

	async openFileSystemModal(item, index?:number, key?: string) {
		if (this.isElectron()) {
			await this.setState({itemModal: item, indexModal: index, keyModal: key});
			const {ipcRenderer: ipc} = window.require('electron');
			const path = `${this.getPathForFileSystem(Array.isArray(item) ? item[index] : item, key)}${index === -1 
				? '/' :	(this.state.os === 'win32' ? (Array.isArray(item) ? item[index] : item).replace(/\//g, '\\') : (Array.isArray(item) ? item[index] : item))}`;
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

	getPathForFileSystem(value:string, key?: string) {
		var regexp = this.state.os === 'win32' ? '^[a-zA-Z]:' : '^/';
		if ((Array.isArray(value) && value[0].match(regexp) === null)
		|| (value && !Array.isArray(value) && value.match(regexp) === null)) {
			var path = key?.includes('System.Binaries') ? this.state.appPath : this.state.dataPath
			return `${path}${this.state.os === 'win32' ? '\\' : '/'}`
		} else {
			return ''
		}
	}

	isElectron() {
		// Renderer process
		if (typeof window !== 'undefined' && typeof window.process === 'object' && (window.process as any).type === 'renderer') {
			return true;
		}
	
		// Main process
		if (typeof process !== 'undefined' && typeof process.versions === 'object' && !!(process.versions as any).electron) {
			return true;
		}
	
		// Detect the user agent when the `nodeIntegration` option is set to true
		if (typeof navigator === 'object' && typeof navigator.userAgent === 'string' && navigator.userAgent.indexOf('Electron') >= 0) {
			return true;
		}
	
		return false;
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
								<div key={element} style={{ display: 'flex', margin: '10px'}}>
									{this.state.value.length > 1 ?
										<React.Fragment>
											<Radio style={{ width: '250px'}} checked={this.state.value[0] === element} 
												onChange={() => {
													let value = (this.state.value as Array<string>).filter(val => val === element)
													.concat((this.state.value as Array<string>).filter(val => val !== element));
													this.setState({ value: value});
													this.props.onChange && this.props.onChange(value);
													}}>
												{this.state.value[0] === element ? i18next.t('CONFIG.PRIMARY_DIRECTORY') : null}
											</Radio>
											<div style={{ width: '100px'}}> 
												<Button type='danger' icon='delete'
													onClick={() => {
														let value = (this.state.value as any[]);
														value.splice(index, 1);
														this.setState({ value: value});
													}} />
											</div>
										</React.Fragment> : null
									}
									<Input onClick={() => this.openFileSystemModal(this.state.value, index, this.props.keyModal)} defaultValue={element} />
								</div>
							)}
							<Button type='primary' onClick={() => this.openFileSystemModal(this.state.value, -1, this.props.keyModal)}>
								<Icon type="plus" />{this.getButtonLabel()}
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
							|| this.state.keyModal?.includes('System.Binaries.Player')} os={this.state.os}
							path={`${this.getPathForFileSystem(this.state.itemModal[this.state.indexModal], this.state.keyModal)}${this.state.indexModal === -1 
								? '/' :	(Array.isArray(this.state.itemModal) ? this.state.itemModal[this.state.indexModal] : this.state.itemModal)}`
							} /> : null}
					</Modal>
				</div>
			);

	}
}
