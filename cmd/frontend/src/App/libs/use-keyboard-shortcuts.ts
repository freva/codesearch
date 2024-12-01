import { useNavigate } from 'react-router-dom';
import { useLayoutEffect } from 'react';

export function useKeyboardShortcuts(): void {
  const navigate = useNavigate();
  useLayoutEffect(() => {}, [navigate]);
}

/*
Esc = select selected hit or Search button if no hits
o/O = open file
b/B = Git blame
d = Filter out selected file
D = Filter out selected file extension
g/G = Open in GitHub
h/H = Open file history in GitHub
n/p = Select next/previous file
r = Reset filters

J + c = Enter '(class|interface) ClassName' in search with 'ClassName' selected
J + f = Enter '\.java$' in file search
J + q = (J + f) + q

 */
