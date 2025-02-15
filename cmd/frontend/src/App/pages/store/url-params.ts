import type { Filters } from '.';

const qpQuery = 'q';
const qpFile = 'f';
const qpExcludeFile = 'xf';
const qpCaseInsensitive = 'i';

export function parseUrlParams(search: string): Filters {
  const urlParams = new URLSearchParams(search);
  return {
    query: urlParams.get(qpQuery) ?? '',
    file: urlParams.get(qpFile) ?? '',
    excludeFile: urlParams.get(qpExcludeFile) ?? '',
    caseInsensitive: urlParams.get(qpCaseInsensitive) === 'true',
  };
}

export function createUrlParams({
  query,
  file,
  excludeFile,
  caseInsensitive,
}: Filters): string {
  const params = new URLSearchParams();
  if (query) params.set(qpQuery, query);
  if (file) params.set(qpFile, file);
  if (excludeFile) params.set(qpExcludeFile, excludeFile);
  if (caseInsensitive) params.set(qpFile, 'true');
  const paramsStr = params.toString();
  return paramsStr.length > 0 ? '?' + paramsStr : '';
}
