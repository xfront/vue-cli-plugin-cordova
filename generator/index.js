module.exports = (api, options, rootOptions) => {
  const fs = require('fs')

  api.extendPackage({
    scripts: {
      'cordova-serve': 'vue-cli-service cordova-serve',
      'cordova-build': 'vue-cli-service build --dest www'
    },
    dependencies: {
      'babel-polyfill': '^6.26.0',
      'cordova-android': '^7.1.0',
      'cordova-browser': '^5.0.3',
      'cordova-ios': '^4.5.4',
      'cordova-plugin-device': '^2.0.1',
      'cordova-plugin-ionic-webview': '^1.2.0',
      'cordova-plugin-splashscreen': '^5.0.2',
      'cordova-plugin-statusbar': '^2.4.2',
      'cordova-plugin-whitelist': '^1.3.3',
      'material-design-icons': '^3.0.1',
      'typeface-roboto': '0.0.54',
      "framework7": "^3.0.0",
      "framework7-icons": "^0.9.1",
      "framework7-vue": "^3.0.0",
    },
    cordova: {
      plugins: {
        'cordova-plugin-device': {},
        'cordova-plugin-ionic-webview': {},
        'cordova-plugin-splashscreen': {},
        'cordova-plugin-statusbar': {},
        'cordova-plugin-whitelist': {}
      },
      platforms: [
        'android',
        'browser',
        'ios'
      ]
    }
  })

  const hasTS = api.hasPlugin('typescript')
  const routerPath = api.resolve(`./src/router.${hasTS ? 'ts' : 'js'}`)
  const hasRouter = fs.existsSync(routerPath)
  api.render('./templates', { hasTS, hasRouter })

  api.postProcessFiles(files => {
    // index.html
    const indexHtml = files['public/index.html']
    if (indexHtml) {
      const lines = indexHtml.split(/\r?\n/g).reverse()
      const lastMetaIndex = lines.findIndex(line => line.match(/\s+<meta/))
      lines[lastMetaIndex] +=
        `\n    <!-- TODO: You should modify CSP for production build -->` +
        `\n    <meta http-equiv="Content-Security-Policy" content="default-src gap: data: 'unsafe-inline' 'unsafe-eval' *">`
      files['public/index.html'] = lines.reverse().join('\n')
    }
    // main.js
    const isTS = 'src/main.ts' in files
    const mainFile = `src/main.${isTS ? 'ts' : 'js'}`
    const main = files[mainFile]
    if (main) {
      const lines = main.split(/\r?\n/g).reverse()
      const topIndex = lines.length - 1
      lines[topIndex] =
        `import 'typeface-roboto';\n` +
        `import 'material-design-icons/iconfont/material-icons.css';\n` +
        `import 'framework7/css/framework7.css';\n` +
        `import 'babel-polyfill';\n` +
        lines[topIndex]
      const lastImportIndex = lines.findIndex(line => line.match(/^import/))
      lines[lastImportIndex] +=
        `\nimport cordovaLoader from './cordovaLoader';` +
        `\nimport Framework7 from 'framework7/framework7.esm.bundle.js';`+
        `\nimport Framework7Vue from 'framework7-vue/framework7-vue.esm.bundle.js'`
      const startAt = lines[0] === '' ? 1 : 0
      const declareVueIndex = lines.findIndex(line => line.match(/new Vue/))
      for (let i = startAt; i <= declareVueIndex; i++) {
        if (i === startAt) {
          lines[i] = `  ${lines[i]}\n});`
        } else if (i === declareVueIndex) {
          lines[i] = `Framework7.use(Framework7Vue);\n\ncordovaLoader(() => {\n  ${lines[i]}`
        } else {
          lines[i] = `  ${lines[i]}`
        }
      }
      files[mainFile] = lines.reverse().join('\n')
    }
    // cordovaLoarder.js
    if (isTS) {
      const loader = 'src/cordovaLoader'
      const content = files[`${loader}.js`]
      files[`${loader}.ts`] = content
      delete files[`${loader}.js`]
    }
  })

  api.onCreateComplete(() => {
    // .gitignore - not included in files on postProcessFiles
    const ignorePath = api.resolve('.gitignore')
    const ignore = fs.existsSync(ignorePath)
      ? fs.readFileSync(ignorePath, 'utf-8')
      : ''
    fs.writeFileSync(ignorePath, ignore + '\n# Cordova\n/www\n/platforms\n/plugins\n')

    // create symlinks
    fs.symlinkSync('../platforms', './public/cordova', 'dir')
    fs.symlinkSync('../platforms/browser/www/config.xml', './public/config.xml')
  })
}

