import React, { Component } from "react";
import i18next from 'i18next';
import axios from "axios";
import ReactDOM from 'react-dom';

class ClassicModeModal extends Component {
    constructor(props) {
        super(props);
    }

    playSong() {
        axios.post('/api/public/player/play');
        ReactDOM.unmountComponentAtNode(document.getElementById('modal'));
    }

    render() {
        const t = this.props.t;
        var modalDialogClass = window.innerWidth < 1025 ? "modal-dialog modal-sm" : "modal-dialog modal-md";
        return (
            <div className="modal" id="modalBox">
                <div className={modalDialogClass}>
                    <div className="modal-content">
                        <div className="modal-header">
                            <h4 className="modal-title">{t("CLASSIC_MODE_TITLE_MODAL")}</h4>
                        </div>
                        <div className="modal-body"
                            style={{display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center"}}>
                            <div className="modal-message">{t("CLASSIC_MODE_TEXT_MODAL")}</div>
                            <button className="btn btn-default" type="button" onClick={this.playSong}
                                style={{
                                    width: "75px",
                                    height: "75px",
                                    fontSize: "6rem",
                                    display: "flex",
                                    marginTop: "10px"
                                }}>
                                <i className="fas fa-play"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )
    }
}

export default ClassicModeModal;
