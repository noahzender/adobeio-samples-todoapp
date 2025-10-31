/*
 * Copyright 2020 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */

const request = require('supertest');
const fs = require('fs');
const path = require('path');

// Mock the data file path for testing
const originalDataFile = path.join(__dirname, '../../dist/dev-keys/todos.json');
const testDataFile = path.join(__dirname, '../../dist/dev-keys/todos.test.json');

// Create a test server module that uses test data file
function createTestServer() {
  const express = require('express');
  const cors = require('cors');
  const { MAX_TODO_ITEMS } = require('../../defaults.json');
  
  const app = express();
  app.use(cors());
  app.use(express.json());
  
  const dataFile = testDataFile;
  
  function ensureStore() {
    const dataDir = path.dirname(dataFile);
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
    
    if (!operation) return res.status(400).json({ error: 'missing parameter(s) "operation"' });
    
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
  
  return app;
}

describe('API Endpoints', () => {
  let app;
  
  beforeEach(() => {
    // Ensure directory exists
    const dataDir = path.dirname(testDataFile);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    // Clean up test data file before each test
    if (fs.existsSync(testDataFile)) {
      fs.unlinkSync(testDataFile);
    }
    app = createTestServer();
  });
  
  afterEach(() => {
    // Clean up test data file after each test
    if (fs.existsSync(testDataFile)) {
      fs.unlinkSync(testDataFile);
    }
  });
  
  describe('POST /todolist', () => {
    describe('Operation validation', () => {
      test('returns 400 when operation is missing', async () => {
        const response = await request(app)
          .post('/todolist')
          .send({});
        
        expect(response.status).toBe(400);
        expect(response.body.error).toBe('missing parameter(s) "operation"');
      });
      
      test('returns 400 when operation is invalid', async () => {
        const response = await request(app)
          .post('/todolist')
          .send({ operation: 'invalid' });
        
        expect(response.status).toBe(400);
        expect(response.body.error).toBe('CRUD operation not found');
      });
    });
    
    describe('CREATE operation', () => {
      test('creates a new todo list successfully', async () => {
        const response = await request(app)
          .post('/todolist')
          .send({ operation: 'create', name: 'My List' });
        
        expect(response.status).toBe(200);
        expect(response.body.message).toBe('"My List" added.');
      });
      
      test('returns 400 when name parameter is missing', async () => {
        const response = await request(app)
          .post('/todolist')
          .send({ operation: 'create' });
        
        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Missing "name" parameter');
      });
      
      test('returns 400 when trying to create duplicate list', async () => {
        // Create first list
        await request(app)
          .post('/todolist')
          .send({ operation: 'create', name: 'Duplicate List' });
        
        // Try to create duplicate
        const response = await request(app)
          .post('/todolist')
          .send({ operation: 'create', name: 'Duplicate List' });
        
        expect(response.status).toBe(400);
        expect(response.body.error).toBe('"Duplicate List" already exists.');
      });
      
      test('newly created list has empty todos array', async () => {
        await request(app)
          .post('/todolist')
          .send({ operation: 'create', name: 'Empty List' });
        
        const readResponse = await request(app)
          .post('/todolist')
          .send({ operation: 'read' });
        
        const list = readResponse.body.todoList.find(l => l.name === 'Empty List');
        expect(list).toBeDefined();
        expect(list.todos).toEqual([]);
      });
    });
    
    describe('READ operation', () => {
      test('returns empty array when no lists exist', async () => {
        const response = await request(app)
          .post('/todolist')
          .send({ operation: 'read' });
        
        expect(response.status).toBe(200);
        expect(response.body.todoList).toEqual([]);
      });
      
      test('returns all todo lists', async () => {
        // Create multiple lists
        await request(app)
          .post('/todolist')
          .send({ operation: 'create', name: 'List 1' });
        await request(app)
          .post('/todolist')
          .send({ operation: 'create', name: 'List 2' });
        
        const response = await request(app)
          .post('/todolist')
          .send({ operation: 'read' });
        
        expect(response.status).toBe(200);
        expect(response.body.todoList).toHaveLength(2);
        expect(response.body.todoList[0].name).toBe('List 2'); // Most recent first
        expect(response.body.todoList[1].name).toBe('List 1');
      });
    });
    
    describe('UPDATE operation', () => {
      test('adds a new todo to an existing list', async () => {
        // Create a list first
        await request(app)
          .post('/todolist')
          .send({ operation: 'create', name: 'Shopping List' });
        
        const todo = { id: '1', title: 'Buy milk', completed: false };
        const response = await request(app)
          .post('/todolist')
          .send({ operation: 'update', name: 'Shopping List', todo });
        
        expect(response.status).toBe(200);
        expect(response.body.message).toBe('Todo "1" added to "Shopping List".');
      });
      
      test('updates an existing todo in a list', async () => {
        // Create list and add todo
        await request(app)
          .post('/todolist')
          .send({ operation: 'create', name: 'Tasks' });
        
        const todo = { id: '1', title: 'Original task', completed: false };
        await request(app)
          .post('/todolist')
          .send({ operation: 'update', name: 'Tasks', todo });
        
        // Update the todo
        const updatedTodo = { id: '1', title: 'Updated task', completed: true };
        const response = await request(app)
          .post('/todolist')
          .send({ operation: 'update', name: 'Tasks', todo: updatedTodo });
        
        expect(response.status).toBe(200);
        expect(response.body.message).toBe('Todo "1" updated in "Tasks".');
        
        // Verify the update
        const readResponse = await request(app)
          .post('/todolist')
          .send({ operation: 'read' });
        
        const list = readResponse.body.todoList.find(l => l.name === 'Tasks');
        expect(list.todos[0]).toEqual(updatedTodo);
      });
      
      test('returns 400 when name parameter is missing', async () => {
        const response = await request(app)
          .post('/todolist')
          .send({ operation: 'update', todo: { id: '1', title: 'Test' } });
        
        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Missing "name" parameter');
      });
      
      test('returns 400 when todo parameter is missing', async () => {
        const response = await request(app)
          .post('/todolist')
          .send({ operation: 'update', name: 'My List' });
        
        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Todo is missing.');
      });
      
      test('returns 400 when list does not exist', async () => {
        const response = await request(app)
          .post('/todolist')
          .send({ 
            operation: 'update', 
            name: 'Non-existent List', 
            todo: { id: '1', title: 'Test' } 
          });
        
        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Non-existent List not found.');
      });
      
      test('enforces MAX_TODO_ITEMS limit', async () => {
        // Create a list
        await request(app)
          .post('/todolist')
          .send({ operation: 'create', name: 'Full List' });
        
        // Add maximum number of todos
        for (let i = 0; i < 10; i++) {
          await request(app)
            .post('/todolist')
            .send({ 
              operation: 'update', 
              name: 'Full List', 
              todo: { id: `${i}`, title: `Task ${i}`, completed: false } 
            });
        }
        
        // Try to add one more
        const response = await request(app)
          .post('/todolist')
          .send({ 
            operation: 'update', 
            name: 'Full List', 
            todo: { id: '11', title: 'Extra Task', completed: false } 
          });
        
        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Max 10 todos reached for "Full List".');
      });
    });
    
    describe('DELETE operation', () => {
      test('deletes an existing todo list', async () => {
        // Create a list
        await request(app)
          .post('/todolist')
          .send({ operation: 'create', name: 'To Delete' });
        
        // Delete it
        const response = await request(app)
          .post('/todolist')
          .send({ operation: 'delete', name: 'To Delete' });
        
        expect(response.status).toBe(200);
        expect(response.body.message).toBe('"To Delete" todo list deleted.');
        
        // Verify it's gone
        const readResponse = await request(app)
          .post('/todolist')
          .send({ operation: 'read' });
        
        expect(readResponse.body.todoList.find(l => l.name === 'To Delete')).toBeUndefined();
      });
      
      test('returns 400 when name parameter is missing', async () => {
        const response = await request(app)
          .post('/todolist')
          .send({ operation: 'delete' });
        
        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Missing "name" parameter');
      });
      
      test('deletes only the specified list when multiple exist', async () => {
        // Create multiple lists
        await request(app)
          .post('/todolist')
          .send({ operation: 'create', name: 'Keep This' });
        await request(app)
          .post('/todolist')
          .send({ operation: 'create', name: 'Delete This' });
        
        // Delete one
        await request(app)
          .post('/todolist')
          .send({ operation: 'delete', name: 'Delete This' });
        
        // Verify only one remains
        const readResponse = await request(app)
          .post('/todolist')
          .send({ operation: 'read' });
        
        expect(readResponse.body.todoList).toHaveLength(1);
        expect(readResponse.body.todoList[0].name).toBe('Keep This');
      });
    });
    
    describe('Edge cases', () => {
      test('handles empty request body gracefully', async () => {
        const response = await request(app)
          .post('/todolist')
          .send({});
        
        expect(response.status).toBe(400);
        expect(response.body.error).toBe('missing parameter(s) "operation"');
      });
      
      test('handles special characters in list names', async () => {
        const response = await request(app)
          .post('/todolist')
          .send({ operation: 'create', name: 'List & More! 🎉' });
        
        expect(response.status).toBe(200);
        expect(response.body.message).toContain('List & More! 🎉');
      });
      
      test('handles todos with various properties', async () => {
        await request(app)
          .post('/todolist')
          .send({ operation: 'create', name: 'Complex List' });
        
        const complexTodo = {
          id: 'complex-1',
          title: 'Complex Task',
          completed: false,
          description: 'A detailed description',
          priority: 'high',
          dueDate: '2024-12-31'
        };
        
        const response = await request(app)
          .post('/todolist')
          .send({ operation: 'update', name: 'Complex List', todo: complexTodo });
        
        expect(response.status).toBe(200);
        
        // Verify all properties are preserved
        const readResponse = await request(app)
          .post('/todolist')
          .send({ operation: 'read' });
        
        const list = readResponse.body.todoList.find(l => l.name === 'Complex List');
        expect(list.todos[0]).toMatchObject(complexTodo);
      });
    });
  });
});

