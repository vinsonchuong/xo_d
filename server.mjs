import process from 'node:process'
import xo from 'xo'
import formatterPretty from 'eslint-formatter-pretty'
import openReport from 'xo/lib/open-report.js'

function log(report, options) {
  const reporter =
    options.reporter || process.env.GITHUB_ACTIONS
      ? xo.getFormatter(options.reporter || 'compact')
      : formatterPretty

  const text = reporter(report.results, {rulesMeta: report.rulesMeta})
  const exitCode = report.errorCount === 0 ? 0 : 1
  return `${text}\n# exit ${exitCode}`
}

export default async function run([input, options, stdin]) {
  if (typeof options.printConfig === 'string') {
    options.filePath = options.printConfig
    const config = await xo.getConfig(options)
    return JSON.stringify(config, undefined, '\t')
  }

  if (options.stdin) {
    if (options.fix) {
      const {
        results: [result],
      } = xo.lintText(stdin, options)
      return (result && result.output) || stdin
    }

    return log(xo.lintText(stdin, options), options)
  }

  const report = await xo.lintFiles(input, options)

  if (options.fix) {
    xo.outputFixes(report)
  }

  if (options.open) {
    openReport(report)
  }

  return log(report, options)
}
