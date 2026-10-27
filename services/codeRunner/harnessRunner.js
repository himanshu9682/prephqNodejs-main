const fs = require('fs/promises');
const path = require('path');
const {
  createTempWorkspace,
  cleanupWorkspace,
  runDockerCommand
} = require('./dockerExecutor');
const { normalizeOutput } = require('./languageUtils');

const IMAGE_JS = process.env.CODE_RUNNER_IMAGE_HARNESS_JS || 'node:18';
const IMAGE_PY = process.env.CODE_RUNNER_IMAGE_HARNESS_PY || 'python:3.11';
const IMAGE_JAVA = process.env.CODE_RUNNER_IMAGE_HARNESS_JAVA || 'eclipse-temurin:17-jdk';
const IMAGE_CPP = process.env.CODE_RUNNER_IMAGE_HARNESS_CPP || process.env.CODE_RUNNER_IMAGE_CPP || 'gcc:13';

const LANGS = {
  javascript: 'js',
  js: 'js',

  python: 'py',
  py: 'py',

  java: 'java',

  cpp: 'cpp',
  cplusplus: 'cpp',
  cxx: 'cpp',
  'c++': 'cpp'
};



const buildJSHarness = (code, entryPoint, paramOrder, rawTestcases) => {
  const raw = JSON.stringify(rawTestcases);
  return `${code}\n\n(function () {\n  const ENTRY = ${JSON.stringify(entryPoint)};\n  const PARAM_ORDER = ${JSON.stringify(paramOrder)};\n  const RAW_TESTCASES = ${raw};\n\n  const fn = (typeof globalThis[ENTRY] === 'function') ? globalThis[ENTRY] : (typeof eval(ENTRY) === 'function' ? eval(ENTRY) : null);\n  const results = [];\n\n  for (const raw of RAW_TESTCASES) {\n    try {\n      const args = PARAM_ORDER.map(k => JSON.parse(raw[k]));\n      const t0 = process.hrtime.bigint();\n      const out = fn(...args);\n      const t1 = process.hrtime.bigint();\n      results.push({\n        output: JSON.stringify(out === undefined ? null : out),\n        runtime_ms: Number(t1 - t0) / 1e6,\n        error: null\n      });\n    } catch (e) {\n      results.push({ output: null, runtime_ms: 0, error: String(e && e.message || e) });\n    }\n  }\n  console.log('__JUDGE__' + JSON.stringify(results));\n})();\n`;
};

const buildPyHarness = (code, entryPoint, paramOrder, rawTestcases) => {
  const raw = JSON.stringify(rawTestcases);
  return `${code}\n\nimport json, time, traceback\n\nENTRY = ${JSON.stringify(entryPoint)}\nPARAM_ORDER = ${JSON.stringify(paramOrder)}\nRAW_TESTCASES = ${raw}\n\nfn = globals().get(ENTRY)\nresults = []\nfor raw in RAW_TESTCASES:\n    try:\n        args = [json.loads(raw[k]) for k in PARAM_ORDER]\n        start = time.perf_counter()\n        out = fn(*args)\n        ms = (time.perf_counter() - start) * 1000\n        results.append({\n            'output': json.dumps(out, separators=(',', ':')) if out is not None else json.dumps(None),\n            'runtime_ms': round(ms, 3),\n            'error': None\n        })\n    except Exception as e:\n        results.append({'output': None, 'runtime_ms': 0, 'error': str(e)})\n\nprint('__JUDGE__' + json.dumps(results))\n`;
};

const javaStringLiteral = (value) => JSON.stringify(String(value))
  .replace(/\u2028/g, '\\u2028')
  .replace(/\u2029/g, '\\u2029');

