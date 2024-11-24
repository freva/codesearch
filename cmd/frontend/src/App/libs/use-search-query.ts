import { useSearchParams } from 'react-router-dom';

export type QueryParams = {
  q: string;
  f: string;
  x: string;
  i: boolean;
};

export function getSearchUrl(params: QueryParams): string {
  const searchParams = new URLSearchParams();
  if (params.q) searchParams.set('q', params.q);
  if (params.f) searchParams.set('f', params.f);
  if (params.x) searchParams.set('x', params.x);
  if (params.i) searchParams.set('i', 'true');

  return '/search?' + searchParams.toString();
}

export function useSearchQuery(): QueryParams {
  const [params] = useSearchParams();

  return {
    q: params.get('q') || '',
    f: params.get('f') || '',
    x: params.get('x') || '',
    i: params.get('i') === 'true',
  };
}
