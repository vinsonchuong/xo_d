import {Xo} from 'xo'
import formatterPretty from 'eslint-formatter-pretty'

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
  }

  const report = await xo.lintFiles(input)
  if (cliOptions.fix) {
    await Xo.outputFixes(report)
  }

  return log(report)
}
