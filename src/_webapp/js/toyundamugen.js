
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

        if (ajaxSearch)  ajaxSearch.abort();
        clearTimeout(timer); 
        timer = setTimeout(function () { 
           fillPlaylist('playlist1', 'public/karas?filter=' + val, 'list', '');
        }, 80); 
    });

    /* // méthode de base, on écrit, ça recherche
    $('#search').on('input', function () {
        var val = $(this).val();
        console.time('public/karas?filter=' + val);
        fillPlaylist('playlist1', 'public/karas?filter=' + val, 'list', '');
    });
    */
});

var stopUpdate = false;
var oldState = {};
var oldSearchVal = "";
var ajaxSearch, timer;

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

fillPlaylist = function (idPlaylist, urlKaras, mode, htmlRight) {
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
                        + '<span class="badge">' + data[key].language.toUpperCase() + '</span>' + htmlRight + "</li>";

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
        fillPlaylist('playlist1', 'public/karas?filter=' + oldSearchVal, 'list', '');
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

