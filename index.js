const WebSocket = require('ws');
const chalk = require('chalk');
const tls = require('tls');
const net = require('net');
const fs = require('fs');

const sslServerOptions = {
  key: fs.readFileSync('certs/game.habbo.com.key'),
  cert: fs.readFileSync('certs/game.habbo.com.crt'),
  requestCert: false,
  ca: []
};

const tlsServer = tls.createServer(sslServerOptions, tlsServerClearStream => {
	tlsServerClearStream.proxyBuffer = null;

	tlsServerClearStream.emulatorSocket = new net.Socket();
	tlsServerClearStream.emulatorSocket.connect(30002, '127.0.0.1', () => {
		if (tlsServerClearStream.proxyBuffer) {
			tlsServerClearStream.emulatorSocket.write(tlsServerClearStream.proxyBuffer);
			tlsServerClearStream.proxyBuffer = null;
		}
	});

	tlsServerClearStream.emulatorSocket.on('data', buffer => {
		tlsServerClearStream.write(buffer);
	});

	tlsServerClearStream.emulatorSocket.on('error', () => {
		tlsServerClearStream.destroy();
	});

	tlsServerClearStream.emulatorSocket.on('close', () => {
		tlsServerClearStream.destroy();
	});

	tlsServerClearStream.on('data', async buffer => {
		if (tlsServerClearStream.emulatorSocket.connecting) {
			if (tlsServerClearStream.proxyBuffer) {
				tlsServerClearStream.proxyBuffer = Buffer.concat([tlsServerClearStream.proxyBuffer, buffer]);
			} else {
				tlsServerClearStream.proxyBuffer = buffer;
			}
		} else {
			tlsServerClearStream.emulatorSocket.write(buffer);
		}
	});

	tlsServerClearStream.on('end', () => {
		tlsServerClearStream.emulatorSocket.destroy();
	});

	tlsServerClearStream.on('error', () => {
		tlsServerClearStream.emulatorSocket.destroy();
	});
});

tlsServer.listen(30000, '127.0.0.1');

const wsServer = new WebSocket.Server({ port: 30001 });

wsServer.on('connection', async ws => {
	ws.tlsServerGateway = new net.Socket();
	ws.tlsServerGateway.connect(tlsServer.address().port, '127.0.0.1');
	
	ws.tlsServerGateway.on('data', tlsServerGatewayData => {
		ws.send(tlsServerGatewayData);
	});

  ws.on('message', websocketInputData => {
    if (websocketInputData == 'StartTLS') {
      ws.send(Buffer.from('OK'));
    } else {
      ws.tlsServerGateway.write(websocketInputData);
    }
  });

  ws.on('close', () => {
  	 ws.tlsServerGateway.destroy();
  });

  ws.on('error', () => {
  	 ws.tlsServerGateway.destroy();
  });
});