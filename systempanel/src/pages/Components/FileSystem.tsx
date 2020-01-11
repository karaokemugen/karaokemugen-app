import { Tree } from 'antd';
import React, {Component} from 'react';
import axios from 'axios';
import { AntTreeNode, AntdTreeNodeAttribute, AntTreeNodeProps, AntTreeNodeSelectedEvent } from 'antd/lib/tree';
const { TreeNode } = Tree;

interface IState {
	treeData: Array<AntdTreeNodeAttribute>;
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
			response = await axios.post('/api/fs', 
			{ path: this.props.fileRequired ? path.substr(0, path.lastIndexOf(this.getSeparator())) : path });
		} catch (error) {
			// Folder don't exist fallback to root folder
			response = await axios.post('/api/fs', { path: '/' });
		}
		let treeData = [];
		let pathFolders = path.split(this.getSeparator());
		if (this.props.os === 'win32') {
			for (const drive of response.data.drives) {
				var element:AntTreeNodeProps = {title: drive.label ? `${drive.label} (${drive.mount})` : drive.identifier, key: `${drive.mount}\\`};	
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
		let response = await axios.post('/api/fs', { path: `${fullPath}${fullPath ? this.getSeparator() : ''}${pathFolders[index]}${this.getSeparator()}`});
		for (const element of response.data.contents) {
			if (element.isDirectory || this.props.seeFiles || this.props.fileRequired) {
				let folder:AntTreeNodeProps = {title: element.name, isLeaf: !element.isDirectory, 
					key: `${response.data.fullPath}${this.getSeparator()}${element.name}`};
				if (element.name === pathFolders[index+1] && element.isDirectory) {
					folder.children = await this.getChildrensRecursively(response.data.fullPath, pathFolders, index+1);
				}
				childrens.push(folder);
			}
		}
		return childrens;
	}

	onLoadData = async (treeNode:AntTreeNode) => {
		if (treeNode.props.children) {
			return;
		}
		let response = await axios.post('/api/fs', { path: treeNode.props.dataRef.key });
		let childrens = [];
		response.data.contents.forEach(element => {
			if (element.isDirectory || this.props.seeFiles || this.props.fileRequired) {
				childrens.push({title: element.name, isLeaf: !element.isDirectory,
					key: `${response.data.fullPath}${this.getSeparator()}${element.name}`});
			}
		});
		treeNode.props.dataRef.children = childrens;
		this.setState({
			treeData: [...this.state.treeData],
		});
	}

	onSelect = async (selectedKeys: string[], e: AntTreeNodeSelectedEvent) => {
		this.props.saveValueModal(selectedKeys.length > 0 ? selectedKeys[0] : null);
	}

	renderTreeNodes = data => {
		return data.map(item => {
			if (item.children) {
				return (
					<TreeNode selectable={(this.props.fileRequired && item.isLeaf) 
						|| (!this.props.fileRequired && !item.isLeaf)}
						 title={item.title} key={item.key} dataRef={item}>
						{this.renderTreeNodes(item.children)}
					</TreeNode>
				);
			} else {
				return <TreeNode selectable={(this.props.fileRequired && item.isLeaf) 
					|| (!this.props.fileRequired && !item.isLeaf)}
					 key={item.key} {...item} dataRef={item} />;
			}
		});
	}

	render() {
		return 	this.state.treeData.length > 0 ?
		 <Tree defaultExpandedKeys={[this.props.path]} onSelect={this.onSelect} 
		 	loadData={this.onLoadData}>{this.renderTreeNodes(this.state.treeData)}</Tree> : null
	}
}


export default FileSystem;
