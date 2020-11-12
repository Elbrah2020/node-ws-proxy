const net = require('net');

let server = net.createServer(socket => {
	socket.on('data', console.log);
});

server.listen(30002);