import { Layout } from 'antd';
import i18next from 'i18next';
import { Component } from 'react';
import { RouteComponentProps, withRouter } from 'react-router-dom';

import { DBKara } from '../../../../../src/lib/types/database/kara';
import { addListener, removeListener } from '../../../utils/electron';
import { commandBackend } from '../../../utils/socket';
import KaraForm from './KaraForm';

interface KaraEditState {
	kara: DBKara | Record<string, never>;
	save: any;
	loadKara: boolean;
}
class KaraEdit extends Component<RouteComponentProps<{ kid: string }>, KaraEditState> {
	state = {
		kara: {},
		save: () => {},
		loadKara: false,
	};

	componentDidMount() {
		this.loadKara();
	}

	saveNew = async (kara) => {
		try {
			await commandBackend('createKara', kara, true, 300000);
			addListener();
			this.props.history.push('/system/karas');
		} catch (e) {
			// already display
		}
	};

	saveUpdate = async (kara) => {
		try {
			await commandBackend('editKara', kara, true, 300000);
			addListener();
			this.props.history.push('/system/karas');
		} catch (e) {
			// already display
		}
	};

	loadKara = async () => {
		removeListener();
		if (this.props.match.params.kid) {
			const res = await commandBackend('getKara', { kid: this.props.match.params.kid }, true);
			this.setState({ kara: res, save: this.saveUpdate, loadKara: true });
		} else {
			this.setState({ save: this.saveNew, loadKara: true });
		}
	};

	handleCopy = async (kid, repo) => {
		await commandBackend('copyKaraToRepo', { repo, kid }, true);
		this.props.history.push('/system/karas');
	};

	render() {
		return (
			<>
				<Layout.Header>
					<div className="title">
						{i18next.t(
							this.props.match.params.kid ? 'HEADERS.KARAOKE_EDIT.TITLE' : 'HEADERS.KARAOKE_NEW.TITLE'
						)}
					</div>
					<div className="description">
						{i18next.t(
							this.props.match.params.kid
								? 'HEADERS.KARAOKE_EDIT.DESCRIPTION'
								: 'HEADERS.KARAOKE_NEW.DESCRIPTION'
						)}
					</div>
				</Layout.Header>
				<Layout.Content>
					{this.state.loadKara && (
						<KaraForm kara={this.state.kara} save={this.state.save} handleCopy={this.handleCopy} />
					)}
				</Layout.Content>
			</>
		);
	}
}

export default withRouter(KaraEdit);
