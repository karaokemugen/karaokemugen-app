// websocket events
var socket = io.connect('http://localhost:1338');

var states = {};

// alert message
socket.on('states', function(newStates) {
    states = newStates;
    if(states.private)
    	$('.states_private').html('Private = TRUE');
	else
		$('.states_private').html('Private = FALSE');
})

socket.on('message', function(message) {
    alert('Le serveur a un message pour vous : ' + message);
})

$('#terminate').click(function () {
    socket.emit('message', 'terminate');
    window.close();
    setTimeout(function(){
        $('#firefox_alert').show();
    },1000);
})

$('#togglePrivate').click(function () {
    socket.emit('message', 'togglePrivate');
})