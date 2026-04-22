const childProcess = require('node:child_process');

const originalExec = childProcess.exec;

function createNoopChildProcess() {
  const noop = () => undefined;

  return {
    on: () => createNoopChildProcess(),
    once: () => createNoopChildProcess(),
    stdout: { on: noop, once: noop },
    stderr: { on: noop, once: noop },
  };
}

childProcess.exec = function patchedExec(command, options, callback) {
  if (String(command).trim().toLowerCase() === 'net use') {
    const done = typeof options === 'function' ? options : callback;
    if (done) process.nextTick(() => done(null, '', ''));
    return createNoopChildProcess();
  }

  return originalExec.apply(this, arguments);
};
