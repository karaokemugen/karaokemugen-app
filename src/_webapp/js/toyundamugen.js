var panel1Default;      // Int : default id of the playlist of the 1st panel (-1 means kara list)
var status;             // String : status of the player
var mode;               // String : way the kara list is constructed, atm "list" supported
var mouseDown;          // Boolean : capture if the mouse is pressed
var scope;              // String : if we're in public or admin interface
var refreshTime;        // Int (ms) : time unit between every call
var stopUpdate;         // Boolean : allow to stop any automatic ajax update
var oldState;           // Object : last player state saved
var oldSearchVal;       // String : previous search value
var ajaxSearch, timer;  // 2 variables used to optimize the search, preventing a flood of search
var pseudo;             // String : pseudo of the user
var bcTags;             // Object : list of blacklist criterias tags

var DEBUG;
var SOCKETDEBUG;

var dragAndDrop;        // Boolean : allowing drag&drop
var karaParPage;        // Int : number of karas disaplyed per "page" (per chunk)
var toleranceDynamicPixels; // Int (px) : number of pixel before reaching the end of a playlist to trigger a new chunk of karas to be requested
var saveLastDetailsKara;    // Matrice saving the differents opened kara details to display them again when needed
var playlistToAdd;          // Int : id of playlist users are adding their kara to
var newKara;                // [Int] : for each playlist side, id of the new kara added
var socket;

var settings;

/* promises */
var scrollUpdating;
var playlistsUpdating;
var playlistContentUpdating;
var settingsUpdating;

/* html */
var addKaraHtml;      
var deleteKaraHtml;
var deleteCriteriaHtml;
var transferKaraHtml;
var infoKaraHtml;
var checkboxKaraHtml;
var buttonHtmlPublic;
var closeButton;
var closeButtonBottom;
var closePopupButton;
var showFullTextButton;
var dragHandleHtml;
var playKaraHtml;

var tabTradToDelete;
var plData;

