import React from 'react';
import { useTranslation } from 'react-i18next';
import PlayerOptions from './PlayerOptions';
import KaraokeOptions from './KaraokeOptions';
import InterfaceOptions from './InterfaceOptions';

var Options = () => {
  const { t } = useTranslation();
  var displays = [];
  return (
    <>
      <div className="col-lg-2 col-xs-0" />
      <div
        className="panel col-lg-8 col-xs-12 modalPage"
      >
        <form className="form-horizontal" id="settings">
          <ul className="nav nav-tabs nav-justified">
            <li className="modal-title active">
              <a
                data-toggle="tab"
                href="#nav-player"
                role="tab"
                aria-controls="nav-login"
                aria-selected="true"
              >
                {t("SETTINGS_PLAYER")}
              </a>
            </li>
            <li className="modal-title">
              <a
                data-toggle="tab"
                href="#nav-karaoke"
                role="tab"
                aria-controls="nav-lokaraokegin"
                aria-selected="false"
              >
                {t("SETTINGS_KARAOKE")}
              </a>
            </li>
            <li className="modal-title">
              <a
                data-toggle="tab"
                href="#nav-interface"
                role="tab"
                aria-controls="nav-interface"
                aria-selected="false"
              >
                {t("SETTINGS_INTERFACE")}
              </a>
            </li>
          </ul>

          <div className="tab-content">
            <div
              id="nav-player"
              role="tabpanel"
              aria-labelledby="nav-player-tab"
              className="modal-body tab-pane fade in active"
            >
              <PlayerOptions displays={displays}/>
            </div>
            <div
              id="nav-interface"
              role="tabpanel"
              aria-labelledby="nav-interface-tab"
              className="modal-body tab-pane fade"
            >
              <InterfaceOptions />
            </div>
            <div
              id="nav-karaoke"
              role="tabpanel"
              aria-labelledby="nav-karaoke-tab"
              className="modal-body tab-pane fade"
            >
              <KaraokeOptions />
            </div>
          </div>
        </form>
      </div>
      <div className="col-lg-2 col-xs-0" />
    </>
  );
};

export default Options;
