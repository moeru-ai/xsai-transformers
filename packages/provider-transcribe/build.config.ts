import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  externals: [
    'onnxruntime-common',
  ],
  rollup: {
    inlineDependencies: true,
  },
})
