import process from 'node:process'
import xo from 'xo'
import formatterPretty from 'eslint-formatter-pretty'
import openReport from 'xo/lib/open-report.js'

async function log(report, options) {
  const reporter =
    options.reporter || process.env.GITHUB_ACTIONS
      ? await xo.getFormatter(options.reporter || 'compact')
      : formatterPretty

  const text = reporter(report.results, {rulesMeta: report.rulesMeta})
  const exitCode = report.errorCount === 0 ? 0 : 1
  return `${text}\n# exit ${exitCode}`
}

export default async function ([input, options, stdin]) {
  if (typeof options.printConfig === 'string') {
    options.filePath = options.printConfig
    const config = await xo.getConfig(options)
    return JSON.stringify(config, undefined, '\t')
  }

  if (options.stdin) {
    if (options.fix) {
      const {
        results: [result],
      } = await xo.lintText(stdin, options)
      return (result && result.output) || stdin
    }

    return log(await xo.lintText(stdin, options), options)
  }

  const report = await xo.lintFiles(input, options)

  if (options.fix) {
    await xo.outputFixes(report)
  }

  if (options.open) {
    openReport(report)
  }

  return log(report, options)
}
