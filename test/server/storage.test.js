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

const fs = require('fs');
const path = require('path');

// Extract storage functions for testing
const dataDir = path.join(__dirname, '../../dist', 'dev-keys');
const dataFile = path.join(dataDir, 'test-storage.json');

function ensureStore(file = dataFile) {
  const dir = path.dirname(file);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(file)) fs.writeFileSync(file, JSON.stringify([]), 'utf8');
}

function readStore(file = dataFile) {
  ensureStore(file);
  try {
    const raw = fs.readFileSync(file, 'utf8');
    return JSON.parse(raw || '[]');
  } catch (e) {
    return [];
  }
}

function writeStore(todoList, file = dataFile) {
  ensureStore(file);
  fs.writeFileSync(file, JSON.stringify(todoList, null, 2), 'utf8');
}

describe('Storage Layer', () => {
  beforeEach(() => {
    // Clean up test file before each test
    if (fs.existsSync(dataFile)) {
      fs.unlinkSync(dataFile);
    }
  });

  afterEach(() => {
    // Clean up test file after each test
    if (fs.existsSync(dataFile)) {
      fs.unlinkSync(dataFile);
    }
  });

  describe('ensureStore', () => {
    test('creates directory if it does not exist', () => {
      const testDir = path.join(__dirname, '../../dist', 'test-dir');
      const testFile = path.join(testDir, 'test.json');
      
      if (fs.existsSync(testFile)) fs.unlinkSync(testFile);
      if (fs.existsSync(testDir)) fs.rmdirSync(testDir);
      
      ensureStore(testFile);
      
      expect(fs.existsSync(testDir)).toBe(true);
      expect(fs.existsSync(testFile)).toBe(true);
      
      // Cleanup
      if (fs.existsSync(testFile)) fs.unlinkSync(testFile);
      if (fs.existsSync(testDir)) fs.rmdirSync(testDir);
    });

    test('creates empty array file if it does not exist', () => {
      ensureStore(dataFile);
      const content = fs.readFileSync(dataFile, 'utf8');
      expect(JSON.parse(content)).toEqual([]);
    });
  });

  describe('readStore', () => {
    test('returns empty array for non-existent file', () => {
      const result = readStore(dataFile);
      expect(result).toEqual([]);
    });

    test('reads and parses existing JSON file', () => {
      const testData = [{ name: 'Test List', todos: [] }];
      writeStore(testData, dataFile);
      
      const result = readStore(dataFile);
      expect(result).toEqual(testData);
    });

    test('handles corrupted JSON gracefully', () => {
      fs.writeFileSync(dataFile, 'invalid json', 'utf8');
      
      const result = readStore(dataFile);
      expect(result).toEqual([]);
    });

    test('handles empty file gracefully', () => {
      fs.writeFileSync(dataFile, '', 'utf8');
      
      const result = readStore(dataFile);
      expect(result).toEqual([]);
    });
  });

  describe('writeStore', () => {
    test('writes todo list to file', () => {
      const testData = [{ name: 'Test List', todos: [] }];
      writeStore(testData, dataFile);
      
      const content = fs.readFileSync(dataFile, 'utf8');
      const result = JSON.parse(content);
      expect(result).toEqual(testData);
    });

    test('writes complex todo list with todos', () => {
      const testData = [
        {
          name: 'Shopping',
          todos: [
            { id: '1', title: 'Buy milk', completed: false },
            { id: '2', title: 'Buy eggs', completed: true }
          ]
        }
      ];
      writeStore(testData, dataFile);
      
      const content = fs.readFileSync(dataFile, 'utf8');
      const result = JSON.parse(content);
      expect(result).toEqual(testData);
    });

    test('overwrites existing file', () => {
      const initialData = [{ name: 'Old List', todos: [] }];
      writeStore(initialData, dataFile);
      
      const newData = [{ name: 'New List', todos: [] }];
      writeStore(newData, dataFile);
      
      const result = readStore(dataFile);
      expect(result).toEqual(newData);
      expect(result).not.toEqual(initialData);
    });

    test('maintains data integrity with multiple lists', () => {
      const testData = [
        { name: 'List 1', todos: [] },
        { name: 'List 2', todos: [{ id: '1', title: 'Task', completed: false }] },
        { name: 'List 3', todos: [] }
      ];
      writeStore(testData, dataFile);
      
      const result = readStore(dataFile);
      expect(result).toHaveLength(3);
      expect(result[1].todos).toHaveLength(1);
    });
  });
});

