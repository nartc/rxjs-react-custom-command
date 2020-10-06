import { useEffect, useRef, useState } from 'react';
import { isObservable, Observable, of, ReplaySubject, Subscription } from 'rxjs';
import { distinctUntilChanged, finalize } from 'rxjs/operators';

export class CustomCommand<TExecute> {
  execute: Observable<TExecute>;

  private $canExecute = new ReplaySubject<boolean>(1);
  private canExecuteSubscription: Subscription;
  private executeSubscription?: Subscription | null;

  constructor(execute: Observable<TExecute> | (() => Observable<TExecute>), canExecute: Observable<boolean> = of(true)) {
    this.execute = isObservable(execute) ? execute : execute();
    this.canExecuteSubscription = canExecute
      .subscribe(this.$canExecute.next.bind(this.$canExecute));
  }

  get canExecute(): boolean {
    let _canExecute = true;
    this.canExecuteSubscription.add(
      this.canExecute$.subscribe((value) => {
        _canExecute = value;
      }),
    );
    return _canExecute;
  }

  get canExecute$(): Observable<boolean> {
    return this.$canExecute.asObservable();
  }

  invoke() {
    if (this.executeSubscription != null) {
      this.executeSubscription = null;
    }

    this.$canExecute.next(false);
    this.executeSubscription = this.execute.pipe(finalize(() => this.$canExecute.next(true))).subscribe();
  }

  unsubscribe() {
    this.canExecuteSubscription?.unsubscribe();
    this.executeSubscription?.unsubscribe();
  }
}

/**
 * A hook that returns:
 * - An `execute` fn that can be passed to event handler (eg: onPress)
 * - A `canExecute` flag that can be passed to a prop that handles the actionable state of a **Call-to-action** (eg:
 * `Button.disabled` prop)
 *
 * @param execute
 * @param canExecute
 */
export const useCustomCommand = <TExecute>(
  execute: Observable<TExecute> | (() => Observable<TExecute>),
  canExecute?: Observable<boolean>,
) => {
  const commandRef = useRef(new CustomCommand(execute, canExecute));
  const [_canExecute, _setCanExecute] = useState(commandRef.current.canExecute);

  useEffect(() => {
    const command = commandRef.current;
    const sub = command.canExecute$
      .pipe(distinctUntilChanged())
      .subscribe(value => {
        _setCanExecute(value);
      });
    return () => {
      sub.unsubscribe();
      command.unsubscribe();
    };
  }, []);

  return {
    execute: commandRef.current.invoke.bind(commandRef.current),
    canExecute: _canExecute,
  };
};
