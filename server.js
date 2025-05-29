const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const fs = require('fs').promises;
const session = require('express-session'); 

const app = express();
const PORT = 3000;
const USERS_FILE = 'users.txt';

app.use(bodyParser.json());
app.use(express.static('game')); // За обслужване на статични файлове в директория game като `userpage.html`

// Конфигуриране на сесиите
app.use(session({
    secret: 'your_secret_key', // Секретен ключ за криптиране на сесии
    resave: false, 
    saveUninitialized: true
}));

// Функция за четене на потребителите от файла
const readUsers = async () => {
    try {
        const data = await fs.readFile(USERS_FILE, 'utf-8');
        return data.split('\n').filter(line => line).map(line => {
            const [username, hashedPassword] = line.split(':');
            return { username, hashedPassword };
        });
    } catch (error) {
        if (error.code === 'ENOENT') return []; // Ако файлът не съществува
        throw error;
    }
};

// Функция за запис на нов потребител
const saveUser = async (username, hashedPassword) => {
    const userLine = `${username}:${hashedPassword}\n`;
    await fs.appendFile(USERS_FILE, userLine);
};

// Зареждане на началната страница
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

// Регистрация на нов потребител
app.post('/register', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required.' });
    }

    const users = await readUsers();
    if (users.some(user => user.username === username)) {
        return res.status(400).json({ error: 'User already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await saveUser(username, hashedPassword);

    res.json({ message: 'User registered successfully.' });
});


// Логване на съществуващ потребител
app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required.' });
    }

    const users = await readUsers();
    const user = users.find(user => user.username === username);

    if (!user) {
        return res.status(401).json({ error: 'User not registered.' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.hashedPassword);
    if (!isPasswordValid) {
        return res.status(401).json({ error: 'Invalid password.' });
    }

    // Записване на името на потребителя в сесията
    req.session.username = user.username;

    res.json({ message: 'Login successful.' });
});

// API за получаване на името на потребителя от сесията
app.get('/api/session-user', (req, res) => {
    if (!req.session.username) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    res.json({ username: req.session.username });
});

// Логаут (унищожаване на сесията) 
app.get('/logout', (req, res) => {
    // Унищожаваме сесията
    req.session.destroy(err => {
        if (err) {
            return res.status(500).send('Could not log out');
        }
        // Пренасочване към началната страница (index.html)
        res.redirect('/');
    });
});


// Стартиране на сървъра
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});