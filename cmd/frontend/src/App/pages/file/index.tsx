import type { ReactNode } from 'react';
import { useParams } from 'react-router-dom';

export function File(): ReactNode {
  const file = useParams()['*'];
  return <>file: {file}</>;
}
