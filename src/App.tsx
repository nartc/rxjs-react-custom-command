import React, { ButtonHTMLAttributes, FC, useRef } from 'react';
import { BehaviorSubject } from 'rxjs';
import { fromFetch } from 'rxjs/fetch';
import { delay, switchMap, tap } from 'rxjs/operators';
import './App.css';
import { useCustomCommand } from './hooks/use-custom-command';

interface CommandButtonProps {
  command: {
    execute: () => void;
    canExecute: boolean;
  }
}

const CommandButton: FC<CommandButtonProps & ButtonHTMLAttributes<HTMLButtonElement>> = (
  { command, children, ...buttonProps }
) => {
  return <button onClick={ command.execute } disabled={ !command.canExecute } { ...buttonProps }>{ children }</button>;
};

function App() {
  const twoDisabledState = useRef(new BehaviorSubject(false));

  const fromFetchUsers = useRef(
    fromFetch('https://jsonplaceholder.typicode.com/users')
      .pipe(
        delay(2000),
        switchMap(res => res.json())
      )
  );

  const commandOne = useCustomCommand(
    fromFetchUsers.current
      .pipe(tap(data => console.log('1', data)))
  );

  const commandTwo = useCustomCommand(
    fromFetchUsers.current
      .pipe(tap(data => console.log('2', data))),
    twoDisabledState.current.asObservable()
  );

  const toggle = () => {
    twoDisabledState.current.next(!twoDisabledState.current.getValue());
  };

  return (
    <div style={ { padding: 20 } }>
      <p>We want these buttons to be disabled while an action (tied to the button) is being executed.</p>

      <CommandButton command={ commandOne }>Button 1</CommandButton>
      <br/><br/>
      <CommandButton command={ commandTwo }>Button 2</CommandButton>
      <br/><br/>
      <button onClick={ toggle }>Toggle button 2 state</button>
    </div>
  );
}

export default App;
