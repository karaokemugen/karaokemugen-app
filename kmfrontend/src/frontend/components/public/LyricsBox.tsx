import './LyricsBox.scss';

import i18next from 'i18next';
import React, { Component } from 'react';

import {ASSLine} from '../../../../../src/lib/types/ass';
import {PublicPlayerState} from '../../../../../src/types/state';
import {commandBackend, getSocket} from '../../../utils/socket';
import {is_touch_device} from '../../../utils/tools';

interface IProps {
	kid?: string
	mobile?: boolean
}

interface IState {
	lyrics: ASSLine[],
	showLyrics: boolean
	timePosition: number
}

class LyricsBox extends Component<IProps, IState> {
	constructor(props) {
		super(props);
		this.state = {
			lyrics: [],
			showLyrics: !is_touch_device(),
			timePosition: -1
		};
	}

	fetchLyrics = async () => {
		if (this.props.kid) {
			const lyrics = await commandBackend('getKaraLyrics', {kid: this.props.kid});
			this.setState({ lyrics: lyrics || [] });
		} else {
			this.setState({ lyrics: [] });
		}
	}

	refreshTimePosition = (data: Partial<PublicPlayerState>) => {
		if (data.timeposition) {
			this.setState({ timePosition: data.timeposition });
		}
	};

	componentDidMount() {
		getSocket().on('playerStatus', this.refreshTimePosition);
		this.fetchLyrics();
	}

	componentDidUpdate(prevProps: Readonly<IProps>) {
		if (prevProps.kid !== this.props.kid) {
			this.fetchLyrics();
		}
	}

	render() {
		return (<div className={`lyrics-box${this.props.mobile ? ' mobile':''}`}>
			{this.props.mobile ? <div className="toggle" onClick={() => this.setState({showLyrics: !this.state.showLyrics})}
									  tabIndex={0}>
				{i18next.t('PUBLIC_HOMEPAGE.SHOW_LYRICS')}
				<i className={this.state.showLyrics ? 'fa fa-fw fa-arrow-up' : 'fa fa-fw fa-arrow-down'}/></div> : null}
			{this.state.showLyrics ?
				<div className="lyrics">
					{
						this.state.lyrics.map((val, index) => {
							return <div
								className={`${(val.start+0.4 < this.state.timePosition) && (this.state.timePosition < val.end-0.5) ? 'current':''}
											${((val.start-0.15) < this.state.timePosition) && (this.state.timePosition < val.start+0.4) ? 'incoming':''}`}
								key={index}
							>{val.text}</div>;
						})
					}
				</div> : null}
		</div>);
	}
}

export default LyricsBox;
