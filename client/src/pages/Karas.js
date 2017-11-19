import React, {Component} from 'react';

import {Container, Grid, Header, Segment} from 'semantic-ui-react';
import {connect} from 'react-redux';

class Karas extends Component {
	render() {
		return (
			<Segment
				inverted
				vertical
				style={{ margin: '1em 0em 1em', padding: '1em 0em 1em' }}
			>
				<Container textAlign='center'>
					<Grid columns={2} stackable style={{ padding: '1em', height: '100%'}}>
						<Grid.Column textAlign='left'>
							<Header
								as='h3'
								content='Karas'
								inverted
							/>
						</Grid.Column>
					</Grid>
				</Container>
			</Segment>
		);
	}
}

export default connect()(Karas);