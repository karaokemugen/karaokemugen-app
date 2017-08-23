var status;
var mode;
var mouseDown;
var scope;
var refreshTime;
var stopUpdate;
var oldState;
var oldSearchVal;
var ajaxSearch, timer;
var pseudo;
var addKaraHtml;
var deleteKaraHtml;
var transferKaraHtml;
var infoKaraHtml;
var buttonHtmlPublic;
var closeButton;
var showFullTextButton;

(function (yourcode) {
    // The global jQuery object is passed as a parameter
    yourcode(window.jQuery, window, document);
}(function ($, window, document) {
    $(function () {


        refreshCommandStates();
        initSwitchs();
        setInterval(function () {
            if (!stopUpdate) {
                refreshCommandStates("refresh");
            }
        }, refreshTime);

        // méthode intelligente, on attend 80ms après que la personne ait arrêté d'écrire, on abort toute requete de recherche en cours, et on relance
        $('#searchPlaylist1, #searchPlaylist2').on('input', function () {
            var num = $(this).attr('num');

            clearTimeout(timer);
            timer = setTimeout(function () {
                fillPlaylist(num);
            }, 80);
        });

        /* // méthode de base, on écrit, ça recherche
        $('#search').on('input', function () {
            var val = $(this).val();
            console.time('public/karas?filter=' + val);
            fillPlaylist('playlist1', 'public/karas?filter=' + val, 'list', addKaraHtml);
        });
        */

        // get & build playlist list on screen

        /* // méthode cyclique, toutes les 300ms on vérifie si la valeur de recherche a changé et lance la recherche
         setInterval(function () {
             checkSearch();
         }, 300);*/

        $("#selectPlaylist1, #selectPlaylist2").change(function () {
            var val = $(this).val();
            var num = $(this).attr('num');
            // prevent selecting 2 times the same playlist
            if (scope === "admin") {
                $("select[type='playlist_select'][id!='selectPlaylist" + num + "'] > option").prop("disabled", false);
                $("select[type='playlist_select'][id!='selectPlaylist" + num + "'] > option[value='" + val + "']").prop("disabled", true);
                $("select[type='playlist_select'][id!='selectPlaylist" + num + "']").select2({ theme: "bootstrap", templateResult: formatPlaylist });
            }

            var option = $(this).find("option:selected");
            ["current", "public"].forEach(function (e) {
                if (option.attr(e) == "1") { $("#flag" + num + " > button[name='" + e + "").removeClass('btn-default').addClass('btn-primary'); }
                else { $("#flag" + num + " > button[name='" + e + "").removeClass('btn-primary').addClass('btn-default'); }
            });
            $("#flag" + num + " > button[name='visible'] > i").attr('class', option.attr('visible') ? 'glyphicon glyphicon-eye-open' : 'glyphicon glyphicon-eye-close');

            $("#playlist" + num).empty();
            $("#searchPlaylist" + num).val("");
            fillPlaylist(num, "list");
        });

        /*
            actions on karas in the playlists
        */
        $('.playlist-main').on('click', '.btnDiv > button', function (e) {
            var num = $(this).closest('ul.list-group').attr('num');
            var idPlaylistFrom = $('#selectPlaylist' + num).val();
            var idPlaylistTo = $('#selectPlaylist' + non(num)).val();
            var idKara = $(this).closest('li').attr('idkara');
            var idKaraPlaylist = $(this).closest('li').attr('idplaylistcontent');
            var action = $(this).attr('name');
            console.log(action, num, idPlaylistFrom, idPlaylistTo, idKara);
            var url, data, type
            if (action === "addKara" || action === "transferKara") {
                url = "", data = {}, type = "";
                type = "POST";

                if (idPlaylistTo > 0) {
                    url = scope + (scope === "public" ? '/karas/' + idKara : '/playlists/' + idPlaylistTo + '/karas');
                    data = { requestedby: pseudo, kara_id: idKara }; // pos : 
                } else if (idPlaylistTo == -1) {
                    console.log("ERR: can't add kara to the kara list from database");
                } else if (idPlaylistTo == -2) {
                    url = scope + '/blacklist/criterias'
                    data = { blcriteria_type: 1001, blcriteria_value: idKara };
                } else if (idPlaylistTo == -3) {
                    url = scope + '/whitelist';
                    data = { kara_id: idKara, reason: prompt("Raison d'ajout à la whitelist") };
                }

                console.log("ACTION : ", idPlaylistTo, url, type, data);
                if (url !== "") {
                    $.ajax({
                        url: url,
                        type: type,
                        data: data
                    }).done(function (data) {
                        fillPlaylist(non(num), idKara);
                        console.log("Kara " + idKara + " ajouté à la playlist (" + idPlaylistTo + ") "
                            + $("#selectPlaylist" + non(num) + " > option[value='" + idPlaylistTo + "']").text() + ".");
                    }).fail(function (data) {
                        scrollToKara(non(num), idKara);
                        console.log("ERR : ", data.responseText);
                    });
                }
            }
            if (action === "transferKara" || action === "deleteKara") {
                $(this).closest('li').fadeOut(500);
                url = "", data = {}, type = "";
                type = "DELETE"
                if (idPlaylistFrom > 0) {
                    url = scope + '/playlists/42/karas/' + idKaraPlaylist;
                } else if (idPlaylistFrom == -1) {
                    console.log("ERR: can't delete kara from the kara list from database");
                } else if (idPlaylistFrom == -2) {
                    console.log("ERR: can't delete kara directly from the blacklist");
                } else if (idPlaylistFrom == -3) {
                    url = scope + '/whitelist/' + idKara;
                }
                if (url !== "") {
                    $.ajax({
                        type: 'DELETE',
                        url: url
                    }).done(function (data) {
                        fillPlaylist(num);
                    });
                }
            }
        });

        $('.playlist-main').on('click', '.infoDiv > button', function (e) {
            var liKara = $(this).closest('li');
            var infoKara = liKara.find('.detailsKara');

            if (infoKara.is(':empty')) {
                var idKara = liKara.attr('idkara');
                $.ajax({ url: 'public/karas/' + idKara }).done(function (data) {
                    data = data[0];
                    details = {
                        "Author": data['author']
                        , "Viewcount": data['viewcount']
                        , "Creator": data['creator']
                        , "Duration": data['duration']
                        , "Language": data['language_i18n']
                        , "Misc": data['misc_i18n']
                        , "Series": data['series']
                        , "Series_altname": data['series_altname']
                        , "Singer": data['singer']
                        , "Type ": data['songtype_i18n'] + data['songorder'] > 1 ? " " + data['songorder'] : ""
                        , "Added ": (data['date_add'] ? data['date_add'] : "") + (data['pseudo_add'] ? " by " + data['pseudo_add'] : "")
                        , "Pos": data['pos']
                        , "series": data['series']
                        , "series_altname": data['series_altname']
                    }
                    var htmlDetails = Object.keys(details).map(function (k) {
                        return details[k] ? "<strong>" + k + "</strong> " + details[k] + "<br/>" : "";
                    });
                    infoKara.html(showFullTextButton + htmlDetails.join(""));
                    infoKara.show(animTime);
                    liKara.find('[name="infoKara"]').css('border-color', '#8aa9af');
                });
            } else if (infoKara.is(':visible')) {
                infoKara.hide(animTime);
                liKara.find('[name="infoKara"]').css('border-color', '');
            } else {
                infoKara.show(animTime);
                liKara.find('[name="infoKara"]').css('border-color', '#8aa9af');
            }
        });

        $('.playlist-main').on('click', '.fullLyrics', function (e) {
            var playlist = $(this).closest('ul');
            var liKara = $(this).closest('li');
            var idKara = liKara.attr('idkara');
            var detailsKara = liKara.find('.detailsKara');

            $.ajax({ url: 'public/karas/' + idKara + '/lyrics' }).done(function (data) {
                liKara.append("<div class='lyricsKara alert alert-info'>" + closeButton + data.join('<br/>') + "</div>");
                scrollToElement(playlist, detailsKara);
            });
        });

        $('.playlist-main').on('click', '.closeParent', function (e) {
            var el = $(this);
            el.parent().fadeOut(animTime, function(){
                el.parent().remove();
            });
        });

        $('input[type="checkbox"],[switch="onoff"]').on('switchChange.bootstrapSwitch', function (event) {
            //alert($(this).is(':checked'));
            $(this).val($(this).is(':checked') ? 1 : 0);
        });

        $(window).trigger('resize');
    });
    animTime = $(window).width() < 1000 ? 0 : 400;
    
    mode = "list";
    refreshTime = 2000;
    stopUpdate = false;
    oldState = {};
    oldSearchVal = "";
    ajaxSearch = {}, timer;
    pseudo = "Anonymous";
    addKaraHtml = '<button name="addKara" class="btn btn-sm btn-action"><i class="glyphicon glyphicon-plus"></i></button>';
    deleteKaraHtml = '<button name="deleteKara" class="btn btn-sm btn-action"><i class="glyphicon glyphicon-minus"></i></button>';
    transferKaraHtml = '<button name="transferKara" class="btn btn-sm btn-action">'
        + '<i class="glyphicon glyphicon-arrow-left"></i><i class="glyphicon glyphicon-arrow-right"></i></button>'
    infoKaraHtml = '<button name="infoKara" class="btn btn-sm btn-action"><i class="glyphicon glyphicon-info-sign"></i></button>';
    closeButton = '<button class="closeParent btn btn-sm btn-action"><i class="glyphicon glyphicon-remove"></i></button>';
    showFullTextButton = "<button class='fullLyrics btn btn-action'><i class='glyphicon glyphicon-align-justify'></i></button>";
    buttonHtmlPublic = '';


    $.ajaxPrefilter(function (options) {
        options.url = window.location.protocol + "//" + window.location.hostname + ":1339/api/v1/" + options.url
    });

    /**
     * Fill playlist on screen with karas
     * @param {1, 2} num - which playlist on the screen
     * @param {String} filter - add a search filter to the request
     */

    fillPlaylist = function (num, idKara) {
        var idPlaylist = $("#selectPlaylist" + num).val();
        var filter = $("#searchPlaylist" + num).val();
        var url, html, canTransferKara, canAddKara;
        if (idPlaylist > 0) {
            url = scope + '/playlists/' + idPlaylist + '/karas';
            html = scope === "admin" ? transferKaraHtml + deleteKaraHtml + addKaraHtml : '';
            canTransferKara = true;
            canAddKara = true;
        } else if (idPlaylist == -1) {
            url = 'public/karas';
            html = addKaraHtml;
            canTransferKara = false;
            canAddKara = false;
        } else if (idPlaylist == -2) {
            url = scope + '/blacklist';
            html = scope === "admin" ? '' : '';
            canTransferKara = false;
            canAddKara = true;
        } else if (idPlaylist == -3) {
            url = scope + '/whitelist';
            html = scope === "admin" ? transferKaraHtml + deleteKaraHtml + addKaraHtml : '';
            canTransferKara = true;
            canAddKara = true;
        }
        urlFiltre = url + "?filter=" + filter;

        console.time('ajax');
        if (ajaxSearch[url]) { ajaxSearch[url].abort(); }
        ajaxSearch[url] = $.ajax({ url: urlFiltre }).done(function (data) {
            var time = console.timeEnd('ajax');
            console.time('html');

            var htmlContent = "";
            if (mode === "list") {
                for (var key in data) {
                    if (data.hasOwnProperty(key)) {
                        if (data[key].language === null) data[key].language = "";
                        htmlContent += "<li idKara='" + data[key].kara_id + "' idplaylistcontent='" + data[key].playlistcontent_id + "' class='list-group-item'>"
                            + "<div class='btnDiv'>" + html + "</div><div class='infoDiv'>" + infoKaraHtml + "</div><div class='contentDiv''>"
                            + [data[key].language.toUpperCase(), data[key].serie, data[key].songtype_i18n_short, data[key].title].join(" - ")
                            + "</span><span class='badge'>" + data[key].language.toUpperCase() + "</span></div>"
                            + "<div class='detailsKara alert alert-info' style='display: none;'></div>"

                            + "</li>";

                    }
                }
            }
            if (scope == "admin") {
                $('#playlist' + non(num)).attr('canTransferKara', canTransferKara).attr('canAddKara', canAddKara);
            }

            var time = console.timeEnd('html');
            var time2 = console.timeEnd(url);

            document.getElementById("playlist" + num).innerHTML = htmlContent;

            if (idKara !== undefined) { scrollToKara(num, idKara); }
        });
    }

    scrollToKara = function (num, idKara) {
        $playlist = $("#playlist" + num);
        $kara = $playlist.find("li[idkara='" + idKara + "']");
        if ($kara.length > 0) { scrollToElement($playlist, $kara); }
        // TODO higlight change background color on focus then get back to normal on blur
        $kara.find('.contentDiv').hide().show(animTime, 'linear');
        $kara.focus();
    }

    scrollToElement = function (parent, element) {
        parent.animate({
            scrollTop: parent.scrollTop() + element.offset().top - parent.offset().top
        }, animTime);
    }

    fillPlaylistSelects = function () {
        var playlistList = {};
        $.ajax({ url: scope + '/playlists', }).done(function (data) {
            playlistList = data;
            if (scope === "admin") {
                playlistList.push({ "playlist_id": -1, "name": "Karas" });
                playlistList.push({ "playlist_id": -2, "name": "Blacklist" });
                playlistList.push({ "playlist_id": -3, "name": "Whitelist" });
            } else if (scope === "public") {
                if (settingsPublic['EngineAllowViewBlacklist'] == 1) playlistList.push({ "playlist_id": -2, "name": "Blacklist" });
                if (settingsPublic['EngineAllowViewWhitelist'] == 1) playlistList.push({ "playlist_id": -3, "name": "Whitelist" });
            }

            $.each(playlistList, function (key, value) {
                $("select[type='playlist_select']").append('<option current="' + value.flag_current + '" public="' + value.flag_public
                    + '" visible="' + value.flag_visible + '" value=' + value.playlist_id + '>' + value.name + '</option>');
            });

            $(".select2").select2({ theme: "bootstrap", templateResult: formatPlaylist });

            // TODO à suppr ?
            $("#selectPlaylist1").val(-1).change();
            if (scope === "admin") {
                $("#selectPlaylist2").val(1).change();
            } else if (scope === "public") { // tester si playlistAjoutId existe et sinon trigger le code mis dans une fonction ?
                if (playlistAjoutId == undefined) {
                    $.ajax({ url: 'public/player' }).done(function (data) {
                        var playlistAjout = data['private'] == 1 ? "current" : "public";
                        $.ajax({ url: 'public/playlists/' + playlistAjout, }).done(function (data) {
                            playlistAjoutId = data.playlist_id;
                            $("#selectPlaylist2").val(playlistAjoutId).change();
                        });
                    });
                } else {
                    $("#selectPlaylist2").val(playlistAjoutId).change();
                }
            }

        }).fail(function (data) {
            console.log(data);
        });
    };

    checkSearch = function () {
        if ($('#search').val() != oldSearchVal) {
            oldSearchVal = $('#search').val();
            console.time('public/karas?filter=' + oldSearchVal);
            fillPlaylist(1);
        } else {
            console.log("recherche identique");
        }
    }

    // refresh screen depending on player infos
    refreshCommandStates = function (callback, param1) {
        $.ajax({ url: 'public/player' }).done(function (data) {
            if (oldState != data) {
                var newWidth = 100 * (data.timePosition + refreshTime / 1000) / $('#karaInfo').attr('length') + '%';
                if (data.timePosition != oldState.timePosition && $('#karaInfo').attr('length') != 0) {
                    $('#progressBarColor').stop().animate({ width: newWidth }, refreshTime, 'linear');
                }
                if (oldState.status != data.status || oldState.playerStatus != data.playerStatus) {
                    status = data.status === "stop" ? "stop" : data.playerStatus;
                    //console.log("status : " + status + " enginestatus : " + data.status  + " playerStatus : " + data.playerStatus );
                    switch (status) {
                        case "play":
                            $('#play').find('i').attr('class', 'glyphicon glyphicon-pause');
                            $('#play').val('pause');
                            break;
                        case "pause":
                            $('#play').find('i').attr('class', 'glyphicon glyphicon-play');
                            $('#play').val('play');
                            break;
                        case "stop":
                            $('#play').find('i').attr('class', 'glyphicon glyphicon-play');
                            $('#play').val('play');
                            break;
                        default:
                            console.log("ERR : Kara status unknown : " + status);
                    }
                }
                if (data.currentlyPlaying !== oldState.currentlyPlaying && data.currentlyPlaying > 0) {
                    $('#progressBarColor').stop().css('width', newWidth);
                    $.ajax({ url: 'public/karas/' + data.currentlyPlaying }).done(function (dataKara) {
                        $('#karaInfo').attr('idKara', dataKara[0].kara_id);
                        $('#karaInfo > span').text([dataKara[0].language.toUpperCase(), dataKara[0].serie, dataKara[0].songtype_i18n_short, dataKara[0].title].join(" - "));
                        $('#karaInfo').attr('length', dataKara[0].duration);
                    });
                }
                if (data.muteStatus != oldState.muteStatus) {
                    if (data.muteStatus) {
                        $('#volume').find('i').attr('class', 'glyphicon glyphicon-volume-off');
                        $('#volume').val('unmute');
                    } else {
                        $('#volume').find('i').attr('class', 'glyphicon glyphicon-volume-up');
                        $('#volume').val('mute');
                    }
                }
                if (data.ontop != oldState.ontop) {
                    $('input[name="toggleAlwaysOnTop"]').bootstrapSwitch('state', data.ontop, true);
                }
                if (data.fullscreen != oldState.fullscreen) {
                    $('input[name="toggleFullscreen"]').bootstrapSwitch('state', data.fullscreen, true);
                }

                oldState = data;
                if (callback && typeof callback === "function" && typeof param1 != "undefined") {
                    callback(param1);
                }
            }
        });
    };

    initSwitchs = function () {
        $("input[switch='onoff'],[name='EnginePrivateMode'],[name='kara_panel']").bootstrapSwitch('destroy', true);

        $("input[switch='onoff']").bootstrapSwitch({
            wrapperClass: "btn btn-default",
            "data-size": "normal"
        });
        $("[name='EnginePrivateMode'],[name='kara_panel']").bootstrapSwitch({
            "wrapperClass": "btn btn-default",
            "data-size": "large",
            "labelWidth": "0",
            "handleWidth": "65",
            "data-inverse": "false"
        });
    };

    formatPlaylist = function (playlist) {
        if (!playlist.id) { return playlist.text; }
        if (!$(playlist.element).attr('current') == "1" && !$(playlist.element).attr('public') == "1") { return playlist.text; }

        var icon = $(playlist.element).attr('current') == "1" ? '<i class="glyphicon glyphicon-facetime-video"></i>' : '';
        icon += $(playlist.element).attr('public') == "1" ? ' ' + '<i class="glyphicon glyphicon-indent-left"></i>' : '';
        var $option = $('<span>' + icon + ' ' + playlist.text + '</span>');

        return $option;
    };

    /* opposite number of playlist : 1 or 2 */
    non = function (num) {
        return 3 - parseInt(num);
    }

    $(window).resize(function () {
        //  initSwitchs();$
        var topHeight = $('.panel-heading.container-fluid').outerHeight();
        $('#playlist1').css('height', 'calc(100% - ' + (scope === "public" ? 0 : topHeight) + 'px  ');
        $('#playlist2').css('height', 'calc(100% - ' + topHeight + 'px  ');
    });

}));


