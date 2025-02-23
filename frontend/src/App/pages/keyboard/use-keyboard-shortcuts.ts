import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listener } from './sequence-key-listener.ts';
import { ACTION, dispatch, useSearchContext } from '../store';

const unfocus = (): void => {
  const elem = document.activeElement;
  if (elem instanceof HTMLElement) elem.blur();
};

export function useKeyboardShortcuts(): [boolean, (open: boolean) => void] {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const form = useSearchContext((ctx) => ctx.form);

  useEffect(() => {
    const binds: [string | string[], (event: KeyboardEvent) => void][] = [
      [['Escape'], unfocus],
      ['q', (): void => form.setFocus('query')],
      ['f', (): void => form.setFocus('file')],
      ['x', (): void => form.setFocus('excludeFile')],
      [
        'i',
        (): void =>
          form.setValue('caseInsensitive', !form.getValues().caseInsensitive),
      ],
      ['b', (): void => form.setFocus('numLinesBefore')],
      ['a', (): void => form.setFocus('numLinesAfter')],
      ['s', (): void => dispatch([ACTION.SET_FILTERS, form.getValues()])],
      ['?', (): void => setOpen((open) => !open)],
    ];

    binds.forEach(([sequence, callback]) => listener.bind(sequence, callback));

    return (): void => binds.forEach(([sequence]) => listener.unbind(sequence));
  }, [navigate]);

  return [open, setOpen];
}
