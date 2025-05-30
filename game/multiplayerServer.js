const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 8080 });

let clients = []; 
let clientData = {}; 

wss.on('connection', (ws) => {
    console.log('Новият клиент е свързан');

    const clientId = clients.length; 
    clients.push(ws);
    clientData[clientId] = {}; 

    ws.send(JSON.stringify({ clientId: clientId }));

    sendActivePlayersToClient(ws);

    const initialData = Object.keys(clientData).map(existingClientId => ({
        clientId: existingClientId, 
        x: clientData[existingClientId].x || 0, 
        y: clientData[existingClientId].y || 0, 
        radius: clientData[existingClientId].radius || 0, 
        color: clientData[existingClientId].color || 'white' 
    }));

    ws.send(JSON.stringify({ type: 'initialData', data: initialData }));

    ws.on('message', (message) => {
        const data = JSON.parse(message);
        console.log(`Получено от клиент ${clientId}:`, data);

        clientData[clientId] = {
            x: data.x,  
            y: data.y, 
            radius: data.radius,  
            color: data.color 
        };

        broadcast(clientId);
    });

    ws.on('close', () => {
        console.log(`Клиент ${clientId} е изключен`);
        clients = clients.filter(client => client !== ws); 
        delete clientData[clientId]; 
        broadcast(); 
    });
});

function broadcast(excludeClientId = null) {
    const ballData = Object.keys(clientData).map(clientId => ({
        clientId: clientId,  
        x: clientData[clientId].x,  
        y: clientData[clientId].y,  
        radius: clientData[clientId].radius,  
        color: clientData[clientId].color  
    }));

    console.log('Бродкаст съобщение:', JSON.stringify(ballData));

    clients.forEach((client, index) => {
        if (client.readyState === WebSocket.OPEN) { 
            
            const broadcastData = {
                senderClientId: excludeClientId,
                ballData: ballData
            };
            client.send(JSON.stringify(broadcastData)); 
        }
    });
}

function sendActivePlayersToClient(ws) {
    const activePlayersData = Object.keys(clientData).map(existingClientId => ({
        clientId: existingClientId,  
        x: clientData[existingClientId].x,  
        y: clientData[existingClientId].y,
        radius: clientData[existingClientId].radius,  
        color: clientData[existingClientId].color  
    }));

    ws.send(JSON.stringify({ type: 'activePlayers', data: activePlayersData }));
}

console.log('WebSocket сървър стартира на порт 8080');