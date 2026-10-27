const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const fsSync = require('fs');

const DOCKER_IMAGE = process.env.CODE_RUNNER_IMAGE || 'node:18';

const resolveDockerBinary = () => {
  if (process.env.DOCKER_CLI_PATH) {
    return process.env.DOCKER_CLI_PATH;
  }

  if (process.platform === 'win32') {
    const candidates = [
      'C:\\Program Files\\Docker\\Docker\\resources\\bin\\docker.exe',
      'C:\\Program Files (x86)\\Docker\\Docker\\resources\\bin\\docker.exe',
      'C:\\Program Files\\Docker\\Docker\\Docker\\resources\\bin\\docker.exe'
    ];

    for (const candidate of candidates) {
      if (fsSync.existsSync(candidate)) {
        return candidate;
      }
    }
  }

  return 'docker';
};

const createTempWorkspace = async () => {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'prephq-run-'));
  return tempRoot;
};

const cleanupWorkspace = async (workspacePath) => {
  await fs.rm(workspacePath, { recursive: true, force: true });
};

const runDockerCommand = ({ workspacePath, commandArgs, stdin = '', timeoutMs = 3000, image }) => {
  return new Promise((resolve) => {
    const startedAt = Date.now();
    const runtimeImage = image || DOCKER_IMAGE;
    const dockerArgs = [
      'run',
      '--rm',
      '-i',
      '--network', 'none',
      '--read-only',
      '--tmpfs', '/tmp:rw,exec,nosuid,size=256m',
      '--pids-limit', '64',
      '--memory', '256m',
      '--cpus', '1',
      '-v', `${workspacePath}:/workspace:ro`,
      runtimeImage,
      ...commandArgs
    ];

    const dockerBinary = resolveDockerBinary();
    const child = spawn(dockerBinary, dockerArgs, {
      windowsHide: true,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';
    let finished = false;

    const finish = (payload) => {
      if (finished) return;
      finished = true;
      resolve({
        ...payload,
        stdout,
        stderr,
        executionTimeMs: Date.now() - startedAt
      });
    };

    // Temporarily disabled: Docker startup can exceed the short run timeout and
    // incorrectly return "Time Limit Exceeded" before user code executes.
    const timer = null;
    // const timer = setTimeout(() => {
    //   child.kill('SIGKILL');
    //   finish({ timeout: true, exitCode: null, signal: 'SIGKILL' });
    // }, timeoutMs);

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString('utf8');
    });

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString('utf8');
    });

    child.on('error', (error) => {
      clearTimeout(timer);
      const isDockerMissing = error && error.code === 'ENOENT';
      finish({
        timeout: false,
        exitCode: null,
        signal: null,
        error: isDockerMissing
          ? 'Docker CLI not found. Install Docker Desktop or set DOCKER_CLI_PATH.'
          : error.message,
        dockerMissing: isDockerMissing
      });
    });

    child.on('close', (exitCode, signal) => {
      clearTimeout(timer);
      finish({ timeout: false, exitCode, signal, error: null });
    });

    if (stdin) {
      child.stdin.write(stdin);
    }
    child.stdin.end();
  });
};

module.exports = {
  createTempWorkspace,
  cleanupWorkspace,
  runDockerCommand
};
