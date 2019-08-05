import React, { Component } from "react";
import { withTranslation } from 'react-i18next';

class ActionsButtons extends Component {
    constructor(props) {
        super(props);
    }

    render() {
        const t = this.props.t;
        var classValue = this.props.isHeader ? "btn btn-default" : "btn btn-sm btn-action"
        return (
            <React.Fragment>
                {(this.props.scope === 'admin' && this.props.idPlaylistTo !== -1 && this.props.idPlaylistTo !== -6) ||
                    (this.props.scope === 'public' && this.props.idPlaylist !== this.props.playlistToAddId) ?
                    <button title={t('TOOLTIP_ADDKARA') + (this.props.scope == 'admin' ? ' - ' + this.props.t('TOOLTIP_ADDKARA_ADMIN') : '')}
                        name="addKara" className={classValue} onClick={this.props.addKara} ><i className="fas fa-plus"></i></button> : null}
                {this.props.scope === 'admin' && this.props.idPlaylist !== -1 && this.props.idPlaylist !== -6 ?
                    <button title={t('TOOLTIP_DELETEKARA')} name="deleteKara"
                        className={classValue} onClick={this.props.deleteKara}><i className="fas fa-minus"></i></button> : null}
                {this.props.scope === 'admin' && this.props.idPlaylistTo >= 0 && this.props.idPlaylist >= 0 ?
                    <button title={t('TOOLTIP_TRANSFERKARA')} name="transferKara" className={classValue}
                        onClick={this.props.transferKara}><i className="fas fa-exchange-alt"></i></button> : null
                }
            </React.Fragment>
        )
    }
}

export default withTranslation()(ActionsButtons);
