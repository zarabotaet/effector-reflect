import React, { FC, InputHTMLAttributes, ChangeEvent } from 'react';
import { restore, fork, allSettled, createDomain } from 'effector';
import { Provider } from 'effector-react/ssr';

import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { reflect } from '../../ssr';

// Example1 (InputCustom)
const InputCustom: FC<{
  value: string | number | string[];
  onChange(value: string): void;
  testId: string;
  placeholder?: string;
}> = (props) => {
  return (
    <input
      data-testid={props.testId}
      placeholder={props.placeholder}
      value={props.value}
      onChange={(event) => props.onChange(event.currentTarget.value)}
    />
  );
};

test('InputCustom', async () => {
  const app = createDomain();

  const change = app.createEvent<string>();
  const $name = restore(change, '');

  const Name = reflect({
    view: InputCustom,
    bind: { value: $name, onChange: change },
  });

  const scope = fork(app);

  expect(scope.getState($name)).toBe('');
  await allSettled(change, { scope, params: 'Bob' });
  expect(scope.getState($name)).toBe('Bob');

  const container = render(
    <Provider value={scope}>
      <Name testId="name" />
    </Provider>,
  );

  const inputName = container.container.firstChild as HTMLInputElement;
  expect(inputName.value).toBe('Bob');
});

test('InputCustom [replace value]', async () => {
  const app = createDomain();

  const change = app.createEvent<string>();
  const $name = app.createStore<string>('');

  $name.on(change, (_, next) => next);

  const Name = reflect({
    view: InputCustom,
    bind: { name: $name, onChange: change },
  });

  const scope = fork(app);

  expect(scope.getState($name)).toBe('');
  await allSettled(change, { scope, params: 'Bob' });
  expect(scope.getState($name)).toBe('Bob');

  const container = render(
    <Provider value={scope}>
      <Name testId="name" value="Alise" />
    </Provider>,
  );

  const inputName = container.container.firstChild as HTMLInputElement;
  expect(inputName.value).toBe('Alise');
});

// Example 2 (InputBase)
const InputBase: FC<InputHTMLAttributes<HTMLInputElement>> = (props) => {
  return <input {...props} />;
};

test('InputBase', async () => {
  const app = createDomain();

  const changeName = app.createEvent<string>();
  const $name = restore(changeName, '');

  const inputChanged = (event: ChangeEvent<HTMLInputElement>) => {
    return event.currentTarget.value;
  };

  const Name = reflect({
    view: InputBase,
    bind: {
      value: $name,
      onChange: changeName.prepend(inputChanged),
    },
  });

  const changeAge = app.createEvent<number>();
  const $age = restore(changeAge, 0);

  const Age = reflect({
    view: InputBase,
    bind: {
      value: $age,
      onChange: changeAge.prepend(parseInt).prepend(inputChanged),
    },
  });

  const scope = fork(app);

  expect(scope.getState($name)).toBe('');
  await allSettled(changeName, { scope, params: 'Bob' });
  expect(scope.getState($name)).toBe('Bob');

  expect(scope.getState($age)).toBe(0);
  await allSettled(changeAge, { scope, params: 25 });
  expect(scope.getState($age)).toBe(25);

  const container = render(
    <Provider value={scope}>
      <Name data-testid="name" />
      <Age data-testid="age" />
    </Provider>,
  );

  const inputName = container.getByTestId('name') as HTMLInputElement;
  expect(inputName.value).toBe('Bob');

  const inputAge = container.getByTestId('age') as HTMLInputElement;
  expect(inputAge.value).toBe('25');
});

test('with ssr for client', async () => {
  const app = createDomain();

  const changeName = app.createEvent<string>();
  const $name = restore(changeName, '');

  const Name = reflect({
    view: (props: {
      value: string;
      onChange: (_event: ChangeEvent<HTMLInputElement>) => void;
    }) => {
      return (
        <input
          data-testid="name"
          value={props.value}
          onChange={props.onChange}
        />
      );
    },
    bind: {
      value: $name,
      onChange: changeName.prepend((event) => event.currentTarget.value),
    },
  });

  const scope = fork(app);

  const container = render(
    <Provider value={scope}>
      <Name />
    </Provider>,
  );

  expect($name.getState()).toBe('');
  await userEvent.type(container.getByTestId('name'), 'Bob');
  expect(scope.getState($name)).toBe('Bob');

  const inputName = container.getByTestId('name') as HTMLInputElement;
  expect(inputName.value).toBe('Bob');
});
