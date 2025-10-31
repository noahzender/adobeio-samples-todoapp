/*
 * Local development server for the Todo app
 */

const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const { MAX_TODO_ITEMS } = require('./defaults.json');

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const dataDir = path.join(__dirname, 'dist', 'dev-keys');
const dataFile = path.join(dataDir, 'todos.json');

function ensureStore() {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(dataFile)) fs.writeFileSync(dataFile, JSON.stringify([]), 'utf8');
}

function readStore() {
  ensureStore();
  try {
    const raw = fs.readFileSync(dataFile, 'utf8');
    return JSON.parse(raw || '[]');
  } catch (e) {
    return [];
  }
}

function writeStore(todoList) {
  ensureStore();
  fs.writeFileSync(dataFile, JSON.stringify(todoList, null, 2), 'utf8');
}

app.post('/todolist', (req, res) => {
  const { operation, name, todo } = req.body || {};

  if (!operation) return res.status(400).json({ error: 'missing parameter(s) \"operation\"' });

  let todoList = readStore();
  let body = {};

  switch (operation) {
    case 'create': {
      if (!name) return res.status(400).json({ error: 'Missing "name" parameter' });
      if (!todoList.find((l) => l.name === name)) {
        todoList.unshift({ name, todos: [] });
        writeStore(todoList);
        body.message = `"${name}" added.`;
      } else {
        return res.status(400).json({ error: `"${name}" already exists.` });
      }
      break;
    }
    case 'read': {
      body.todoList = todoList;
      break;
    }
    case 'update': {
      if (!name) return res.status(400).json({ error: 'Missing "name" parameter' });
      if (!todo) return res.status(400).json({ error: 'Todo is missing.' });
      const list = todoList.find((l) => l.name === name);
      if (!list) return res.status(400).json({ error: `${name} not found.` });
      const idx = list.todos.findIndex((t) => t.id === todo.id);
      if (idx !== -1) {
        list.todos[idx] = todo;
        body.message = `Todo "${todo.id}" updated in "${name}".`;
        writeStore(todoList);
      } else {
        if (list.todos.length < MAX_TODO_ITEMS) {
          list.todos.unshift(todo);
          body.message = `Todo "${todo.id}" added to "${name}".`;
          writeStore(todoList);
        } else {
          return res.status(400).json({ error: `Max ${MAX_TODO_ITEMS} todos reached for "${name}".` });
        }
      }
      break;
    }
    case 'delete': {
      if (!name) return res.status(400).json({ error: 'Missing "name" parameter' });
      todoList = todoList.filter((l) => l.name !== name);
      writeStore(todoList);
      body.message = `"${name}" todo list deleted.`;
      break;
    }
    default:
      return res.status(400).json({ error: 'CRUD operation not found' });
  }

  return res.json(body);
});

// Serve static frontend (expects a bundled file at web-src/dist/bundle.js)
app.use(express.static(path.join(__dirname, 'web-src')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'web-src', 'index.html'));
});

app.listen(port, () => {
  console.log(`Local Todo server listening at http://localhost:${port}`);
});


