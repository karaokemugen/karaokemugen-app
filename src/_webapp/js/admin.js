$(document).ready(function () {
    /*** INITIALISATION ***/
    /* variables & ajax setup */
    var stopUpdate = false;
    var mouseDown = false;
    var oldState = {};
    $.ajaxPrefilter(function (options) {
        options.url = window.location.protocol + "//" + window.location.hostname + ":1339/api/v1/" + options.url
    });

    setupAjax = function (passwordAdmin) {

        $.ajaxSetup({
            headers: { "Authorization": "Basic " + btoa("truc:" + passwordAdmin) },
            error: function (jqXHR, textStatus, errorThrown) {
                console.log(jqXHR.status + "  - " + textStatus + "  - " + errorThrown);
            }
        });
    }

    setupAjax(mdpAdmin);

    // dynamic creation of switchable settings 
    var settingsOnOff = ["PlayerPIP", "EngineAllowNicknameChange", "EngineAllowViewBlacklist", "EngineAllowViewBlacklistCriterias"
        , "EngineAllowViewWhitelist", "EngineDisplayNickname", "PlayerFullscreen", "PlayerStayOnTop"
        , "PlayerNoBar", "PlayerNoHud"];
    $.each(settingsOnOff, function (e, val) {
        html = $('<div class="form-group"><label for="' + val + '" class="col-xs-4 control-label">' + val + '</label>'
            + '<div class="col-xs-6"> <input switch="onoff" type="checkbox" name="' + val + '"></div></div>');
        if (val === "PlayerPIP") {
            html.insertBefore('#pipSettings')
        } else {
            $('#settings').append(html);
        }
    });

    /* init functions */

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
                        $('#karaInfo').text([dataKara[0].language.toUpperCase(), dataKara[0].serie, dataKara[0].songtype_i18n_short, dataKara[0].title].join(" - "));
                        $('#karaInfo').attr('length', dataKara[0].duration);
                    });
                }
                if (data.timeposition != oldState.timeposition && $('#karaInfo').attr('length') != 0) {
                    console.log(data.timeposition);
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
        $.ajax({ url: 'admin/playlists', }).done(function (data) {
            playlistList = data;
            playlistList.push({ "id_playlist": -1, "name": "Karas" });
            $.each(playlistList, function (key, value) {
                $("select[type='playlist_select']").append('<option value=' + value.id_playlist + '>' + value.name + '</option>');
            });
            $(".select2").select2({ theme: "bootstrap" });

            // TODO à suppr
            $("[type='playlist_select'][num='1']").val(-1).trigger('change');
            $("[type='playlist_select'][num='2']").val(1).trigger('change');

        }).fail(function (data) {
            $.each(data, function (index, value) {
                $('#consolelog').html($('#consolelog').html() + index + ': ' + value + '<br/>');
            });

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

    // nameExclude = input not being updated (most likely user is on it)
    getSettings = function (nameExclude) {
        var playlistList = {};
        $.ajax({ url: 'admin/settings' }).done(function (data) {
            $.each(data, function (i, val) {
                input = $('[name="' + i + '"]');
                // console.log(i, val);
                if (input.length == 1 && i != nameExclude) {
                    if (input.attr('type') !== "checkbox") {
                        input.val(val);
                    } else {
                        input.bootstrapSwitch('state', val, true);
                        input.val(val);
                        if (input.attr('name') === "PlayerPIP") {
                            val ? $('#pipSettings').show() : $('#pipSettings').hide();
                        }
                    }
                }
            });
        });
    }

    setSettings = function (e, changeAdminPass) {
        //console.log($(e), $(e).val());
        if (e.attr('oldValue') !== e.val() || e.attr('type') === "checkbox") {
            getSettings(e.attr('name'));

            $('#settings').promise().then(function () {
                settingsArray = {};
                formArray = $('#settings').serializeArray()
                    .concat($('input[type=checkbox]:not(:checked)').map(function () { return { name: this.name, value: "0" }; }).get());

                $(formArray).each(function (index, obj) {
                    console.log(index, obj);
                    settingsArray[obj.name] = obj.value;
                });
                settingsArray['EnginePrivateMode'] = $('input[name="EnginePrivateMode"]').val();
                settingsArray['AdminPassword'] = changeAdminPass ? $('button[name="AdminPassword"]').val() : $('button[name="AdminPassword"]').attr('oldValue');
                console.log("SETTINGS", settingsArray);

                $.ajax({
                    type: 'PUT',
                    url: 'admin/settings',
                    data: settingsArray
                }).done(function (data) {
                    if (changeAdminPass) {
                        mdpAdmin = $('button[name="AdminPassword"]').val();
                        console.log(mdpAdmin);
                        setupAjax(mdpAdmin);
                    }
                    getSettings();
                });
            });
        }
    }
    /* init selects & switchs */

    fillPlaylistSelects();
    initSwitchs();
    refreshCommandStates();
    setInterval(function () {
        if (!stopUpdate) {
            refreshCommandStates("refresh");
        }
    }, 1000);

    getSettings();


    $("[name='kara_panel']").on('switchChange.bootstrapSwitch', function (event, state) {
        console.log(this, event, state);
        if (state) {
            $('#playlist').hide();
            $('#manage').show();
        } else {
            $('#playlist').show();
            $('#manage').hide();
        }
    });
    $("[name='EnginePrivateMode']").on('switchChange.bootstrapSwitch', function (event, state) {
        console.log(this, event, state);
        // FCT send playlist state (1=private 0=public)

    });
    // get & build kara list on screen
    $("select[type='playlist_select']").change(function () {
        var val = $(this).val();
        var num = $(this).attr('num');
        // prevent selecting 2 times the same playlist
        $("select[type='playlist_select'][num!=" + num + "] > option").prop("disabled", false);
        $("select[type='playlist_select'][num!=" + num + "] > option[value='" + val + "']").prop("disabled", true);
        $("select[type='playlist_select'][num!=" + num + "]").select2({ theme: "bootstrap" });

        var side = num == 1 ? 'right' : 'left';
        var buttonHtml = '<button onclick="transfer(this);" num="' + num + '" class="btn btn-sm btn-default btn-dark pull-' + side + '">'
            + '<i class="glyphicon glyphicon-arrow-left"></i><i class="glyphicon glyphicon-arrow-right"></i></button>'

        $("#playlist" + num).empty();

        // fill list with kara list
        var urlKaras = "";
        if (val > 0) {
            urlKaras = 'admin/playlists/' + val + '/karas';
        } else if (val == -1) {
            urlKaras = 'public/karas';
        }

        $.ajax({ url: urlKaras }).done(function (data) {
            console.time('profile');
            htmlList = "";
            for (var key in data) {
                if (data.hasOwnProperty(key)) {
                    if (data[key].language === null) data[key].language = "";
                    htmlList += "<li idKara='" + data[key].id_kara + "' class='list-group-item'>"
                        + [data[key].language.toUpperCase(), data[key].serie, data[key].songtype_i18n_short, data[key].title].join(" - ")
                        + '<span class="badge">' + data[key].language.toUpperCase() + '</span>' + buttonHtml + "</li>";

                }
            }
            document.getElementById('playlist' + num).innerHTML = htmlList;
            var time = console.timeEnd('profile');
        });
    });

    // TODO change everything, global PUT followed by playlist refresh showing right client infos
    transfer = function (e) {
        var num = $(e).attr('num');
        var newNum = 3 - num;
        var idPlaylistFrom = $("[type='playlist_select'][num='" + num + "']").val();
        var idPlaylistTo = $("[type='playlist_select'][num='" + newNum + "']").val();

        if (idPlaylistFrom == -1) {
            $.ajax({
                type: 'POST',
                url: 'admin/playlists/' + idPlaylistTo + '/karas',
                data: {
                    requestedby: 'admin',
                    kara_id: $(e).parent().attr('idKara')
                }
            }).done(function (data) {
                console.log(data);
                $(e).parent().clone().appendTo('#playlist' + newNum);
            });
        } else {
            $(e).attr('num', newNum);
            $(e).parent().detach().appendTo('#playlist' + newNum);
        }
    };

    $('button[action="command"]').click(function () {
        val = $(this).val();
        $.ajax({
            url: 'admin/player',
            type: 'PUT',
            data: { command: val }
        }).done(function (data) {
            refreshCommandStates();
        });
    });
    $('input[action="command"][switch="onoff"]').on('switchChange.bootstrapSwitch', function (event) {
        val = $(this).attr('name');
        $.ajax({
            url: 'admin/player',
            type: 'PUT',
            data: { command: val }
        }).done(function (data) {
            refreshCommandStates();
        });
    });

    $('#settings input[type!="checkbox"][exclude!="true"]').blur(function () {
        setSettings($(this));
    });
    $('#settings input[type="checkbox"]').on('switchChange.bootstrapSwitch', function (event) {
        $(this).val($(this).is(':checked') ? 1 : 0);
        setSettings($(this));
    });

    $('#settings input').focus(function () {
        $(this).attr('oldValue', $(this).val());
    }).keypress(function (e) { // allow pressing enter to validate a setting
        if (e.which == 13) {
            $(this).blur();
        }
    });


    /* progression bar handlers part */

    goToPosition = function (e) {
        var karaInfo = $('#karaInfo');
         var songLength = karaInfo.attr('length');
        var barInnerwidth = karaInfo.innerWidth();
        var futurTimeX = e.pageX - karaInfo.offset().left;
        var presentTimeX = $(progressBarColor).width();
        var difference = futurTimeX - presentTimeX;
        var differenceRatio = difference / barInnerwidth;
        var differenceTime = Math.round(differenceRatio * songLength);
        $(progressBarColor).width(100 * (presentTimeX / barInnerwidth + differenceTime / songLength) + "%");
        $.ajax({
            url: 'admin/player',
            type: 'PUT',
            data: { command: 'seek', options: differenceTime }
        })
            .done(function (data) {
                refreshCommandStates(setStopUpdate, false);
            });
    }
    $('#karaInfo').click(function (e) {
        refreshCommandStates(goToPosition, e);
    });

    $('#karaInfo').mousedown(function (e) {
        stopUpdate = true;
        mouseDown = true;
        $(progressBarColor).width(e.pageX + "px");
    });
    $('#karaInfo').mouseup(function (e) {
        mouseDown = false;
    });
    $('#karaInfo').mousemove(function (e) {
        if (mouseDown) {
            $(progressBarColor).width(e.pageX + "px");
        }
    });
    $('#karaInfo').mouseout(function (e) {
        if (mouseDown) {
            stopUpdate = false;
            mouseDown = false;
            refreshCommandStates();
        }
    });


    /* password case handlers */

    $('#confirmPassword, #password').on("input", function () {
        if ($('#confirmPassword').val() === $('#password').val() && $('#password').val() !== "") {
            $('#sendPassword').attr('oldvalue', $('#sendPassword').val());
            $('#sendPassword').val($('#confirmPassword').val());
            $('#sendPassword').removeClass('btn-danger').addClass('btn-success');
            $('#sendPassword').prop('disabled', false);
        } else {
            $('#sendPassword').addClass('btn-danger').removeClass('btn-success');
            $('#sendPassword').prop('disabled', true);
        }
    });
    $('#sendPassword').click(function () {
        setSettings($(this), true);
    });

    setStopUpdate = function (stop) {
        stopUpdate = stop;
    }

    $(window).resize(function () {
        //  initSwitchs();
    });

});
