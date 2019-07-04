import React, { Component } from "react";
import { withTranslation } from 'react-i18next';
import axios from 'axios';

class WelcomePage extends Component {
    constructor(props) {
        super(props)
        this.state = {

        };
        this.getCatchphrase = this.getCatchphrase.bind(this);
        this.getNewsFeed = this.getNewsFeed.bind(this);
        this.getCatchphrase();
        this.getNewsFeed();
    }

    async getCatchphrase() {
        const res = await axios.get('/api/public/catchphrase');
        this.setState({ catchphrase: res.data })
    }

    async getNewsFeed() {
        const res = await axios.get('/api/public/newsfeed');
        const data = res.data;
        var base = data[0];
        var appli = data[1];
        var mast = data[2];
        var news = [];
        if (base.body && appli.body) {
            base.body = JSON.parse(base.body);
            appli.body = JSON.parse(appli.body);
            news =
                [
                    {
                        html: base.body.feed.entry[0].content._text,
                        date: base.body.feed.entry[0].updated._text,
                        dateStr: new Date(base.body.feed.entry[0].updated._text).toLocaleDateString(),
                        title: this.props.t("BASE_UPDATE") + ' : ' + base.body.feed.title._text + ' - ' + base.body.feed.entry[0].summary._text,
                        link: base.body.feed.entry[0].link._attributes.href,
                        type: 'base',
                    },
                    {
                        html: appli.body.feed.entry[0].content._text,
                        date: appli.body.feed.entry[0].updated._text,
                        dateStr: new Date(appli.body.feed.entry[0].updated._text).toLocaleDateString(),
                        title: this.props.t("APP_UPDATE") + ' : ' + appli.body.feed.entry[0].title._text + ' - ' + appli.body.feed.entry[0].summary._text,
                        link: appli.body.feed.entry[0].link._attributes.href,
                        type: 'app',
                    },
                ];
        }

        if (mast.body) {
            mast.body = JSON.parse(mast.body);
            for (var i = 0; i < 3; i++) {
                news.push({
                    html: mast.body.rss.channel.item[i].description._text,
                    date: mast.body.rss.channel.item[i].pubDate._text,
                    dateStr: new Date(mast.body.rss.channel.item[i].pubDate._text).toLocaleDateString(),
                    title: mast.body.rss.channel.item[i].title._text,
                    link: mast.body.rss.channel.item[i].link._text,
                    type: 'mast',
                });
            }
        }
        news.sort((a, b) => {
            var dateA = new Date(a.date);
            var dateB = new Date(b.date);
            return dateA < dateB ? 1 : dateA > dateB ? -1 : 0;
        });
        var $news = $('.news');
        news.forEach((e) => {
            $news.append('<li class="new" type="' + e.type + '">'
                + '<p class="new-header"><b>' + e.title + '</b>'
                + '<a href="' + e.link + '" target="_blank">' + e.dateStr + '</a></p>'
                + '<p>' + e.html + '</p>'
                + '</li>');
        });
        $('.new').each((k, e) => {
            if ($(e).prop('scrollHeight') > $(e).outerHeight()) {
                $(e).addClass('overflowed');
            }
        });
    }

    render() {
        const t = this.props.t;
        return (
            <React.Fragment>
                <div className="navbar-default navbar-fixed-top" id="navigation">
                    <div className="container">
                        <div className="navbar-header">
                            <button type="button" className="navbar-toggle collapsed" data-toggle="collapse" data-target="#navbar">
                                <span className="sr-only">Toggle navigation</span>
                                <span className="icon-bar"></span>
                                <span className="icon-bar"></span>
                                <span className="icon-bar"></span>
                            </button>
                        </div>

                        <nav className="collapse navbar-collapse" id="navbar">
                            <ul className="nav navbar-nav navbar-right" id="top-nav">
                                <li className="current hidden"><a href="#body">Home</a></li>
                                <li><a href="#about" className="hidden">{t("WLCM_ABOUTUS")}</a></li>
                                <li><a href="http://mugen.karaokes.moe/contact.html" target="_blank"><i
                                    className="glyphicon glyphicon-pencil"></i> {t("WLCM_CONTACT")}</a></li>
                                <li><a href="http://mugen.karaokes.moe/" target="_blank"><i className="glyphicon glyphicon-link"></i>
                                    {t("WLCM_SITE")}</a></li>
                                <li><a href="#" id="wlcm_login"><i className="glyphicon glyphicon-user"></i>
                                    <span>{t("NOT_LOGGED")}</span></a></li>
                                <li id="wlcm_disconnect" style={{ display: 'none' }}><a href="#" title={t("LOGOUT")} className="logout"><i
                                    className="glyphicon glyphicon-log-out"></i> <span>{t("LOGOUT")}</span></a></li>
                            </ul>
                        </nav>
                    </div>
                </div>

                <section id="center-area">
                    <div className="container">
                        <div className="row">
                            <div className="col-md-12 logoDiv">
                                <h1 className="wow">
                                    <img className="logo-1" height="122" src="/ressources/img/Logo-final-fond-transparent.png" alt="LOGO" />
                                </h1>
                            </div>
                            <div className="col-md-12 text-center catchPhrase">
                                {this.state.catchphrase}
                            </div>
                            <div className="col-md-12 block wow menu zoomIn">

                                <ul id="welcome_dashboard">
                                    <li className="manage">
                                        <div className="dash days_dash">
                                            <i className="digit glyphicon glyphicon-list normalText"></i>
                                            <i className="digit glyphicon glyphicon-hand-right tutorialText"></i>
                                            <div className="dash_title normalText">{t("WLCM_KARAMANAGER")}</div>
                                            <div className="dash_title tutorialText">{t("WLCM_GETSTARTED")}</div>
                                        </div>
                                    </li>
                                    <li>
                                        <div className="dash hours_dash">
                                            <i className="digit glyphicon glyphicon-cog"></i>
                                            <div className="dash_title">{t("WLCM_ADMINISTRATION")}</div>
                                        </div>
                                    </li>
                                    <li>
                                        <div className="dash seconds_dash">
                                            <i className="digit glyphicon glyphicon-user"></i>
                                            <div className="dash_title">{t("WLCM_PUBLIC")}</div>
                                        </div>
                                    </li>
                                    <li className="hidden">
                                        <div className="dash seconds_dash">
                                            <i className="digit glyphicon glyphicon-refresh"></i>
                                            <div className="dash_title">{t("WLCM_UPDATE")}</div>
                                        </div>
                                    </li>
                                    <li>
                                        <div className="dash minutes_dash">
                                            <i className="digit glyphicon glyphicon-question-sign"></i>
                                            <div className="dash_title">{t("WLCM_HELP")}</div>
                                        </div>
                                    </li>
                                </ul>

                            </div>
                            <div className="col-md-12 wow block zoomIn perfectScrollbar">
                                <ul className="news">

                                </ul>

                            </div>
                        </div>
                    </div>
                </section>
            </React.Fragment>
        )
    }
}

export default withTranslation()(WelcomePage);
