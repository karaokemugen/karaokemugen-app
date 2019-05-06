import React, {Component} from 'react';
import {Button, Checkbox, Form, Icon, Input, InputNumber, message, Select, Tooltip, Upload} from 'antd';
import EditableTagGroup from '../Components/EditableTagGroup';

class KaraForm extends Component<any, any> {

	constructor(props) {
		super(props);

		// If kara is being edited (already has a dateadded) author won't be automatically filled if there's no author already.
		// If there's an author field already in the karadata, it gets filled later.
		this.state = this.createStateFromProps(props);

	}

	createStateFromProps(props) {
		const state = {
			seriesRequired: true,
			overwrite: false,
			subfileList: [],
			mediafileList: [],
			singers: [],
			authors: [],
			tags: ['TAG_ANIME', 'TAG_TVSHOW'],
			series: [],
			creators: [],
			songwriters: [],
			groups: [],
			songtype: 'OP',
			langs: ['jpn']
		};

		if (!this.props.kara.dateadded) {
			this.props.kara.dateadded = new Date();
			localStorage.getItem('username') !== 'admin' ? state.authors = [localStorage.getItem('username')] : state.authors = [];
		}
		if (!this.props.kara.datemodif) this.props.kara.datemodif = this.props.kara.dateadded;
		if (this.props.kara.singers && this.props.kara.singers.length > 0 && !this.props.kara.singers.includes('NO_TAG')) state.singers = this.props.kara.singers;
		if (this.props.kara.series) state.series = this.props.kara.series.split(',');
		if (this.props.kara.groups && this.props.kara.groups.length > 0 && !this.props.kara.groups.includes('NO_TAG')) state.groups = this.props.kara.groups;
		if (this.props.kara.songwriters && this.props.kara.songwriters.length  > 0 && !this.props.kara.songwriters.includes('NO_TAG')) state.songwriters = this.props.kara.songwriters;
		if (this.props.kara.authors && this.props.kara.authors.length > 0 && !this.props.kara.authors.includes('NO_TAG')) state.authors = this.props.kara.authors;
		if (this.props.kara.langs && this.props.kara.langs.length > 0 && !this.props.kara.langs.includes('NO_TAG')) state.langs = this.props.kara.langs;
		if (this.props.kara.creators && this.props.kara.creators.length > 0 && !this.props.kara.creators.includes('NO_TAG')) state.creators = this.props.kara.creators;
		if (this.props.kara.songtype && this.props.kara.songtype.length > 0) state.songtype =  this.props.kara.songtype[0].replace('TYPE_','');
		if (this.props.kara.tags && this.props.kara.tags.length > 0 && !this.props.kara.tags.includes('NO_TAG')) state.tags = this.props.kara.tags;
		if (this.props.kara.mediafile_old) {
			state.overwrite = true;
			state.mediafileList = [{
				uid: -1,
				name: this.props.kara.mediafile_old,
				status: 'done'
			}];
		}
		if (this.props.kara.subfile_old) {
			state.overwrite = true;
			state.subfileList = [{
				uid: -1,
				name: this.props.kara.subfile_old,
				status: 'done'
			}];
		}

		return state;
	}

	componentDidMount() {
		this.onChangeType(this.state.songtype);
		this.props.form.validateFields();
	}

	handleSubmit = (e) => {
		e.preventDefault();
		this.props.form.validateFields((err, values) => {
			if (!err) this.props.save(values);
		});
	};

	isMediaFile = (filename) => {
		return new RegExp('^.+\\.(avi|mkv|mp4|webm|mov|wmv|mpg|ogg|m4a|mp3)$').test(filename);
	};

	onChangeOverwrite = (e) => {
		this.props.form.setFieldsValue({ overwrite: e.target.checked});
	};

	onChangeType = (e) => {
		this.setState({
			seriesRequired: !(e === 'MV' || e === 'LIVE')
		}, () => {
			this.props.form.validateFields(['series'], { force: true });
	  		this.props.form.validateFields(['singer'], { force: true });
    	}
		);
	};

