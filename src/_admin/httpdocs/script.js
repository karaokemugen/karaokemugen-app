// websocket events
var socket = io.connect('http://localhost:1338');

var engine_states = {};
var local_states = {};

// alert message
socket.on('engine_states', function(newStates) {
    engine_states = newStates;

    private_message = engine_states.private ? 'Mode Privé':'Mode publique';
    $('.states_private').html(private_message);

    status_message = engine_states.status=='play' ? 'Mode lecture':'Mode arrêt';
    $('.states_status').html(status_message);

    $('.tool-frontend-access').attr('data-port',1*engine_states.frontend_port);
    $('.tool-frontend-access').attr('action','//'+document.location.hostname+':'+engine_states.frontend_port);
})

socket.on('local_states', function(newStates) {
    local_states = newStates;
    if(local_states.generate_karabd)
    {
        $('.tool-kara-index').attr('data-state','running');
    }
    else
    {
        $('.tool-kara-index').attr('data-state','stop');
    }
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

$('#terminate').click(function () {
    socket.emit('action', 'terminate');
    window.close();
    setTimeout(function(){
        $('#firefox_alert').show();
    },1000);
})

$('#togglePrivate').click(function () {
    socket.emit('action', 'togglePrivate');
})

$('#engine_play').click(function () {
    socket.emit('action', 'play');
})
$('#engine_stop').click(function () {
    socket.emit('action', 'stop');
})
$('#engine_stop_now').click(function () {
    socket.emit('action', 'stop.now');
})

$('.tool-kara-index .run').click(function () {
    socket.emit('action', 'generate_karabd');
})