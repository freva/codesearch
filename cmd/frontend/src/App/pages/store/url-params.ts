import type { Filters } from '.';

const qpQuery = 'q';
const qpFile = 'f';
const qpExcludeFile = 'xf';
const qpCaseInsensitive = 'i';
const qpNumBeforeLines = 'b';
const qpNumAfterLines = 'a';

export function parseUrlParams(search: string): Filters {
  const urlParams = new URLSearchParams(search);
  const parseNum = (param: string, defaultValue: number): number => {
    const val = parseInt(urlParams.get(param) ?? '', 10);
    return isNaN(val) ? defaultValue : val;
  };
  return {
    query: urlParams.get(qpQuery) ?? '',
    file: urlParams.get(qpFile) ?? '',
    excludeFile: urlParams.get(qpExcludeFile) ?? '',
    caseInsensitive: urlParams.get(qpCaseInsensitive) === 'true',
    numLinesBefore: parseNum(qpNumBeforeLines, 0),
    numLinesAfter: parseNum(qpNumAfterLines, 0),
  };
}

export function createUrlParams({
  query,
  file,
  excludeFile,
  caseInsensitive,
  numLinesBefore,
  numLinesAfter,
}: Filters): string {
  const params = new URLSearchParams();
  if (query) params.set(qpQuery, query);
  if (file) params.set(qpFile, file);
  if (excludeFile) params.set(qpExcludeFile, excludeFile);
  if (caseInsensitive) params.set(qpCaseInsensitive, 'true');
  if (numLinesBefore !== 0)
    params.set(qpNumBeforeLines, numLinesBefore.toString(10));
  if (numLinesAfter !== 0)
    params.set(qpNumAfterLines, numLinesAfter.toString(10));
  const paramsStr = params.toString();
  return paramsStr.length > 0 ? '?' + paramsStr : '';
}
