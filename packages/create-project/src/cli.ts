#!/usr/bin/env bun

import { main } from './index.js';

const exitCode = await main(process.argv.slice(2));
process.exitCode = exitCode;
