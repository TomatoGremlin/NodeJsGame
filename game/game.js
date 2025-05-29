// DOM елементи
const serverAddressInput = document.getElementById('serverAddress');
const connectButton = document.getElementById('connectButton');
const disconnectButton = document.getElementById('disconnectButton');
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const edgeCollisionSound = document.getElementById('edgeCollisionSound');
const newClientSound = document.getElementById('newClientSound');


// Настройки на канваса
function resizeCanvas() {
    canvas.width = 500;
    canvas.height = 500;
    // canvas.width = window.innerWidth * 0.9;
    // canvas.height = window.innerHeight * 0.9;
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// WebSocket променливи
let socket;
let isConnected = false;

// Данни за топчета
let balls = [];
let clientId = null;

// Генериране на случаен цвят
function getRandomColor() {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

// Рисуване на топчета
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
    // Проверка дали връзката е активна и дали имаме clientId
    if (!isConnected || clientId === null) return;

    // Намерете топчето на клиента по clientId
    const ball = balls.find(b => Number(b.clientId) === Number(clientId)); // Преобразуваме към число за коректно сравнение
    if (!ball) return;

    // Преместване на топката според натиснатата стрелка
    switch (e.key) {
        case 'ArrowUp':
            if (ball.y - ball.radius > 0) ball.y -= 5; // Местим нагоре
            break;
        case 'ArrowDown':
            if (ball.y + ball.radius < canvas.height) ball.y += 5; // Местим надолу
            break;
        case 'ArrowLeft':
            if (ball.x - ball.radius > 0) ball.x -= 5; // Местим наляво
            break;
        case 'ArrowRight':
            if (ball.x + ball.radius < canvas.width) ball.x += 5; // Местим надясно
            break;
    }

    // Проверка за удар в границите на канваса
    if (ball.x - ball.radius <= 0 || ball.x + ball.radius >= canvas.width ||
        ball.y - ball.radius <= 0 || ball.y + ball.radius >= canvas.height) {
        // Удар в някоя граница на canvasa
        edgeCollisionSound.play();
    }

    // Стъпка 1: Намерете топката, чийто clientId съвпада с този на местещия клиент
    const ballIndex = balls.findIndex((ball) => Number(ball.clientId) === Number(clientId)); // Преобразуваме към число за коректно сравнение

    // Стъпка 2: Ако топката е намерена в масива (индексът не е -1)
    if (ballIndex !== -1) {
        // Стъпка 3: Използваме splice() за премахване на топката от масива
        balls.splice(ballIndex, 1); // Премахва 1 елемент от масива на този индекс
        console.log(`Топка с clientId ${clientId} беше премахната.`);
    } else {
        console.log(`Не е намерена топка с clientId ${clientId}.`);
    }

    // Лог за проверка на актуализирания масив
    console.log("Актуализиран масив на топките:", balls);

    // Добавяме новата топка с актуализираните координати
    balls.push({ ...ball }); // Създаваме нов обект с обновените координати и го добавяме в масива

    // Изпращаме новите данни към сървъра за актуализиране на позицията
    socket.send(JSON.stringify({
        clientId: clientId,
        x: Math.floor(ball.x),
        y: Math.floor(ball.y),
        radius: ball.radius,
        color: ball.color
    }));

    // Логваме броя на топките в масива и айдитата на всяка топка
    console.log(`Броят на топките в масива: ${balls.length}`);
    balls.forEach(ball => {
        console.log(`Топка с clientId: ${ball.clientId}, позиция: (${ball.x}, ${ball.y})`);
    });

    console.log(`Местите клиент: ${clientId}`);
    console.log(`Топката с clientId ${clientId} актуализирана на координати (${ball.x}, ${ball.y})`);

    // Преизчертаваме топките на канваса
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBalls();
});


// Свързване към WebSocket сървъра
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

        // Добавяне на новото топче локално
        balls.push({ ...newBall, clientId: -1 }); // Временно clientId = -1, докато получим от сървъра

        drawBalls();

        // Изпращане на данните към сървъра
        socket.send(JSON.stringify(newBall));
    };

    socket.onmessage = (event) => {
        // Обработваме полученото съобщение от сървъра
        let serverData;
        try {
            serverData = JSON.parse(event.data);
            console.log('Получено съобщение от сървъра:', serverData);
        } catch (error) {
            console.error('Грешка при парсирането на съобщението:', error);
            return;
        }

        // Проверка дали данните съдържат масив с топки (ballData)
        if (serverData.ballData && Array.isArray(serverData.ballData)) {
            console.log('Получени данни за топките:');

            // Обработваме всяка топка от масива
            serverData.ballData.forEach(ball => {
                // Търсим дали вече имаме топка с този clientId
                const existingBall = balls.find(b => b.clientId === ball.clientId);

                if (existingBall) {
                    // Ако топката вече съществува, актуализираме данните й
                    existingBall.x = ball.x;
                    existingBall.y = ball.y;
                    existingBall.radius = ball.radius;
                    existingBall.color = ball.color;
                    console.log(`Актуализирана топка с clientId: ${ball.clientId}`);
                } else {
                    // Ако топката не съществува, добавяме нова топка
                    balls.push({ ...ball });
                    console.log(`Добавена нова топка с clientId: ${ball.clientId}`);

                    // Пускане на звук за появата на нов клиент
                    newClientSound.currentTime = 0; 
                    newClientSound.play();
                }
            });
        }
        // Ако сървърът връща само clientId (например при първоначално свързване)
        else if (serverData.clientId !== undefined) {
            // Задаваме clientId на клиента след първоначално свързване
            clientId = serverData.clientId;
            console.log(`Получено clientId от сървъра: ${clientId}`);

            // Намираме топката на текущия клиент (ако е с clientId = -1) и я актуализираме
            const myBall = balls.find(ball => ball.clientId === -1);
            if (myBall) {
                myBall.clientId = clientId;
                console.log(`Локално топче актуализирано с clientId: ${clientId}`);
            }
        }

        // Преизчертаваме топките на канваса
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

// Изключване от WebSocket
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