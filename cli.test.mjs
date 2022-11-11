import {promises as fs} from 'node:fs'
import {spawn} from 'node:child_process'
import path from 'node:path'
import test from 'ava'
import {useTemporaryDirectory} from 'ava-patterns'
import getStream from 'get-stream'

async function cli(args, {cwd, stdin}) {
  const child = spawn(path.resolve('cli.js'), args, {cwd})

  if (stdin) {
    child.stdin.end(stdin)
  }

  const [exitCode, stdout] = await Promise.all([
    new Promise((resolve) => {
      child.on('exit', resolve)
    }),
    getStream(child.stdout),
  ])

  return {
    exitCode,
    stdout,
  }
}

test.serial('reporting errors', async (t) => {
  const directory = await useTemporaryDirectory(t)
  await directory.writeFile('x.js', 'console.log()')

  const {stdout, exitCode} = await cli(['x.js'], {cwd: directory.path})
  t.regex(stdout, /x\.js/)
  t.regex(stdout, /Missing semicolon/)
  t.is(exitCode, 1)
})

test.serial('fix option', async (t) => {
  const directory = await useTemporaryDirectory(t)
  const filePath = await directory.writeFile('x.js', 'console.log()')

  await cli(['--fix', 'x.js'], {cwd: directory.path})
  t.is(await fs.readFile(filePath, 'utf8'), 'console.log();\n')
})

test.serial('fix option with stdin', async (t) => {
  const directory = await useTemporaryDirectory(t)
  const {stdout} = await cli(['--fix', '--stdin'], {
    cwd: directory.path,
    stdin: 'console.log()',
  })
  t.is(stdout, 'console.log();\n')
})
