var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var dateTime = require('node-datetime');

app.use(express.static('public'));

app.get('/', function(req, res){
  res.sendFile(__dirname + '/client.html');
});

// function to retrieve timestamps for messages
let timeStamp = function(){
	var dt = dateTime.create();
	var formattedDate = dt.format('H:M');
	return formattedDate;
}

// function that checks if the current username
// is in the list of randomly generated names
let randomNameChecker = function(name){
	if (name in randomNames){
		return true;
	}
	else {
		return false;
	}
}

// function that checks if the current username is
// in the list of available randomly generated names
let nameAvailable = function (name){
	if (name in availableNames){
		return true;
	}
	else {
		return false;
	}
}

// generating 1000 random names, User(x: 1000)
let randomNames = [];
for (i=0; i<1000; i++){
	randomNames[i] = "User" + i;
}
// sort the random names
randomNames.sort(function(a, b){return 0.5 - Math.random()});

// a list to determine whether a random name is being used or not
let availableNames = randomNames;

// A list containing the usernames of clients connected to the server
clients = [];
let updateClients = function(){
	io.emit('users update', clients);
}

// function to check if an element is in an array/list
function include(arr, obj) {
  return (arr.indexOf(obj) != -1);
}

// chat history containing up to 200 messages
chatHistory = [];

// function that pushes and pops accordingly
// with the 200 chat message history limit
let addToChatHistory = function(message) {
  if (chatHistory.length < 200){
    chatHistory.push(message);
  }
  else {
    chatHistory.shift();
    chatHistory.push(message);
  }
}

// function that sends new connections the chat history
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

    // message received is a command to change client's nickname
		if (msg.split(' ')[0] == '/nick'){
			desiredName = msg.split(' ')[1];
      // client's name is available
      // if block to check if the name is a random generated one
      // and pushes the name back to the list if it is
			if (!(include(clients, desiredName))){
				if (randomNameChecker(tempName)){
					if (!(nameAvailable(tempName))){
						availableNames.push(tempName);
            availableNames.sort(function(a, b){return 0.5 - Math.random()});
					}
				}
        // changes the nickname of the user
        // user is notified that their nickname has changed
        // all other users are notified as well
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
      // The nickname is already in use
			else {
				socket.emit('chat message', "The name that you have requested is unavailable.");
			}
		}
    // server receives a command to change the color of a nickname
		else if (msg.split(' ')[0] == '/nickcolor'){
      let desiredColor = msg.split(' ')[1];
      socket.emit('color change', msg);
      socket.emit('chat message', "Your name color has been changed.");
		}
    // server receives a message to be broadcasted back to the chat room
    // client-sender's message is bolded to theirselves, while to all others,
    // the message is non-bolded
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
