if(!localStorage.getItem('toyunda_admin_session_id'))
    localStorage.setItem('toyunda_admin_session_id', Math.random().toString(36).substring(3,16) + +new Date);

// websocket events
var socket = io.connect('http://localhost:1338');
// immediate send of client UUID
socket.emit('clientRegister', localStorage.getItem('toyunda_admin_session_id'));

var engine_states = {};
var local_states = {};

socket.on('login', function(code) {
    console.log(code);
    switch (code) {
        case 'required':
            if($('body').data('page-group')!=='login')
                document.location.href="/login.html";
            break;
        case 'ready':
            if($('body').data('page-group')=='loader')
                document.location.href="/dashboard.html";
            break;
        case 'success':
            document.location.href="/dashboard.html";
            break;
        case 'fail':
            document.location.href="/login-fail.html";
            break;
        default:
            break;
    }
})

// alert message
socket.on('engine_states', function(newStates) {
    engine_states = newStates;
    // status, private
    for(var i in engine_states)
        $('body').attr('states-engine-'+i,JSON.stringify(engine_states[i]));

    refreshShowOnState();

    // puis on met à jour les éléments complémentaires (ex url vers le frontend)
    $('.tool-frontend-access').attr('action','//'+document.location.hostname+':'+engine_states.frontend_port);

    if(engine_states.playlist)
    {
        $('.engine-playlist-count').html(engine_states.playlist.content.length);
        $('.engine-playlist-index').html(engine_states.playlist.index+1);
    }
})

socket.on('local_states', function(newStates) {
    local_states = newStates;
    for(var i in local_states)
        $('body').attr('states-local-'+i,JSON.stringify(local_states[i]));

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

function login(password)
{
    socket.emit('login', password);
}

function engineTerminate(){
     // close engine after a delay
    socket.emit('action', 'terminate');
    // and immediate call terminate page
    document.location.href="/terminate.html"
}
function togglePrivate(){
    socket.emit('action', 'togglePrivate');
}
function toggleFullscreen(){
    socket.emit('action', 'toggleFullscreen');
}
function toggleOnTop(){
    socket.emit('action', 'toggleOnTop');
}
function enginePlay(){
    socket.emit('action', 'play');
}
function engineStop(){
    socket.emit('action', 'stop');
}
function enginePause(){
    socket.emit('action', 'pause');
}
function enginePrev(){
    socket.emit('action', 'prev');
}
function engineNext(){
    socket.emit('action', 'next');
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
        var cond = ($(this).attr('show-on-state')+':').split(':');
        if(cond[1]!='' && $('body').attr('states-'+cond[0])==cond[1] || cond[1]=='' && $('body').attr('states-'+cond[0])!=null)
            $(this).show();
        else
            $(this).hide();

    });
}
refreshShowOnState();