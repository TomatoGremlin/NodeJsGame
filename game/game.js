// DOM елементи
const serverAddressInput = document.getElementById('serverAddress');
const connectButton = document.getElementById('connectButton');
const disconnectButton = document.getElementById('disconnectButton');
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const edgeCollisionSound = document.getElementById('edgeCollisionSound');
const newClientSound = document.getElementById('newClientSound');


function resizeCanvas() {
    canvas.width = 500;
    canvas.height = 500;
    // canvas.width = window.innerWidth * 0.9;
    // canvas.height = window.innerHeight * 0.9;
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

let socket;
let isConnected = false;

let balls = [];
let clientId = null;

function getRandomColor() {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

function drawBalls() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    balls.forEach(ball => {
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
        ctx.fillStyle = ball.color;
        ctx.fill();
        ctx.closePath();
    });
}

document.addEventListener('keydown', (e) => {
    if (!isConnected || clientId === null) return;

    const ball = balls.find(b => Number(b.clientId) === Number(clientId));
    if (!ball) return;

    switch (e.key) {
        case 'ArrowUp':
            if (ball.y - ball.radius > 0) ball.y -= 5; 
            break;
        case 'ArrowDown':
            if (ball.y + ball.radius < canvas.height) ball.y += 5; 
            break;
        case 'ArrowLeft':
            if (ball.x - ball.radius > 0) ball.x -= 5; 
            break;
        case 'ArrowRight':
            if (ball.x + ball.radius < canvas.width) ball.x += 5; 
            break;
    }

    if (ball.x - ball.radius <= 0 || ball.x + ball.radius >= canvas.width ||
        ball.y - ball.radius <= 0 || ball.y + ball.radius >= canvas.height) {
        edgeCollisionSound.play();
    }

    const ballIndex = balls.findIndex((ball) => Number(ball.clientId) === Number(clientId)); 

    if (ballIndex !== -1) {
        balls.splice(ballIndex, 1); 
        console.log(`Топка с clientId ${clientId} беше премахната.`);
    } else {
        console.log(`Не е намерена топка с clientId ${clientId}.`);
    }

    console.log("Актуализиран масив на топките:", balls);

    balls.push({ ...ball }); 

    socket.send(JSON.stringify({
        clientId: clientId,
        x: Math.floor(ball.x),
        y: Math.floor(ball.y),
        radius: ball.radius,
        color: ball.color
    }));

    console.log(`Броят на топките в масива: ${balls.length}`);
    balls.forEach(ball => {
        console.log(`Топка с clientId: ${ball.clientId}, позиция: (${ball.x}, ${ball.y})`);
    });

    console.log(`Местите клиент: ${clientId}`);
    console.log(`Топката с clientId ${clientId} актуализирана на координати (${ball.x}, ${ball.y})`);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBalls();
});


function connect() {
    const serverAddress = serverAddressInput.value;
    socket = new WebSocket(serverAddress);

    socket.onopen = () => {
        isConnected = true;
        connectButton.disabled = true;
        disconnectButton.disabled = false;
        console.log('Свързване успешно');

        const ballColor = getRandomColor();
        const newBall = {
            clientId: null,
            x: Math.floor(Math.random() * canvas.width),
            y: Math.floor(Math.random() * canvas.height),
            radius: 30,
            color: ballColor
        };

        balls.push({ ...newBall, clientId: -1 }); // Временно clientId = -1, докато получим от сървъра

        drawBalls();

        socket.send(JSON.stringify(newBall));
    };

    socket.onmessage = (event) => {
        let serverData;
        try {
            serverData = JSON.parse(event.data);
            console.log('Получено съобщение от сървъра:', serverData);
        } catch (error) {
            console.error('Грешка при парсирането на съобщението:', error);
            return;
        }

        if (serverData.ballData && Array.isArray(serverData.ballData)) {
            console.log('Получени данни за топките:');

            serverData.ballData.forEach(ball => {
                const existingBall = balls.find(b => b.clientId === ball.clientId);

                if (existingBall) {
                    existingBall.x = ball.x;
                    existingBall.y = ball.y;
                    existingBall.radius = ball.radius;
                    existingBall.color = ball.color;
                    console.log(`Актуализирана топка с clientId: ${ball.clientId}`);
                } else {
                    balls.push({ ...ball });
                    console.log(`Добавена нова топка с clientId: ${ball.clientId}`);

                    newClientSound.currentTime = 0; 
                    newClientSound.play();
                }
            });
        }
        else if (serverData.clientId !== undefined) {
            clientId = serverData.clientId;
            console.log(`Получено clientId от сървъра: ${clientId}`);

            const myBall = balls.find(ball => ball.clientId === -1);
            if (myBall) {
                myBall.clientId = clientId;
                console.log(`Локално топче актуализирано с clientId: ${clientId}`);
            }
        }

        drawBalls();
    };


    socket.onclose = () => {
        isConnected = false;
        connectButton.disabled = false;
        disconnectButton.disabled = true;
        balls = [];
        drawBalls();
        console.log('Сървърът беше прекъснат');
    };
}

function disconnect() {
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ clientId: clientId, disconnect: true }));
        socket.close();
    }
    isConnected = false;
    connectButton.disabled = false;
    disconnectButton.disabled = true;
    console.log('Изключен от сървъра');
}

connectButton.addEventListener('click', connect);
disconnectButton.addEventListener('click', disconnect);