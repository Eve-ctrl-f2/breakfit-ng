import { definePreset } from '@primeng/themes';
import Aura from '@primeng/themes/aura';

/**
 * BreakFit theme preset — "Functional Brutalism".
 *
 * Built on PrimeNG's Aura base in styled mode. We override the primary palette
 * to the locked lime accent (#c8f060) and the surface palette to the near-black
 * stack the React build used (#08080c base). Everything is expressed through
 * design tokens so PrimeNG components (Button, Dialog, Slider, Card, ...) inherit
 * the look automatically — no per-component CSS overrides needed.
 */
export const BreakFitPreset = definePreset(Aura, {
  primitive: {
    lime: {
      50: '#f7fce8',
      100: '#eef9cf',
      200: '#e0f4a8',
      300: '#d4f085',
      400: '#c8f060', // accent
      500: '#aedb3f',
      600: '#8bb52e',
      700: '#688826',
      800: '#4d6322',
      900: '#3d4e20',
      950: '#1f2a0d',
    },
  },
  semantic: {
    primary: {
      50: '{lime.50}',
      100: '{lime.100}',
      200: '{lime.200}',
      300: '{lime.300}',
      400: '{lime.400}',
      500: '{lime.400}',
      600: '{lime.500}',
      700: '{lime.600}',
      800: '{lime.700}',
      900: '{lime.800}',
      950: '{lime.900}',
    },
    // Force the app into permanent dark mode (BreakFit has no light theme).
    colorScheme: {
      dark: {
        primary: {
          color: '{lime.400}',
          contrastColor: '#08080c',
          hoverColor: '{lime.300}',
          activeColor: '{lime.500}',
        },
        surface: {
          0: '#ffffff',
          50: '#f6f6f8',
          100: '#26262e',
          200: '#1d1d24',
          300: '#16161c',
          400: '#121217',
          500: '#0f0f14',
          600: '#0c0c11',
          700: '#0a0a0e',
          800: '#08080c', // app background
          900: '#060609',
          950: '#030305',
        },
        formField: {
          background: '{surface.700}',
          borderColor: '{surface.100}',
          hoverBorderColor: '{surface.50}',
          focusBorderColor: '{primary.color}',
          color: '{surface.0}',
          placeholderColor: '{surface.100}',
        },
        content: {
          background: '{surface.700}',
          borderColor: '{surface.100}',
          color: '{surface.0}',
        },
        text: {
          color: '#f3f3f7',
          mutedColor: '#9a9aa6',
        },
      },
      light: {
        primary: {
          color: '{lime.400}',
          contrastColor: '#08080c',
          hoverColor: '{lime.500}',
          activeColor: '{lime.600}',
        },
        surface: {
          0: '#ffffff',
          50: '#f6f6fa',
          100: '#eeeef3',
          200: '#e2e2ea',
          300: '#d4d4de',
          400: '#bcbcc8',
          500: '#9a9aa6',
          600: '#82828e',
          700: '#54545f',
          800: '#2c2c36',
          900: '#14141a',
          950: '#08080c',
        },
        formField: {
          background: '#ffffff',
          borderColor: '{surface.300}',
          hoverBorderColor: '{surface.400}',
          focusBorderColor: '{primary.color}',
          color: '{surface.900}',
          placeholderColor: '{surface.500}',
        },
        content: {
          background: '#ffffff',
          borderColor: '{surface.200}',
          color: '{surface.900}',
        },
        text: {
          color: '#14141a',
          mutedColor: '#54545f',
        },
      },
    },
  },
  components: {
    button: {
      root: {
        borderRadius: '12px',
        paddingX: '1.1rem',
        paddingY: '0.7rem',
        gap: '0.5rem',
      },
    },
    dialog: {
      root: {
        borderRadius: '20px',
        background: '{content.background}',
      },
    },
    card: {
      root: {
        borderRadius: '16px',
        background: '{content.background}',
      },
    },
  },
});
