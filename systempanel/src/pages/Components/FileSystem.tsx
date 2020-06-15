import { Tree } from 'antd';
import React, {Component, ReactText} from 'react';
import { AntTreeNodeProps, TreeNodeNormal } from 'antd/lib/tree/Tree';
import Axios from 'axios';

interface IState {
	treeData: Array<TreeNodeNormal>;
}

interface IProps {
	path: string;
	os: string;
	seeFiles?: boolean;
	fileRequired?: boolean;
	saveValueModal: (value) => void;
}

class FileSystem extends Component<IProps, IState> {

	constructor(props) {
		super(props);
		this.state = {
			treeData: []
		};
	}

	componentDidMount() {
		this.getFileSystem(this.props.path);
	}

	getSeparator() {
		return this.props.os === 'win32' ? '\\' : '/';
	}

	async getFileSystem(path: string) {
		let response;
		try {
			response = await Axios.post('/fs', 
			{ path: this.props.fileRequired ? path.substr(0, path.lastIndexOf(this.getSeparator())) : path });
		} catch (error) {
			// Folder don't exist fallback to root folder
			response = await Axios.post('/fs', { path: '/' });
		}
		let treeData = [];
		let pathFolders = path.split(this.getSeparator());
		if (this.props.os === 'win32') {
			for (const drive of response.data.drives) {
				let element:AntTreeNodeProps = {title: drive.label ? `${drive.label} (${drive.mount})` : drive.identifier, key: `${drive.mount}\\`};	
				if (pathFolders[0] === drive.mount) {
					element.children = await this.getChildrensRecursively('', pathFolders, 0);
				}
				treeData.push(element);
			}
		} else {
			treeData.push(await this.getChildrensRecursively('', pathFolders, 0)[0]);
		}
		this.setState({treeData: treeData});
	}

	async getChildrensRecursively(fullPath:string, pathFolders: Array<string>, index:number) {
		let childrens = [];
		let response = await Axios.post('/fs', { path: `${fullPath}${fullPath ? this.getSeparator() : ''}${pathFolders[index]}${this.getSeparator()}`});
		for (const element of response.data.contents) {
			if (element.isDirectory || this.props.seeFiles || this.props.fileRequired) {
				let folder:AntTreeNodeProps = {title: element.name, isLeaf: !element.isDirectory,
					selectable: (this.props.fileRequired && !element.isDirectory) 
					|| (!this.props.fileRequired && element.isDirectory), 
					key: `${response.data.fullPath}${this.getSeparator()}${element.name}`};
				if (element.name === pathFolders[index+1] && element.isDirectory) {
					folder.children = await this.getChildrensRecursively(response.data.fullPath, pathFolders, index+1);
				}
				childrens.push(folder);
			}
		}
		return childrens;
	}

	onLoadData = async (treeNode) => {
		if (treeNode.children) {
			return;
		}
		let response = await Axios.post('/fs', { path: treeNode.key });
		let childrens = [];
		response.data.contents.forEach(element => {
			if (element.isDirectory || this.props.seeFiles || this.props.fileRequired) {
				childrens.push({title: element.name, isLeaf: !element.isDirectory,
					selectable: (this.props.fileRequired && !element.isDirectory) 
					|| (!this.props.fileRequired && element.isDirectory),
					key: `${response.data.fullPath}${this.getSeparator()}${element.name}`});
			}
		});
		treeNode.children = childrens;
		this.setState({
			treeData: [...this.state.treeData],
		});
	}

	onSelect = async (selectedKeys: ReactText[]) => {
		this.props.saveValueModal(selectedKeys.length > 0 ? selectedKeys[0] : null);
	}

	render() {
		return 	this.state.treeData.length > 0 ?
		 <Tree defaultExpandedKeys={[this.props.path]} onSelect={this.onSelect} 
		 	loadData={this.onLoadData} treeData={this.state.treeData}/> : null
	}
}


export default FileSystem;
