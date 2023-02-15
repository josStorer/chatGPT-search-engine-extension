import archiver from 'archiver'
import fs from 'fs-extra'
import path from 'path'
import webpack from 'webpack'
import ProgressBarPlugin from 'progress-bar-webpack-plugin'
import CssMinimizerPlugin from 'css-minimizer-webpack-plugin'
import MiniCssExtractPlugin from 'mini-css-extract-plugin'
import TerserPlugin from 'terser-webpack-plugin'
import { BundleAnalyzerPlugin } from 'webpack-bundle-analyzer'

const outdir = 'build'

const __dirname = path.resolve()
const isProduction = process.argv[2] !== '--development' // --production and --analyze are both production
const isAnalyzing = process.argv[2] === '--analyze'

async function deleteOldDir() {
  await fs.rm(outdir, { recursive: true, force: true })
}

async function runWebpack(callback) {
  const compiler = webpack({
    entry: {
      'content-script': {
        import: './src/content-script/index.jsx',
        dependOn: 'shared',
      },
      background: {
        import: './src/background/index.mjs',
      },
      popup: {
        import: './src/popup/index.jsx',
        dependOn: 'shared',
      },
      shared: ['preact', 'webextension-polyfill', '@primer/octicons-react'],
    },
    output: {
      filename: '[name].js',
      path: path.resolve(__dirname, outdir),
    },
    mode: isProduction ? 'production' : 'development',
    devtool: false,
    optimization: {
      minimizer: [
        new TerserPlugin({
          terserOptions: {
            output: { ascii_only: true },
          },
        }),
        new CssMinimizerPlugin(),
      ],
      concatenateModules: !isAnalyzing,
    },
    plugins: [
      new ProgressBarPlugin({
        format: '  build [:bar] :percent (:elapsed seconds)',
        clear: false,
      }),
      new MiniCssExtractPlugin({
        filename: '[name].css',
      }),
      new BundleAnalyzerPlugin({
        analyzerMode: isAnalyzing ? 'static' : 'disable',
      }),
    ],
    resolve: {
      extensions: ['.jsx', '.mjs', '.js'],
      alias: {
        parse5: path.resolve(__dirname, 'node_modules/parse5'),
      },
    },
    module: {
      rules: [
        {
          test: /\.m?jsx?$/,
          exclude: /(node_modules)/,
          use: [
            {
              loader: 'babel-loader',
              options: {
                presets: [
                  '@babel/preset-env',
                  {
                    plugins: ['@babel/plugin-transform-runtime'],
                  },
                ],
                plugins: [
                  [
                    '@babel/plugin-transform-react-jsx',
                    {
                      runtime: 'automatic',
                      importSource: 'preact',
                    },
                  ],
                ],
              },
            },
          ],
        },
        {
          test: /\.s[ac]ss$/,
          use: [
            MiniCssExtractPlugin.loader,
            {
              loader: 'css-loader',
              options: {
                importLoaders: 1,
              },
            },
            {
              loader: 'sass-loader',
            },
          ],
        },
        {
          test: /\.less$/,
          use: [
            MiniCssExtractPlugin.loader,
            {
              loader: 'css-loader',
              options: {
                importLoaders: 1,
              },
            },
            {
              loader: 'less-loader',
            },
          ],
        },
        {
          test: /\.css$/,
          use: [
            MiniCssExtractPlugin.loader,
            {
              loader: 'css-loader',
            },
          ],
        },
        {
          test: /\.(woff|ttf)$/,
          type: 'asset/resource',
          generator: {
            emit: false,
          },
        },
        {
          test: /\.woff2$/,
          type: 'asset/inline',
        },
      ],
    },
  })
  if (isProduction) compiler.run(callback)
  else compiler.watch({}, callback)
}

async function zipFolder(dir) {
  const output = fs.createWriteStream(`${dir}.zip`)
  const archive = archiver('zip', {
    zlib: { level: 9 },
  })
  archive.pipe(output)
  archive.directory(dir, false)
  await archive.finalize()
}

async function copyFiles(entryPoints, targetDir) {
  if (!fs.existsSync(targetDir)) await fs.mkdir(targetDir)
  await Promise.all(
    entryPoints.map(async (entryPoint) => {
      await fs.copy(entryPoint.src, `${targetDir}/${entryPoint.dst}`)
    }),
  )
}

async function build() {
  await deleteOldDir()
  await runWebpack(async (err, stats) => {
    if (err || stats.hasErrors()) {
      console.error(err || stats.toString())
      return
    }
    // console.log(stats.toString())

    const commonFiles = [
      { src: 'build/shared.js', dst: 'shared.js' },
      { src: 'build/content-script.js', dst: 'content-script.js' },
      { src: 'build/content-script.css', dst: 'content-script.css' },
      { src: 'build/background.js', dst: 'background.js' },
      { src: 'build/popup.js', dst: 'popup.js' },
      { src: 'build/popup.css', dst: 'popup.css' },
      { src: 'src/popup/index.html', dst: 'popup.html' },
      { src: 'src/logo.png', dst: 'logo.png' },
    ]

    // chromium
    await copyFiles(
      [...commonFiles, { src: 'src/manifest.json', dst: 'manifest.json' }],
      `./${outdir}/chromium`,
    )

    if (isProduction) await zipFolder(`./${outdir}/chromium`)

    // firefox
    await copyFiles(
      [...commonFiles, { src: 'src/manifest.v2.json', dst: 'manifest.json' }],
      `./${outdir}/firefox`,
    )

    if (isProduction) await zipFolder(`./${outdir}/firefox`)
  })
}

build()
