var roomName;
var socket;

$(document).ready(function(){
	// record room name
	var roomName = $('meta[name=roomName]').attr("content");

	// prompt for user nickname if it doesn't exist
	var nickname = prompt('what would you like your nickname to be?');

	document.getElementById('nicknameField').value = nickname;

	// add form event listener
    var messageForm = document.getElementById('messageForm');
    $(messageForm).on('submit', sendMessage);

    socket = io.connect();
    
    // handle receiving messages
    socket.on('message', function(nickname, message, time){
        var newTime = new Date(time).toLocaleString();
        $('#message-div').append('<li><span class="nickname"><b>'+nickname+'</b>: </span>  <span class="time">'+newTime +'</span><span class="message">'+message+'</span></li>');
        $('#message-div').animate({scrollTop: $('#message-div').prop("scrollHeight")}, 500);
    });

    // handle room membership changes
    socket.on('membershipChanged', function(members){
        // clear current member list
        $('#members').html('');
        
        // display the new member list
        for(var i = 0; i < members.length; i++){
            member = members[i];
            $('#members').append('<li>'+member+'</li>');
        }
        
    });

    var messagesCallback = function(messages){
        var messageDiv = $('#message-div');
        for (var i = 0; i < messages.length; i++){
            message = messages[i];
            var time = new Date(message.time).toLocaleString();
            console.log(message);
            messageDiv.append('<li><span class="nickname"><b>'+message.nickname+'</b>: </span>  <span class="time">'+time +'</span><span class="message">'+message.body+'</span></li>');
        }
        $('#message-div').animate({scrollTop: $('#message-div').prop("scrollHeight")}, 500);
    };

    // join the room
    socket.emit('join', roomName, nickname, messagesCallback);

    
});



function sendMessage(e) {
	// prevent form from redirecting
    e.preventDefault();

    message = $('#messageField').val();

    socket.emit('message', message);

    // clear message field
    $('#messageField').val('');
}
