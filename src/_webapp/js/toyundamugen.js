
$(document).ready(function () {
    refreshCommandStates();
    initSwitchs();
    setInterval(function () {
        if (!stopUpdate) {
            refreshCommandStates("refresh");
        }
    }, refreshTime);

    // méthode intelligente, on attend 80ms après que la personne ait arrêté d'écrire, on abort toute requete de recherche en cours, et on relance
    $('#searchPlaylist1, #searchPlaylist2').on('input', function () {
        var filter = $(this).val();
        var num = $(this).attr('num');
        
        clearTimeout(timer);
        timer = setTimeout(function () {
            fillPlaylist(num, filter, 'list');
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

    $("select[type='playlist_select']").change(function () {
        var val = $(this).val();
        var num = $(this).attr('num');
        // prevent selecting 2 times the same playlist
        if (scope === "admin") {
            $("select[type='playlist_select'][id!='selectPlaylist" + num + "'] > option").prop("disabled", false);
            $("select[type='playlist_select'][id!='selectPlaylist" + num + "'] > option[value='" + val + "']").prop("disabled", true);
            $("select[type='playlist_select'][id!='selectPlaylist" + num + "']").select2({ theme: "bootstrap", templateResult: formatPlaylist });
        }
        
        var option = $(this).find("option:selected");
        ["current", "public"].forEach( function(e) {
            if(option.attr(e) == "1") { $("#flag" + num + " > button[name='" + e + "").removeClass('btn-default').addClass('btn-primary'); }
            else { $("#flag" + num + " > button[name='" + e + "").removeClass('btn-primary').addClass('btn-default');}
        });
        $("#flag" + num + " > button[name='visible'] > i").attr('class', option.attr('visible') ? 'glyphicon glyphicon-eye-open' : 'glyphicon glyphicon-eye-close');
        
        $("#playlist" + num).empty();
        $("#searchPlaylist" + num).val("");
        fillPlaylist(num, "", "list");
    });

    $('.playlist-main').on('click', '.addKara > button', function (e) {

        var idPlaylistFrom = $(this).closest('list-group');
        var idKara = $(this).closest('li').attr('idkara');
        // var idPlaylistTo = $("[type='playlist_select'][num='" + newNum + "']").val();
        if (scope === "public") {
            $.ajax({
                url: 'public/karas/' + idKara,
                type: 'POST',
                data: { requestedby: "truc" }
            }).done(function (data) {

                $("#selectPlaylist2").trigger('change');
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

    $('input[type="checkbox"],[switch="onoff"]').on('switchChange.bootstrapSwitch', function (event) {
        //alert($(this).is(':checked'));
        $(this).val($(this).is(':checked') ? 1 : 0);
    });
});

var refreshTime = 2000;
var stopUpdate = false;
var oldState = {};
var oldSearchVal = "";
var ajaxSearch = {}, timer;
var addKaraHtml = '<span class="pull-left addKara"><button class="btn btn-sm btn-default"><i class="glyphicon glyphicon-plus"></i></button></span>';
var deleteHtml = '<span class="pull-left addKara"><button class="btn btn-sm btn-default"><i class="glyphicon glyphicon-minus"></i></button></span>';
var transferHtml = '<button onclick="transfer(this);" class="btn btn-sm btn-default btn-dark">'
    + '<i class="glyphicon glyphicon-arrow-left"></i><i class="glyphicon glyphicon-arrow-right"></i></button>'
var buttonHtmlPublic = '';

$.ajaxPrefilter(function (options) {
    options.url = window.location.protocol + "//" + window.location.hostname + ":1339/api/v1/" + options.url
});

/**
 * Fill playlist with karas
 * @param {1, 2} num - which playlist on the screen
 * @param {String} filter - add a search filter to the request
 * @param {"list"} mode - way to render the list (only list atm)
 */

fillPlaylist = function (num, filter, mode) {
    var idPlaylist = $("#selectPlaylist" + num).val();
    var url, html;
    if (idPlaylist > 0) {
        url = scope + '/playlists/' + idPlaylist + '/karas';
        html = scope === "admin" ? transferHtml : '';
    } else if (idPlaylist == -1) {
        url = 'public/karas';
        html = addKaraHtml;
    } else if (idPlaylist == -2) {
        url = scope + '/blacklist';
        html = scope === "admin" ? '' : '';
    } else if (idPlaylist == -3) {
        url = scope + '/whitelist';
        html = scope === "admin" ? deleteHtml : '';
    }
    urlFiltre = url + "?filter=" + filter;
        console.log("AHHHH : " + url, scope, mode === "list");

    console.time('ajax');
    if (ajaxSearch[url]) {   ajaxSearch[url].abort();  }
    ajaxSearch[url] = $.ajax({ url: urlFiltre }).done(function (data) {
        var time = console.timeEnd('ajax');
        console.time('html');

        var htmlContent = "";
        if (mode === "list") {
            for (var key in data) {
                if (data.hasOwnProperty(key)) {
                    if (data[key].language === null) data[key].language = "";
                    htmlContent += "<li idKara='" + data[key].id_kara + "' class='list-group-item'>"
                        + [data[key].language.toUpperCase(), data[key].serie, data[key].songtype_i18n_short, data[key].title].join(" - ")
                        + '<span class="badge">' + data[key].language.toUpperCase() + '</span>' + html + "</li>";

                }
            }
        }

        var time = console.timeEnd('html');
        var time2 = console.timeEnd(url);
        document.getElementById("playlist" + num).innerHTML = htmlContent;

        console.log('resultats :  ' + $('#' + "playlist" + num + ' > li').length);
    });
}

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
            $("select[type='playlist_select']").append('<option current="' + value.flag_current + '" public="' + value.flag_public
                                                            + '" visible="' + value.flag_visible + '" value=' + value.id_playlist + '>' + value.name + '</option>');
        });

        $(".select2").select2({ theme: "bootstrap", templateResult: formatPlaylist });

        // TODO à suppr ?
        $("#selectPlaylist1").val(-1).change();
        if (scope === "admin") {
            $("#selectPlaylist2").val(1).change();      
        } else if (scope === "public") {
            $("#selectPlaylist2").val(settingsPublic['EnginePrivateMode'] === "1" ? 1 : 2).change();
        }

    }).fail(function (data) {
        console.log(data);
    });
};

checkSearch = function () {
    if ($('#search').val() != oldSearchVal) {
        oldSearchVal = $('#search').val();
        console.time('public/karas?filter=' + oldSearchVal);
        fillPlaylist( 1, oldSearchVal, 'list');
    } else {
        console.log("recherche identique");
    }
}

// refresh screen depending on player infos
refreshCommandStates = function (callback, param1) {
    $.ajax({ url: 'public/player' }).done(function (data) {
        if (oldState != data) {
            var newWidth = 100 * (data.timeposition + refreshTime/1000) / $('#karaInfo').attr('length') + '%';
            if (data.timeposition != oldState.timeposition && $('#karaInfo').attr('length') != 0) {
                $('#progressBarColor').stop().animate({ width: newWidth }, refreshTime, 'linear');
            }
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
                $('#progressBarColor').stop().css('width', newWidth);
                $.ajax({ url: 'public/karas/' + data.currentlyplaying }).done(function (dataKara) {
                    $('#karaInfo').attr('idKara', dataKara[0].id_kara);
                    $('#karaInfo > span').text([dataKara[0].language.toUpperCase(), dataKara[0].serie, dataKara[0].songtype_i18n_short, dataKara[0].title].join(" - "));
                    $('#karaInfo').attr('length', dataKara[0].duration);
                });
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

formatPlaylist = function(playlist) {
  if (!playlist.id) { return playlist.text; }
  if (!$(playlist.element).attr('current') == "1" && !$(playlist.element).attr('public') == "1" ) { return playlist.text; }
 
  var icon = $(playlist.element).attr('current') == "1"  ? '<i class="glyphicon glyphicon-facetime-video"></i>' : '';
  icon += $(playlist.element).attr('public') == "1"  ? ' ' + '<i class="glyphicon glyphicon-indent-left"></i>' : '';
  var $option = $('<span>' + icon + ' ' + playlist.text + '</span>');

  return $option;
};