#!/usr/bin/env node

const requiredMajor = 20;
const requiredMinor = 19;
const current = process.versions.node;
const [majorText, minorText] = current.split('.');
const major = Number(majorText);
const minor = Number(minorText ?? '0');

if (major < requiredMajor || (major === requiredMajor && minor < requiredMinor)) {
  console.error('');
  console.error('Unsupported Node.js version');
  console.error(`Required: ${requiredMajor}.${requiredMinor}+`);
  console.error(`Current:  ${current}`);
  console.error('');
  console.error('This project depends on Vite 8 / Rolldown, which requires a modern Node.js runtime.');
  console.error('Please switch to a supported version (for example with nvm or fnm) and run the command again.');
  console.error('');
  process.exit(1);
}

console.log(`Node.js ${current} is supported.`);
