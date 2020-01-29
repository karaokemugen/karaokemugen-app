import React from 'react';
import {Icon, Radio, Input, Modal, Button} from 'antd';
import axios from 'axios/index';
import i18next from 'i18next';
import FileSystem from './FileSystem';

interface FoldersElementProps {
	onChange: any,
	value?: any[]
}

interface FoldersElementState {
	value: any[],
	dataPath: string,
	os: string;
	visibleModal: boolean;
	indexModal?: number;
	itemModal?: Array<string>;
	newValueModal?:string | Array<string>;
}

export default class FoldersElement extends React.Component<FoldersElementProps, FoldersElementState> {

	input: any;
	currentVal: any;

	constructor(props) {
		super(props);
		this.state = {
			value: this.props.value || [],
			dataPath: '',
			os: '',
			visibleModal: false
		};
	}

	async componentDidMount() {
		await this.refresh();
	}

	async refresh() {
		await axios.get('/api/settings')
			.then(res => this.setState({dataPath: res.data.state.dataPath, os: res.data.state.os}))
	}

	openFileSystemModal(item, index?:number) {
		this.setState({itemModal: item, indexModal: index, visibleModal: true})
	}
	
	saveFolders () {
		let value = this.state.value;
		if (this.state.indexModal === -1) {
			value.push(this.state.newValueModal);
		} else {
			value[this.state.indexModal] = this.state.newValueModal
		}
		this.setState({value: value});
		this.props.onChange && this.props.onChange(value);
	}

	getPathForFileSystem(value:string) {
		var regexp = this.state.os === 'win32' ? '^[a-zA-Z]:' : '^/';
		if ((Array.isArray(value) && value[0].match(regexp) === null) ) {
			return `${this.state.dataPath}${this.state.os === 'win32' ? '\\' : '/'}`
		} else {
			return ''
		}
	}

	render() {
			return (
				<div>
					{this.state.value.map((element, index) =>
						<div key={element} style={{ display: 'flex', margin: '10px'}}>
							
							{this.state.value.length > 1 ?
							<React.Fragment>
								<Radio style={{ width: '250px'}} checked={this.state.value[0] === element} 
									onChange={() => {
										this.setState({ value: 
											(this.state.value as Array<string>).filter(val => val === element)
											.concat((this.state.value as Array<string>).filter(val => val !== element))});
										}}>
									{this.state.value[0] === element ? i18next.t('CONFIG.PRIMARY_DIRECTORY') : null}
								</Radio>
								<div style={{ width: '100px'}}> 
									<Button type='danger' icon='delete'
										onClick={() => {
											let value = this.state.value;
											value.splice(index, 1);
											this.setState({ value: value});
										}} />
								</div>
								</React.Fragment> : null
							}
							<Input onClick={() => this.openFileSystemModal(this.state.value, index)} defaultValue={element} />
						</div>
					)}
					<Button type='primary' onClick={() => this.openFileSystemModal(this.state.value, -1)}>
						<Icon type="plus" />{i18next.t('CONFIG.ADD_DIRECTORY')}
					</Button>
					<Modal
						title={i18next.t('CONFIG.CHOOSE_DIRECTORY')}
							visible={this.state.visibleModal}
						onOk={() => {
							this.saveFolders();
							this.setState({visibleModal: false});
						}}
						onCancel={() => this.setState({visibleModal: false})}
						okText={i18next.t('CONFIG.SAVE')}
						cancelText={i18next.t('NO')}
						> 
						{this.state.visibleModal ? <FileSystem saveValueModal={(value) => this.setState({newValueModal: value})} os={this.state.os}
							path={`${this.getPathForFileSystem(this.state.itemModal[this.state.indexModal])}${this.state.indexModal === -1 
								? '/' :	this.state.itemModal[this.state.indexModal]}`} /> : null}
					</Modal>
				</div>
			);

	}
}
