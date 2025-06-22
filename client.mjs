import process from 'node:process'
import fs from 'node:fs/promises'
import {createRequire} from 'node:module'
import path from 'node:path'
import getStdin from 'get-stdin'
import {pathExists} from 'path-exists'
import findCacheDirectory from 'find-cache-directory'
import meow from 'meow'

const cacheDirName = 'xo-linter'
const tsExtensions = new Set(['ts', 'tsx', 'cts', 'mts'])

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
    const cli = meow(
      `
        Usage
          $ xo_d [<file|glob> ...]
          $ xo_d [start|stop|status]

        Options
          --fix             Automagically fix issues
          --reporter        Reporter to use
          --space           Use space indent instead of tabs [Default: 2]
          --config          Path to a XO configuration file
          --semicolon       Use semicolons [Default: true]
          --react           Include React specific parsing and xo-react linting rules [Default: false]
          --prettier        Format with prettier or turn off prettier conflicted rules when set to 'compat' [Default: false]
          --version         Print XO version
          --quiet           Show only errors and no warnings
          --stdin           Validate/fix code from stdin
          --stdin-filename  Specify a filename for the --stdin option
          --ignore          Ignore pattern globs, can be set multiple times
          --cwd=<dir>       Working directory for files [Default: process.cwd()]

        Examples
          $ xo
          $ xo index.js
          $ xo *.js !foo.js
          $ xo --space
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
          config: {
            type: 'string',
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
          react: {
            type: 'boolean',
            default: false,
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
          open: {
            type: 'boolean',
          },
          ignore: {
            type: 'string',
            isMultiple: true,
            aliases: ['ignores'],
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
      react: cliOptions.react,
    }

    const linterOptions = {
      fix: cliOptions.fix,
      cwd: (cliOptions.cwd && path.resolve(cliOptions.cwd)) ?? process.cwd(),
      quiet: cliOptions.quiet,
      ts: true,
    }

    // Make data types for `options.space` match those of the API
    if (typeof cliOptions.space === 'string') {
      cliOptions.space = cliOptions.space.trim()

      if (/^\d+$/u.test(cliOptions.space)) {
        baseXoConfigOptions.space = Number.parseInt(cliOptions.space, 10)
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

    if (
      process.env.GITHUB_ACTIONS &&
      !linterOptions.fix &&
      !cliOptions.reporter
    ) {
      linterOptions.quiet = true
    }

    if (cliOptions.version) {
      showVersion()
    }

    if (cliOptions.stdin) {
      const stdin = await getStdin()

      let shouldRemoveStdInFile = false

      // For TypeScript, we need a file on the filesystem to lint it or else @typescript-eslint will blow up.
      // We create a temporary file in the node_modules/.cache/xo-linter directory to avoid conflicts with the user's files and lint that file as if it were the stdin input as a work around.
      // We clean up the file after linting.
      if (
        cliOptions.stdinFilename &&
        tsExtensions.has(path.extname(cliOptions.stdinFilename).slice(1))
      ) {
        const absoluteFilePath = path.resolve(
          cliOptions.cwd,
          cliOptions.stdinFilename,
        )
        if (!(await pathExists(absoluteFilePath))) {
          const cacheDir =
            findCacheDirectory({name: cacheDirName, cwd: linterOptions.cwd}) ??
            path.join(cliOptions.cwd, 'node_modules', '.cache', cacheDirName)
          cliOptions.stdinFilename = path.join(
            cacheDir,
            path.basename(absoluteFilePath),
          )
          shouldRemoveStdInFile = true
          baseXoConfigOptions.ignores = [
            '!**/node_modules/**',
            '!node_modules/**',
            '!node_modules/',
            `!${path.relative(cliOptions.cwd, cliOptions.stdinFilename)}`,
          ]
          if (!(await pathExists(path.dirname(cliOptions.stdinFilename)))) {
            await fs.mkdir(path.dirname(cliOptions.stdinFilename), {
              recursive: true,
            })
          }

          await fs.writeFile(cliOptions.stdinFilename, stdin)
        }
      }

      if (cliOptions.fix) {
        return coreD.invoke([
          cliOptions,
          linterOptions,
          baseXoConfigOptions,
          input,
          stdin,
        ])
      }

      coreD.invoke([
        cliOptions,
        linterOptions,
        baseXoConfigOptions,
        input,
        null,
      ])

      if (shouldRemoveStdInFile) {
        await fs.rm(cliOptions.stdinFilename)
      }

      return
    }

    coreD.invoke([cliOptions, linterOptions, baseXoConfigOptions, input, null])
  }
}
