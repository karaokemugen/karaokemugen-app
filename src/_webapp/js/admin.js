$(document).ready(function(){
/*** INITIALISATION ***/
/* variables & ajax setup */

    $.ajaxPrefilter(function( options ) {
        options.url = window.location.protocol + "//" + window.location.hostname + ":1339/api/v1/" +  options.url 
    });
    $.ajaxSetup({
        headers : {"Authorization": "Basic " + mdpAdminHash},
        error: function(jqXHR, textStatus, errorThrown) {
            console.log(jqXHR.status + "  - " + textStatus + "  - " + errorThrown);
        }
    });


    /* init functions */

     // refresh screen depending on player infos
    refreshCommandStates = function(){
        $.ajax({url : 'public/player'}).done(function(data){
            var status = data.status === "stop" ? "stop" : data.playerstatus;
			//console.log("status : " + status + " enginestatus : " + data.status  + " playerstatus : " + data.playerstatus );
            switch(status) {
                case "play":
                    $('#play').find('i').attr('class','glyphicon glyphicon-pause');
                    $('#play').val('pause');
                    break;
                case "pause":
                    $('#play').find('i').attr('class','glyphicon glyphicon-play');
					$('#play').val('play');
                    break;
                case "stop":
                    $('#play').find('i').attr('class','glyphicon glyphicon-play');
					$('#play').val('play');
                    break;
                default:
                    alert("Kara status unknown : " + status);
            }
            if(data.currentlyplaying !== $('#karaInfo').attr('idKara') && data.currentlyplaying > 0) {
                $.ajax({url : 'public/karas/' + data.currentlyplaying}).done(function(dataKara){
                    //console.log(dataKara[0].duration);
                    $('#karaInfo').attr('idKara', dataKara[0].id_kara);
                    $('#karaInfo').text( [dataKara[0].language.toUpperCase(), dataKara[0].title, "" , dataKara[0].series].join(" - ") );
                    $('#karaInfo').attr('length', dataKara[0].duration);                
                });
            }
            if ($('#karaInfo').attr('length') != 0) {
                $('#progressBarColor').width(100 * data.timeposition /  $('#karaInfo').attr('length') + '%');
            }
            onTop = $('input[name="toggleAlwaysOnTop"]');
            if(onTop.bootstrapSwitch('state') != data.ontop) {
               onTop.bootstrapSwitch('state', data.ontop, true);
            }
            fullScreen = $('input[name="toggleFullscreen"]');
            if(fullScreen.bootstrapSwitch('state') != data.fullscreen) {
               fullScreen.bootstrapSwitch('state', data.fullscreen, true);
            }
            //$('input[name="toggleFullscreen"]').bootstrapSwitch('state', data.fullscreen);

        });
    };

    fillPlaylistSelects = function() {
        var playlistList = {};
        $.ajax({url : 'admin/playlists', }).done(function(data){
            playlistList = data;
            playlistList.push({"id_playlist" : -1, "name" : "Karas"});
            $.each(playlistList, function(key, value) 
            {  
                $("select[type='playlist_select']").append('<option value=' + value.id_playlist + '>' + value.name + '</option>');
            });
            $(".select2").select2({theme: "bootstrap"});
            
// TODO à suppr
            $("[type='playlist_select'][num='1']").val(-1).trigger('change');
            $("[type='playlist_select'][num='2']").val(1).trigger('change');

        }).fail(function(data){
            $.each(data, function(index, value) {
                $('#consolelog').html( $('#consolelog').html() + index + ': ' + value + '<br/>');
            });
    
        });
    };

    initSwitchs = function(){
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

    getSettings = function(nameExclude) {
        var playlistList = {};
        $.ajax({url : 'admin/settings'}).done(function(data){
            $.each(data, function (i, item) {
                input = $('input[name="' + i + '"]');
                if(input.length == 1 && i != nameExclude) {
                    if(input.attr('type') !== "checkbox") {
                        input.val(item); 
                    } else {
                        input.bootstrapSwitch('state', item);
                    }
                }
            }); 
        });
    }

    setSettings = function(e) { console.log(e, $(e));
        if( e.attr('oldValue') !==  e.val() ) {
            getSettings(e.attr('name'));
                
            $('#settings').promise().then(function(){
                settingsArray = $('#settings').serializeArray();
                settingsArray['EnginePrivateMode'] = $('input[name="EnginePrivateMode"]').val();
                
                $.ajax({
                    url : 'admin/settings',
                    data : settingsArray    
                });
            });
        }
    }
    /* init selects & switchs */

    $("input[type='checkbox']").on('switchChange.bootstrapSwitch', function(event) {
        $(this).val($(this).is(':checked') ? 1 : 0);
    });

    fillPlaylistSelects();
    initSwitchs();
    refreshCommandStates();
    setInterval(function() {
        refreshCommandStates();
    }, 1500);

    /* event handlers */

    $("[name='kara_panel']").on('switchChange.bootstrapSwitch', function(event, state) {
        console.log(this, event, state);
        if (state) {
            $('#playlist').hide();
            $('#manage').show();
        } else {
            $('#playlist').show();
            $('#manage').hide();
        }
    });	
    $("[name='EnginePrivateMode']").on('switchChange.bootstrapSwitch', function(event, state) {
        console.log(this, event, state);
        // FCT send playlist state (1=private 0=public)
        
    });	
    // get & build kara list on screen
    $("select[type='playlist_select']").change(function(){
        var val = $(this).val();
        var num = $(this).attr('num');
        /* prevent selecting 2 times the same playlist */
        $("select[type='playlist_select'][num!=" + num + "] > option").prop( "disabled", false );
        $("select[type='playlist_select'][num!=" + num + "] > option[value='" + val + "']").prop( "disabled", true );
        $("select[type='playlist_select'][num!=" + num + "]").select2({theme: "bootstrap"});
        
        var side = num == 1 ? 'right' : 'left';
        var buttonHtml = '<button onclick="transfer(this);" num="' + num + '" class="btn btn-sm btn-default btn-dark pull-' + side +'">'
                            + '<i class="glyphicon glyphicon-arrow-left"></i><i class="glyphicon glyphicon-arrow-right"></i></button>'
        
        $("#playlist" + num).empty();

        // fill list with kara list
        var urlKaras = "";
        if(val > 0) {
            urlKaras =  'admin/playlists/' + val + '/karas';
        } else if (val == -1) {
            urlKaras =  'public/karas';
        }

        $.ajax({url : urlKaras}).done(function(data){
            console.time('profile');
            htmlList = "";
            for(var key in data){
                if(data.hasOwnProperty(key)){
                    if (data[key].language === null) data[key].language = "";
                    htmlList += "<li idKara='" + data[key].id_kara + "' class='list-group-item'>"
                        + [data[key].language.toUpperCase(), data[key].title, data[key].songtype_i18n_short , data[key].series].join(" - ")
                        + '<span class="badge">' + data[key].language.toUpperCase() + '</span>' + buttonHtml + "</li>";

                }
            }
            document.getElementById('playlist' + num).innerHTML = htmlList;
            var time = console.timeEnd('profile');
        });
    });	

    transfer = function(e) {
        var num =  $(e).attr('num');
        var newNum = 3 - num;
        var idPlaylistFrom = $("[type='playlist_select'][num='" + num + "']").val();
        var idPlaylistTo = $("[type='playlist_select'][num='" + newNum + "']").val();
        
        if (idPlaylistFrom == -1) {
             $.ajax({
                type : 'POST',
                url : 'admin/playlists/' + idPlaylistTo + '/karas',
                data : { requestedby : 'admin',
                         kara_id : $(e).parent().attr('idKara')}
            }).done(function(data){
                 console.log(data);
                 $(e).parent().clone().appendTo('#playlist' + newNum);
            });
        } else {
            $(e).attr('num', newNum);
            $(e).parent().detach().appendTo('#playlist' + newNum);
        }
    };
// TODO revoir complètement, faire un envoi global et une verif globale qui affiche les bonnes infos clients
   
	$('[action="command"]').click(function(){
        val = $(this).val();
        $.ajax({
			url : 'admin/player',
			type : 'PUT',
			data : {command : val}
		}).done(function(data) {
			refreshCommandStates();
		});
    });
     $('input[action="command"][switch="onoff"]').on('switchChange.bootstrapSwitch', function(event) {
        val = $(this).attr('name');
        $.ajax({
			url : 'admin/player',
			type : 'PUT',
			data : {command : val}
		}).done(function(data) {
			refreshCommandStates();
		});
    });

    $('#settings input[type!="checkbox"]').blur(function(){
        setSettings($(this));
    });
    $('#settings input[type="checkbox"]').on('switchChange.bootstrapSwitch', function(event) {
        setSettings($(this));
    });
   

    $('#settings input').focus(function(){
        $(this).attr('oldValue', $(this).val());
    }).keypress(function(e){ // permet de presser entrer pour valider un changement de paramètre
        if(e.which == 13){
            $(this).blur();    
        }       
    });

    $( window ).resize(function() {
        //  initSwitchs();
    });

});