// Java harness: 
const buildJavaHarness = (code, entryPoint, paramOrder, rawTestcases) => {
  const raw = rawTestcases.map(testcase => paramOrder.map(key => String(testcase[key])));
  return `
import java.lang.reflect.*;
import java.util.*;

${code}

public class Main {
  static final String ENTRY = ${javaStringLiteral(entryPoint)};
  static final String[][] RAW_TESTCASES = new String[][] {
${raw.map(args => `    new String[] { ${args.map(javaStringLiteral).join(', ')} }`).join(',\n')}
  };

  static class JsonParser {
    private final String s;
    private int i = 0;

    JsonParser(String s) {
      this.s = s == null ? "null" : s.trim();
    }

    Object parse() {
      Object value = parseValue();
      skipWhitespace();
      return value;
    }

    private Object parseValue() {
      skipWhitespace();
      if (i >= s.length()) return null;
      char c = s.charAt(i);
      if (c == '"') return parseString();
      if (c == '[') return parseArray();
      if (c == '{') return parseObject();
      if (s.startsWith("true", i)) { i += 4; return Boolean.TRUE; }
      if (s.startsWith("false", i)) { i += 5; return Boolean.FALSE; }
      if (s.startsWith("null", i)) { i += 4; return null; }
      return parseNumber();
    }

    private String parseString() {
      StringBuilder out = new StringBuilder();
      i++;
      while (i < s.length()) {
        char c = s.charAt(i++);
        if (c == '"') break;
        if (c != '\\\\') {
          out.append(c);
          continue;
        }
        char esc = s.charAt(i++);
        switch (esc) {
          case '"': out.append('"'); break;
          case '\\\\': out.append('\\\\'); break;
          case '/': out.append('/'); break;
          case 'b': out.append('\\b'); break;
          case 'f': out.append('\\f'); break;
          case 'n': out.append('\\n'); break;
          case 'r': out.append('\\r'); break;
          case 't': out.append('\\t'); break;
          case 'u':
            out.append((char) Integer.parseInt(s.substring(i, i + 4), 16));
            i += 4;
            break;
          default:
            out.append(esc);
        }
      }
      return out.toString();
    }

    private List<Object> parseArray() {
      List<Object> out = new ArrayList<>();
      i++;
      skipWhitespace();
      if (i < s.length() && s.charAt(i) == ']') { i++; return out; }
      while (i < s.length()) {
        out.add(parseValue());
        skipWhitespace();
        if (i < s.length() && s.charAt(i) == ',') { i++; continue; }
        if (i < s.length() && s.charAt(i) == ']') { i++; break; }
      }
      return out;
    }

    private Map<String, Object> parseObject() {
      Map<String, Object> out = new LinkedHashMap<>();
      i++;
      skipWhitespace();
      if (i < s.length() && s.charAt(i) == '}') { i++; return out; }
      while (i < s.length()) {
        String key = parseString();
        skipWhitespace();
        if (i < s.length() && s.charAt(i) == ':') i++;
        out.put(key, parseValue());
        skipWhitespace();
        if (i < s.length() && s.charAt(i) == ',') { i++; continue; }
        if (i < s.length() && s.charAt(i) == '}') { i++; break; }
      }
      return out;
    }

    private Number parseNumber() {
      int start = i;
      while (i < s.length() && "-+0123456789.eE".indexOf(s.charAt(i)) >= 0) i++;
      String n = s.substring(start, i);
      if (n.indexOf('.') >= 0 || n.indexOf('e') >= 0 || n.indexOf('E') >= 0) return Double.parseDouble(n);
      long value = Long.parseLong(n);
      return value >= Integer.MIN_VALUE && value <= Integer.MAX_VALUE ? (int) value : value;
    }

    private void skipWhitespace() {
      while (i < s.length() && Character.isWhitespace(s.charAt(i))) i++;
    }
  }

  static Object convert(Object value, Class<?> target) {
    if (value == null) return null;
    if (target == Object.class) return value;
    if (target == String.class) return String.valueOf(value);
    if (target == int.class || target == Integer.class) return ((Number) value).intValue();
    if (target == long.class || target == Long.class) return ((Number) value).longValue();
    if (target == double.class || target == Double.class) return ((Number) value).doubleValue();
    if (target == float.class || target == Float.class) return ((Number) value).floatValue();
    if (target == boolean.class || target == Boolean.class) return value;
    if (target.isArray()) {
      List<?> list = (List<?>) value;
      Class<?> component = target.getComponentType();
      Object arr = Array.newInstance(component, list.size());
      for (int i = 0; i < list.size(); i++) {
        Array.set(arr, i, convert(list.get(i), component));
      }
      return arr;
    }
    if (List.class.isAssignableFrom(target)) return value;
    return value;
  }

  static Method findMethod() {
    for (Method method : Solution.class.getDeclaredMethods()) {
      if (method.getName().equals(ENTRY) && method.getParameterCount() == RAW_TESTCASES[0].length) {
        method.setAccessible(true);
        return method;
      }
    }
    throw new RuntimeException("Method not found: " + ENTRY);
  }

  static String toJson(Object value) {
    if (value == null) return "null";
    Class<?> type = value.getClass();
    if (type == String.class || type == Character.class) return quote(String.valueOf(value));
    if (value instanceof Number || value instanceof Boolean) return String.valueOf(value);
    if (type.isArray()) {
      int length = Array.getLength(value);
      List<String> parts = new ArrayList<>();
      for (int i = 0; i < length; i++) parts.add(toJson(Array.get(value, i)));
      return "[" + String.join(",", parts) + "]";
    }
    if (value instanceof Iterable) {
      List<String> parts = new ArrayList<>();
      for (Object item : (Iterable<?>) value) parts.add(toJson(item));
      return "[" + String.join(",", parts) + "]";
    }
    if (value instanceof Map) {
      List<String> parts = new ArrayList<>();
      for (Object entryObj : ((Map<?, ?>) value).entrySet()) {
        Map.Entry<?, ?> entry = (Map.Entry<?, ?>) entryObj;
        parts.add(quote(String.valueOf(entry.getKey())) + ":" + toJson(entry.getValue()));
      }
      return "{" + String.join(",", parts) + "}";
    }
    return quote(String.valueOf(value));
  }

  static String quote(String value) {
    StringBuilder out = new StringBuilder("\\"");
    for (int i = 0; i < value.length(); i++) {
      char c = value.charAt(i);
      switch (c) {
        case '"': out.append("\\\\\\""); break;
        case '\\\\': out.append("\\\\\\\\"); break;
        case '\\b': out.append("\\\\b"); break;
        case '\\f': out.append("\\\\f"); break;
        case '\\n': out.append("\\\\n"); break;
        case '\\r': out.append("\\\\r"); break;
        case '\\t': out.append("\\\\t"); break;
        default:
          if (c < 32) out.append(String.format("\\\\u%04x", (int) c));
          else out.append(c);
      }
    }
    return out.append("\\"").toString();
  }

  static String resultJson(String output, double runtimeMs, String error) {
    return "{\\"output\\":" + (output == null ? "null" : quote(output)) +
      ",\\"runtime_ms\\":" + String.format(Locale.US, "%.3f", runtimeMs) +
      ",\\"error\\":" + (error == null ? "null" : quote(error)) + "}";
  }

  public static void main(String[] args) {
    Solution solution = new Solution();
    Method method = findMethod();
    Class<?>[] paramTypes = method.getParameterTypes();
    List<String> results = new ArrayList<>();

    for (String[] raw : RAW_TESTCASES) {
      try {
        Object[] argsForCall = new Object[raw.length];
        for (int i = 0; i < raw.length; i++) {
          argsForCall[i] = convert(new JsonParser(raw[i]).parse(), paramTypes[i]);
        }

        long start = System.nanoTime();
        Object out = method.invoke(solution, argsForCall);
        long end = System.nanoTime();
        results.add(resultJson(toJson(out), (end - start) / 1000000.0, null));
      } catch (InvocationTargetException e) {
        Throwable cause = e.getCause() == null ? e : e.getCause();
        results.add(resultJson(null, 0, cause.getMessage() == null ? cause.toString() : cause.getMessage()));
      } catch (Exception e) {
        results.add(resultJson(null, 0, e.getMessage() == null ? e.toString() : e.getMessage()));
      }
    }

    System.out.println("__JUDGE__[" + String.join(",", results) + "]");
  }
}
`;
};

