
$(document).ready(function () {
    refreshCommandStates();
    initSwitchs();
    setInterval(function () {
        if (!stopUpdate) {
            refreshCommandStates("refresh");
        }
    }, 3000);

    /* // méthode cyclique, toutes les 300ms on vérifie si la valeur de recherche a changé et lance la recherche
     setInterval(function () {
         checkSearch();
     }, 300);*/

    // méthode intelligente, on attend 80ms après que la personne ait arrêté d'écrire, on abort toute requete de recherche en cours, et on relance

    $('#search').on('input', function () {
        var val = $(this).val();
        console.time('public/karas?filter=' + val);

        if (ajaxSearch) ajaxSearch.abort();
        clearTimeout(timer);
        timer = setTimeout(function () {
            fillPlaylist('playlist1', 'public/karas?filter=' + val, 'list', addKaraHtml);
        }, 80);
    });
    $('#search').trigger('input');

    /* // méthode de base, on écrit, ça recherche
    $('#search').on('input', function () {
        var val = $(this).val();
        console.time('public/karas?filter=' + val);
        fillPlaylist('playlist1', 'public/karas?filter=' + val, 'list', addKaraHtml);
    });
    */

    // get & build playlist list on screen

    $("select[type='playlist_select']").change(function () {
        var val = $(this).val();
        var num = $(this).attr('num');
        // prevent selecting 2 times the same playlist
        $("select[type='playlist_select'][num!=" + num + "] > option").prop("disabled", false);
        $("select[type='playlist_select'][num!=" + num + "] > option[value='" + val + "']").prop("disabled", true);
        $("select[type='playlist_select'][num!=" + num + "]").select2({ theme: "bootstrap" });

        var side = num == 1 ? 'right' : 'left';
        var buttonHtml = '<button onclick="transfer(this);" num="' + num + '" class="btn btn-sm btn-default btn-dark">'
            + '<i class="glyphicon glyphicon-arrow-left"></i><i class="glyphicon glyphicon-arrow-right"></i></button>'
        var buttonHtmlPublic = '';

        $("#playlist" + num).empty();

        // fill list with kara list
        var urlKaras = "";

        if (val > 0) {
            urlKaras = scope + '/playlists/' + val + '/karas';
        } else if (val == -1) {
            urlKaras = 'public/karas';
        } else if (val == -2) {
            urlKaras = scope + '/blacklist';
        } else if (val == -3) {
            urlKaras = scope + '/whitelist';
        }

        fillPlaylist('playlist' + num, urlKaras, 'list', scope === "admin" ? buttonHtml : buttonHtmlPublic);
    });



    $('.playlist-main').on('click', '.addKara > button', function (e) {
        
        var idPlaylistFrom = $(this).closest('list-group');
        var idKara = $(this).closest('li').attr('idkara');
        // var idPlaylistTo = $("[type='playlist_select'][num='" + newNum + "']").val();
        if (scope === "public") {
            $.ajax({ 
                url: 'public/karas/' + idKara,
                type: 'POST',
                data: { requestedby : "truc" } }).done(function (data) {
                  
                $("[type='playlist_select'][num='2']").trigger('change');
                //console.log(data);
            });
        } else {
            $.ajax({
                type: 'POST',
                url: 'admin/playlists/' + idPlaylistTo + '/karas',
                data: {
                    requestedby: 'admin',
                    kara_id: $(e).parent().attr('idKara')
                }
            });
        }
    });

    $('input[type="checkbox"]').on('switchChange.bootstrapSwitch', function (event) {
        $(this).val($(this).is(':checked') ? 1 : 0);
    });
});

var stopUpdate = false;
var oldState = {};
var oldSearchVal = "";
var ajaxSearch, timer;
var addKaraHtml = '<span class="pull-left addKara"><button class="btn btn-sm btn-default"><i class="glyphicon glyphicon-plus"></i></button></span>';

$.ajaxPrefilter(function (options) {
    options.url = window.location.protocol + "//" + window.location.hostname + ":1339/api/v1/" + options.url
});

