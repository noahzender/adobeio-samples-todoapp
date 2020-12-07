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

import actions from './config.json';

import React, { useState, useEffect } from 'react';
import ErrorBoundary from 'react-error-boundary';
import { Provider as RSProvider, defaultTheme, View, Flex, Grid, repeat, ProgressCircle } from '@adobe/react-spectrum';
import '@spectrum-css/typography';
import PropTypes from 'prop-types';
import { CreateTodoList } from './CreateTodoList';
import { TodoList } from './TodoList';

// error handler on UI rendering failure
function onError(e, componentStack) {}

// component to show if UI fails rendering
function fallbackComponent({ componentStack, error }) {
  return (
    <>
      <h1>Error</h1>
      <pre>{componentStack + '\n' + error.message}</pre>
    </>
  );
}

function App({ ims }) {
  const [isLoading, setIsLoading] = useState(true);
  const [todoList, setTodoList] = useState([]);

  // Helper function to communicate with the Runtime actions
  const action = async (name, operation, body = {}) => {
    const res = await fetch(actions[name], {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-gw-ims-org-id': ims.org,
        authorization: `Bearer ${ims.token}`
      },
      body: JSON.stringify({
        operation,
        ...body
      })
    });

    return await res.json();
  };

  const onCreateTodoList = async (name) => {
    setTodoList([{ name, todos: [] }, ...todoList]);

    console.log(await action('todolist', 'create', { name }));
  };

  const onDeleteTodoList = async (name) => {
    setTodoList(todoList.filter(({ name: toDeleteName }) => name !== toDeleteName));

    console.log(await action('todolist', 'delete', { name }));
  };

  const onCreateTodo = async (todo) => {
    console.log(await action('todo', 'create', { todo }));
  };

  // Same as onCreateTodo but we leave it to show the distinction between create and update in the code
  const onUpdateTodo = async (todo) => {
    console.log(await action('todo', 'update', { todo }));
  };

  // Show the loading indicator while fetching the todo lists
  useEffect(() => {
    (async () => {
      const { todoList } = await action('todolist', 'read');
      if (todoList) {
        setTodoList(todoList);
        setIsLoading(false);
      }
    })();
  }, []);

  return (
    <ErrorBoundary onError={onError} FallbackComponent={fallbackComponent}>
      <RSProvider theme={defaultTheme} colorScheme={`light`}>
        <View elementType="main" minHeight="100vh">
          {isLoading ? (
            <Flex alignItems="center" justifyContent="center" height="100vh">
              <ProgressCircle size="L" aria-label="Loading…" isIndeterminate />
            </Flex>
          ) : (
            <>
              <View height="size-800" marginY="size-400">
                <CreateTodoList onCreate={onCreateTodoList} />
              </View>
              <Grid
                columns={repeat('auto-fit', 'size-3400')}
                autoRows="size-6000"
                justifyContent="center"
                gap="size-200">
                {todoList.map((list, index) => (
                  <TodoList
                    key={index}
                    todoList={list}
                    onDelete={onDeleteTodoList}
                    onCreate={onCreateTodo}
                    onUpdate={onUpdateTodo}
                  />
                ))}
              </Grid>
            </>
          )}
        </View>
      </RSProvider>
    </ErrorBoundary>
  );
}

App.propTypes = {
  ims: PropTypes.object
};

export default App;
