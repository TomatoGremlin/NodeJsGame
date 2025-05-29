const WebSocket = require('ws');

// Създаване на WebSocket сървър на порт 8080
const wss = new WebSocket.Server({ port: 8080 });

let clients = []; // Масив с всички свързани клиенти
let clientData = {}; // Обект, който съхранява данни за всеки клиент (като ключ ще използваме clientId)

// Обработваме всяко ново свързване
wss.on('connection', (ws) => {
    console.log('Новият клиент е свързан');

    // Присвояваме уникален идентификатор на клиента (номер на топката)
    const clientId = clients.length; // Това ще бъде номер на топката
    clients.push(ws);
    clientData[clientId] = {}; // Инициализиране на данни за клиента

    // Изпращаме на клиента неговия уникален идентификатор
    ws.send(JSON.stringify({ clientId: clientId }));

    //Изпращаме на данните на новия клиент до всички активни клиенти 
    sendActivePlayersToClient(ws);

    //Изпращаме на новия клиент данните за всички съществуващи топчета
    const initialData = Object.keys(clientData).map(existingClientId => ({
        clientId: existingClientId, //Идентификатор на съществуващия клиента
        x: clientData[existingClientId].x || 0, //X координата
        y: clientData[existingClientId].y || 0, //Y координата
        radius: clientData[existingClientId].radius || 0, //Радиус на топката
        color: clientData[existingClientId].color || 'white' //Цвят на топката
    }));

    ws.send(JSON.stringify({ type: 'initialData', data: initialData }));

    // Когато клиент изпрати съобщение
    ws.on('message', (message) => {
        const data = JSON.parse(message);
        console.log(`Получено от клиент ${clientId}:`, data);

        // Актуализираме данните за съответния клиент
        clientData[clientId] = {
            x: data.x,  // Получаваме координатите на топката
            y: data.y,  // Получаваме координатите на топката
            radius: data.radius,  // Получаваме радиуса
            color: data.color  // Получаваме цвета
        };

        // Препращаме актуализираните данни за всички топчета към всички клиенти (без да изпращаме обратно на изпращача)
        broadcast(clientId);
    });

    // Когато клиент се изключи
    ws.on('close', () => {
        console.log(`Клиент ${clientId} е изключен`);
        clients = clients.filter(client => client !== ws); // Премахваме клиента от масива
        delete clientData[clientId]; // Премахваме данните за клиента
        broadcast(); // Изпращаме новото състояние на топчетата на всички останали клиенти
    });
});

// Функция за изпращане на съобщение до всички клиенти, освен на изпращача
function broadcast(excludeClientId = null) {
    // Изпращаме всички данни за топчетата: координати, радиус и цвят
    const ballData = Object.keys(clientData).map(clientId => ({
        clientId: clientId,  // Идентификатор на клиента
        x: clientData[clientId].x,  // X координата
        y: clientData[clientId].y,  // Y координата
        radius: clientData[clientId].radius,  // Радиус на топката
        color: clientData[clientId].color  // Цвят на топката
    }));

    // Логваме съобщението, което ще бъде изпратено
    console.log('Бродкаст съобщение:', JSON.stringify(ballData));

    // Изпращаме съобщението до всички клиенти, освен този, който е изпратил съобщението
    clients.forEach((client, index) => {
        if (client.readyState === WebSocket.OPEN) { // && index !== excludeClientId
            // Добавяме към пакета идентификатора на клиента, който е изпратил съобщението
            const broadcastData = {
                senderClientId: excludeClientId,
                ballData: ballData
            };
            client.send(JSON.stringify(broadcastData)); // Изпращаме всички данни за топчетата
        }
    });
}

// Функция за изпращане на данните за всички активни клиенти само на новия клиент
function sendActivePlayersToClient(ws) {
    const activePlayersData = Object.keys(clientData).map(existingClientId => ({
        clientId: existingClientId,  // Идентификатор на съществуващ клиента
        x: clientData[existingClientId].x,  // X координата
        y: clientData[existingClientId].y,  // Y координата
        radius: clientData[existingClientId].radius,  // Радиус на топката
        color: clientData[existingClientId].color  // Цвят на топката
    }));

    // Изпращаме данните за всички активни клиенти само на новия клиент
    ws.send(JSON.stringify({ type: 'activePlayers', data: activePlayersData }));
}

console.log('WebSocket сървър стартира на порт 8080');