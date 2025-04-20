import {
  defineConfig,
  presetAttributify,
  presetIcons,
  presetTypography,
  presetWebFonts,
  presetWind3,
  transformerDirectives,
  transformerVariantGroup,
} from 'unocss'

export default defineConfig({
  presets: [
    presetWind3(),
    presetAttributify(),
    presetTypography(),
    presetWebFonts({
      fonts: {
        mono: 'DM Mono',
        sans: 'DM Sans',
        serif: 'DM Serif Display',
      },
    }),
    presetIcons({
      scale: 1.2,
    }),
  ],
  safelist: 'prose prose-sm m-auto text-left'.split(' '),
  transformers: [
    transformerDirectives(),
    transformerVariantGroup(),
  ],
})