// refresh screen depending on player infos
refreshCommandStates = function (callback, param1) {
    $.ajax({ url: 'public/player' }).done(function (data) {
        if (oldState != data) {
            if (oldState.status != data.status || oldState.playerstatus != data.playerstatus) {
                var status = data.status === "stop" ? "stop" : data.playerstatus;
                //console.log("status : " + status + " enginestatus : " + data.status  + " playerstatus : " + data.playerstatus );
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
            if (data.currentlyplaying !== oldState.currentlyplaying && data.currentlyplaying > 0) {
                $.ajax({ url: 'public/karas/' + data.currentlyplaying }).done(function (dataKara) {
                    $('#karaInfo').attr('idKara', dataKara[0].id_kara);
                    $('#karaInfo > span').text([dataKara[0].language.toUpperCase(), dataKara[0].serie, dataKara[0].songtype_i18n_short, dataKara[0].title].join(" - "));
                    $('#karaInfo').attr('length', dataKara[0].duration);
                });
            }
            if (data.timeposition != oldState.timeposition && $('#karaInfo').attr('length') != 0) {
                $('#progressBarColor').width(100 * data.timeposition / $('#karaInfo').attr('length') + '%');
            }
            if (data.mutestatus != oldState.mutestatus) {
                if (data.mutestatus) {
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

fillPlaylistSelects = function () {
    var playlistList = {};
    $.ajax({ url: scope + '/playlists', }).done(function (data) {
        playlistList = data;
        if (scope === "admin") {
            playlistList.push({ "id_playlist": -1, "name": "Karas" });
            playlistList.push({ "id_playlist": -2, "name": "Blacklist" });
            playlistList.push({ "id_playlist": -3, "name": "Whitelist" });
        } else if (scope === "public") {
            if (settingsPublic['EngineAllowViewBlacklist'] == 1) playlistList.push({ "id_playlist": -2, "name": "Blacklist" });
            if (settingsPublic['EngineAllowViewWhitelist'] == 1) playlistList.push({ "id_playlist": -3, "name": "Whitelist" });
        }

        $.each(playlistList, function (key, value) {
            $("select[type='playlist_select']").append('<option value=' + value.id_playlist + '>' + value.name + '</option>');
        });

        $(".select2").select2({ theme: "bootstrap" });

        // TODO à suppr
        if (scope === "admin") {
            $("[type='playlist_select'][num='1']").val(-1).trigger('change');
            $("[type='playlist_select'][num='2']").val(1).trigger('change');
        } else if (scope === "public") {
            $("[type='playlist_select'][num='2']").val(settingsPublic['EnginePrivateMode'] === "1" ? 1 : 2).trigger('change');
        }

    }).fail(function (data) {
        console.log(data);
    });
};

// mode = 'list', htmlRight = htlm to add on the right of the list item
fillPlaylist = function (idPlaylist, urlKaras, mode, html) {
    console.log(urlKaras);
    console.time('ajax');
    ajaxSearch = $.ajax({ url: urlKaras }).done(function (data) {
        var time = console.timeEnd('ajax');
        console.time('html');
        htmlList = "";
        if (mode === "list") {
            for (var key in data) {
                if (data.hasOwnProperty(key)) {
                    if (data[key].language === null) data[key].language = "";
                    htmlList += "<li idKara='" + data[key].id_kara + "' class='list-group-item'>"
                        + [data[key].language.toUpperCase(), data[key].serie, data[key].songtype_i18n_short, data[key].title].join(" - ")
                        + '<span class="badge">' + data[key].language.toUpperCase() + '</span>' + html + "</li>";

                }
            }
        }

        var time = console.timeEnd('html');
        var time2 = console.timeEnd(urlKaras);
        document.getElementById(idPlaylist).innerHTML = htmlList;
        console.log('resultats :  ' + $('#' + idPlaylist + ' > li').length);
    });
}

checkSearch = function () {
    if ($('#search').val() != oldSearchVal) {
        oldSearchVal = $('#search').val();
        console.time('public/karas?filter=' + oldSearchVal);
        fillPlaylist('playlist1', 'public/karas?filter=' + oldSearchVal, 'list', addKaraHtml);
    } else {
        console.log("recherche identique");
    }
}

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


