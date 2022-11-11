# xo_d
[![npm](https://img.shields.io/npm/v/@vinsonchuong/xo_d.svg)](https://www.npmjs.com/package/@vinsonchuong/xo_d)
[![CI Status](https://github.com/vinsonchuong/xo_d/workflows/CI/badge.svg)](https://github.com/vinsonchuong/xo_d/actions?query=workflow%3ACI)
[![dependencies Status](https://david-dm.org/vinsonchuong/xo_d/status.svg)](https://david-dm.org/vinsonchuong/xo_d)
[![devDependencies Status](https://david-dm.org/vinsonchuong/xo_d/dev-status.svg)](https://david-dm.org/vinsonchuong/xo_d?type=dev)

Speed up [xo](https://github.com/xojs/xo) in the same way as
[eslint_d](https://github.com/mantoni/eslint_d.js)

## Usage
Install [xo_d](https://www.npmjs.com/package/@vinsonchuong/xo_d)
by running:

```sh
yarn add @vinsonchuong/xo_d
```

`xo_d` is a drop-in replacement for `xo` that maintains a warmed-up background
process to speed up linting.

In addition to supporting the full interface of `xo`, `xo_d` provides:

- `xo_d start` to warm-up a background process. This does not need to be run
  in advance. A background process will otherwise be started on first usage.
- `xo_d stop` to stop the background process.
- `xo_d status` to see if a background process is running.
