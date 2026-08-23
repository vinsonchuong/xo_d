import fs from 'node:fs/promises'
import path from 'node:path'
import {Xo} from 'xo'
import formatterPretty from 'eslint-formatter-pretty'
import {pathExists} from 'path-exists'
import findCacheDirectory from 'find-cache-directory'

const cacheDirName = 'xo-linter'
const tsExtensions = new Set(['ts', 'tsx', 'cts', 'mts'])

export default async function run([
  cliOptions,
  linterOptions,
  baseXoConfigOptions,
  input,
  stdin,
]) {
  const xo = new Xo(linterOptions, baseXoConfigOptions)

  const log = async (report) => {
    const reporterName = cliOptions.reporter
    const shouldUsePrettyReporter = reporterName === undefined

    let text

    if (shouldUsePrettyReporter) {
      const counts = {
        errorCount: 0,
        warningCount: 0,
        fixableErrorCount: 0,
        fixableWarningCount: 0,
      }
      for (const result of report.results) {
        counts.errorCount += result.errorCount
        counts.warningCount += result.warningCount
        counts.fixableErrorCount += result.fixableErrorCount
        counts.fixableWarningCount += result.fixableWarningCount
      }

      const formatterMetadata = {
        cwd: linterOptions.cwd,
        ...report,
        ...counts,
      }
      text = formatterPretty(report.results, formatterMetadata)
    } else {
      const reporter = await xo.getFormatter(reporterName)
      text = await reporter.format(report.results)
    }

    const exitCode = report.errorCount === 0 ? 0 : 1

    return `${text}\n# exit ${exitCode}`
  }

  if (cliOptions.stdin) {
    let shouldRemoveStdInFile = false
    // For TypeScript, we need a file on the filesystem to lint it or else @typescript-eslint will blow up.
    // We create a temporary file in the node_modules/.cache/xo-linter directory to avoid conflicts with the user's files and lint that file as if it were the stdin input as a work around.
    // We clean up the file after linting.
    if (
      cliOptions.stdinFilename !== '' &&
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

    try {
      if (linterOptions.fix) {
        const {
          results: [result],
        } = await xo.lintText(stdin, {
          filePath: cliOptions.stdinFilename,
        })
        return result?.output ?? stdin
      }

      return log(
        await xo.lintText(stdin, {
          filePath: cliOptions.stdinFilename,
          warnIgnored: false,
        }),
      )
    } finally {
      if (shouldRemoveStdInFile) {
        await fs.rm(cliOptions.stdinFilename)
      }
    }
  }

  const report = await xo.lintFiles(input)
  if (cliOptions.fix) {
    await Xo.outputFixes(report)
  }

  return log(report)
}
