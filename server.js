const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const fs = require('fs').promises;
const session = require('express-session'); 

const app = express();
const PORT = 3000;
const USERS_FILE = 'users.txt';

app.use(bodyParser.json());
app.use(express.static('game')); 


app.use(session({
    secret: 'your_secret_key', 
    resave: false, 
    saveUninitialized: true
}));

const readUsers = async () => {
    try {
        const data = await fs.readFile(USERS_FILE, 'utf-8');
        return data.split('\n').filter(line => line).map(line => {
            const [username, hashedPassword] = line.split(':');
            return { username, hashedPassword };
        });
    } catch (error) {
        if (error.code === 'ENOENT') return []; 
        throw error;
    }
};

const saveUser = async (username, hashedPassword) => {
    const userLine = `${username}:${hashedPassword}\n`;
    await fs.appendFile(USERS_FILE, userLine);
};

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

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

    req.session.username = user.username;

    res.json({ message: 'Login successful.' });
});

app.get('/api/session-user', (req, res) => {
    if (!req.session.username) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    res.json({ username: req.session.username });
});

app.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).send('Could not log out');
        }
        res.redirect('/');
    });
});


app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});