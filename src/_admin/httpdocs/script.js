// websocket events
var socket = io.connect('http://localhost:1338');

var states = {};

// alert message
socket.on('states', function(newStates) {
    states = newStates;

    private_message = states.private ? 'Mode Privé':'Mode publique';
    $('.states_private').html(private_message);

    status_message = states.status=='play' ? 'Mode lecture':'Mode arrêt';
    $('.states_status').html(status_message);
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