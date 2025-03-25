import { useEffect, useState } from 'react';
import type { NavigateFunction } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { listener } from './sequence-key-listener';
import type { Filters, SelectedHit } from '../store';
import { ACTION, dispatch, useSearchContext } from '../store';
import type { FieldPath, FieldPathValue, UseFormReturn } from 'react-hook-form';
import { createUrlParams } from '../store/url-params.ts';

const testFileRegex = '/tests?/|_tests?\\b|Tests?[^a-z]|/systemtests/|\\.html$';

const pathAnchor = (hit: SelectedHit): string =>
  `${hit.path}${hit.line > 0 ? '#L' + hit.line : ''}`;

function ghUrl(view: string): (hit: SelectedHit) => string {
  return (hit) => `${hit.repository}/${view}/${hit.branch}/${pathAnchor(hit)}`;
}

export type UrlGenerator = (hit: SelectedHit) => string | undefined;
export const URL_GENERATORS: readonly {
  key: string;
  name: string;
  url: UrlGenerator;
}[] = Object.freeze([
  {
    key: 'o',
    name: 'file view',
    url: (hit) => `/file/${hit.directory}/${pathAnchor(hit)}`,
  },
  { key: 'g', name: 'file view in GitHub', url: ghUrl('blob') },
  { key: 'b', name: 'blame view', url: ghUrl('blame') },
  { key: 'h', name: 'history view', url: ghUrl('commits') },
]);

const goToDispatcher =
  (
    navigate: NavigateFunction,
    urlGenerator: UrlGenerator,
    newWindow: boolean,
  ) =>
  (): void =>
    dispatch([
      ACTION.CALLBACK_SELECTED_HIT,
      (selectedHit: SelectedHit): void => {
        const url = urlGenerator(selectedHit);
        if (url == null) return;
        if (newWindow) window.open(url);
        else if (url.startsWith('http')) window.location.href = url;
        else navigate(url);
      },
    ]);

function modify<TFieldName extends FieldPath<Filters>>(
  form: UseFormReturn<Filters>,
  field: TFieldName,
  mapper: (
    current: FieldPathValue<Filters, TFieldName>,
  ) => FieldPathValue<Filters, TFieldName>,
): () => void {
  return () =>
    form.setValue(
      field,
      mapper(form.getValues()[field] as FieldPathValue<Filters, TFieldName>),
    );
}

function unfocus(): void {
  const elem = document.activeElement;
  if (elem instanceof HTMLElement) elem.blur();
}

export function useKeyboardShortcuts(): [boolean, (open: boolean) => void] {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const form = useSearchContext((ctx) => ctx.form);

  // p/n select prev/next file
  // d/D exclude file selected directory/extension
  // +/- expand/collapse file hits

  // prettier-ignore
  useEffect(() => {
    const binds: [string | string[], (event: KeyboardEvent) => void][] = [
      [['Escape'], unfocus],
      ['q', (): void => form.setFocus('query')],
      ['f', (): void => form.setFocus('file')],
      ['x', (): void => form.setFocus('excludeFile')],
      ['i', modify(form, 'caseInsensitive', (cur) => !cur)],
      // ['b', (): void => form.setFocus('numLinesBefore')],
      ['a', (): void => form.setFocus('numLinesAfter')],
      ['s', (): void => { navigate(`/search${createUrlParams(form.getValues())}`) }],
      ['?', (): void => setOpen((open) => !open)],

      ['r', (): void => { navigate('/') }],
      ['t', modify(form, 'excludeFile', (cur) => cur === testFileRegex ? '' : testFileRegex)],

      ['k', (): void => dispatch([ACTION.SELECT_PREVIOUS])],
      [['ArrowUp'], (): void => dispatch([ACTION.SELECT_PREVIOUS])],
      ['j', (): void => dispatch([ACTION.SELECT_NEXT])],
      [['ArrowDown'], (): void => dispatch([ACTION.SELECT_NEXT])],
    ];

    URL_GENERATORS.forEach(({ key, url }) => {
      binds.push([key, goToDispatcher(navigate, url, false)]);
      binds.push([key.toUpperCase(), goToDispatcher(navigate, url, true)]);
    });

    binds.forEach(([sequence, callback]) => listener.bind(sequence, callback));

    return (): void => binds.forEach(([sequence]) => listener.unbind(sequence));
  }, [navigate]);

  return [open, setOpen];
}
