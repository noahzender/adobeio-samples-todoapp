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

const { Core } = require('@adobe/aio-sdk');
const stateLib = require('@adobe/aio-lib-state');
const { errorResponse, stringParameters, checkMissingRequestInputs } = require('../utils');
const { MAX_TODO_ITEMS } = require('../../defaults.json');

// main function that will be executed by Adobe I/O Runtime
async function main(params) {
  // create a Logger
  const logger = Core.Logger('main', { level: params.LOG_LEVEL || 'info' });

  try {
    // 'info' is the default level if not set
    logger.info('Calling the main action');

    // log parameters, only if params.LOG_LEVEL === 'debug'
    logger.debug(stringParameters(params));

    // check for missing request input parameters and headers
    const requiredParams = ['operation'];
    const requiredHeaders = ['Authorization'];
    const errorMessage = checkMissingRequestInputs(params, requiredParams, requiredHeaders);
    if (errorMessage) {
      // return and log client errors
      return errorResponse(400, errorMessage, logger);
    }

    const state = await stateLib.init();
    const { name, operation } = params;
    let body = {};

    const defaultTodoList = async () => {
      let todoList = await state.get(`todolist`);
      if (!todoList) {
        todoList = { value: [] };
      }
      return todoList;
    };

    switch (operation) {
      case 'read':
        const { value: names } = await defaultTodoList();

        body.todoList = [];

        for (const name of names) {
          const todo = {
            name,
            todos: []
          };

          for (let i = 0; i < MAX_TODO_ITEMS; i++) {
            const todoItem = await state.get(`todo-${name}-${i}`);
            if (todoItem) {
              todo.todos.unshift(todoItem.value);
            }
          }

          body.todoList.unshift(todo);
        }

        break;
      case 'create':
        if (name) {
          const { value: names } = await defaultTodoList();

          if (!names.includes(name)) {
            names.push(name);

            await state.put(`todolist`, names, { ttl: -1 });

            body.message = `${name} added.`;
          } else {
            body.message = `${name} already exists.`;
          }
        } else {
          body.message = `name is empty.`;
        }
        break;
      case 'delete':
        const todoList = await state.get(`todolist`);
        if (todoList) {
          todoList.value = todoList.value.filter((todoListName) => todoListName !== name);
          await state.put(`todolist`, todoList.value, { ttl: -1 });
        }

        for (let i = 0; i < MAX_TODO_ITEMS; i++) {
          await state.delete(`todo-${name}-${i}`);
        }

        body.message = `${name} todo list deleted.`;
        break;
      default:
        return errorResponse(400, 'CRUD operation not found', logger);
    }

    return {
      statusCode: 200,
      body
    };
  } catch (error) {
    // log any server errors
    logger.error(error);
    // return with 500
    return errorResponse(500, error.message, logger);
  }
}

exports.main = main;
