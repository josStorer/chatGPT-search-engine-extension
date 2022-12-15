import archiver from 'archiver'
import fs from 'fs-extra'
import path from 'path'
import webpack from 'webpack'
import ProgressBarPlugin from 'progress-bar-webpack-plugin'
import CssMinimizerPlugin from 'css-minimizer-webpack-plugin'
import MiniCssExtractPlugin from 'mini-css-extract-plugin'
import TerserPlugin from 'terser-webpack-plugin'

const outdir = 'build'

const __dirname = path.resolve()

async function deleteOldDir() {
  await fs.rm(outdir, { recursive: true, force: true })
}

async function runWebpack(callback) {
  webpack({
    entry: {
      'content-script': './src/content-script/index.jsx',
      background: './src/background/index.mjs',
      popup: './src/popup/index.jsx',
    },
    output: {
      filename: '[name].js',
      path: path.resolve(__dirname, outdir),
    },
    mode: 'production',
    optimization: {
      minimizer: [
        new TerserPlugin({
          terserOptions: {
            output: { ascii_only: true },
          },
        }),
        new CssMinimizerPlugin(),
      ],
    },
    plugins: [
      new ProgressBarPlugin({
        format: '  build [:bar] :percent (:elapsed seconds)',
        clear: false,
      }),
      new MiniCssExtractPlugin({
        filename: '[name].css',
      }),
    ],
    resolve: {
      extensions: ['.jsx', '.mjs', '.js'],
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
                presets: ['@babel/preset-env'],
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
  }).run(callback)
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
  await fs.mkdir(targetDir)
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

    const commonFiles = [
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

    await zipFolder(`./${outdir}/chromium`)

    // firefox
    await copyFiles(
      [...commonFiles, { src: 'src/manifest.v2.json', dst: 'manifest.json' }],
      `./${outdir}/firefox`,
    )

    await zipFolder(`./${outdir}/firefox`)
  })
}

build()
