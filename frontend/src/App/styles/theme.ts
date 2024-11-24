import { createTheme, rem } from '@mantine/core';

export const fontWeightLight = '300';
export const fontWeightRegular = '400';
export const fontWeightBold = '600';

export const theme = createTheme({
  black: '#000',
  white: '#fff',
  primaryColor: 'green',
  defaultRadius: 'xs',
  cursorType: 'pointer',
  fontFamily: 'Lato, sans-serif',
  fontSizes: {
    xs: rem(11),
    sm: rem(12),
    md: rem(13),
    lg: rem(16),
    xl: rem(21),
  },
  radius: {
    xs: rem(5),
    sm: rem(8),
    md: rem(13),
    lg: rem(21),
    xl: rem(34),
  },
  spacing: {
    xs: rem(5),
    sm: rem(8),
    md: rem(13),
    lg: rem(21),
    xl: rem(34),
  },
  lineHeights: {
    xs: '1.5',
    sm: '1.5',
    md: '1.5',
    lg: '1.5',
    xl: '1.5',
  },
  headings: {
    fontFamily: 'Lato, sans-serif',
    sizes: {
      h1: {
        fontSize: '1.3333rem',
        lineHeight: '1',
        fontWeight: fontWeightBold,
      },
      h2: {
        fontSize: '1.1875rem',
        lineHeight: '1',
        fontWeight: fontWeightRegular,
      },
      h3: {
        fontSize: '1.1042rem',
        lineHeight: '1',
        fontWeight: fontWeightRegular,
      },
      h4: {
        fontSize: '1.0417rem',
        lineHeight: '1',
        fontWeight: fontWeightBold,
      },
      h5: {
        fontSize: '1rem',
        lineHeight: '1',
        fontWeight: fontWeightBold,
      },
      h6: {
        fontSize: '0.9375rem',
        lineHeight: '1',
        fontWeight: fontWeightBold,
      },
    },
  },
});
