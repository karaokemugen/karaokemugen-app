import React, { Component } from "react";
import { withTranslation } from 'react-i18next';
import iso639 from 'iso-639';
import axios from 'axios';
import { parseJwt,createCookie } from '../toolsReact.js'

class ProfilModal extends Component {
    constructor(props) {
        super(props)
        this.favImport = this.favImport.bind(this);
        this.profileDelete = this.profileDelete.bind(this);
    }

    profileDelete() {
        var t = this.props.t;
        displayModal('custom', t('PROFILE_ONLINE_DELETE'),
            '<label>' + t('PROFILE_PASSWORD_AGAIN') + '</label>'
            + '<input type="password" placeholder="' + t('PASSWORD') + '" class="form-control" name="password">', function (data) {
                var response = axios.delete('/api/public/myaccount/online', { password: data.password });
                displayMessage('success', '', t('PROFILE_ONLINE_DELETED'));
                if (response.token) {
                    createCookie('mugenToken', response.token, -1);
                    createCookie('mugenTokenOnline', response.onlineToken, -1);

                    logInfos = parseJwt(response.token);
                    logInfos.token = response.token;
                    logInfos.onlineToken = response.onlineToken;
                    window.initApp();
                }
            }
        );
    }

    favImport(event) {
        if (!window.FileReader) return alert('FileReader API is not supported by your browser.');
        var input = event.target;
        if (input.files && input.files[0]) {
            var file = input.files[0];
            var fr = new FileReader();
            fr.onload = () => {
                displayModal('confirm', this.props.t('CONFIRM_FAV_IMPORT'), '', function (confirm) {
                    if (confirm) {
                        var data = {};
                        data['favorites'] = fr['result'];
                        axios.post('/api/public/favorites/import', data);
                    }
                });
            };
            fr.readAsText(file);
        }
    }

