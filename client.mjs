import process from 'node:process'
import {createRequire} from 'node:module'
import getStdin from 'get-stdin'
import meow from 'meow'
import semver from 'semver'

const require = createRequire(import.meta.url)

export default async function run() {
  process.env.CORE_D_TITLE = 'xo_d'
  process.env.CORE_D_DOTFILE = '.xo_d'
  process.env.CORE_D_SERVICE = require.resolve('./server.js')
  const coreD = require('core_d')

  const xoDCommand = process.argv[2]
  if (
    xoDCommand === 'start' ||
    xoDCommand === 'stop' ||
    xoDCommand === 'restart' ||
    xoDCommand === 'status'
  ) {
    coreD[xoDCommand]()
  } else {
    const {
      input,
      flags: options,
      showVersion,
    } = meow(
      `
      Usage
      $ xo_d [<file|glob> ...]
      $ xo_d [start|stop|status]

      Options
      --fix             Automagically fix issues
      --reporter        Reporter to use
      --env             Environment preset  [Can be set multiple times]
      --global          Global variable  [Can be set multiple times]
      --ignore          Additional paths to ignore  [Can be set multiple times]
      --space           Use space indent instead of tabs  [Default: 2]
      --no-semicolon    Prevent use of semicolons
      --prettier        Conform to Prettier code style
      --node-version    Range of Node.js version to support
      --plugin          Include third-party plugins  [Can be set multiple times]
      --extend          Extend defaults with a custom config  [Can be set multiple times]
      --open            Open files with issues in your editor
      --quiet           Show only errors and no warnings
      --extension       Additional extension to lint [Can be set multiple times]
      --cwd=<dir>       Working directory for files
      --stdin           Validate/fix code from stdin
      --stdin-filename  Specify a filename for the --stdin option
      --print-config    Print the effective ESLint config for the given file

      Examples
      $ xo
      $ xo index.js
      $ xo *.js !foo.js
      $ xo --space
      $ xo --env=node --env=mocha
      $ xo --plugin=react
      $ xo --plugin=html --extension=html
      $ echo 'const x=true' | xo --stdin --fix
      $ xo --print-config=index.js

      Tips
      - Add XO to your project with \`npm init xo\`.
      - Put options in package.json instead of using flags so other tools can read it.
      `,
      {
        importMeta: import.meta,
        autoVersion: false,
        booleanDefault: undefined,
        flags: {
          fix: {
            type: 'boolean',
          },
          reporter: {
            type: 'string',
          },
          env: {
            type: 'string',
            isMultiple: true,
          },
          global: {
            type: 'string',
            isMultiple: true,
          },
          ignore: {
            type: 'string',
            isMultiple: true,
          },
          space: {
            type: 'string',
          },
          semicolon: {
            type: 'boolean',
          },
          prettier: {
            type: 'boolean',
          },
          nodeVersion: {
            type: 'string',
          },
          plugin: {
            type: 'string',
            isMultiple: true,
          },
          extend: {
            type: 'string',
            isMultiple: true,
          },
          open: {
            type: 'boolean',
          },
          quiet: {
            type: 'boolean',
          },
          extension: {
            type: 'string',
            isMultiple: true,
          },
          cwd: {
            type: 'string',
          },
          printConfig: {
            type: 'string',
          },
          stdin: {
            type: 'boolean',
          },
          stdinFilename: {
            type: 'string',
          },
        },
      },
    )

    for (const key in options) {
      if (Array.isArray(options[key]) && options[key].length === 0) {
        delete options[key]
      }
    }

    if (typeof options.space === 'string') {
      if (/^\d+$/u.test(options.space)) {
        options.space = Number.parseInt(options.space, 10)
      } else if (options.space === 'true') {
        options.space = true
      } else if (options.space === 'false') {
        options.space = false
      } else {
        if (options.space !== '') {
          input.push(options.space)
        }

        options.space = true
      }
    }

    if (process.env.GITHUB_ACTIONS && !options.fix && !options.reporter) {
      options.quiet = true
    }

    if (input[0] === '-') {
      options.stdin = true
      input.shift()
    }

    if (options.version) {
      showVersion()
    }

    if (options.nodeVersion) {
      if (options.nodeVersion === 'false') {
        options.nodeVersion = false
      } else if (!semver.validRange(options.nodeVersion)) {
        console.error(
          'The `--node-engine` flag must be a valid semver range (for example `>=6`)',
        )
        process.exit(1)
      }
    }

    if (typeof options.printConfig === 'string') {
      if (input.length > 0 || options.printConfig === '') {
        console.error(
          'The `--print-config` flag must be used with exactly one filename',
        )
        process.exit(1)
      }

      if (options.stdin) {
        console.error('The `--print-config` flag is not supported on stdin')
        process.exit(1)
      }

      options.filePath = options.printConfig

      coreD.invoke([input, options, null])
    } else if (options.stdin) {
      const stdin = await getStdin()

      if (options.stdinFilename) {
        options.filePath = options.stdinFilename
      }

      if (options.fix) {
        return coreD.invoke([input, options, stdin])
      }

      if (options.open) {
        console.error('The `--open` flag is not supported on stdin')
        process.exit(1)
      }

      coreD.invoke([input, options, stdin])
    } else {
      coreD.invoke([input, options, null])
    }
  }
}
