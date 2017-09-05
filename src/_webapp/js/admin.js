(function (yourcode) {
    // The global jQuery object is passed as a parameter
    yourcode(window.jQuery, window, document);
}(function ($, window, document) {
    // The $ is now locally scoped 
    // Listen for the jQuery ready event on the document
    $(function () {

        /* init selects & switchs */

        $("[name='kara_panel']").on('switchChange.bootstrapSwitch', function (event, state) {
            if (state) {
                $('#playlist').show();
                $('#manage').hide();
            } else {
                $('#playlist').hide();
                $('#manage').show();
            }
        });

        // handling small touchscreen screens with big virtual keyboard

        $("select[type='playlist_select']").on('select2:open', function () {
            //$('#header').hide();
            $(".select2-dropdown").css('z-index', '9999');
        });

        $("select[type='playlist_select']").on('select2:close', function () {
            // $('#header').show();
            $(".select2-dropdown").css('z-index', '1051');
            document.body.scrollTop = 0; // For Chrome, Safari and Opera 
            document.documentElement.scrollTop = 0; // For IE and Firefox
        })


        $('button[action="command"]').click(function (e) {
            var name = $(this).attr('name');
            var dataAjax = { command: name };

            if ($(this).val() != "") dataAjax['options'] = $(this).val();

            if (e.target.name == "setVolume") {
                var btn = $(e.target);
                var val = parseInt(btn.val()), base = .04;
                val = val / 100;
                val = (Math.pow(base, val) - 1) / (base - 1);
                val = parseInt(val * 100);
                dataAjax = { command: btn.attr('name'), options: val };
            }

            $.ajax({
                url: 'admin/player',
                type: 'PUT',
                data: dataAjax
            }).done(function (data) {
                // refreshCommandStates();
            });
        });

        $('input[action="command"][switch="onoff"]').on('switchChange.bootstrapSwitch', function (event) {
            val = $(this).attr('name');
            $.ajax({
                url: 'admin/player',
                type: 'PUT',
                data: { command: val }
            }).done(function (data) {
                // refreshCommandStates();
            });
        });

        $('button[action="poweroff"]').click(function () {
            $.ajax({
                url: 'admin/shutdown',
                type: 'POST',
            }).done(function (data) {
                console.log("Extinction de l'appli");
                stopUpdate = true;
            });
        });
        $('#settings input[type!="checkbox"][exclude!="true"]').blur(function () {
            setSettings($(this));
        });
        $('#settings input[type="checkbox"], input[name="EnginePrivateMode"]').on('switchChange.bootstrapSwitch', function (event) {
            setSettings($(this));
        });

        $('#settings input').focus(function () {
            $(this).attr('oldValue', $(this).val());
        }).keypress(function (e) { // allow pressing enter to validate a setting
            if (e.which == 13) {
                $(this).blur();
            }
        });
        $('.playlist-main').on('keypress', '#bcVal', function (e) {
            if (e.which == 13) {
                $('#blacklistCriteriasInputs').find('#bcAdd').click();
            }
        });

        $('.playlist-main').on('click', 'button.addBlacklistCriteria', function (e) {
            // TODO check if type is valid maybe
            var type = $('#bcType').val();
            var val = $('#bcVal').val();
            var data = { blcriteria_type: type, blcriteria_value: val };
            $.ajax({
                url: scope + '/blacklist/criterias',
                type: 'POST',
                data: data
            }).done(function (data) {
                displayMessage('success', 'Success', 'Criteria ' + type + ' - ' + val + ' added to the list');
            })
        });

        $('.playlist-main').on('click', '.deleteCriteria', function (e) {
            // TODO check if type is valid maybe
            var bcId = $(this).closest('li').attr('blcriteria_id');
            $.ajax({
                url: scope + '/blacklist/criterias/' + bcId,
                type: 'DELETE'
            }).done(function (data) {
                displayMessage('success', 'Success', 'Blacklist criteria ' + bcId + ' deleted');
            });
        });
        $('.playlist-main').on('change', '#bcType', function (e) {
            var bcType = $(this).val();
            var bcTagsFiltered = jQuery.grep(bcTags, function (obj) {
                return obj.type == bcType
            });

            var $bcValInput;
            if (bcTagsFiltered.length > 0) {
                bcValInput = $('<select id="bcVal" class="input-sm"></select>');
                $.each(bcTagsFiltered, function (i, o) {
                    var $option = $("<option/>").attr("value", o.tag_id).text(o.name_i18n);
                    bcValInput.append($option);
                });
            } else {
                bcValInput = $('<input type="text" id="bcVal" class="input-sm"/>');
            }
            $('#bcValContainer').empty().append(bcValInput);

            if (bcTagsFiltered.length > 0) {
                $('#bcVal').select2({ theme: "bootstrap", dropdownAutoWidth: true, minimumResultsForSearch: 7 });

            }
        });
        $('.playlist-main').on('click', '.infoDiv > button.playKara', function (e) {
            var liKara = $(this).closest('li');
            var idPlc = parseInt(liKara.attr('idplaylistcontent'));
            var idPlaylist = parseInt($('#selectPlaylist' + $(this).closest('ul').attr('num')).val());

            $.ajax({
                type: 'PUT',
                url: scope + '/playlists/' + idPlaylist + '/karas/' + idPlc,
                data: { flag_playing: "1" }
            }).done(function (data) {
                console.log("Kara plc_id " + idPlc + " flag_playing set to true");
            });
        });

        $('#karaInfo').click(function (e) {
            if (status != undefined && status != "" && status != "stop") {
                //refreshCommandStates(goToPosition, e);
                goToPosition(e);
            }
        });

        $('#karaInfo').on('mousedown touchstart', function (e) {
            if (status != undefined && status != "" && status != "stop") {
                stopUpdate = true;
                mouseDown = true;
                $('#progressBarColor').stop().css('width', e.pageX + "px");
                $('#progressBar').attr('title', oldState.timeposition);
            }
        });
        $('#karaInfo').mouseup(function (e) {
            mouseDown = false;
        });
        $('#karaInfo').mousemove(function (e) {
            if (mouseDown) {
                $('#progressBarColor').stop().css('width', e.pageX + "px");
            }
        });
        $('#karaInfo').mouseout(function (e) {
            if (mouseDown) {
                stopUpdate = false;
                mouseDown = false;
                //refreshCommandStates();
            }
        });

        /**
         * react to new select entry, creating a new playlist
        */
        $('.select2').on('select2:select', function (e) {
            var select = $(this);
            if (select.find("option[value='" + e.params.data.id + "'][name]").length == 0) {
                var playlistName = e.params.data.text
                var create = confirm("Créer nouvelle playlist '" + playlistName + "' ?");
                if (create) {
                    $.ajax({
                        url: 'admin/playlists',
                        type: 'POST',
                        data: { name: playlistName, flag_visible: 0, flag_current: 0, flag_public: 0 }
                    })
                        .done(function (idNewPlaylist) {
                            playlistsUpdating.done(function () {
                                select.val(idNewPlaylist).change()
                            });
                        });
                } else {
                    select.val([]);
                }

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
		$('select[name="PlayerScreen"] > option').each(function(i) {
			$(this).text(i+1 + " - " + $(this).text());
		});
        fillPlaylistSelects(true);
        getSettings();

        pseudo = "Administrateur";
    });

    /*** INITIALISATION ***/
    /* variables & ajax setup */

    mouseDown = false;
    scope = 'admin';
    panel1Default = -1;

    setupAjax = function (passwordAdmin) {

        $.ajaxSetup({
            cache: false,
            headers: { "Authorization": "Basic " + btoa("truc:" + passwordAdmin) }
        });
    }

    setupAjax(mdpAdmin);

    // dynamic creation of switchable settings 
    var htmlSettings = ""
    $.each(settingsOnOff, function (e, val) {
        html = '<div class="form-group"><label for="' + e + '" class="col-xs-4 control-label">' + val + '</label>'
            + '<div class="col-xs-6"> <input switch="onoff" type="checkbox" name="' + e + '"></div></div>';
        if (val === "PlayerPIP") {
            $(html).insertBefore('#pipSettings')
        } else {
            htmlSettings += html;
        }
    });

    $('#settings').append(htmlSettings);

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
                            val ? $('#pipSettings').show('500') : $('#pipSettings').hide('500');
                        }
                    }
                }
            });
        });
    }

    setSettings = function (e, changeAdminPass) {
        //    console.log( $(e).attr('name'), $(e).val(), $(e));
        if (e.attr('oldValue') !== e.val() || e.attr('type') === "checkbox") {
            getSettings(e.attr('name'));

            $('#settings').promise().then(function () {
                settingsArray = {};
                formArray = $('#settings').serializeArray()
                    .concat($('#settings input[type=checkbox]:not(:checked)').map(function () { return { name: this.name, value: "0" }; }).get());

                $(formArray).each(function (index, obj) {
                    settingsArray[obj.name] = obj.value;
                });
                settingsArray['EnginePrivateMode'] = $('input[name="EnginePrivateMode"]').val();
                settingsArray['AdminPassword'] = changeAdminPass ? $('button[name="AdminPassword"]').val() : $('button[name="AdminPassword"]').attr('oldValue');

                console.log("setSettings : ", settingsArray);

                $.ajax({
                    type: 'PUT',
                    url: 'admin/settings',
                    data: settingsArray
                }).done(function (data) {
                    if (changeAdminPass) {
                        mdpAdmin = $('button[name="AdminPassword"]').val();
                        setupAjax(mdpAdmin);
                    }
                    getSettings();
                });
            });
        }
    }


    /* progression bar handlers part */

    goToPosition = function (e) {
        var karaInfo = $('#karaInfo');
        var songLength = karaInfo.attr('length');
        var barInnerwidth = karaInfo.innerWidth();
        var futurTimeX = e.pageX - karaInfo.offset().left;
        var presentTimeX = $(progressBarColor).width();
        var futurTimeSec = songLength * futurTimeX / barInnerwidth;
        $(progressBarColor).stop().css('width', 100 * futurTimeSec / songLength + "%");
        $.ajax({
            url: 'admin/player',
            type: 'PUT',
            data: { command: 'goTo', options: futurTimeSec }
        })
            .done(function (data) {
                setStopUpdate(false);
            });
    }

    $('#flag1, #flag2').on('click', 'button', function () {
        var btn = $(this);
        var name = btn.attr('name');
        var selector = btn.closest('.panel-heading').find('[type="playlist_select"]');
        var playlistId = selector.val();
        var namePlaylist = selector.find('option[value="' + playlistId + '"]').attr('name');
        var data = {}, urlEnd = "";

        if (name === "flag_current" && !btn.hasClass('btn-primary')) {
            urlEnd = "/setCurrent";
        } else if (name === "flag_public" && !btn.hasClass('btn-primary')) {
            urlEnd = "/setPublic";
        } else if (name === "flag_visible") {
            urlEnd = "";
            if (btn.find('i').hasClass('glyphicon-eye-close')) {
                data = { name: namePlaylist, flag_visible: 1 };
            } else if (btn.find('i').hasClass('glyphicon-eye-open')) {
                data = { name: namePlaylist, flag_visible: 0 };
            }
        }
        $.ajax({
            url: 'admin/playlists/' + playlistId + urlEnd,
            type: 'PUT',
            data: data
        }).done(function (data) {
            //fillPlaylistSelects();
        });
    });

    changeKaraPos = function (e) {
        var liKara = e.closest('li');
        var idKara = liKara.attr('idKara');
        var num = liKara.closest('ul').attr('num');
        var posFromPrev = parseInt(liKara.prev('li').attr('pos')) + 1;
        var posFromNext = parseInt(liKara.next('li').attr('pos'));
        posFromPrev = isNaN(posFromPrev) ? posFromNext : posFromPrev;
        posFromNext = isNaN(posFromNext) ? posFromPrev : posFromNext;

        if (posFromPrev != posFromNext || isNaN(posFromPrev) && isNaN(posFromNext)) {
            displayMessage("warning", "Error:", "Kara positions in this playlist are messed up, refreshing it. <br/>Please try again.");
            fillPlaylist(num);
            return false;
        } else {
            var idPlc = parseInt(liKara.attr('idplaylistcontent'));
            var idPlaylist = parseInt($('#selectPlaylist' + num).val());

            $.ajax({
                type: 'PUT',
                url: scope + '/playlists/' + idPlaylist + '/karas/' + idPlc,
                data: { pos : posFromPrev }
            }).done(function (data) {
                console.log("Kara plc_id " + posFromPrev + " pos changed");
            }).fail(function (data) {
                fillPlaylist(num);
            });
            scrollToKara(num, idKara); 
        }
    }
}));


