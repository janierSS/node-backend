// app.js

const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware
app.use(bodyParser.json());

// Helper functions to read and write JSON files
const readJSONFile = (filename) => {
  const data = fs.readFileSync(path.join(__dirname, filename));
  return JSON.parse(data);
};

const writeJSONFile = (filename, content) => {
  fs.writeFileSync(path.join(__dirname, filename), JSON.stringify(content, null, 2));
};

// User Login Route
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const users = readJSONFile('users.json');

  let user = users.find((u) => u.username === username);

  if (!user) {
    // Register new user
    user = { id: Date.now(), username, password };
    users.push(user);
    writeJSONFile('users.json', users);
    res.status(201).json({ message: 'User registered successfully', userId: user.id });
  } else if (user.password === password) {
    // Successful login
    res.status(200).json({ message: 'Login successful', userId: user.id });
  } else {
    // Incorrect password
    res.status(401).json({ message: 'Incorrect password' });
  }
});

// Middleware to check authentication
const authenticate = (req, res, next) => {
  const { userId } = req.headers;
  if (!userId) {
    return res.status(401).json({ message: 'User ID header is missing' });
  }
  const users = readJSONFile('users.json');
  const user = users.find((u) => u.id == userId);
  if (!user) {
    return res.status(401).json({ message: 'Invalid User ID' });
  }
  req.user = user;
  next();
};

// Routes for Notes

// Get all notes for the authenticated user
app.get('/notes', authenticate, (req, res) => {
  const notes = readJSONFile('notes.json');
  const userNotes = notes.filter((note) => note.userId == req.user.id);
  res.json(userNotes);
});

// Add a new note
app.post('/notes', authenticate, (req, res) => {
  const { title, content } = req.body;
  const notes = readJSONFile('notes.json');
  const newNote = {
    id: Date.now(),
    userId: req.user.id,
    title,
    content,
  };
  notes.push(newNote);
  writeJSONFile('notes.json', notes);
  res.status(201).json({ message: 'Note added', note: newNote });
});

// Edit an existing note
app.put('/notes/:id', authenticate, (req, res) => {
  const noteId = req.params.id;
  const { title, content } = req.body;
  const notes = readJSONFile('notes.json');
  const noteIndex = notes.findIndex((note) => note.id == noteId && note.userId == req.user.id);

  if (noteIndex === -1) {
    return res.status(404).json({ message: 'Note not found' });
  }

  notes[noteIndex] = { ...notes[noteIndex], title, content };
  writeJSONFile('notes.json', notes);
  res.json({ message: 'Note updated', note: notes[noteIndex] });
});

// Delete a note
app.delete('/notes/:id', authenticate, (req, res) => {
  const noteId = req.params.id;
  const notes = readJSONFile('notes.json');
  const newNotes = notes.filter((note) => !(note.id == noteId && note.userId == req.user.id));

  if (notes.length === newNotes.length) {
    return res.status(404).json({ message: 'Note not found' });
  }

  writeJSONFile('notes.json', newNotes);
  res.json({ message: 'Note deleted' });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
