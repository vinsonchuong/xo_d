#!/usr/bin/env node
;(async function () {
  const {default: run} = await import('./client.mjs')
  await run()
})()
