const { runHarness } = require('../services/codeRunner/harnessRunner');

exports.run = async (req, res) => {
  const { code, language = 'javascript', timeoutMs, entry_point, param_order, testcases } = req.body || {};

  if (!code || typeof code !== 'string' || !code.trim()) {
    return res.status(400).json({
      success: false,
      status: 'EMPTY_CODE',
      output: '',
      error: 'Code cannot be empty',
      executionTimeMs: 0
    });
  }

  if (!entry_point || !Array.isArray(param_order) || !Array.isArray(testcases) || testcases.length === 0) {
    return res.status(400).json({
      status: 'INVALID_RUN_PAYLOAD',
      message: 'For run API, entry_point, param_order, and non-empty testcases are required'
    });
  }

  const result = await runHarness({
    language,
    code,
    entryPoint: entry_point,
    paramOrder: param_order,
    testcases,
    timeoutMs: Number(timeoutMs) > 0 ? Number(timeoutMs) : 5000
  });

  const httpStatus = (() => {
    if (result.status === 'DOCKER_UNAVAILABLE') return 503;
    if (result.status === 'timeout') return 408;
    if (result.status === 'runtime_error') return 500;
    if (result.status === 'INVALID_RUN_PAYLOAD') return 400;
    return 200;
  })();

  return res.status(httpStatus).json(result);
};