    async favExport() {
        const exportFile = await axios.get('/api/public/favorites/export');
        var dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportFile, null, 4));
        var dlAnchorElem = document.getElementById('downloadAnchorElem');
        dlAnchorElem.setAttribute('href', dataStr);
        dlAnchorElem.setAttribute('download', ['KaraMugen', 'fav', logInfos.username, new Date().toLocaleDateString().replace('\\', '-')].join('_') + '.kmplaylist');
        dlAnchorElem.click();
    }

    render() {
        const t = this.props.t;
        var selectIso = Object.keys(iso639.iso_639_2).map(k => { return { "id": k, "text": iso639.iso_639_2[k][this.props.i18n.language][0] } });
        // $('[name="fallback_series_lang"], [name="main_series_lang"]').select2({ theme: 'bootstrap',
        //     tags: false,
        //     data: selectIso,
        //     dropdownParent: $('#profilModal'),
        //     minimumResultsForSearch: 3
        // });
        return (
            <div className="modal-dialog modal-md">
                <div className="modal-content">
                    <ul className="nav nav-tabs nav-justified modal-header">
                        <li className="modal-title active"><a data-toggle="tab" href="#nav-profil" role="tab" aria-controls="nav-profil" aria-selected="true"> {t("PROFILE")}</a></li>
                        {this.props.loginfos.role !== 'guest' ?
                            <li className="modal-title"><a data-toggle="tab" href="#nav-lang" role="tab" aria-controls="nav-lang" aria-selected="false"> {t("LANGUAGE")}</a></li> : null
                        }
                        <li className="modal-title"><a data-toggle="tab" href="#nav-userlist" role="tab" aria-controls="nav-userlist" aria-selected="false"> {t("USERLIST")}</a></li>
                        <button className="closeModal btn btn-action" data-dismiss="modal" aria-label="Close"></button>
                    </ul>
                    <div className="tab-content" id="nav-tabContent">
                        <div id="nav-profil" role="tabpanel" aria-labelledby="nav-profil-tab" className="modal-body tab-pane fade in active">
                            <div className="profileContent">

                                <div className="col-md-3 col-lg-3 col-xs-12 col-sm-12">

                                    <label htmlFor="avatar" title={t("AVATAR_IMPORT")} className="btn btn-default plGenericButton avatar" name="import">
                                        <img className="img-circle" name="avatar_file"
                                            src="/avatars/blank.png"
                                            alt="User Pic" />
                                        {this.props.loginfos.role !== 'guest' ?
                                            <input id="avatar" className="import-file" type="file" accept="image/*" style={{ display: 'none' }} /> : null
                                        }
                                    </label>
                                    <p name="login"></p>
                                </div>
                                {this.props.loginfos.role !== 'guest' ?
                                    <div className="col-md-9 col-lg-9 col-xs-12 col-sm-12 profileData">
                                        <div className="profileLine">
                                            <i className="glyphicon glyphicon-user"></i>
                                            <input className="form-control" name="nickname" type="text" placeholder={t("PROFILE_USERNAME")} />
                                        </div>
                                        <div className="profileLine">
                                            <i className="glyphicon glyphicon-envelope"></i>
                                            <input className="form-control" name="email" type="text" placeholder={t("PROFILE_MAIL")} />
                                        </div>
                                        <div className="profileLine">
                                            <i className="glyphicon glyphicon-link"></i>
                                            <input className="form-control" name="url" type="text" placeholder={t("PROFILE_URL")} />
                                        </div>
                                        <div className="profileLine">
                                            <i className="glyphicon glyphicon-leaf"></i>
                                            <input className="form-control" name="bio" type="text" placeholder={t("PROFILE_BIO")} />
                                        </div>
                                        <div className="profileLine">
                                            <i className="glyphicon glyphicon-lock"></i>
                                            <input className="form-control" name="password" type="password" placeholder={t("PROFILE_PASSWORD")} />
                                            <input className="form-control passwordConfirmation" type="password" placeholder={t("PROFILE_PASSWORDCONF")} style={{ marginLeft: 3 + 'px' }} />
                                        </div>
                                        <div className="profileLine">
                                            <i className="glyphicon glyphicon-star"></i>
                                            <label htmlFor="favImport" type="button" title={t("FAVORITES_IMPORT")} className="btn btn-action btn-default col-xs-6 col-lg-6 favImport">
                                                <i className="glyphicon glyphicon-import"></i> {t("IMPORT")}
                                                <input id="favImport" className="import-file" type="file" accept=".kmplaylist" style={{ display: 'none' }} onChange={this.favImport} />
                                            </label>
                                            <button type="button" title={t("FAVORITES_EXPORT")} className="btn btn-action btn-default col-xs-6 col-lg-6 favExport" onClick={this.favExport}>
                                                <i className="glyphicon glyphicon-export"></i> {t("EXPORT")}
                                            </button>
                                        </div>
                                        <div className="profileLine">
                                            <button type="button" title={t("PROFILE_CONVERT")} className="btn btn-primary btn-action btn-default col-xs-12 col-lg-12 profileConvert">
                                                <i className="glyphicon glyphicon-retweet"></i> {t("PROFILE_CONVERT")}
                                            </button>
                                            <button type="button" title={t("PROFILE_ONLINE_DELETE")} className="btn btn-primary btn-action btn-default col-xs-12 col-lg-12 profileDelete" onClick={this.profileDelete}>
                                                <i className="glyphicon glyphicon-retweet"></i> {t("PROFILE_ONLINE_DELETE")}
                                            </button>
                                        </div>
                                    </div> : null
                                }
                            </div>
                        </div>
                        <div id="nav-lang" role="tabpanel" aria-labelledby="nav-lang-tab" className="modal-body tab-pane fade in">
                            <div className="profileContent">
                                <div className="col-md-12 col-lg-12 col-xs-12 col-sm-12 profileData">
                                    <div className="profileLine row">
                                        <label htmlFor="series_lang_mode" className="col-xs-6 control-label">{t("SERIE_NAME_MODE")}</label>
                                        <div className="col-xs-6">
                                            <select type="number" className="form-control" name="series_lang_mode">
                                                <option value="-1" default>{t("SERIE_NAME_MODE_NO_PREF")}</option>
                                                <option value="0">{t("SERIE_NAME_MODE_ORIGINAL")}</option>
                                                <option value="1">{t("SERIE_NAME_MODE_SONG")}</option>
                                                <option value="2">{t("SERIE_NAME_MODE_ADMIN")}</option>
                                                <option value="3">{t("SERIE_NAME_MODE_USER")}</option>
                                                <option value="4">{t("SERIE_NAME_MODE_USER_FORCE")}</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="profileLine row">
                                        <label htmlFor="main_series_lang" className="col-xs-6 control-label">{t("MAIN_SERIES_LANG")}</label>
                                        <div className="col-xs-6">
                                            <select type="number" className="form-control" name="main_series_lang">

                                            </select>
                                        </div>
                                    </div>
                                    <div className="profileLine row">
                                        <label htmlFor="fallback_series_lang" className="col-xs-6 control-label">{t("FALLBACK_SERIES_LANG")}</label>
                                        <div className="col-xs-6">
                                            <select type="number" className="form-control" name="fallback_series_lang">

                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div id="nav-userlist" role="tabpanel" aria-labelledby="nav-userlist-tab" className="modal-body tab-pane fade in">
                            <div className="userlist list-group col-md-12 col-lg-12 col-xs-12 col-sm-12">

                            </div>
                        </div>
                        <div className="modal-footer">

                        </div>

                    </div>

                </div>
            </div>
        )
    }
}

export default withTranslation()(ProfilModal);