	onMediaUploadChange = (info) => {
		let fileList = info.fileList;
		fileList = fileList.slice(-1);
		this.setState({ mediafileList: fileList });
		if (info.file.status === 'uploading') {
			this.props.form.setFieldsValue({ mediafile: null, mediafile_orig: null });
		} else if (info.file.status === 'done') {
			if (this.isMediaFile(info.file.name)) {
				this.props.form.setFieldsValue({
					mediafile: info.file.response.filename,
					mediafile_orig: info.file.response.originalname
				});
				message.success(`${info.file.name} file added successfully`);
			} else {
				this.props.form.setFieldsValue({ mediafile: null });
				message.error(`${info.file.name} is not a media file`);
				info.file.status = 'error';
				this.setState({ mediafileList: [] });
			}
		} else if (info.file.status === 'error') {
			this.props.form.setFieldsValue({ mediafile: null, mediafile_orig: null });
			this.setState({ mediafileList: [] });
		}
	};

	onSubUploadChange = (info) => {
		let fileList = info.fileList;
		fileList = fileList.slice(-1);
		this.setState({ subfileList: fileList });
		if (info.file.status === 'uploading') {
			this.props.form.setFieldsValue({ subfile: null, subfile_orig: null });
		} else if (info.file.status === 'done') {
			if (info.file.name.endsWith('.ass')) {
				this.props.form.setFieldsValue({
					subfile: info.file.response.filename,
					subfile_orig: info.file.response.originalname
				});
				message.success(`${info.file.name} file added successfully`);
			} else {
				this.props.form.setFieldsValue({ subfile: null, subfile_orig: null });
				message.error(`${info.file.name} is not a subs file`);
				info.file.status = 'error';
				this.setState({ subfileList: [] });
			}
		} else if (info.file.status === 'error') {
			this.props.form.setFieldsValue({ subfile: null });
			this.setState({ subfileList: [] });
		}
	};

