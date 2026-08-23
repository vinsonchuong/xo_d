import process from 'node:process'
import {createRequire} from 'node:module'
import path from 'node:path'
import getStdin from 'get-stdin'
import meow from 'meow'

const require = createRequire(import.meta.url)

export default async function run() {
  process.env.CORE_D_TITLE = 'xo_d'
  process.env.CORE_D_DOTFILE = '.xo_d'
  process.env.CORE_D_SERVICE = require.resolve('./server.js')
  const coreD = require('core_d')

  const xoDCommand = process.argv[2]
  if (['start', 'stop', 'restart', 'status'].includes(xoDCommand)) {
    coreD[xoDCommand]()
  } else {
    const cli = meow(
      `
        Usage
          $ xo_d [<file|glob> ...]
          $ xo_d [start|stop|status]

        Options
          --fix                     Automagically fix issues
          --reporter                Reporter to use
          --space                   Use space indent instead of tabs [Default: 2]
          --config                  Path to a XO configuration file
          --semicolon               Use semicolons [Default: true]
          --prettier                Format with prettier or turn off Prettier-conflicted rules when set to 'compat' [Default: false]
          --version                 Print XO version
          --quiet                   Show only errors and no warnings
          --stdin                   Validate/fix code from stdin
          --stdin-filename          Specify a filename for the --stdin option
          --ignore                  Ignore pattern globs, can be set multiple times
          --suppressions-location   Path to a custom ESLint suppressions file
          --cwd=<dir>               Working directory for files [Default: process.cwd()]

        Examples
          $ xo_d
          $ xo_d index.js
          $ xo_d *.js !foo.js
          $ xo_d --space
      `,
      {
        importMeta: import.meta,
        autoVersion: false,
        booleanDefault: undefined,
        flags: {
          fix: {
            type: 'boolean',
            default: false,
          },
          reporter: {
            type: 'string',
          },
          space: {
            type: 'string',
          },
          configPath: {
            type: 'string',
            aliases: ['config'],
          },
          quiet: {
            type: 'boolean',
          },
          semicolon: {
            type: 'boolean',
          },
          prettier: {
            type: 'boolean',
          },
          cwd: {
            type: 'string',
            default: process.cwd(),
          },
          version: {
            type: 'boolean',
          },
          stdin: {
            type: 'boolean',
          },
          stdinFilename: {
            type: 'string',
            default: 'stdin.js',
          },
          ignore: {
            type: 'string',
            isMultiple: true,
            aliases: ['ignores'],
          },
          suppressionsLocation: {
            type: 'string',
          },
        },
      },
    )

    const {input, flags: cliOptions, showVersion} = cli

    const baseXoConfigOptions = {
      space: cliOptions.space,
      semicolon: cliOptions.semicolon,
      prettier: cliOptions.prettier,
      ignores: cliOptions.ignore,
    }

    const linterOptions = {
      fix: cliOptions.fix,
      cwd: cliOptions.cwd === '' ? process.cwd() : path.resolve(cliOptions.cwd),
      quiet: cliOptions.quiet,
      ts: true,
      configPath: cliOptions.configPath,
      suppressionsLocation: cliOptions.suppressionsLocation,
    }

    // Make data types for `options.space` match those of the API
    if (typeof cliOptions.space === 'string') {
      cliOptions.space = cliOptions.space.trim()
      if (/^\d+$/v.test(cliOptions.space)) {
        baseXoConfigOptions.space = Number(cliOptions.space)
      } else if (cliOptions.space === 'true') {
        baseXoConfigOptions.space = true
      } else if (cliOptions.space === 'false') {
        baseXoConfigOptions.space = false
      } else {
        if (cliOptions.space !== '') {
          // Assume `options.space` was set to a filename when run as `xo --space file.js`
          input.push(cliOptions.space)
        }

        baseXoConfigOptions.space = true
      }
    }

    const isGitHubActions = Boolean(process.env.GITHUB_ACTIONS)
    if (
      isGitHubActions &&
      !linterOptions.fix &&
      cliOptions.reporter === undefined
    ) {
      linterOptions.quiet = true
    }

    if (cliOptions.version) {
      showVersion()
    }

    if (cliOptions.stdin) {
      const stdin = await getStdin()

      coreD.invoke([
        cliOptions,
        linterOptions,
        baseXoConfigOptions,
        input,
        stdin,
      ])
    } else {
      coreD.invoke([
        cliOptions,
        linterOptions,
        baseXoConfigOptions,
        input,
        null,
      ])
    }
  }
}
