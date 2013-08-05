// use express and socket.io
var http = require('http');
var express = require('express');
var app = express();
var server = http.createServer(app);

var io = require('socket.io').listen(server, {log: false});

app.use(express.bodyParser());

// configure database
var anyDB = require('any-db');
var conn = anyDB.createConnection('sqlite3://chatroom.db');

// create database
conn.query('CREATE TABLE IF NOT EXISTS messages(id INTEGER PRIMARY KEY AUTOINCREMENT, room TEXT, nickname TEXT,body TEXT, time INTEGER);').on('end', function(){
		console.log('Made table!');
});

// expose static directories
app.use('/public', express.static(__dirname + '/public'));

//configure templating engine
var engines = require('consolidate');
app.engine('html', engines.hogan);
app.set('views', __dirname + '/templates');

// generating the lobby
app.get('/', function(request, response){
	var sql = 'SELECT DISTINCT room FROM messages'
	var q = conn.query(sql);
	var rooms = [];

	q.on('row', function(row){
		rooms.push(row);
	})
	q.on('end', function(){
		response.render('index.html', {rooms: rooms});
	})
})

// generating a random new room
app.get('/newRoom', function(request, response){
	response.redirect('/'+generateRoomIdentifier());
})

// getting a new room rendered
app.get('/:roomName', function(request, response){
    var name = request.params.roomName;
    response.render('room.html', {roomName: name});
});

io.sockets.on('connection', function(socket){
    // clients emit this when they join new rooms
    socket.on('join', function(roomName, nickname, callback){
        socket.join(roomName); 
        socket.nickname = nickname; 
        socket.roomName = roomName;

        // get messages of this chatroom from db 
        var messages = [];
		var sql = 'SELECT * FROM messages WHERE room = $1 ORDER BY time ASC';
		var q = conn.query(sql, [roomName]);

		q.on('row', function(row){
			messages.push(row);
		})
		q.on('end', function(row){
        	callback(messages);
		})

		broadcastMembership(socket.roomName);
    });

    // the client emits this when they want to send a message
    socket.on('message', function(message){
        // process an incoming message (don't forget to broadcast it to everyone!)
        // var rooms = Object.keys(io.sockets.manager.roomClients[socket.id]);
        // var roomName = (rooms[0] == '') ? rooms[1].substr(1) : rooms[0].substr(1);
        var time = new Date().toString();

        // send message to all members in the room
        io.sockets.in(socket.roomName).emit('message', socket.nickname, message, time);

        // store message in db
        conn.query("INSERT INTO messages(room,nickname,body,time) VALUES ($1, $2, $3, $4)", [socket.roomName, socket.nickname, message, time]);

    });

    // the client disconnected/closed their browser window
    socket.on('disconnect', function(){
    	// leave the room and update members list
        socket.leave(socket.roomName);
        broadcastMembership(socket.roomName);
    });
});

function broadcastMembership(roomName) {
    // fetch all sockets in a room
    var sockets = io.sockets.clients(roomName);

    // pull the nicknames out of the socket objects using array.map(...)
    var nicknames = sockets.map(function(socket){
        return socket.nickname;
    });

    // send them out
    io.sockets.in(roomName).emit('membershipChanged', nicknames);
}

function generateRoomIdentifier() {
    // make a list of legal characters, while intentionally excluding 0, O, I, and 1 for readability
    var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

    var result = '';
    for (var i = 0; i < 6; i++)
        result += chars.charAt(Math.floor(Math.random() * chars.length));

    return result;
}

server.listen(8080, function(){
	console.log('- chatroom running on port 8080');
});