	render() {
		const {getFieldDecorator} = this.props.form;

		return (
			<Form
				onSubmit={this.handleSubmit}
				className='kara-form'
			>
				<Form.Item hasFeedback
					label="Media file"
					labelCol={{ span: 3 }}
					wrapperCol={{ span: 6, offset: 0 }}
				>
					<Upload
						action='/api/system/karas/importfile'
						accept='video/*,audio/*'
						multiple={false}
						onChange={this.onMediaUploadChange}
						fileList={this.state.mediafileList}
					>
						<Button>
							<Icon type="upload" />Media File
						</Button>
					</Upload></Form.Item>
				<Form.Item
					label="Lyrics file"
					labelCol={{ span: 3 }}
					wrapperCol={{ span: 6, offset: 0 }}
				>
					<Upload
						action='/api/system/karas/importfile'
						multiple={false}
						onChange={this.onSubUploadChange}
						fileList={this.state.subfileList}
					>
						<Button>
							<Icon type="upload" />Lyrics File
						</Button>
					</Upload></Form.Item>
				<Form.Item hasFeedback
					label={(
						<span>Song title&nbsp;
							<Tooltip title="If you don't know, put the name of the series here as well">
								<Icon type="question-circle-o" />
							</Tooltip>
						</span>
					)}
					labelCol={{ span: 3 }}
					wrapperCol={{ span: 8, offset: 0 }}
				>
					{getFieldDecorator('title', {
						initialValue: this.props.kara.title,
						rules: [{
							required: true,
							message: 'Please enter a song title'
						}],
					})(<Input
						onPressEnter={this.handleSubmit}
						placeholder='Song Title'
					/>)}
				</Form.Item>
				<Form.Item hasFeedback
					label={(
						<span>Serie(s)&nbsp;
							<Tooltip title="If type is MV or LIVE, series is not mandatory, except if it is related to a particular anime series (Love Live, Idolmaster, etc.)">
								<Icon type="question-circle-o" />
							</Tooltip>
						</span>
					)}
					labelCol={{ span: 3 }}
					wrapperCol={{ span: 14, offset: 0 }}
				>
					{getFieldDecorator('series', {
						initialValue: this.state.series,
						rules: [{
							required: this.state.seriesRequired,
							message: 'Series is mandatory if song type is not MV or LIVE'
						}]
					})(<EditableTagGroup
						search={'serie'}
						onChange={ (tags) => this.props.form.setFieldsValue({ series: tags.join(',') }) }
					/>)}
				</Form.Item>
				<Form.Item
					label="Song type"
					labelCol={{ span: 3 }}
					wrapperCol={{ span: 3, offset: 0 }}
				>
					{getFieldDecorator('type', {
						rules: [{required: true}],
						initialValue: this.state.songtype
					})(<Select placeholder={'Song type'}
						onChange={ this.onChangeType }
					>
						<Select.Option value='AMV'>AMV</Select.Option>
						<Select.Option value='CM'>Commercial</Select.Option>
						<Select.Option value='ED'>Ending</Select.Option>
						<Select.Option value='IN'>Insert Song</Select.Option>
						<Select.Option value='OT'>Other</Select.Option>
						<Select.Option value='PV'>Promotional Video</Select.Option>
						<Select.Option value='LIVE'>Concert</Select.Option>
						<Select.Option value='OP'>Opening</Select.Option>
						<Select.Option value='MV'>Music video</Select.Option>
					</Select>)}
				</Form.Item>
				<Form.Item hasFeedback
					label={(
						<span>Song order&nbsp;
							<Tooltip title="If this is the only opening/ending in the series, leave blank.">
								<Icon type="question-circle-o" />
							</Tooltip>
						</span>
					)}
					labelCol={{ span: 3 }}
					wrapperCol={{ span: 1, offset: 0 }}
				>
					{getFieldDecorator('order', {
						initialValue: this.props.kara.order
					})(<InputNumber
						min={0}
						style={{ width: '100%' }}
					/>)}
				</Form.Item>
				<Form.Item hasFeedback
					label={(
						<span>Language(s)&nbsp;
							<Tooltip title={(<a href="https://en.wikipedia.org/wiki/List_of_ISO_639-2_codes">See ISO639-2B codes</a>)}>
								<Icon type="question-circle-o" />
							</Tooltip>
						</span>
					)}
					labelCol={{ span: 3 }}
					wrapperCol={{ span: 6, offset: 0 }}
				>
					{getFieldDecorator('lang', {
						rules: [{required: true}],
						initialValue: this.state.langs
					})(<EditableTagGroup
						search={'lang'}
						onChange={ (tags) => this.props.form.setFieldsValue({ lang: tags.join(',') }) }
					/>)}
				</Form.Item>
				<Form.Item hasFeedback
					label={(
						<span>Broadcast Year&nbsp;
							<Tooltip title="Year when the series was broadcasted. Leave blank if you don't know">
								<Icon type="question-circle-o" />
							</Tooltip>
						</span>
					)}
					labelCol={{ span: 3 }}
					wrapperCol={{ span: 2, offset: 0 }}
				>
					{getFieldDecorator('year', {
						initialValue: this.props.kara.year || 2010,
						rules: [{required: true}]
					})(<InputNumber
						min={0}
						placeholder='Year'
						style={{ width: '100%' }}
					/>)}
				</Form.Item>
				<Form.Item hasFeedback
					label="Singer(s)"
					labelCol={{ span: 3 }}
					wrapperCol={{ span: 6, offset: 0 }}
				>
					{getFieldDecorator('singer', {
						initialValue: this.state.singers,
						rules: [{
							required: !this.state.seriesRequired,
							message: 'Singer is mandatory if song type is MV or LIVE'
						}]
					})(<EditableTagGroup
						tagType={2}
						search={'tag'}
						onChange={ (tags) => this.props.form.setFieldsValue({ singer: tags.join(',') }) }
					/>)}
				</Form.Item>
				<Form.Item
					label={(
						<span>Songwriter(s)&nbsp;
							<Tooltip title="Songwriters compose lyrics AND music.">
								<Icon type="question-circle-o" />
							</Tooltip>
						</span>
					)}
					labelCol={{ span: 3 }}
					wrapperCol={{ span: 6, offset: 0 }}
				>
					{getFieldDecorator('songwriter', {
						initialValue: this.state.songwriters
					})(<EditableTagGroup
						tagType={8}
						search={'tag'}
						onChange={ (tags) => this.props.form.setFieldsValue({ songwriter: tags.join(',') }) }
					/>)}
				</Form.Item>
				<Form.Item
					label={(
						<span>Creator(s)&nbsp;
							<Tooltip title="Entity that created the series. Can be animation studio, movie studio, or game studio">
								<Icon type="question-circle-o" />
							</Tooltip>
						</span>
					)}
					labelCol={{ span: 3 }}
					wrapperCol={{ span: 6, offset: 0 }}
				>
					{getFieldDecorator('creator', {
						initialValue: this.state.creators
					})(<EditableTagGroup
						tagType={4}
						search={'tag'}
						onChange={ (tags) => this.props.form.setFieldsValue({ creator: tags.join(',') }) }
					/>)}
				</Form.Item>
				<Form.Item hasFeedback
					label={(
						<span>Karaoke Author(s)&nbsp;
							<Tooltip title="Is that you? :) When heavily modifying a karaoke, you should add yourself here">
								<Icon type="question-circle-o" />
							</Tooltip>
						</span>
					)}
					labelCol={{ span: 3 }}
					wrapperCol={{ span: 6, offset: 0 }}
				>
					{getFieldDecorator('author', {
						initialValue: this.state.authors
					})(<EditableTagGroup
						tagType={6}
						search={'tag'}
						onChange={ (tags) => this.props.form.setFieldsValue({ author: tags.join(',') }) }
					/>)}
				</Form.Item>
				<Form.Item
					label={(
						<span>Tag(s)&nbsp;
							<Tooltip title={(<a href="http://mugen.karaokes.moe/docs/fr/contrib-guide/tags/">See tag list</a>)}>
								<Icon type="question-circle-o" />
							</Tooltip>
						</span>
					)}
					labelCol={{ span: 3 }}
					wrapperCol={{ span: 10, offset: 0 }}
				>
					{getFieldDecorator('tags', {
						initialValue: this.state.tags
					})(<EditableTagGroup
						tagType={7}
						checkboxes={true}
						search={'tag'}
						onChange={ (tags) => this.props.form.setFieldsValue({ tags: tags.join(',') }) }
					/>)}
				</Form.Item>
				<Form.Item
					label={(
						<span>Group(s)&nbsp;
							<Tooltip title="Download groups for this song">
								<Icon type="question-circle-o" />
							</Tooltip>
						</span>
					)}
					labelCol={{ span: 3 }}
					wrapperCol={{ span: 6, offset: 0 }}
				>
					{getFieldDecorator('groups', {
						initialValue: this.state.groups
					})(<EditableTagGroup
						tagType={9}
						search={'tag'}
						onChange={ (tags) => this.props.form.setFieldsValue({ groups: tags.join(',') }) }
					/>)}
				</Form.Item>
				<Form.Item hasFeedback
					label="Overwrite files"
					labelCol={{ span: 3 }}
					wrapperCol={{ span: 7, offset: 0 }}
				>
					<Checkbox onChange={this.onChangeOverwrite}>WARNING : any existing media or subfile will be overwritten!</Checkbox>
				</Form.Item>
				<Form.Item>
					{getFieldDecorator('overwrite', {
						initialValue: this.state.overwrite
					})(<Input type="hidden" />)}
				</Form.Item>
				<Form.Item
					label='Creation date'
					labelCol={{ span: 3 }}
					wrapperCol={{ span: 8, offset: 0 }}
				>
					{getFieldDecorator('dateadded', {
						initialValue: this.props.kara.dateadded
					})(<Input disabled={true} />)}
				</Form.Item>
				<Form.Item
					label='Last updated date'
					labelCol={{ span: 3 }}
					wrapperCol={{ span: 8, offset: 0 }}
				>
					{getFieldDecorator('datemodif', {
						initialValue: this.props.kara.datemodif
					})(<Input disabled={true} />)}
				</Form.Item>
				<Form.Item
					wrapperCol={{ span: 8, offset: 0 }}
				>
					<Button type='primary' htmlType='submit' className='login-form-button'>
						Save and generate .kara file
					</Button>
				</Form.Item>
				<Form.Item>
					{getFieldDecorator('kid', {
						initialValue: this.props.kara.kid
					})(<Input type="hidden" />)}
				</Form.Item>
				<Form.Item>
					{getFieldDecorator('karafile', {
						initialValue: this.props.kara.karafile
					})(<Input type="hidden" />)}
				</Form.Item>
				<Form.Item>
					{getFieldDecorator('mediafile', {
						initialValue: this.props.kara.mediafile
					})(<Input type="hidden" />)}
				</Form.Item>
				<Form.Item>
					{getFieldDecorator('mediafile_orig', {
						initialValue: null
					})(<Input type="hidden" />)}
				</Form.Item>
				<Form.Item>
					{getFieldDecorator('subfile_orig', {
						initialValue: null
					})(<Input type="hidden" />)}
				</Form.Item>
				<Form.Item>
					{getFieldDecorator('subfile', {
						initialValue: this.props.kara.subfile
					})(<Input type="hidden" />)}
				</Form.Item>

			</Form>
		);
	}
}

const cmp = Form.create()(KaraForm);
export default cmp;
