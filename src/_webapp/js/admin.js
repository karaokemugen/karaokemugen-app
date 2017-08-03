
$(document).ready(function(){
    /* variables & ajax setup */

    $.ajaxPrefilter(function( options ) {
        options.url = "http://localhost:1339/api/v1/" +  options.url 
    });
    $.ajaxSetup({
        headers : {"Authorization": "Basic " + mdpAdminHash}
    });


    /* fill the 2 playlist selects */

    fillPlaylistSelects = function() {
        var playlistList = {};
        $.ajax({url : 'admin/playlists'}).done(function(data){
            playlistList = data;
            playlistList.push({"id_playlist" : -1, "name" : "Karas"});
            $.each(playlistList, function(key, value) 
            {  
                $("select[type='playlist_select']").append('<option value=' + value.id_playlist + '>' + value.name + '</option>');
            });
            $(".select2").select2({theme: "bootstrap"});
        });
    };

    /* init selects & switchs */

    fillPlaylistSelects();

    $("input[switch='onoff']").bootstrapSwitch({
        wrapperClass: "btn btn-default",
        "data-size": "normal"
    });
    $("[name='kara_state'],[name='kara_panel']").bootstrapSwitch({
        "wrapperClass": "btn btn-default",
        "data-size": "large",
        "labelWidth": "0",
        "handleWidth": "65",
        "data-inverse": "false"
    });



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
    $("[name='kara_state']").on('switchChange.bootstrapSwitch', function(event, state) {
        console.log(this, event, state);
        
        // FCT send playlist state (1=private 0=public)
        
    });	

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
            urlKaras =  'public/karas?filter=_';
        }

        $.ajax({url : urlKaras}).done(function(data){
            console.time('profile');
            htmlList = "";
            for(var key in data){
                if(data.hasOwnProperty(key)){
                    if (data[key].language === null) data[key].language = "";
                    htmlList += "<li value='" + data[key].key + "' class='list-group-item'>"
                        + [data[key].language.toUpperCase(), data[key].title, "" , data[key].series].join(" - ")
                        + '<span class="badge">' + data[key].language.toUpperCase() + '</span>' + buttonHtml + "</li>";

                }
            }
            document.getElementById('playlist' + num).innerHTML = htmlList;
            var time = console.timeEnd('profile');
        });
    });	

    transfer = function(e) {
        var newNum = 3 - $(e).attr('num');
        $(e).attr('num', newNum);
        $(e).parent().detach().appendTo('#playlist' + newNum);
    };

    $("#play").click(function() {
        if($(this).val() === "play") {
            // FCT play kara
            $(this).val("pause");
        } else {
            // FCT pause kara
            $(this).val("play");
        }
        $(this).toggleClass('btn-info').toggleClass('btn-primary')
                .find('i').toggleClass('glyphicon-play').toggleClass('glyphicon-pause');
    });

    $("#stop").click(function() {
        // FCT stop kara
        
        $("#play").val("play");
        $("#play").attr('class', 'btn btn-primary')
                .find('i').attr('class', 'glyphicon glyphicon-play');
    });

    /* manage panel event handlers */

    $("#password").blur(function(){
        // FCT change password
    });
    $("#kara_username_show").blur(function(){
        // FCT change username show
    });
    $("#kara_username_change").blur(function(){
        // FCT change username change
    });
    $("#song_per_user").blur(function(){
        // FCT change song per user
    });
    $("#screen_number").blur(function(){
        // FCT change screen number
    });

});