(function (yourcode) {
    yourcode(window.jQuery, window, document);
}(function ($, window, document) {
    $(function () {
        // Once page is loaded

        plData = {  "0" : {
            name: "Standard playlists",
            url : scope + '/playlists/pl_id/karas',
            html : scope === "admin" ? deleteKaraHtml + addKaraHtml + transferKaraHtml : '',
            canTransferKara : true,
            canAddKara : true,
            },
        "-1" : {
            name : "Kara list",
            url : 'public/karas',
            html : addKaraHtml,
            canTransferKara : false,
            canAddKara : false,
            },
        "-2" : {
            name : "Blacklist",
            url : scope + '/blacklist',
            html : scope === "admin" ? '' : '',
            canTransferKara : false,
            canAddKara : true,
        },
        "-3" : {
            name : "Whitelist",
            url : scope + '/whitelist',
            html : scope === "admin" ? deleteKaraHtml + addKaraHtml + transferKaraHtml : '',
            canTransferKara : true,
            canAddKara : true,
        },
        "-4" : {
            name : "Blacklist criterias",
            url : scope + '/blacklist/criterias',
            html : deleteCriteriaHtml,
            canTransferKara : false,
            canAddKara : true,
        }
    }
        // Background things
        var rdmFlip = Math.floor(Math.random() * 2) + 1;    
        $('#panel' + rdmFlip + ' > .playlistContainer').attr('flipped', true);
        $('#panel' + non(rdmFlip) + ' > .playlistContainer').attr('flipped', false);
        var rdmColor = Math.floor(Math.random() * 20) + 1; 
        if (rdmColor == 20) { $('.playlistContainer').attr('noGreyFace', true); }

        // Setup
        $.ajaxSetup({
            error: function (jqXHR, textStatus, errorThrown) {
                DEBUG && console.log(jqXHR.status + "  - " + textStatus + "  - " + errorThrown + " : " + jqXHR.responseText);
                if(jqXHR.status != 0) {
                    displayMessage('warning','Error', jqXHR.responseText);
                }
            }
        });
        // Init with player infos, set the playlist's id where users can add their karas
        $.ajax({ url: 'public/player' }).done(function (data) {
            refreshPlayerInfos(data);

            playlistToAdd = data['private'] == 1 ? "current" : "public";
            $.ajax({ url: 'public/playlists/' + playlistToAdd, }).done(function (data) {
                playlistToAddId = data.playlist_id;
            });

        });
        // Some html init
        settingsUpdating = scope ===  "admin" ?  getSettings() : getPublicSettings();
        
        settingsUpdating.done( function() {
            fillPlaylistSelects().done(function () {
                playlistContentUpdating = $.when.apply($, [fillPlaylist(1), fillPlaylist(2)]);
                refreshPlaylistDashboard(1);
                refreshPlaylistDashboard(2);
                
                $(window).trigger('resize');
             });
        });

        initSwitchs();

        $('.bootstrap-switch').promise().then(function(){
            $(this).each(function(){
                $(this).attr('title', $(this).find('input').attr('title'));
            });
        });
        
        // Méthode standard on attend 100ms après que la personne ait arrêté d'écrire, on abort toute requete de recherche en cours, et on lance la recherche
        $('#searchPlaylist1, #searchPlaylist2').on('input', function () {
            var side = $(this).attr('side');

            clearTimeout(timer);
            timer = setTimeout(function () {
                fillPlaylist(side).done( function() {
                   refreshFooterInfos(side);
                });
            }, 100);
        });

        // Allow pressing enter to validate a setting
        $('#searchPlaylist1, #searchPlaylist2, #choixPseudo').keypress(function (e) {
            if (e.which == 13) {
                $(this).blur();
            }
        });

        
        // When user selects a playlist
        $("#selectPlaylist1, #selectPlaylist2").change(function (e) {
            var val = $(this).val(), oldVal;
            var side = $(this).attr('side');
            var isNew = $(this).find('[data-select2-tag="true"][value="' + val + '"]');
            if(isNew.length > 0) {
                e.preventDefault(); // si c'est une nouvelle entrée, le serveur nous dira quand elle sera crée
                fillPlaylistSelects();
            } else if(val == $("select[type='playlist_select'][side!='" + side + "'] > option:selected[value='" + val + "']").val()) {
                oldVal = $(this).closest('.plDashboard').data('playlist_id');
                $("select[type='playlist_select'][side!='" + side + "']").val(oldVal);
                fillPlaylistSelects().done( function() {
                    $("select[type='playlist_select']").change();
                });
            } else {
                createCookie("plVal" + side, val, 365);

                $("#playlist" + side).empty();
                $("#searchPlaylist" + side).val("");

                fillPlaylist(side).done( function() {
                    refreshPlaylistDashboard(side);
                });
                /*
                // prevent selecting 2 times the same playlist
                if (scope === "admin") {
                    $("select[type='playlist_select'][side!='" + side + "'] > option").attr("disabled", false);
                    $("select[type='playlist_select'][side!='" + side + "'] > option[value='" + val + "']").attr("disabled", true);
                }
                */
            }
        });

        // main actions on karas in the playlists
        $('.playlist-main').on('click', '.btnDiv > button:not(.groupAction), [name="addKara"]', function (e) {
            
            var side = $(this).closest('.panel').attr('side');
        
            var li = $(this).closest('li');
            var idPlaylistFrom = parseInt($('#selectPlaylist' + side).val());
            var idPlaylistTo = parseInt($('#selectPlaylist' + non(side)).val());
            var idKara, idKaraPlaylist;
            
            if($(this).parent().hasClass('plCommands')) {
                var checkedList = $(this).closest('.panel').find('li:has(span[name="checkboxKara"][value="1"])');
                var idKaraList = checkedList.map(function (k, v) {
                    return $(v).attr('idkara');
                });
                var idKaraPlaylistList = checkedList.map(function (k, v) {
                    return $(v).attr('idplaylistcontent');
                });
                
                li = checkedList;
                var idKara = Array.prototype.slice.apply(idKaraList).join();
                var idKaraPlaylist = Array.prototype.slice.apply(idKaraPlaylistList).join();
                if(!idKara && !idKaraPlaylist) {
                    DEBUG && console.log("No kara selected");
                    return false;
                }
            } else {
                idKara = li.attr('idkara');
                idKaraPlaylist = li.attr('idplaylistcontent');
            }

            var action = $(this).attr('name');
            DEBUG && console.log(action, side, idPlaylistFrom, idPlaylistTo, idKara);

            var promise = $.Deferred();
            var url, data, type
            if (action === "addKara" || action === "transferKara") {
                url = "", data = {}, type = "";
                type = "POST";

                if (idPlaylistTo > 0) {
                    url = scope + (scope === "public" ? '/karas/' + idKara : '/playlists/' + idPlaylistTo + '/karas');
                    var requestedby = idPlaylistFrom == -1 || li.data('pseudo_add') == undefined ? pseudo : li.data('pseudo_add');
                    data = { requestedby: requestedby, kara_id: idKara };
                } else if (idPlaylistTo == -1) {
                    displayMessage('warning', 'Error',"can't add kara to the kara list from database");
                    DEBUG && console.log("ERR: can't add kara to the kara list from database");
                } else if (idPlaylistTo == -2) {
                    url = scope + '/blacklist/criterias'
                    data = { blcriteria_type: 1001, blcriteria_value: idKara };
                } else if (idPlaylistTo == -3) {
                    url = scope + '/whitelist';
                    data = { kara_id: idKara, reason: prompt("Raison d'ajout à la whitelist") };
                }

                DEBUG && console.log("ACTION : ", idPlaylistTo, url, type, data);
                if (url !== "") {
                    $.ajax({
                        url: url,
                        type: type,
                        data: data
                    }).done(function (data) {
                        DEBUG && console.log(data);
                        promise.resolve();
                        //fillPlaylist(non(side), idKara);
                        playlistContentUpdating.done( function() {
                            scrollToKara(non(side), idKara); 
                        });
                        displayMessage('success', '', (li.length > 1 ? li.length + " karas ajoutés" : "Kara ajouté")
                            + " à la playlist <i>" +$("#selectPlaylist" + non(side) + " > option[value='" + idPlaylistTo + "']").text() + "</i>.");
                        
                        DEBUG && console.log("Kara " + idKara + " ajouté à la playlist (" + idPlaylistTo + ") "
                            + $("#selectPlaylist" + non(side) + " > option[value='" + idPlaylistTo + "']").text() + ".");
                    }).fail(function (data) {
                        scrollToKara(non(side), idKara);
                        if (mode === "mobile") { fillPlaylist(1) }
                    });
                }
            } else {
                promise.resolve();
            }
            if (action === "transferKara" || action === "deleteKara") {
                // temp solution to database transaction issue
                promise.done( function() {
                    li.addClass('deleted');
                    url = "", data = {}, type = "";
                    type = "DELETE"
                    if (idPlaylistFrom > 0) {
                        url = scope + '/playlists/' + idPlaylistFrom + '/karas/';
                        data['plc_id'] = idKaraPlaylist;
                    } else if (idPlaylistFrom == -1) {
                        DEBUG && console.log("ERR: can't delete kara from the kara list from database");
                    } else if (idPlaylistFrom == -2) {
                        DEBUG && console.log("ERR: can't delete kara directly from the blacklist");
                    } else if (idPlaylistFrom == -3) {
                        url = scope + '/whitelist/' + li.attr('idwhitelist');
                    }
                    if (url !== "") {
                        $.ajax({
                            type: 'DELETE',
                            url: url,
                            data: data
                        }).done(function (data) {
                            li.hide();
                            //fillPlaylist(side);
                        });
                    }
                });
            }
        });
        
        // (de)select all karas button
        $('.playlist-main').on('click', '.btnDiv > button.groupAction', function() {
            var $this = $(this);
            var name = $this.attr('name');
            var side = $this.closest('.panel').attr('side');
            var idPlaylist = $this.closest('.plDashboard').data('playlist_id');
            var idPlaylistTo = $('#panel' + non(side) + ' .plDashboard').data('playlist_id');
            var url = getPlData(idPlaylist).url;

            if (name === "selectAllKaras") {
                $('#playlist' + side + ' [name="checkboxKara"][value="' +  $this.attr('value') + '"]').click();
                $this.attr('value', $this.attr('value') == "1" ? "0" : "1");
            } else if (name === "addAllKaras") {
                $.ajax({ url: url }).done(function (data) {
                    displayMessage("info", "Info", "Ajout de " + data.length + "karas à la playlist " + $('#panel' + non(side) + ' .plDashboard').data('name'))
                    var karaList = data.map(function(a) {return a.kara_id }).join();
                    var urlPost = getPlData(idPlaylistTo).url;
                   
                    $.ajax({
                        url: urlPost,
                        type: "POST",
                        data: { kara_id : karaList, requestedby : pseudo }
                    }).done(function (data) {
                        DEBUG && console.log(karaList + " added to playlist " + idPlaylistTo);
                    });
                });
            } else if (name === "deleteAllKaras") {
                $.ajax({
                    url: url.replace("/karas","") + "/empty",
                    type: "PUT"
                }).done(function (data) {
                    DEBUG && console.log("Playlist " + idPlaylist + " emptied");
                });
            }
        });

        if(mode != "mobile") {
            $('.playlist-main').on('click', '.infoDiv > button[name="infoKara"], .detailsKara > button.closeParent', function(e) {
                toggleDetailsKara($(this));
            });
        }

        // show full lyrics of a given kara
        $('.playlist-main').on('click', '.fullLyrics', function (e) {
            var playlist = $(this).closest('ul');
            var liKara = $(this).closest('li');
            var lyricsKara = liKara.find('.lyricsKara');
            var idKara = liKara.attr('idkara');
            var detailsKara = liKara.find('.detailsKara');

            if(lyricsKara.length == 0) {
                liKara.append($("<div class='lyricsKara alert alert-info'>" + closeButton + "<div class='lyricsKaraLoad'>...</div>" + closeButtonBottom + "</div>")
                    .hide().fadeIn(animTime));                
            } else if (!lyricsKara.is(':visible')) {
                lyricsKara.fadeIn(animTime);
            }
            $.ajax({ url: 'public/karas/' + idKara + '/lyrics' }).done(function (data) {
                liKara.find('.lyricsKaraLoad').html(data.join('<br/>'));
                scrollToElement(playlist, detailsKara);
            });
        });

        // show full lyrics of a given kara
        $('.getLucky').on('click', function (e) {
            $.ajax({ url: 'public/karas/random' }).done(function (data) {
                var chosenOne = data;
                $.ajax({ url: 'public/karas/' + chosenOne }).done(function (data) {
                    data = data[0];
                    alert("Vous allez ajouter " + buildKaraTitle(data)
                        + (pseudo ? " sous le pseudo " + pseudo : "") + ".\nFélicitations.");
                    $.ajax({
                        url: scope + '/karas/' + chosenOne,
                        type: 'POST',
                        data: { requestedby : pseudo }
                    }).done(function (data) {
                        playlistContentUpdating.done( function() {
                            scrollToKara(2, chosenOne); 
                        });
                        displayMessage('success', 'Succès', "Kara ajouté à la playlist <i>" + playlistToAdd + "</i>.");
                    })
                });
            });
        });

        // generic close button
        $('.playlist-main').on('click', '.closeParent', function (e) {
            var el = $(this);
            el.parent().fadeOut(animTime, function(){
                el.parent().remove();
            });
        });

        /* set the right value for switchs */
        $('input[type="checkbox"],[switch="onoff"]').on('switchChange.bootstrapSwitch', function (event) {
            //alert($(this).is(':checked'));
            $(this).val($(this).is(':checked') ? 1 : 0);
        });
     
        
        /* handling dynamic loading */
        $('.playlistContainer').scroll(function(e) {
            var container = $(this);

            if(container.attr('flagScroll') == "true") { 
                container.attr('flagScroll', false);
            } else {
                var playlist = container.find('ul').first();
                var side = playlist.attr('side');
                var dashboard = container.prev('.plDashboard');
                var idPlaylist = dashboard.find('select').val();
                var from =  getPlaylistRange(idPlaylist).from;
                var to = getPlaylistRange(idPlaylist).to;
                var KaraLast, yPosition;
                var nbKaraInPlaylist = container.find('li').length;
                var loading = dashboard.parent().find(".playlistLoading")
    
                toleranceDynamicPixels = 200;
    
                var scrollX;
                //DEBUG && console.log(container.scrollTop(), container.innerHeight(), container[0].scrollHeight, loading.css('display'), loading.css('opacity'));
                var scrollTop = container.scrollTop() + container.innerHeight() + toleranceDynamicPixels >= container[0].scrollHeight && nbKaraInPlaylist >= karaParPage * 2;
                var scrollBottom = container.scrollTop() < toleranceDynamicPixels && from > 0;
                //DEBUG && console.log(container.scrollTop() + container.innerHeight() + toleranceDynamicPixels , container[0].scrollHeight,nbKaraInPlaylist >= karaParPage * 2, scrollTop, loading.css('opacity') > .95);
             

                if (  (!scrollUpdating || scrollUpdating.state() == "resolved")  && (scrollTop || scrollBottom)) {
                    loading.fadeIn(400);
                    
                    if(scrollTop) {  // scroll down 
                        scrollX = container.scrollTop();
                        karaPos = playlist.find('li').last();
                        yPosition = karaPos.offset().top - toleranceDynamicPixels + 15; // - playlist.innerHeight() + scrollX + container.innerHeight();
                        
                        from += karaParPage;
                        to = from + karaParPage * 2;
                    } else if( scrollBottom ) {  // scroll up 
                        
                        scrollX = container.scrollTop();
                        karaPos = playlist.find('li').first();
                        yPosition = karaPos.offset().top + scrollX;
    
                        from = Math.max(0, from - karaParPage -20);
                        to = from + karaParPage * 2;
                    }

                    DEBUG && console.log(scrollX + "Affichage des karas de " + from + " à " + to);
                    
                    setPlaylistRange(idPlaylist, from, to);
                   
                    scrollUpdating = fillPlaylist(side);
                   
                    
                    scrollUpdating.done( function(){

                        var kara = playlist.find('li[idkara="' + karaPos.attr('idkara') + '"]');
                        var yPositionNew = kara && kara.offset() ? kara.offset().top : yPosition;
                        var y = container.scrollTop() + yPositionNew - yPosition;

                        console.log(container, y);
                        container.scrollTop(y);
                        
                        container.attr('flagScroll', true);
                        refreshFooterInfos(side);

                    });
                                          
                }
            }
           
        });

        /* close closable popup */
        $('body').on('click', '.closePopupParent', function (e) {
            var el = $(this);
            el.closest('.popup').fadeOut(animTime);
            el.remove();
            $('body > div[class!="popup"]').css('opacity','1');
        });

        $.ajax({ url: 'public/tags', }).done(function (data) {
            bcTags = data;
        });
        /* prevent the virtual keyboard popup when on touchscreen by not focusing the search input */
        if(isTouchScreen) {
            $('select').on('select2:open', function() {
                $('.select2-search input').prop('focus', 0);
            });
            $('#progressBarColor').addClass('cssTransition');
        }
        
        $(window).trigger('resize');
    });

    socket = io( window.location.protocol + "//" + window.location.hostname + ":1340");
    
    isTouchScreen =  "ontouchstart" in document.documentElement || new URL(window.location.href).searchParams.get("TOUCHSCREEN") != null;
    animTime = $(window).width() < 1000 ? 200 : 300;
    refreshTime = 1000;
    toleranceDynamicPixels = 100;
    mode = "list";
    pseudo = "Anonymous";

    dragAndDrop = true;
    stopUpdate = false;
    
    karaParPage = new URL(window.location.href).searchParams.get("karaNum") ? parseInt(new URL(window.location.href).searchParams.get("karaNum")) : isTouchScreen ? 45 : 55;
    DEBUG = new URL(window.location.href).searchParams.get("DEBUG") != null;
    SOCKETDEBUG = new URL(window.location.href).searchParams.get("SOCKETDEBUG") != null;

    newKara = [] != null;
    saveLastDetailsKara = [[]];
    playlistRange = {};
    ajaxSearch = {}, timer;
    oldState = {};
    oldSearchVal = "";

    addKaraHtml = '<button name="addKara" class="btn btn-sm btn-action"><i class="glyphicon glyphicon-plus"></i></button>';
    deleteKaraHtml = '<button name="deleteKara" class="btn btn-sm btn-action"><i class="glyphicon glyphicon-minus"></i></button>';
    deleteCriteriaHtml = '<button name="deleteCriteria" class="btn btn-action deleteCriteria"><i class="glyphicon glyphicon-minus"></i></button>';
    transferKaraHtml = '<button name="transferKara" class="btn btn-sm btn-action">'
        + '<i class="glyphicon glyphicon-arrow-left"></i><i class="glyphicon glyphicon-arrow-right"></i></button>';
    checkboxKaraHtml = '<span name="checkboxKara" value=0><i class="glyphicon glyphicon-unchecked"></i></span>';
    infoKaraHtml = '<button name="infoKara" class="btn btn-sm btn-action"><i class="glyphicon glyphicon-info-sign"></i></button>';
    closeButton = '<button class="closeParent btn btn-action"><i class="glyphicon glyphicon-remove"></i></button>';
    closeButtonBottom = '<button class="closeParent bottom btn btn-action"><i class="glyphicon glyphicon-remove"></i></button>';
    closePopupButton = '<button class="closePopupParent btn btn-action"><i class="glyphicon glyphicon-remove"></i></button>';
    showFullTextButton = "<button class='fullLyrics btn btn-action'><i class='glyphicon glyphicon-align-justify'></i></button>";
    buttonHtmlPublic = '';
    dragHandleHtml =  "<span class='dragHandle'><i class='glyphicon glyphicon-option-vertical'></i></span>";
    playKaraHtml = "<button class='btn btn-sm btn-action playKara'><i class='glyphicon glyphicon-play'></i></btn>"

    tabTradToDelete = { "TYPE_1001" : "Kara",
    "TYPE_1002" : "Plus long que (sec)",
    "TYPE_1003" : "Plus court que (sec)",
    "TYPE_1000" : "Titre contenant",
    "TYPE_0"    : "Tags",
    "TYPE_1"    : "Inutilisé",
    "TYPE_2"    : "Chanteur",
    "TYPE_3"    : "Type",
    "TYPE_4"    : "Créateur",
    "TYPE_5"    : "Language",
    "TYPE_6"    : "Auteur du kara",
    "TYPE_7"    : "Divers",
    "TYPE_8"    : "Compositeur"
    };

    /* simplify the ajax calls */
    $.ajaxPrefilter(function (options) {
        options.url = window.location.protocol + "//" + window.location.hostname + ":1339/api/v1/" + options.url
    });

    /**
     * Fill a playlist on screen with karas
     * @param {1, 2} side - which playlist on the screen
     * @param {Int} idKara - kara to highlight & scroll to at the end of the work
     * @param {Int} from - returned results start from this sideber
     * @param {Int} to - returned results end to this sideber
     */
    // TODO supprimer idKara et reporter sur le reste du code
    // TODO if list is updated from another source (socket ?) keep the size of the playlist
    fillPlaylist = function (side, idKara, from, to) {
        DEBUG && console.log(side, idKara, from, to);
        var deferred = $.Deferred();
        var idPlaylist = parseInt($("#selectPlaylist" + side).val());
        var filter = $("#searchPlaylist" + side).val();
        var fromTo = "";
        var url, html, canTransferKara, canAddKara, dragHandle, playKara;

        var range = getPlaylistRange(idPlaylist);
        from = range.from;
        to = range.to;

        fromTo += "&from=" + from + "&to=" + to;

        // setup variables depending on which playlist is selected : -1 = database kara list, -2 = blacklist, -3 = whitelist, -4 = blacklist criterias

        var singlePlData = getPlData(idPlaylist);
        if(!singlePlData) return false;
        url = singlePlData.url;
        html = singlePlData.html;
        canTransferKara = singlePlData.canTransferKara;
        canAddKara = singlePlData.canAddKara;
        

        dragHandle = isTouchScreen && (scope == "public" && idPlaylist == -1 && side == 1
                || scope == "admin" && idPlaylist > 0) ? dragHandleHtml : "";
        playKara = scope === "admin" && idPlaylist > 0 ? playKaraHtml : "";

        // public users can add kara to one list, current or public
        canAddKara = scope === "admin" ? canAddKara : $("#selectPlaylist" + side + " > option:selected").data("flag_" + playlistToAdd) == "1";
     
        urlFiltre = url + "?filter=" + filter + fromTo;

        // ask for the kara list from given playlist
        if (ajaxSearch[url]) { ajaxSearch[url].abort(); }
        ajaxSearch[url] = $.ajax({ url: urlFiltre }).done(function (data) {
            //DEBUG && console.log(urlFiltre + " : " + data.length + " résultats");
            
            var htmlContent = "";
            
                if(idPlaylist != -4) {
                    for (var key in data) {
                        if (data.hasOwnProperty(key)) {
                            // build the kara line
                            if (data[key].language === null) data[key].language = "";
                            
                            var karaDataAttributes = " idKara='" + data[key].kara_id + "' "
                            + (idPlaylist == -3 ? " idwhitelist='" + data[key].whitelist_id  + "'" : "")
                            + (idPlaylist > 0 ? " idplaylistcontent='" + data[key].playlistcontent_id + "' pos='"
                                    + data[key].pos + "' data-pseudo_add='" + data[key].pseudo_add + "'" : "")
                            + (data[key].flag_playing ? "currentlyPlaying" : "" ) + " "
                            + (data[key].pseudo_add == pseudo ? "user" : "" )

                            if (mode === "list") {
                                htmlContent += "<li class='list-group-item' " + karaDataAttributes + ">"
                                    + "<div class='btnDiv'>" + html + dragHandle + "</div>"
                                    + (scope == "admin" ? checkboxKaraHtml : "")
                                    + "<div class='infoDiv'>" + infoKaraHtml + playKara + "</div>"
                                    + "<div class='contentDiv''>" + buildKaraTitle(data[key], filter)
                                    + (isTouchScreen || true ? "" : "<span class='badge'>" + data[key].language.toUpperCase() + "</span>")
                                    + "</div>"
                                    + (saveDetailsKara(idPlaylist, data[key].kara_id) ? buildKaraDetails(data[key], mode) : "")
                                    + "</li>"; 
                            } else if (mode === "mobile") {
                                htmlContent += "<li class='collection-item' " + karaDataAttributes + ">"
                                    + "<div class='subKara'>"
                                //    + "<div class='infoDiv right circle'>" + infoKaraHtml + html + "</div>"
                                    + "<div class='contentDiv''>" + buildKaraTitle(data[key], filter)
                                    + "</div>"
                                //    + "<div class='btnDiv right'>" + "</div>"
                                    + "</div>"
                                //    + (saveDetailsKara(idPlaylist, data[key].kara_id) ? buildKaraDetails(data[key]) : "")
                                    + "</li>"; 
                            }
                        }
                    }

                    document.getElementById("playlist" + side).innerHTML = htmlContent;
                    if( mode === "mobile") { swipSwippables(side); }
                } else {
                    /* Blacklist criterias build */
                    var blacklistCriteriasHtml = $("<div/>");
                    var regenSelect2 = false;
                    if (scope === "admin") {
                        if ($('#blacklistCriteriasInputs').length > 0) {
                            $('#blacklistCriteriasInputs').detach().appendTo(blacklistCriteriasHtml);
                        } else {
                            regenSelect2 = true;
                            blacklistCriteriasHtml = $('<div><span id="blacklistCriteriasInputs" class="list-group-item" style="padding:10px">'
                                + '<select id="bcType" class="input-sm" style="color:black"/> '
                                + '<span id="bcValContainer" style="color:black"></span> '
                                + '<button id="bcAdd" class="btn btn-default btn-action addBlacklistCriteria"><i class="glyphicon glyphicon-plus"></i></button>'
                                + '</span></div>');
                                $.each(tabTradToDelete, function(k, v){
                                    blacklistCriteriasHtml.find('#bcType').append($('<option>', {value: k.replace("TYPE_",""), text: v}));                        
                                });
                        }
                    }
                   
                    for (var key in data) {
                        if (data.hasOwnProperty(key)) {
                            if(blacklistCriteriasHtml.find('li[type="' + data[key].type + '"]').length == 0) {
                                blacklistCriteriasHtml.append("<li class='list-group-item liType' type='" + data[key].type + "'>" + tabTradToDelete["TYPE_" + data[key].type] + "</li>");
                            }
                            // build the blacklist criteria line
                            var bcTagsFiltered = jQuery.grep(bcTags, function(obj) {
                                return obj.tag_id == data[key].value;
                            });
                            var tagText = bcTagsFiltered.length == 1 ?  bcTagsFiltered[0].name_i18n : data[key].value;
                            var textContent = data[key].type == 1001 ? buildKaraTitle(data[key].value[0]) : tagText;

                            blacklistCriteriasHtml.find('li[type="' + data[key].type + '"]').after(
                                "<li class='list-group-item liTag' blcriteria_id='" + data[key].blcriteria_id + "'> "
                                + "<div class='btnDiv'>" + html + "</div>"
                                + "<div class='typeDiv'>" + tabTradToDelete["TYPE_" + data[key].type] + "</div>"
                                + "<div class='contentDiv''>" + textContent + "</div>"
                                + "</li>");
                        }
                    }
                   //htmlContent = blacklistCriteriasHtml.html();
                    $("#playlist" + side).empty().append(blacklistCriteriasHtml);
                    if (regenSelect2) { $('#bcType').select2({ theme: "bootstrap", dropdownAutoWidth : true, minimumResultsForSearch: -1 }); }
                    $('#bcType').change();
                }
              
                
           
            // depending on the playlist we're in, notify if the other playlist can add & transfer to us
            $('#panel' + non(side)).attr('canTransferKara', canTransferKara).attr('canAddKara', canAddKara);
            
            deferred.resolve();
            //var time = console.timeEnd('html'); DEBUG && console.log(data.length);
           
            $('#panel' + side).find('.playlistLoading').fadeOut(400);
          
            // drag & drop part
            // TODO revoir pour bien définir le drag&drop selon les droits
            if (dragAndDrop && scope === "public" && mode != "mobile") {
                var draggableLi =  isTouchScreen  ? $("#playlist" + 1 + " > li .dragHandle") : $("#playlist" + 1 + " > li");
                var dropZone = $('#playlist' + non(1)).parent();
                if(draggableLi.draggable('instance') != undefined) {
                    if($("#panel" + 1).attr('canaddkara') == "true")  {
                        draggableLi.draggable('enable')
                        dropZone.droppable('enable');
                    } else {
                        draggableLi.draggable('disable');
                        dropZone.droppable('disable');
                    }
                } else if( $("#panel" + 1).attr('canaddkara') == "true") {
                    draggableLi.draggable({
                        cursorAt: { top: 20, right: 15 },
                        helper:  function(){
                            var li = $(this).closest('li');
                            return $("<div class='list-group-item dragged'></div>")
                                .append(li.find('.dragHandle').clone(),li.find('.contentDiv').clone())  },
                        appendTo: dropZone,
                        zIndex: 9999,
                        delay: 0, 
                        distance: 0
                    });
                    dropZone.droppable({
                         classes: {
                            "ui-droppable-hover": "highlight-hover",
                            "ui-droppable-active": "highlight-active"
                            },
                        drop : function(e, ui){ $(ui.draggable).closest('li').find('.btnDiv > [name=addKara]').click(); }
                    });
                }
            } else if(dragAndDrop && scope === "admin") {
                if(idPlaylist > 0) {
                    var sortableUl = $("#playlist" + side);
                    sortableUl.sortable({
                        appendTo: sortableUl,
                        handle : isTouchScreen ? ".btnDiv" : false,
                        cancel : "",
                        update: function(event, ui) { changeKaraPos(ui.item) },
                       // connectWith: sortableUl2,
                       axis : "y"
                    });
                }
                /*
                if ($('#selectPlaylist' + non(side)).val() > 0) {
                    var sortableUl2 = $("#playlist" + non(side));
                    sortableUl2.sortable({
                        appendTo: sortableUl2,
                        helper : isTouchScreen ? ".dragHandle" : false,
                        update: function(event, ui) { changeKaraPos(ui.item) },
                       // connectWith: sortableUl,
                       axis : "y"
                    });
                }
                    */
                /*
                helper: function(event, ui){ 
                    var li = $(ui);
                    li.find('.detailsKara, .lyricsKara').remove();
                    li.css('height', 'auto');
                    return li.clone()},
                    start: function(e, ui){
                        ui.placeholder.height(ui.item.height());
                    },
                    */
                
            }
        });
        return deferred.promise();
    }
    /**
     * Scroll to a kara in a playlist and highlight it
     * @param {1, 2} side - which playlist on the screen
     * @param {Int} idKara - kara to highlight & scroll
     */
    scrollToKara = function (side, idKara) {
        var parent = $("#playlist" + side).parent();
        var element = parent.find("li[idkara='" + idKara + "']");
        if (element.length > 0) {
            var willParentSroll = parent[0].scrollTop != parent[0].clientTop|| (parent[0].clientHeight != parent[0].scrollHeight
                                    && parent.scrollTop() + element.offset().top - parent.offset().top != 0)
            // DEBUG && console.log( parent[0].scrollTop, parent[0].clientTop, parent[0].clientHeight, parent[0].scrollHeight, parent.scrollTop() + element.offset().top - parent.offset().top);
            parent.velocity({
                scrollTop: parent.scrollTop() + element.offset().top - parent.offset().top
            }, willParentSroll ? 400 : 0 , function(){
                    element = parent.find("li[idkara='" + idKara + "']"); // element may be lost in the meantime
                    element.finish().effect( "highlight", {color: '#234a35'}, 1000 );
                    element.focus();
            });
        }
    }
    
    /** 
    * Generic function scrolling to an element in its parent
    * @param {Element} parent - parent of the element
    * @param {Element} element - element to scroll to
    * @param {Boolean} highlight - to highlight the element
    */
    scrollToElement = function (parent, element, highlight) {
        var willParentSroll = parent[0].scrollTop != parent[0].clientTop || (parent[0].clientHeight != parent[0].scrollHeight
                                && parent.scrollTop() + element.offset().top - parent.offset().top != 0)
        // DEBUG && console.log( parent[0].scrollTop, parent[0].clientTop, parent[0].clientHeight, parent[0].scrollHeight, parent.scrollTop() + element.offset().top - parent.offset().top);
         parent.velocity({
            scrollTop: parent.scrollTop() + element.offset().top - parent.offset().top
        }, willParentSroll ? 400 : 0 , function(){
            if(highlight) {
                element.finish().effect( "highlight", {color: '#234a35'}, 1000 );
                element.focus();
            }
        });
    }
     
    /** 
    * Fill playlist lists
    */
    fillPlaylistSelects = function () {
        var deferred = $.Deferred();

        var playlistList = {};
        var select1 = $("#selectPlaylist1"), select2 = $("#selectPlaylist2");
        var val1 = select1.val(), val2 = select2.val();
        
        $.ajax({ url: scope + '/playlists', }).done(function (data) {
            playlistList = data; // object containing all the playlists
            if (scope === "admin")                                                              playlistList.push({ "playlist_id": -1, "name": "Karas" });
            if (scope === "admin" || settings['EngineAllowViewBlacklist'] == 1)           playlistList.push({ "playlist_id": -2, "name": "Blacklist", "flag_visible" : settings['EngineAllowViewBlacklist'] });
            if (scope === "admin" || settings['EngineAllowViewBlacklistCriterias'] == 1)  playlistList.push({ "playlist_id": -4, "name": "Blacklist criterias", "flag_visible" : settings['EngineAllowViewBlacklistCriterias']});
            if (scope === "admin" || settings['EngineAllowViewWhitelist'] == 1)           playlistList.push({ "playlist_id": -3, "name": "Whitelist", "flag_visible" :  settings['EngineAllowViewWhitelist']});
        
            // building the options
            var optionHtml = "";
            $.each(playlistList, function (key, value) {
                var params = Object.keys(value).map(function (k, v) {  return "data-" + k + "='" +  value[k] + "'" }).join(" ");
                optionHtml += "<option " + params + "  value=" + value.playlist_id + "> " + value.name + "</option>";
            });
            $("select[type='playlist_select']").empty().html(optionHtml);

            // setting the right values to newly refreshed selects
            // for public interface, panel1Default to keep kara list, playlistToAddId to show the playlist where users can add
            // for admin, check cookies
            if(scope === "public" && typeof playlistToAddId == "undefined") {
                select1.val(val1? val1 : panel1Default);
                $.ajax({ url: 'public/player' }).done(function (data) {
                    playlistToAdd = data['private'] == 1 ? "current" : "public";
                    
                    $.ajax({ url: 'public/playlists/' + playlistToAdd, async: true }).done(function (data) {
                        playlistToAddId = data.playlist_id;
                        select2.val(val2? val2 : playlistToAddId);
                    });
                });
            } else {
                var plVal1Cookie = readCookie("plVal1");
                var plVal2Cookie = readCookie("plVal2");
                select1.val(val1? val1 : plVal1Cookie ? plVal1Cookie : -1);
                select2.val(val2? val2 : plVal2Cookie ? plVal2Cookie : 1);
            }
            
/*
            if(newVal != undefined & side != undefined) {
                $("#selectPlaylist" + side).val(newVal);
            }
*/    
            $(".select2").select2({ theme: "bootstrap",
                                    templateResult: formatPlaylist,
                                    templateSelection : formatPlaylist,
                                    tags: true,
                                    minimumResultsForSearch: 2
                                });
            deferred.resolve();
        }).fail(function (data) {
            DEBUG && console.log(data);
        });
        return deferred.promise();
    };

    /** refresh playlist dashboard infos
    * @param {1,2} side - (optional) side of the playlist to trigger the change on
    */
   refreshPlaylistDashboard = function(side) {
        var dashboard = $("#panel" + side + " .plDashboard");
        var select = dashboard.find('.plSelect select');
        var option = select.find("option:selected");
        // managing flags
        ["flag_current", "flag_public"].forEach(function (e) {
            if (option.data(e) == "1") { dashboard.find("button[name='" + e + "']").removeClass('btn-default').addClass('btn-primary'); }
            else { dashboard.find("button[name='" + e + "']").removeClass('btn-primary').addClass('btn-default'); }
        });

        // overcomplicated stuff because storing var as data in html via jquery doesn't affect actual html attributes...
        var optionAttrList = option.prop("attributes");
        var attrList = dashboard.prop("attributes");
        var attrListStr = Object.keys(attrList).map(function(k,v){return attrList[v].name.indexOf('data-') > -1 ? attrList[v].name : "" }).join(" ");
        dashboard.removeAttr(attrListStr);

        $.each(optionAttrList, function() {
            dashboard.attr(this.name, this.value);
        });
        dashboard.data(option.data());
        playlistContentUpdating.done( function(){
            refreshFooterInfos(side);
        });
        var idPlaylist =  option.val();
        if (playlistRange[idPlaylist] == undefined) {
            setPlaylistRange(idPlaylist, 0, karaParPage * 2);
        }
        $(window).resize();
    }

    refreshFooterInfos = function(side) {
        var dashboard =  $("#panel" + side + " .plDashboard");
        var idPlaylist = dashboard.find('.plSelect select > option:selected').val();
        var range = getPlaylistRange(idPlaylist);
        var max = range.from + $('#playlist' + side + ' > li ').length;

        var plInfos = "";
        if(idPlaylist) {
            plInfos = range.from + "-" + max;
            plInfos += (idPlaylist != -1) ? " / " + dashboard.data('num_karas') + " karas ~ dur " + secondsTimeSpanToHMS(dashboard.data('length')) : "";
            dashboard.parent().find('.plInfos').text(plInfos);
        }
    }

    /** 
    * refresh the player infos
    * @param {Function} callback - function to call at the end of the refresh
    * @param {anything} param1 - param to give to this function
    */
    refreshPlayerInfos = function (data, callback, param1) {
        if (oldState != data) {
            var newWidth = $('#karaInfo').width() * parseInt(10000 * ( data.timePosition + refreshTime/1000) / $('#karaInfo').attr('length')) / 10000 + 'px';
          
            if (data.timePosition != oldState.timePosition && !stopUpdate && $('#karaInfo').attr('length') != 0) {
                    var elm = document.getElementById('progressBarColor');
                    elm.style.transform =  "translateX(" + newWidth + ")";
            }
            if (oldState.status != data.status || oldState.playerStatus != data.playerStatus) {
                status = data.status === "stop" ? "stop" : data.playerStatus;
                //DEBUG && console.log("status : " + status + " enginestatus : " + data.status  + " playerStatus : " + data.playerStatus );
                switch (status) {
                    case "play":
                        $('#status').attr('name','pause');
                        $('#progressBarColor').addClass('cssTransform');
                        break;
                    case "pause":
                        $('#status').attr('name', 'play');
                        $('#progressBarColor').removeClass('cssTransform');
                        break;
                    case "stop":
                        $('#status').attr('name', 'play');
                        $('#progressBarColor').removeClass('cssTransform');
                        break;
                    default:
                        DEBUG && console.log("ERR : Kara status unknown : " + status);
                }
            }
            if($('input[name="lyrics"]').is(':checked') || mode == "mobile" && $('#switchInfoBar').hasClass('showLyrics')) {
                var text = data['subText'];
                if(oldState['subText'] != null && text != null && text.indexOf(oldState['subText']) > -1 && text != oldState['subText']) {
                    text.replace(oldState['subText'], "<span style='background-color: #888;'>" + oldState['subText'] + "</span>");
                }
                $('#karaInfo > span').html(text);
            } else {

            }
            if (data.currentlyPlaying !== oldState.currentlyPlaying && data.currentlyPlaying > 0) {
                
                var barCss = $('#progressBarColor.cssTransform');
                barCss.removeClass('cssTransform');
                $('#progressBarColor').stop().css({transform : "translateX(0)"});
                barCss.addClass('cssTransform');

                $.ajax({ url: 'public/karas/' + data.currentlyPlaying }).done(function (dataKara) {
                    $('#karaInfo').attr('idKara', dataKara[0].kara_id);
                    $('#karaInfo').attr('length', dataKara[0].duration);
                    $('#karaInfo > span').text( buildKaraTitle(dataKara[0]) );
                    $('#karaInfo > span').data('text', buildKaraTitle(dataKara[0]) );
                });
                var panel = $('[type="playlist_select"] > option:selected[flag_current="1"]').closest('.panel');
                panel.find('.list-group-item[currentlyPlaying]').removeAttr('currentlyPlaying');
                panel.find('.list-group-item[idkara="' + data.currentlyPlaying + '"]').attr('currentlyPlaying', '');
            } 
            if (data.showSubs != oldState.showSubs) {
                if (data.showSubs) {
                    $('#showSubs').attr('name','hideSubs');
                } else {
                    $('#showSubs').attr('name','showSubs');
                }
            }
            if (data.muteStatus != oldState.muteStatus) {
                if (!data.muteStatus) {
                    $('#mutestatus').attr('name','mute');
                } else {
                    $('#mutestatus').attr('name','unmute');
                }
            }
            if (data.onTop != oldState.onTop) {
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
    };
 
    /** 
    * Init bootstrapSwitchs
    */
    initSwitchs = function () {
        $("input[switch='onoff'],[name='EnginePrivateMode'],[name='kara_panel'],[name='lyrics']").bootstrapSwitch('destroy', true);

        $("input[switch='onoff']").bootstrapSwitch({
            wrapperClass: "btn btn-default",
            "data-size": "normal"
        });
        $("[name='EnginePrivateMode'],[name='kara_panel'],[name='lyrics']").bootstrapSwitch({
            "wrapperClass": "btn btn-default",
            "data-size": "large",
            "labelWidth": "15",
            "handleWidth": "59",
            "data-inverse": "false"
        })
    }
 
    /** 
    * Build kara title for users depending on the data
    * @param {Object} data - data from the kara
    * @param {String} search - (optional) search made by the user
    * @return {String} the title
    */
    buildKaraTitle = function(data, search) {
        var titleArray = $.grep([data.language.toUpperCase(), data.serie ? data.serie : data.singer,
            data.songtype_i18n_short + (data.songorder > 1 ? " " + data.songorder : ""), data.title], Boolean);
        var titleClean = Object.keys(titleArray).map(function (k) {
                return titleArray[k] ? titleArray[k] : "";
            });
        var titleText = titleClean.join(" - ");

        if(search) {
            var search_regexp = new RegExp("(" + search + ")", "gi");
            titleText = titleText.replace(search_regexp,"<h>$1</h>");
        }
           return titleText;
    }
 
    toggleDetailsKara = function (el) {
        var liKara = el.closest('li');
        var idKara = parseInt(liKara.attr('idkara'));
        var idPlc = parseInt(liKara.attr('idplaylistcontent'));
        var idPlaylist = parseInt( el.closest('.panel').find('.plDashboard').data('playlist_id'));
        var infoKara = liKara.find('.detailsKara');
        if (infoKara.length == 0) {
            var urlInfoKara = idPlaylist > 0 ? scope + '/playlists/' + idPlaylist + '/karas/' + idPlc : 'public/karas/' + idKara;

            $.ajax({ url: urlInfoKara }).done(function (data) {
                var detailsHtml = buildKaraDetails(data[0], mode);
                detailsHtml = $(detailsHtml).hide()
                liKara.find('.contentDiv').after(detailsHtml);

                if(mode == "mobile") {
                    liKara.find('.fullLyricsMobile').hammer().on('tap', function (e) {
                        var playlist = $(this).closest('ul');
                        var liKara = $(this).closest('li');
                        var idKara = liKara.attr('idkara');
                        var detailsKara = liKara.find('.detailsKara');
                  
                        $.ajax({ url: 'public/karas/' + idKara + '/lyrics' }).done(function (data) {
                            $('#lyricsModalText').html(data.join('<br/>'));
                            $('#lyricsModal').modal('open');
                        });
                    });
                    
                }
                detailsHtml.fadeIn(animTime);
                liKara.find('[name="infoKara"]').css('border-color', '#8aa9af');
                saveDetailsKara(idPlaylist, idKara, "add");
            });
        } else if (infoKara.is(':visible')) {
            saveDetailsKara(idPlaylist, idKara, "remove");
            infoKara.add(liKara.find('.lyricsKara')).fadeOut(animTime);
            
            liKara.find('[name="infoKara"]').css('border-color', '');
        } else {
            saveDetailsKara(idPlaylist, idKara, "add");
            infoKara.fadeIn(animTime);
            liKara.find('[name="infoKara"]').css('border-color', '#8aa9af');
        }
    }

    /** 
    * Build kara details depending on the data
    * @param {Object} data - data from the kara
    * @param {String} mode - html mode
    * @return {String} the details, as html
    */
    buildKaraDetails = function(data, htmlMode) {
        var details = {
                  "Added ": (data['date_add'] ? data['date_add'] : "") + (data['pseudo_add'] ? " by " + data['pseudo_add'] : "")
                , "Author": data['author']
                , "Viewcount": data['viewcount']
                , "Creator": data['creator']
                , "Duration": data['duration'] == 0 || isNaN(data['duration']) ? null : ~~(data['duration'] / 60) + ":" + (data['duration'] % 60 < 10 ? "0" : "") + data['duration'] % 60
                , "Language": data['language_i18n']
                , "Misc": data['misc_i18n']
                , "Series": data['series']
                , "Series_altname": data['series_altname']
                , "Singer": data['singer']
                , "Type ": data['songtype_i18n'] + data['songorder'] > 1 ? " " + data['songorder'] : ""
                , "series": data['series']
                , "series_altname": data['series_altname']
            }
            var htmlDetails = Object.keys(details).map(function (k) {
                return details[k] ? "<tr><td>" + k + "</td><td>" + details[k] + "</td><tr/>" : "";
            });
            var htmlTable = "<table>" + htmlDetails.join("") + "</table>";

            infoKaraTemp = "no mode specified";
            if (htmlMode == "list") {
                infoKaraTemp = "<div class='detailsKara alert alert-info'>" + closeButton + showFullTextButton + htmlTable + "</div>";
            } else if (htmlMode == "mobile") {
                infoKaraTemp = "<div class='detailsKara z-depth-1'>" + showFullTextButton + htmlTable + "</div>";
            }
            return infoKaraTemp;
    }
	
	/*
	*	Manage memory of opened kara details
	*	idPlaylist {Int} : id of the playlist the details are opened/closed in 
	*	idKara {Int} : id of the kara having his details opened
	*	command {Int} : command to execute, "add"/"remove" to add/remove to/from the list, nothing to just know if the details are opened
	*/
	saveDetailsKara = function(idPlaylist, idKara, command) {
		if(isNaN(idPlaylist) || isNaN(idKara)) { return false; }
		idPlaylist = parseInt(idPlaylist);
		idKara = parseInt(idKara);
		if(saveLastDetailsKara[idPlaylist + 1000] == undefined) { saveLastDetailsKara[idPlaylist + 1000] = []; }
		if(command == "add") {
			saveLastDetailsKara[idPlaylist + 1000].push(idKara);
		} else if(command == "remove") {
			saveLastDetailsKara[idPlaylist + 1000].pop(idKara);
		} else {
		//DEBUG && console.log("ah",(-1 != $.inArray(idKara, saveLastDetailsKara[idPlaylist + 1000])));
			return (-1 != $.inArray(idKara, saveLastDetailsKara[idPlaylist + 1000]));
		}
	}

    formatPlaylist = function (playlist) {
        if (!playlist.id) { return playlist.text; }
        if (!$(playlist.element).data('flag_current') == "1"
            && !$(playlist.element).data('flag_public') == "1"
            && !$(playlist.element).data('flag_visible') == "0")
            { return playlist.text; }
    
        var icon = "";
        if ($(playlist.element).data('flag_current') == "1") {
            icon =  '<i class="glyphicon glyphicon-facetime-video"></i>'
        } else if ($(playlist.element).data('flag_public') == "1") {
            icon = '<i class="glyphicon glyphicon-globe"></i>';
        }
        if ($(playlist.element).data('flag_visible') == "0") {
            icon +=  ' <i class="glyphicon glyphicon-eye-close"></i> '
        }

        var $option = $('<span>' + icon + ' ' + playlist.text + '</span>');

        return $option;
    }

    /* display an element as closable popup */
    popup = function(element, easing, callback) {
        el = $(element);
        el.animate({ opacity: 'toggle', height: 'toggle' }, 'fast', easing, function(){
            el.css('max-height', $(window).height() - 100);
            el.css('top', 50);
            el.css('max-width',$(window).width() * .95);
            el.css('left', ($(window).width() - el.width()) / 2);

            $('body > div[class!="popup"]').css('opacity','.5');
            el.prepend(closePopupButton);
        });
    }

    /* display a fading message, useful to show success or errors */
    displayMessage = function(type, title, message) {
        var messageDiv = $('#message');
        messageDiv.finish().hide();
        messageDiv.attr('class','alert alert-' + type);
        messageDiv.html('<strong>' + title + '</strong> ' + message);
        messageDiv.fadeIn(600).delay(2200).fadeOut(600);
        
    }

    $(window).resize(function () {
        //  initSwitchs();
        var topHeight1 = $('#panel1 .panel-heading.container-fluid').outerHeight();
        var topHeight2 = $('#panel2 .panel-heading.container-fluid').outerHeight();
        $('#playlist1').parent().css('height', 'calc(100% - ' + (scope === "public" ? 0 : topHeight1) + 'px ');
        $('#playlist2').parent().css('height', 'calc(100% - ' + topHeight2 + 'px  ');
    });

    /* opposite sideber of playlist : 1 or 2 */
    non = function (side) {
        return 3 - parseInt(side);
    }

    secondsTimeSpanToHMS = function(s) {
        var h = Math.floor(s/3600);
        s -= h*3600;
        var m = Math.floor(s/60);
        s -= m*60;
        return (h > 0 ? h+"h" : "") +(m < 10 ? '0'+m : m)+"m"+(s < 10 ? '0'+s : s ) + 's'; 
    }

    getPlaylistRange = function(idPl) {
        var search = $("#searchPlaylist" + sideOfPlaylist(idPl)).val()
        if(!playlistRange[idPl]) playlistRange[idPl] = {};
        return playlistRange[idPl][search] ? playlistRange[idPl][search] : { from : 0, to : karaParPage * 2 };
    }

    setPlaylistRange = function(idPl, from, to) {
        var search = $("#searchPlaylist" + sideOfPlaylist(idPl)).val()
        if(!playlistRange[idPl]) playlistRange[idPl] = {};
        playlistRange[idPl][search] = { from : from, to : to };
    }

    getPlData = function(idPl) {
        var idPlNorm = Math.min(0, idPl);
        var singlePlData = plData[idPlNorm] ? jQuery.extend({}, plData[idPlNorm]) : null;

        if(singlePlData) singlePlData.url = singlePlData.url.replace("pl_id", idPl);
        
        return singlePlData;
    }
    
    sideOfPlaylist = function(idPlaylist) {
        var side = $('[type="playlist_select"] > option:selected[value="' + idPlaylist + '"]').parent().attr('side');
        return side;
    }

    /* cookies */
        
    createCookie = function(name,value,days) {
        if (days) {
            var date = new Date();
            date.setTime(date.getTime()+(days*24*60*60*1000));
            var expires = "; expires="+date.toGMTString();
        }
        else var expires = "";
        document.cookie = name+"="+value+expires+"; path=/";
    }

    readCookie = function(name) {
        var nameEQ = name + "=";
        var ca = document.cookie.split(';');
        for(var i=0;i < ca.length;i++) {
            var c = ca[i];
            while (c.charAt(0)==' ') c = c.substring(1,c.length);
            if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
        }
        return null;
    }

    eraseCookie = function(name) {
        createCookie(name,"",-1);
    }

    /* partie socket */
    socket.on('playerStatus', function(data){
        refreshPlayerInfos(data)
    });
    
    socket.on('settingsUpdated', function(data){
        settingsUpdating = scope === "admin" ? getSettings() : getPublicSettings(false);

        settingsUpdating.done(function (){
            if(!($('#selectPlaylist' + 1).data('select2') && $('#selectPlaylist' + 1).data('select2').isOpen() 
                || $('#selectPlaylist' + 2).data('select2') && $('#selectPlaylist' + 2).data('select2').isOpen() )) {
                playlistsUpdating = fillPlaylistSelects();
    
                playlistsUpdating.done(function () {
                    refreshPlaylistDashboard(1);
                    refreshPlaylistDashboard(2);
            
                });
            }
        });
    });

    socket.on('playlistsUpdated', function(){
        if(!(($('#selectPlaylist2').data('select2') && $('#selectPlaylist2').data('select2').isOpen())
                || ($('#selectPlaylist1').data('select2') && $('#selectPlaylist1').data('select2').isOpen()))) { 
            playlistsUpdating = fillPlaylistSelects(); 
        }
    });

    socket.on('playlistInfoUpdated', function(idPlaylist){
        if (idPlaylist) {
          if(!($('#selectPlaylist' + 1).data('select2') && $('#selectPlaylist' + 1).data('select2').isOpen() 
                || $('#selectPlaylist' + 2).data('select2') && $('#selectPlaylist' + 2).data('select2').isOpen() )) {
                playlistsUpdating = fillPlaylistSelects();

                var side = sideOfPlaylist(idPlaylist); DEBUG && console.log("b" +side);
                if (side) {
                    playlistsUpdating.done(function () {DEBUG && console.log("ah" + side);
                        refreshPlaylistDashboard(side);
                     });
                }
               
            }
        }
    });

    socket.on('playingUpdated', function(data){
        var side = sideOfPlaylist(data.playlist_id);
        DEBUG && console.log(side, data.playlist_id);
        $('#playlist' + side + ' > li[currentlyplaying]').removeAttr('currentlyplaying');
        $('#playlist' + side + ' > li[idplaylistcontent="' + data.plc_id + '"]').attr('currentlyplaying', true);
    });

    socket.on('playlistContentsUpdated', function(idPlaylist){
        var side = sideOfPlaylist(idPlaylist);
        DEBUG && console.log(side, idPlaylist);
        if(side && $('#playlist' + side + '.lyricsKara:visible').length == 0) {
            playlistContentUpdating = fillPlaylist(side);
        }
    });

    socket.on('blacklistUpdated', function(){
        var idPlaylist = -2;
        var side = sideOfPlaylist(idPlaylist);

        if(side && $('#playlist' + side + '.lyricsKara:visible').length == 0) {
            playlistContentUpdating = fillPlaylist(side);
        }
        idPlaylist = -4;
        var side = sideOfPlaylist(idPlaylist);
        if(side && $('#playlist' + side + '.lyricsKara:visible').length == 0) {
            playlistContentUpdating = fillPlaylist(side);
        }
       
    });

    socket.on('whitelistUpdated', function(idPlaylist){
        var idPlaylist = -3;
        var side = sideOfPlaylist(idPlaylist);

        if(side && $('#playlist' + side + '.lyricsKara:visible').length == 0) {
            playlistContentUpdating = fillPlaylist(side);
        }
    });

    var onevent = socket.onevent;
    socket.onevent = function (packet) {
        var args = packet.data || [];
        onevent.call (this, packet);    // original call
        packet.data = ["*"].concat(args);
        onevent.call(this, packet);      // additional call to catch-all
    };
    
    socket.on('*', function(e, data) {
        true && SOCKETDEBUG && DEBUG && console.log(e, data);
    });
}));


