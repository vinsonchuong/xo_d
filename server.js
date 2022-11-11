const process = require('node:process')

exports.invoke = async (cwd, args, text, callback) => {
  try {
    process.chdir(cwd)
    const {default: run} = await import('./server.mjs')
    if (args[0] === '--no-color') {
      args = args.slice(1)
    }

    const output = await run(args)

    return callback(null, output)
  } catch (error) {
    callback(error, 'FAILURE')
  }
}
