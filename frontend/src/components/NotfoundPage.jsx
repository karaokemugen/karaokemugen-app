import { withTranslation } from "react-i18next";
import React, { Component } from 'react';
import image404 from '../assets/nanami_.jpg'

class NotfoundPage extends Component {
    constructor(props) {
        super(props);
    }

    render() {
        return (
            <React.Fragment>
            <p>{location.pathname}</p>
            <h1>{this.props.t("404")}</h1>
            <h3>{this.props.t("404_2")}</h3>
            <strong><pre>    * &lt;----- {this.props.t("404_3")}</pre></strong>
            <img height="500" src={image404} />
        </React.Fragment>
        )
    }
}

export default withTranslation()(NotfoundPage);