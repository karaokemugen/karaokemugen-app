var mouseDown;          // Boolean : capture if the mouse is pressed

(function (yourcode) {
    yourcode(window.jQuery, window, document);
}(function ($, window, document) {

    scope = 'admin';
    // The $ is now locally scoped
    // Listen for the jQuery ready event on the document
    $(function () {

        $('.playlist-main').on('keypress', '#bcVal', function (e) {
            if (e.which == 13) {
                $('#blacklistCriteriasInputs').find('#bcAdd').click();
            }
        });

        $('.playlist-main').on('click', 'button.addBlacklistCriteria', function () {
            // TODO check if type is valid maybe
            var type = $('#bcType').val();
            var val = $('#bcVal').val();

            var data = { blcriteria_type: type, blcriteria_value: val };
            $.ajax({
                url: scope + '/blacklist/criterias',
                type: 'POST',
                data: data
            });
        });

        $('.playlist-main').on('click', '.deleteCriteria', function () {
            // TODO check if type is valid maybe
            var bcId = $(this).closest('li').attr('blcriteria_id');
            $.ajax({
                url: scope + '/blacklist/criterias/' + bcId,
                type: 'DELETE'
            });
        });
        $('.playlist-main').on('change', '#bcType', function () {
            tagsUpdating.done(() => {
                if (tags) {
                    var bcType = $(this).val();
                    var tagsFiltered = jQuery.grep(tags, function (obj) {
                        return obj.type == bcType;
                    });
                    var $bcValInput;
                    if (tagsFiltered.length > 0) {
                        $bcValInput = $('<select id="bcVal" class="input-sm"></select>');
                        $.each(tagsFiltered, function (i, o) {
                            var trad = o.i18n[i18n.locale];
                            var $option = $('<option/>')
                                .attr('value', o.tag_id)
                                .attr('karacount', o.karacount)
                                .text(trad ? trad : o.name);
                            $bcValInput.append($option);
                        });
                    } else {
                        $bcValInput = $('<input type="text" id="bcVal" class="input-sm"/>');
                    }
                    $('#bcValContainer').empty().append($bcValInput);

                    if (tagsFiltered.length > 0) {
                        $('#bcVal').select2({ theme: 'bootstrap', dropdownAutoWidth: true, minimumResultsForSearch: 7 });

                    }
                }
            })
        });


        $('.playlist-main').on('click', '.likeCount,.likeFreeButton', function () {
            var $this = $(this);
            var li = $this.closest('li');
            var idPlaylistContent = li.attr('idplaylistcontent');

            var side = $this.closest('.panel').attr('side');
            var idPlaylist = parseInt($('#selectPlaylist' + side).val());

            var flag = true;
            $.ajax({
                type: 'PUT',
                url: scope + '/playlists/' + idPlaylist + '/karas/' + idPlaylistContent,
                data: { flag_free: flag }
            }).done(function () {
                $this.toggleClass('btn-primary free');
            });

        });

        // main actions on karas in the playlists
        $('.playlist-main').on('click contextmenu', '.actionDiv > button:not(.clusterAction)', function (e) {
            if (e.type === 'contextmenu') {
                e.preventDefault();
            }
            var side = $(this).closest('.panel').attr('side');

            var li = $(this).closest('li');
            var idPlaylistFrom = parseInt($('#selectPlaylist' + side).val());
            var idPlaylistTo = parseInt($('#selectPlaylist' + non(side)).val());
            var idKara, idKaraPlaylist;
            var clusterAction = false;
            var nameElementId = idPlaylistFrom !== -3 ? 'idplaylistcontent' : 'idwhitelist';

            if ($(this).parent().hasClass('plCommands')) {
                clusterAction = true;
                var checkedList = $(this).closest('.panel').find('li:has(span[name="checkboxKara"][checked])');
                var idKaraList = checkedList.map(function (k, v) {
                    return $(v).attr('idkara');
                });
                var idKaraPlaylistList = checkedList.map(function (k, v) {
                    return $(v).attr(nameElementId);
                });

                li = checkedList;
                idKara = Array.prototype.slice.apply(idKaraList).join();
                idKaraPlaylist = Array.prototype.slice.apply(idKaraPlaylistList).join();
                if (!idKara && !idKaraPlaylist) {
                    return false;
                }
            } else {
                idKara = li.attr('idkara');
                idKaraPlaylist = li.attr(nameElementId);
            }

            var action = $(this).attr('name');

            var promise = $.Deferred();
            var url, data, type;
            if (action === 'addKara' || action === 'transferKara') {
                url = '', data = {}, type = '';
                type = 'POST';

                if (idPlaylistTo > 0) {
                    url = scope + '/playlists/' + idPlaylistTo + '/karas';
                    if (idPlaylistFrom > 0) {
                        data = { plc_id: idKaraPlaylist };
                        type = 'PATCH';
                    } else {
                        var requestedby = idPlaylistFrom == -1 || li.data('username') == undefined ? logInfos.username : li.data('username');
                        data = { requestedby: requestedby, kid: idKara };
                    }
                } else if (idPlaylistTo == -2 || idPlaylistTo == -4) {
                    url = scope + '/blacklist/criterias';
                    data = { blcriteria_type: 1001, blcriteria_value: idKara };
                } else if (idPlaylistTo == -3) {
                    url = scope + '/whitelist';
                    data = { kid: idKara };
                }

                if (e.type === 'contextmenu') {
                    data.pos = -1;
                }

                promise.resolve();
            } else {
                promise.resolve();
            }
            if (action === 'transferKara') {
                // temp solution to database transaction issue
                promise.done(function () {
                    li.addClass('deleted');
                    url = '', data = {}, type = '';
                    type = 'DELETE';
                    if (idPlaylistFrom > 0) {
                        url = scope + '/playlists/' + idPlaylistFrom + '/karas/';
                        data['plc_id'] = idKaraPlaylist;
                    } else if (idPlaylistFrom == -3) {
                        url = scope + '/whitelist';
                        data['wlc_id'] = idKaraPlaylist;
                    }
                    if (url !== '') {
                        $.ajax({
                            type: 'DELETE',
                            url: url,
                            data: data
                        }).done(function () {
                            li.hide();
                        });
                    }
                });
            }
        });

        $('.playlist-main').on('click', 'span[name="checkboxKara"]', function () {
            var checked = $(this).attr('checked');
            $(this).attr('checked', !checked);
        });

        $('#karaInfo').click(function (e) {
            if (status != undefined && status != '' && status != 'stop' && $(this).attr('length') != -1) {
                goToPosition(e);
            }
        });

        $('#karaInfo').on('mousedown touchstart', function (e) {
            if (status != undefined && status != '' && status != 'stop' && $(this).attr('length') != -1) {
                stopUpdate = true;
                mouseDown = true;
                $('#progressBarColor').removeClass('cssTransform')
                    .css('transform', 'translateX(' + e.pageX + 'px)')
                    .addClass('');

                $('#progressBar').attr('title', oldState.timeposition);
            }
        });
        $('#karaInfo').mouseup(function () {
            mouseDown = false;
        });
        $('#karaInfo').mousemove(function (e) {
            if (mouseDown) {
                $('#progressBarColor').removeClass('cssTransform')
                    .css('transform', 'translateX(' + e.pageX + 'px)')
                    .addClass('');
            }
        });
        $('#karaInfo').mouseout(function () {
            if (mouseDown) {
                $('#progressBarColor').addClass('cssTransform');
                stopUpdate = false;
                mouseDown = false;
            }
        });

        setStopUpdate = function (stop) {
            stopUpdate = stop;
        };
    });

    /*** INITIALISATION ***/
    /* variables & ajax setup */

    mouseDown = false;

    /* progression bar handlers part */

    goToPosition = function (e) {
        var karaInfo = $('#karaInfo');
        var songLength = karaInfo.attr('length');
        var barInnerwidth = karaInfo.innerWidth();
        var futurTimeX = e.pageX - karaInfo.offset().left;
        var futurTimeSec = songLength * futurTimeX / barInnerwidth;

        if (!isNaN(futurTimeSec) && futurTimeSec >= 0) {
            $('#progressBarColor').removeClass('cssTransform')
                .css('transform', 'translateX(' + e.pageX + 'px)')
                .addClass('');

            $.ajax({
                url: 'admin/player',
                type: 'PUT',
                data: { command: 'goTo', options: futurTimeSec },
                complete: function () {
                    $('#progressBarColor').addClass('cssTransform');
                }
            })
                .done(function () {
                    setStopUpdate(false);
                });
        } else {
            console.log('Err: problem calculating time for goTo command');
        }
    };

    $('#flag1, #flag2').on('click', 'button', function () {
        var btn = $(this);
        var name = btn.attr('name');
        var selector = btn.closest('.panel-heading').find('[type="playlist_select"]');
        var idPlaylist = selector.val();
        var namePlaylist = selector.find('option[value="' + idPlaylist + '"]').data('name');
        var data = {}, urlEnd = '';

        if (name === 'flag_current' && !btn.hasClass('btn-primary')) {
            urlEnd = '/setCurrent';
        } else if (name === 'flag_public' && !btn.hasClass('btn-primary')) {
            urlEnd = '/setPublic';
        } else if (name === 'flag_visible') {
            urlEnd = '';
            var setTo = !btn.closest('.plDashboard').data('flag_visible');

            if (idPlaylist > 0) {
                data = { name: namePlaylist, flag_visible: setTo };
            } else {
                var list = { '-2': 'Blacklist', '-3': 'Whitelist', '-4': 'BlacklistCriterias' };
                //$('input[name="Frontend.Permissions.AllowView' + list[idPlaylist] + '"]').val(1).bootstrapSwitch('state', setTo);
                return false;
            }
        } else {
            return false;
        }
        $.ajax({
            url: 'admin/playlists/' + idPlaylist + urlEnd,
            type: 'PUT',
            data: data
        });
    });

    $('#flag1, #flag2').on('contextmenu', 'button', function (e) {
        e.preventDefault();
        var btn = $(this);
        var name = btn.attr('name');
        var selector = btn.closest('.panel-heading').find('[type="playlist_select"]');
        var idPlaylist = selector.find('option[data-' + name + '="1"]').val();
        console.log(idPlaylist, selector);
        selector.val(idPlaylist).change();
    });

    $('.import-file').change(function () {
        if (!window.FileReader) return alert('FileReader API is not supported by your browser.');

        var dashBoard = $(this).closest('.plDashboard');
        var select = dashBoard.find('.plSelect select');
        var input = this;
        if (input.files && input.files[0]) {
            file = input.files[0];
            fr = new FileReader();
            fr.onload = function () {
                var data = {};
                var name;
                if (file.name.includes('KaraMugen_fav')) {
                    data['favorites'] = fr['result'];
                    url = 'public/favorites/import';
                    name = 'Favs';
                } else {
                    url = scope + '/playlists/import';
                    data['playlist'] = fr['result'];
                    name = JSON.parse(fr.result).PlaylistInformation.name;
                }                
                ajx('POST', url, data, function (response) {
                    window.displayMessage('success', 'Playlist importée' + ' : ', name);
                    if (response.unknownKaras && response.unknownKaras.length > 0) {
                        window.displayMessage('warning', 'Karas inconnus' + ' : ', response.unknownKaras);
                    }
                    var playlist_id = file.name.includes('KaraMugen_fav') ? -5 : response.playlist_id;
                    playlistsUpdating.done(function () {
                        select.val(playlist_id).change();
                    });
                });
            };
            fr.readAsText(file);
        }
    });

    $('.controls button').click(function () {
        var name = $(this).attr('name');
        var dashBoard = $(this).closest('.plDashboard');
        var select = dashBoard.find('.plSelect select');
        var selectedOption = dashBoard.find('[type="playlist_select"] > option:selected');
        var playlistName = selectedOption.data('name');
        var idPlaylist = parseInt(dashBoard.data('playlist_id'));

        var url = scope + '/playlists/' + idPlaylist;
        var type = '', data = {};

        if (name == 'shuffle') {
            url += '/shuffle';
            type = 'PUT';
            ajx(type, url, data);
        } else if (name == 'smartShuffle') {
            url += '/shuffle';
            type = 'PUT';
            data = { smartShuffle: 1 }
            ajx(type, url, data);
        } else if (name == 'export') {
            if (idPlaylist === -5) {
                url = 'public/favorites'
            }
            url += '/export';
            type = 'GET';
            ajx(type, url, data, function (data) {
                var dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(data, null, 4));
                var dlAnchorElem = document.getElementById('downloadAnchorElem');
                dlAnchorElem.setAttribute('href', dataStr);
                if (idPlaylist === -5) {
                    dlAnchorElem.setAttribute('download', ['KaraMugen', 'fav', logInfos.username, new Date().toLocaleDateString().replace('\\','-')].join('_') + '.kmplaylist');
                } else {
                    dlAnchorElem.setAttribute('download', ['KaraMugen', playlistName, new Date().toLocaleDateString().replace('\\', '-')].join('_') + '.kmplaylist');
                }
                dlAnchorElem.click();
            });
        } else if (name == 'editName') {
            type = 'PUT';
            $.each(['flag_current', 'flag_visible', 'flag_public'], function (k, v) {
                data[v] = selectedOption.data(v);
            });

            window.callModal('prompt', window.t('CL_RENAME_PLAYLIST', playlistName), '', function (newName) {
                data['name'] = newName;
                ajx(type, url, data);
            }, playlistName);
        } else if (name == 'add') {
            type = 'POST';
            url = 'admin/playlists';

            window.callModal('prompt', window.t('CL_CREATE_PLAYLIST'), '',
                function (playlistName) {
                    data = { name: playlistName, flag_visible: false, flag_current: false, flag_public: false };
                    ajx(type, url, data, function (idNewPlaylist) {
                        playlistsUpdating.done(function () {
                            select.val(idNewPlaylist).change();
                        });
                    });
                }
            );
        } else if (name == 'delete') {
            url += '';
            type = 'DELETE';
            window.callModal('confirm', window.t('CL_DELETE_PLAYLIST', playlistName), '', function (confirm) {
                if (confirm) {
                    ajx(type, url, data, function () {
                        playlistsUpdating.done(function () {
                            select.change();
                        });
                    });
                }
            });
        } else if (name == 'startFavMix') {
            $.ajax({
                url: 'public/users/',
                type: 'GET'
            })
                .done(function (response) {
                    var userList = response.filter(u => u.type < 2);

                    var userlistStr = '<div class="automixUserlist">';
                    $.each(userList, function (i, k) {
                        userlistStr +=
                            '<div class="checkbox"><label>'
                            + '<input type="checkbox" name="users"'
                            + ' value="' + k.login + '" ' + (k.flag_online ? 'checked' : '') + '>'
                            + k.nickname + '</label></div>';
                    });
                    userlistStr += '</div>';

                    window.callModal('custom', window.t('START_FAV_MIX'),
                        userlistStr + '<input type="text"name="duration" placeholder="200 (min)"/>',
                        function (data) {
                            if (!data.duration) data.duration = 200;
                            $.ajax({
                                url: 'admin/automix',
                                type: 'POST',
                                data: data
                            })
                                .done(function (response) {
                                    var idNewPlaylist = response.playlist_id;
                                    playlistsUpdating.done(function () {
                                        select.val(idNewPlaylist).change();
                                    });
                                });
                        }
                    );
                });
        }


    });

    changeKaraPos = function (e) {
        console.log('changeKaraPos() got called');
        var liKara = e.closest('li');
        var idKara = liKara.attr('idKara');
        var side = liKara.closest('ul').attr('side');
        var posFromPrev = parseInt(liKara.prev('li').attr('pos')) + 1;
        var posFromNext = parseInt(liKara.next('li').attr('pos'));
        posFromPrev = isNaN(posFromPrev) ? posFromNext : posFromPrev;
        posFromNext = isNaN(posFromNext) ? posFromPrev : posFromNext;

        if (posFromPrev != posFromNext || isNaN(posFromPrev) && isNaN(posFromNext)) {
            console.log('Positions in the list are fucked up');
            window.displayMessage('warning', 'Err:', window.t('CL_WRONG_KARA_ORDER'));
            return false;
        } else {
            console.log('Preparing for the PUT...');
            var idPlc = parseInt(liKara.attr('idplaylistcontent'));
            var idPlaylist = parseInt($('#selectPlaylist' + side).val());
            liKara.parent().addClass('disabled');

            console.log('Sending the PUT right now');
            $.ajax({
                type: 'PUT',
                url: scope + '/playlists/' + idPlaylist + '/karas/' + idPlc,
                data: { pos: posFromPrev }
            }).always(() => {
                liKara.parent().removeClass('disabled');
            });
        }
    };
}));
