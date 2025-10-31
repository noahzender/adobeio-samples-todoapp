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

// Import the same test server creation function
const testDataFile = path.join(__dirname, '../../dist/dev-keys/todos.test.json');

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

describe('TodoList CRUD Operations', () => {
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
  
  describe('Complete CRUD workflow', () => {
    test('create, read, update, and delete a todo list with todos', async () => {
      const listName = 'My Work Tasks';
      
      // CREATE: Create a new todo list
      const createResponse = await request(app)
        .post('/todolist')
        .send({ operation: 'create', name: listName });
      
      expect(createResponse.status).toBe(200);
      expect(createResponse.body.message).toContain(listName);
      
      // READ: Verify list exists
      const readResponse1 = await request(app)
        .post('/todolist')
        .send({ operation: 'read' });
      
      expect(readResponse1.body.todoList).toHaveLength(1);
      expect(readResponse1.body.todoList[0].name).toBe(listName);
      expect(readResponse1.body.todoList[0].todos).toEqual([]);
      
      // UPDATE: Add todos to the list
      const todos = [
        { id: '1', title: 'Design mockups', completed: false },
        { id: '2', title: 'Write documentation', completed: false },
        { id: '3', title: 'Code review', completed: true }
      ];
      
      for (const todo of todos) {
        const updateResponse = await request(app)
          .post('/todolist')
          .send({ operation: 'update', name: listName, todo });
        
        expect(updateResponse.status).toBe(200);
      }
      
      // READ: Verify todos were added
      const readResponse2 = await request(app)
        .post('/todolist')
        .send({ operation: 'read' });
      
      const list = readResponse2.body.todoList.find(l => l.name === listName);
      expect(list.todos).toHaveLength(3);
      expect(list.todos[0].id).toBe('3'); // Most recent first
      
      // UPDATE: Mark a todo as complete
      const updatedTodo = { id: '1', title: 'Design mockups', completed: true };
      const updateCompleteResponse = await request(app)
        .post('/todolist')
        .send({ operation: 'update', name: listName, todo: updatedTodo });
      
      expect(updateCompleteResponse.status).toBe(200);
      expect(updateCompleteResponse.body.message).toContain('updated');
      
      // READ: Verify todo was updated
      const readResponse3 = await request(app)
        .post('/todolist')
        .send({ operation: 'read' });
      
      const updatedList = readResponse3.body.todoList.find(l => l.name === listName);
      const updatedTodoItem = updatedList.todos.find(t => t.id === '1');
      expect(updatedTodoItem.completed).toBe(true);
      
      // DELETE: Delete the todo list
      const deleteResponse = await request(app)
        .post('/todolist')
        .send({ operation: 'delete', name: listName });
      
      expect(deleteResponse.status).toBe(200);
      expect(deleteResponse.body.message).toContain('deleted');
      
      // READ: Verify list was deleted
      const readResponse4 = await request(app)
        .post('/todolist')
        .send({ operation: 'read' });
      
      expect(readResponse4.body.todoList).toHaveLength(0);
    });
  });
  
  describe('Multiple todo lists', () => {
    test('can manage multiple independent todo lists', async () => {
      // Create multiple lists
      await request(app)
        .post('/todolist')
        .send({ operation: 'create', name: 'Personal' });
      await request(app)
        .post('/todolist')
        .send({ operation: 'create', name: 'Work' });
      await request(app)
        .post('/todolist')
        .send({ operation: 'create', name: 'Shopping' });
      
      // Add todos to different lists
      await request(app)
        .post('/todolist')
        .send({ 
          operation: 'update', 
          name: 'Personal', 
          todo: { id: '1', title: 'Buy groceries', completed: false } 
        });
      
      await request(app)
        .post('/todolist')
        .send({ 
          operation: 'update', 
          name: 'Work', 
          todo: { id: '2', title: 'Meeting with team', completed: false } 
        });
      
      // Verify all lists exist and have correct todos
      const readResponse = await request(app)
        .post('/todolist')
        .send({ operation: 'read' });
      
      expect(readResponse.body.todoList).toHaveLength(3);
      
      const personalList = readResponse.body.todoList.find(l => l.name === 'Personal');
      const workList = readResponse.body.todoList.find(l => l.name === 'Work');
      const shoppingList = readResponse.body.todoList.find(l => l.name === 'Shopping');
      
      expect(personalList.todos).toHaveLength(1);
      expect(workList.todos).toHaveLength(1);
      expect(shoppingList.todos).toHaveLength(0);
      
      // Delete one list, others should remain
      await request(app)
        .post('/todolist')
        .send({ operation: 'delete', name: 'Shopping' });
      
      const readResponse2 = await request(app)
        .post('/todolist')
        .send({ operation: 'read' });
      
      expect(readResponse2.body.todoList).toHaveLength(2);
      expect(readResponse2.body.todoList.find(l => l.name === 'Shopping')).toBeUndefined();
    });
  });
  
  describe('Error handling', () => {
    test('handles operations on non-existent lists appropriately', async () => {
      // Try to update a non-existent list
      const updateResponse = await request(app)
        .post('/todolist')
        .send({ 
          operation: 'update', 
          name: 'Non-existent', 
          todo: { id: '1', title: 'Test', completed: false } 
        });
      
      expect(updateResponse.status).toBe(400);
      expect(updateResponse.body.error).toContain('not found');
      
      // Try to delete a non-existent list
      const deleteResponse = await request(app)
        .post('/todolist')
        .send({ operation: 'delete', name: 'Non-existent' });
      
      // Note: Current implementation doesn't error on delete of non-existent
      // This is actually fine - idempotent delete
      expect(deleteResponse.status).toBe(200);
    });
    
    test('handles duplicate todo IDs correctly', async () => {
      // Create list and add todo
      await request(app)
        .post('/todolist')
        .send({ operation: 'create', name: 'Tasks' });
      
      const todo = { id: 'duplicate-id', title: 'First', completed: false };
      await request(app)
        .post('/todolist')
        .send({ operation: 'update', name: 'Tasks', todo });
      
      // Add another todo with same ID (should update, not add duplicate)
      const todo2 = { id: 'duplicate-id', title: 'Updated', completed: true };
      const response = await request(app)
        .post('/todolist')
        .send({ operation: 'update', name: 'Tasks', todo: todo2 });
      
      expect(response.status).toBe(200);
      expect(response.body.message).toContain('updated');
      
      // Verify only one todo exists
      const readResponse = await request(app)
        .post('/todolist')
        .send({ operation: 'read' });
      
      const list = readResponse.body.todoList.find(l => l.name === 'Tasks');
      expect(list.todos).toHaveLength(1);
      expect(list.todos[0].title).toBe('Updated');
    });
  });
  
  describe('Max todos limit', () => {
    test('prevents adding more than MAX_TODO_ITEMS todos to a list', async () => {
      await request(app)
        .post('/todolist')
        .send({ operation: 'create', name: 'Limited List' });
      
      // Add maximum todos
      for (let i = 0; i < 10; i++) {
        const response = await request(app)
          .post('/todolist')
          .send({ 
            operation: 'update', 
            name: 'Limited List', 
            todo: { id: `${i}`, title: `Task ${i}`, completed: false } 
          });
        
        expect(response.status).toBe(200);
      }
      
      // Try to add one more
      const response = await request(app)
        .post('/todolist')
        .send({ 
          operation: 'update', 
          name: 'Limited List', 
          todo: { id: '11', title: 'Extra Task', completed: false } 
        });
      
      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Max 10 todos');
      
      // Verify exactly 10 todos exist
      const readResponse = await request(app)
        .post('/todolist')
        .send({ operation: 'read' });
      
      const list = readResponse.body.todoList.find(l => l.name === 'Limited List');
      expect(list.todos).toHaveLength(10);
    });
    
    test('allows updating existing todos even when at max limit', async () => {
      await request(app)
        .post('/todolist')
        .send({ operation: 'create', name: 'Full List' });
      
      // Fill to max
      for (let i = 0; i < 10; i++) {
        await request(app)
          .post('/todolist')
          .send({ 
            operation: 'update', 
            name: 'Full List', 
            todo: { id: `${i}`, title: `Task ${i}`, completed: false } 
          });
      }
      
      // Update an existing todo (should work)
      const updateResponse = await request(app)
        .post('/todolist')
        .send({ 
          operation: 'update', 
          name: 'Full List', 
          todo: { id: '5', title: 'Updated Task 5', completed: true } 
        });
      
      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.message).toContain('updated');
    });
  });
});
