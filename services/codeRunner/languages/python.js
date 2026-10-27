const fs = require('fs/promises');
const path = require('path');
const {
  createTempWorkspace,
  cleanupWorkspace,
  runDockerCommand
} = require('../dockerExecutor');
const { normalizeOutput, buildRuntimeError } = require('../languageUtils');

const IMAGE = process.env.CODE_RUNNER_IMAGE_PYTHON || 'python:3.11';

const runPython = async ({ code, input = '', expectedOutput, timeoutMs = 3000 }) => {
  if (!code || !String(code).trim()) {
    return {
      status: 'EMPTY_CODE',
      output: '',
      error: 'Code cannot be empty',
      executionTimeMs: 0
    };
  }

  const workspacePath = await createTempWorkspace();
  const filePath = path.join(workspacePath, 'main.py');

  try {
    await fs.writeFile(filePath, String(code), 'utf8');

    const syntaxCheck = await runDockerCommand({
      workspacePath,
      image: IMAGE,
      commandArgs: ['python', '-c', "import py_compile; py_compile.compile('/workspace/main.py', cfile='/tmp/main.pyc', doraise=True)"],
      timeoutMs: Math.min(timeoutMs, 2000)
    });

    if (syntaxCheck.timeout) {
      return {
        status: 'TIME_LIMIT_EXCEEDED',
        output: syntaxCheck.stdout.trim(),
        error: 'Time Limit Exceeded',
        executionTimeMs: syntaxCheck.executionTimeMs
      };
    }

    if (syntaxCheck.error) {
      if (syntaxCheck.dockerMissing) {
        return {
          status: 'DOCKER_UNAVAILABLE',
          output: '',
          error: syntaxCheck.error,
          executionTimeMs: syntaxCheck.executionTimeMs
        };
      }

      return {
        status: 'RUNTIME_ERROR',
        output: syntaxCheck.stdout.trim(),
        error: syntaxCheck.error,
        executionTimeMs: syntaxCheck.executionTimeMs
      };
    }

    if (syntaxCheck.exitCode !== 0) {
      return {
        status: 'SYNTAX_ERROR',
        output: syntaxCheck.stdout.trim(),
        error: buildRuntimeError(syntaxCheck.stderr),
        executionTimeMs: syntaxCheck.executionTimeMs
      };
    }

    const execution = await runDockerCommand({
      workspacePath,
      image: IMAGE,
      commandArgs: ['python', '/workspace/main.py'],
      stdin: input,
      timeoutMs
    });

    if (execution.timeout) {
      return {
        status: 'TIME_LIMIT_EXCEEDED',
        output: execution.stdout.trim(),
        error: 'Time Limit Exceeded',
        executionTimeMs: execution.executionTimeMs
      };
    }

    if (execution.error) {
      if (execution.dockerMissing) {
        return {
          status: 'DOCKER_UNAVAILABLE',
          output: '',
          error: execution.error,
          executionTimeMs: execution.executionTimeMs
        };
      }

      return {
        status: 'RUNTIME_ERROR',
        output: execution.stdout.trim(),
        error: execution.error,
        executionTimeMs: execution.executionTimeMs
      };
    }

    if (execution.exitCode !== 0) {
      return {
        status: 'RUNTIME_ERROR',
        output: execution.stdout.trim(),
        error: buildRuntimeError(execution.stderr),
        executionTimeMs: execution.executionTimeMs
      };
    }

    const output = execution.stdout.replace(/\r\n/g, '\n');

    if (expectedOutput !== undefined && expectedOutput !== null) {
      const actual = normalizeOutput(output);
      const expected = normalizeOutput(expectedOutput);

      if (actual !== expected) {
        return {
          status: 'WRONG_ANSWER',
          output: output.trim(),
          error: `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`,
          executionTimeMs: execution.executionTimeMs
        };
      }
    }

    return {
      status: 'ACCEPTED',
      output: output.trim(),
      error: null,
      executionTimeMs: execution.executionTimeMs
    };
  } catch (error) {
    return {
      status: 'RUNTIME_ERROR',
      output: '',
      error: error.message,
      executionTimeMs: 0
    };
  } finally {
    await cleanupWorkspace(workspacePath);
  }
};

module.exports = {
  runPython
};
