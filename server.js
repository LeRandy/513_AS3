var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var dateTime = require('node-datetime');

app.use(express.static('public'));

app.get('/', function(req, res){
  res.sendFile(__dirname + '/client.html');
});

let timeStamp = function(){
	var dt = dateTime.create();
	var formattedDate = dt.format('H:M');
	return formattedDate;
}

let randomNameChecker = function(name){
	if (name in randomNames){
		return true;
	}
	else {
		return false;
	}
}

let nameAvailable = function (name){
	if (name in availableNames){
		return true;
	}
	else {
		return false;
	}
}

let randomNames = [];
for (i=0; i<1000; i++){
	randomNames[i] = "User" + i;
}
randomNames.sort(function(a, b){return 0.5 - Math.random()});
let availableNames = randomNames;

clients = [];
let updateClients = function(){
	io.emit('users update', clients);
}

function include(arr, obj) {
  return (arr.indexOf(obj) != -1);
}

chatHistory = [];
let addToChatHistory = function(message) {
  if (chatHistory.length < 200){
    chatHistory.push(message);
  }
  else {
    chatHistory.shift();
    chatHistory.push(message);
  }
}
let displayHistory = function(socket){
  for (i=0; i<chatHistory.length; i++){
    socket.emit('chat message', chatHistory[i]);
  }
}

io.on('connection', function(socket){
  // connection
	let tempName = availableNames.pop();
	clients.push(tempName);
  console.log(tempName + ' connected');
	updateClients();
  displayHistory(socket);
  socket.emit('chat message', "You are " + tempName + ".");
  socket.emit('name update', tempName);
  socket.broadcast.emit('chat message', tempName + " has joined the room.");
  // disconnection
	socket.on('disconnect', function(){
    console.log(tempName + ' disconnected');
		clients.splice(clients.indexOf(tempName), 1);
		updateClients();
    io.emit('chat message', tempName + " has disconnected from the room.");
		if (randomNameChecker(tempName)){ // check if the name is a random generated one
			if (!(nameAvailable(tempName))){ // if the random generated name is not in the availableNames, make it available
				availableNames.push(tempName);
				availableNames.sort(function(a, b){return 0.5 - Math.random()});
			}
		}
  });

	socket.on('chat message', function(msg){
		if (msg.split(' ')[0] == '/nick'){
			desiredName = msg.split(' ')[1];
			if (!(include(clients, desiredName))){
				if (randomNameChecker(tempName)){
					if (!(nameAvailable(tempName))){
						availableNames.push(tempName);
            availableNames.sort(function(a, b){return 0.5 - Math.random()});
					}
				}
				else {
          clients.splice(clients.indexOf(tempName), 1);
					clients.push(desiredName);
					socket.broadcast.emit('chat message', tempName + " has changed their username to " + desiredName + ".");
          socket.emit('name update', desiredName);
					tempName = desiredName;
					socket.emit('chat message', "Your name has been changed to " + tempName);
					updateClients();
				}
			}
			else {
				socket.emit('chat message', "The name that you have requested is unavailable.");
			}
		}
		else if (msg.split(' ')[0] == '/nickcolor'){
      let desiredColor = msg.split(' ')[1];

      socket.emit('chat message', "Your name color has been changed.");
		}
		else {
			let userMessage = '[' + timeStamp() + '] ' + tempName + ':' + ' ' + msg;
      socket.broadcast.emit('chat message', userMessage);
      socket.emit('bold message', userMessage);
      addToChatHistory(userMessage);
		}
	});
});

http.listen(3000, function(){
  console.log('listening on *:3000');
});
