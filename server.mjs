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
    const reporter = cliOptions.reporter
      ? await new Xo(linterOptions, baseXoConfigOptions).getFormatter(
          cliOptions.reporter,
        )
      : {format: formatterPretty}

    const text = reporter.format(report.results, {
      cwd: linterOptions.cwd,
      ...report,
    })
    const exitCode = report.errorCount === 0 ? 0 : 1

    return `${text}\n# exit ${exitCode}`
  }

  if (cliOptions.stdin) {
    if (cliOptions.fix) {
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