const cppStringLiteral = (value) => JSON.stringify(String(value));

const splitCppParams = (paramsSource) => {
  const params = [];
  let current = '';
  let angleDepth = 0;
  let parenDepth = 0;
  for (const char of paramsSource) {
    if (char === '<') angleDepth++;
    if (char === '>') angleDepth = Math.max(0, angleDepth - 1);
    if (char === '(') parenDepth++;
    if (char === ')') parenDepth = Math.max(0, parenDepth - 1);
    if (char === ',' && angleDepth === 0 && parenDepth === 0) {
      params.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  if (current.trim()) params.push(current.trim());
  return params;
};

const normalizeCppType = (type) => type
  .replace(/\bconst\b/g, '')
  .replace(/\bstd::/g, '')
  .replace(/[&*]/g, '')
  .replace(/\s+/g, ' ')
  .replace(/\s*</g, '<')
  .replace(/>\s*/g, '>')
  .replace(/\s*,\s*/g, ',')
  .trim();

const parseCppSignature = (code, entryPoint, paramOrder) => {
  const escapedEntry = String(entryPoint).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const signatureMatch = code.match(new RegExp(`([\\w:<>,\\s&*]+?)\\s+${escapedEntry}\\s*\\(([^)]*)\\)`));
  if (!signatureMatch) {
    throw new Error(`Unable to find C++ method signature for ${entryPoint}`);
  }

  const returnType = normalizeCppType(signatureMatch[1].split(/\b(public|private|protected)\s*:\s*/).pop());
  const paramsSource = signatureMatch[2].trim();
  const params = paramsSource && paramsSource !== 'void' ? splitCppParams(paramsSource) : [];
  if (params.length !== paramOrder.length) {
    throw new Error(`C++ method ${entryPoint} expects ${params.length} params, but paramOrder has ${paramOrder.length}`);
  }

  const paramTypes = params.map((param) => {
    const withoutDefault = param.split('=')[0].trim();
    const tokens = withoutDefault.match(/^(.+?)\s+([A-Za-z_]\w*)$/);
    if (!tokens) {
      throw new Error(`Unable to parse C++ parameter: ${param}`);
    }
    return normalizeCppType(tokens[1]);
  });

  return { returnType, paramTypes };
};

// C++ harness:
const buildCppHarness = (code, entryPoint, paramOrder, rawTestcases) => {
  const { returnType, paramTypes } = parseCppSignature(code, entryPoint, paramOrder);
  const raw = rawTestcases.map(testcase => paramOrder.map(key => String(testcase[key])));
  const testcaseRows = raw
    .map(args => `    { ${args.map(cppStringLiteral).join(', ')} }`)
    .join(',\n');
  const argDeclarations = paramTypes
    .map((type, index) => `        auto arg${index} = Converter<${type}>::get(parseJson(raw[${index}]));`)
    .join('\n');
  const callArgs = paramTypes.map((_, index) => `arg${index}`).join(', ');
  const invocation = returnType === 'void'
    ? `        solution.${entryPoint}(${callArgs});\n        results.push_back(resultJson("null", runtimeMs(start), ""));`
    : `        auto out = solution.${entryPoint}(${callArgs});\n        results.push_back(resultJson(toJson(out), runtimeMs(start), ""));`;

  return String.raw`
#include <bits/stdc++.h>
using namespace std;

${code}

struct JsonValue {
  enum Type { Null, Number, Bool, String, Array, Object } type = Null;
  double number = 0;
  bool boolean = false;
  string text;
  vector<JsonValue> array;
  map<string, JsonValue> object;
};

struct JsonParser {
  string s;
  size_t i = 0;

  explicit JsonParser(string input) : s(std::move(input)) {}

  JsonValue parse() {
    skip();
    return parseValue();
  }

  JsonValue parseValue() {
    skip();
    if (i >= s.size()) return {};
    char c = s[i];
    if (c == '"') return parseString();
    if (c == '[') return parseArray();
    if (c == '{') return parseObject();
    if (s.compare(i, 4, "true") == 0) { i += 4; JsonValue v; v.type = JsonValue::Bool; v.boolean = true; return v; }
    if (s.compare(i, 5, "false") == 0) { i += 5; JsonValue v; v.type = JsonValue::Bool; v.boolean = false; return v; }
    if (s.compare(i, 4, "null") == 0) { i += 4; return {}; }
    return parseNumber();
  }

  JsonValue parseString() {
    JsonValue v;
    v.type = JsonValue::String;
    i++;
    while (i < s.size()) {
      char c = s[i++];
      if (c == '"') break;
      if (c != '\\') {
        v.text.push_back(c);
        continue;
      }
      if (i >= s.size()) break;
      char esc = s[i++];
      switch (esc) {
        case '"': v.text.push_back('"'); break;
        case '\\': v.text.push_back('\\'); break;
        case '/': v.text.push_back('/'); break;
        case 'b': v.text.push_back('\b'); break;
        case 'f': v.text.push_back('\f'); break;
        case 'n': v.text.push_back('\n'); break;
        case 'r': v.text.push_back('\r'); break;
        case 't': v.text.push_back('\t'); break;
        case 'u':
          if (i + 4 <= s.size()) i += 4;
          break;
        default:
          v.text.push_back(esc);
      }
    }
    return v;
  }

  JsonValue parseArray() {
    JsonValue v;
    v.type = JsonValue::Array;
    i++;
    skip();
    if (i < s.size() && s[i] == ']') { i++; return v; }
    while (i < s.size()) {
      v.array.push_back(parseValue());
      skip();
      if (i < s.size() && s[i] == ',') { i++; continue; }
      if (i < s.size() && s[i] == ']') { i++; break; }
    }
    return v;
  }

  JsonValue parseObject() {
    JsonValue v;
    v.type = JsonValue::Object;
    i++;
    skip();
    if (i < s.size() && s[i] == '}') { i++; return v; }
    while (i < s.size()) {
      JsonValue key = parseString();
      skip();
      if (i < s.size() && s[i] == ':') i++;
      v.object[key.text] = parseValue();
      skip();
      if (i < s.size() && s[i] == ',') { i++; continue; }
      if (i < s.size() && s[i] == '}') { i++; break; }
    }
    return v;
  }

  JsonValue parseNumber() {
    size_t start = i;
    while (i < s.size() && string("-+0123456789.eE").find(s[i]) != string::npos) i++;
    JsonValue v;
    v.type = JsonValue::Number;
    v.number = stod(s.substr(start, i - start));
    return v;
  }

  void skip() {
    while (i < s.size() && isspace(static_cast<unsigned char>(s[i]))) i++;
  }
};

JsonValue parseJson(const string& raw) {
  return JsonParser(raw).parse();
}

template <typename T>
struct Converter;

template <>
struct Converter<int> {
  static int get(const JsonValue& v) { return static_cast<int>(llround(v.number)); }
};

template <>
struct Converter<long> {
  static long get(const JsonValue& v) { return static_cast<long>(llround(v.number)); }
};

template <>
struct Converter<long long> {
  static long long get(const JsonValue& v) { return static_cast<long long>(llround(v.number)); }
};

template <>
struct Converter<double> {
  static double get(const JsonValue& v) { return v.number; }
};

template <>
struct Converter<float> {
  static float get(const JsonValue& v) { return static_cast<float>(v.number); }
};

template <>
struct Converter<bool> {
  static bool get(const JsonValue& v) { return v.boolean; }
};

template <>
struct Converter<string> {
  static string get(const JsonValue& v) { return v.text; }
};

template <typename T>
struct Converter<vector<T>> {
  static vector<T> get(const JsonValue& v) {
    vector<T> out;
    for (const auto& item : v.array) out.push_back(Converter<T>::get(item));
    return out;
  }
};

string quoteJson(const string& value) {
  string out = "\"";
  for (char c : value) {
    switch (c) {
      case '"': out += "\\\""; break;
      case '\\': out += "\\\\"; break;
      case '\b': out += "\\b"; break;
      case '\f': out += "\\f"; break;
      case '\n': out += "\\n"; break;
      case '\r': out += "\\r"; break;
      case '\t': out += "\\t"; break;
      default:
        if (static_cast<unsigned char>(c) < 32) {
          char buf[7];
          snprintf(buf, sizeof(buf), "\\u%04x", c);
          out += buf;
        } else {
          out.push_back(c);
        }
    }
  }
  out += "\"";
  return out;
}

string toJson(const string& value) { return quoteJson(value); }
string toJson(const char* value) { return quoteJson(string(value)); }
string toJson(char value) { return quoteJson(string(1, value)); }
string toJson(bool value) { return value ? "true" : "false"; }
string toJson(int value) { return to_string(value); }
string toJson(long value) { return to_string(value); }
string toJson(long long value) { return to_string(value); }
string toJson(float value) { ostringstream out; out << value; return out.str(); }
string toJson(double value) { ostringstream out; out << value; return out.str(); }

template <typename T>
string toJson(const vector<T>& value) {
  vector<string> parts;
  for (const auto item : value) parts.push_back(toJson(item));
  string out = "[";
  for (size_t i = 0; i < parts.size(); i++) {
    if (i) out += ",";
    out += parts[i];
  }
  out += "]";
  return out;
}

double runtimeMs(chrono::steady_clock::time_point start) {
  return chrono::duration<double, milli>(chrono::steady_clock::now() - start).count();
}

string resultJson(const string& output, double runtimeMs, const string& error) {
  ostringstream ms;
  ms << fixed << setprecision(3) << runtimeMs;
  return string("{\"output\":") + quoteJson(output) +
    ",\"runtime_ms\":" + ms.str() +
    ",\"error\":" + (error.empty() ? "null" : quoteJson(error)) + "}";
}

int main() {
  Solution solution;
  vector<vector<string>> rawTestcases = {
${testcaseRows}
  };
  vector<string> results;

  for (const auto& raw : rawTestcases) {
    try {
${argDeclarations}
      auto start = chrono::steady_clock::now();
${invocation}
    } catch (const exception& e) {
      results.push_back(resultJson("null", 0, e.what()));
    } catch (...) {
      results.push_back(resultJson("null", 0, "Unknown error"));
    }
  }

  cout << "__JUDGE__[";
  for (size_t i = 0; i < results.size(); i++) {
    if (i) cout << ",";
    cout << results[i];
  }
  cout << "]" << endl;
  return 0;
}
`;
};

const normalizedEqual = (a, b) => {
  try { return JSON.stringify(JSON.parse(a)) === JSON.stringify(JSON.parse(b)); }
  catch { return String(a).trim() === String(b).trim(); }
};

const runHarness = async ({ language, code, entryPoint, paramOrder, testcases, timeoutMs = 5000 }) => {
  const lang = String(language || 'javascript').toLowerCase().trim();
  if (!LANGS[lang]) {
    return { status: 'UNSUPPORTED_LANGUAGE', message: `Unsupported language: ${language}` };
  }

  const workspacePath = await createTempWorkspace();
  const normalizedLang = LANGS[lang];
  if (!['js', 'py', 'java', 'cpp'].includes(normalizedLang)) {
    return { status: 'UNSUPPORTED_LANGUAGE', message: `Unsupported language: ${language}` };
  }
  const isJS = normalizedLang === 'js';
  const isPy = normalizedLang === 'py';
  const isJava = normalizedLang === 'java';
  const isCpp = normalizedLang === 'cpp';
  const fileName = isJS ? 'Main.js' : (isPy ? 'Main.py' : (isJava ? 'Main.java' : 'Main.cpp'));
  const image = isJS ? IMAGE_JS : (isPy ? IMAGE_PY : (isJava ? IMAGE_JAVA : IMAGE_CPP));

  try {
    const rawInputs = testcases.map(tc => tc.inputs || {});
    const harnessSource = isJS
      ? buildJSHarness(code, entryPoint, paramOrder, rawInputs)
      : (isJava
        ? buildJavaHarness(code, entryPoint, paramOrder, rawInputs)
        : (isCpp
          ? buildCppHarness(code, entryPoint, paramOrder, rawInputs)
          : buildPyHarness(code, entryPoint, paramOrder, rawInputs)));

    await fs.writeFile(path.join(workspacePath, fileName), harnessSource, 'utf8');

    const commandArgs = isJS
      ? ['node', `/workspace/${fileName}`]
      : (isJava
        ? ['sh', '-lc', 'cp /workspace/Main.java /tmp/Main.java && javac /tmp/Main.java && java -cp /tmp Main']
        : (isCpp
          ? ['sh', '-lc', 'cp /workspace/Main.cpp /tmp/Main.cpp && g++ -std=c++17 /tmp/Main.cpp -O2 -pipe -o /tmp/main && /tmp/main']
          : ['python', `/workspace/${fileName}`]));

    const execution = await runDockerCommand({ workspacePath, image, commandArgs, timeoutMs });

    if (execution.timeout) {
      return { status: 'timeout', message: `Time Limit Exceeded (${timeoutMs}ms)`, results: [] };
    }

    if (execution.error) {
      if (execution.dockerMissing) {
        return { status: 'DOCKER_UNAVAILABLE', message: execution.error };
      }
      // runtime error before any judge output
      return { status: 'runtime_error', error_message: execution.error || execution.stderr || 'Execution error', results: [] };
    }

    const out = execution.stdout || '';
    const judgeLine = out.split('\n').reverse().find(l => l.startsWith('__JUDGE__'));
    if (!judgeLine) {
      return { status: 'runtime_error', error_message: (execution.stderr || out || 'No judge output').slice(0, 2000), results: [] };
    }

    let harnessResults;
    try {
      harnessResults = JSON.parse(judgeLine.slice('__JUDGE__'.length));
    } catch (e) {
      return { status: 'runtime_error', error_message: 'Invalid judge output', results: [] };
    }

    const results = [];
    let passedCount = 0;
    for (let i = 0; i < harnessResults.length; i++) {
      const r = harnessResults[i];
      const expected = testcases[i] ? testcases[i].expected_output : null;
      const your_output = r.error ? null : (r.output === null ? null : r.output);
      const passed = r.error == null && expected !== undefined && expected !== null && normalizedEqual(r.output, expected);
      if (passed) passedCount++;
      results.push({
        case: i + 1,
        input: testcases[i] ? testcases[i].inputs : {},
        your_output,
        expected_output: expected,
        passed,
        runtime_ms: r.runtime_ms,
        error: r.error || null
      });
    }

    const allPassed = passedCount === results.length && results.every(r => !r.error);
    return {
      status: 'success',
      results,
      summary: {
        passed: passedCount,
        total: results.length,
        status: allPassed ? 'Accepted' : (results.some(r => r.error) ? 'Runtime Error' : 'Wrong Answer'),
        avg_runtime_ms: results.length ? +(results.reduce((s, n) => s + (n.runtime_ms || 0), 0) / results.length).toFixed(3) : 0
      }
    };
  } catch (error) {
    return { status: 'runtime_error', error_message: error && error.message ? error.message : String(error), results: [] };
  } finally {
    await cleanupWorkspace(workspacePath);
  }
};

module.exports = {
  runHarness
};
