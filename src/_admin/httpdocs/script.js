// websocket events
var socket = io.connect('http://localhost:1338');

var engine_states = {};
var local_states = {};

// alert message
socket.on('engine_states', function(newStates) {
    engine_states = newStates;
    // status, private
    for(var i in engine_states)
        $('body').attr('states-engine-'+i,engine_states[i]);

    refreshShowOnState();

    // puis on met à jour les éléments complémentaires (ex url vers le frontend)
    $('.tool-frontend-access').attr('action','//'+document.location.hostname+':'+engine_states.frontend_port);
})

socket.on('local_states', function(newStates) {
    local_states = newStates;
    for(var i in local_states)
        $('body').attr('states-local-'+i,local_states[i]);

    refreshShowOnState();
})

socket.on('generate_karabd', function(param) {
    if(param.event && param.event=='cleanLog')
    {
        $('.tool-kara-index .log').empty();
    }
    if(param.event && param.event=='addLog')
    {
        console.log(param.data);
        $('.tool-kara-index .log').append(param.data+"\r\n");
    }
})

socket.on('message', function(message) {
    alert('Le serveur a un message pour vous : ' + message);
})

function engineTerminate(){
    socket.emit('action', 'terminate');
    window.close();
    setTimeout(function(){
        $('#firefox_alert').show();
    },1000);
}
function togglePrivate(){
    socket.emit('action', 'togglePrivate');
}
function enginePlay(){
    socket.emit('action', 'play');
}
function engineStop(){
    socket.emit('action', 'stop');
}
function engineStopNow(){
    socket.emit('action', 'stop.now');
}
function generateKaraDB(){
    socket.emit('action', 'generate_karabd');
}

function refreshShowOnState()
{
    $('[show-on-state]').each(function(){
        var cond = $(this).attr('show-on-state').split(':');
        if($('body').attr('states-'+cond[0])==cond[1])
            $(this).show();
        else
            $(this).hide();

    });
}
refreshShowOnState();