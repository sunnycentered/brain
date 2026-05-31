const { execFile } = require('child_process');

const OLLAMA_CMD = process.env.OLLAMA_CMD || 'ollama';
const DEFAULT_MODEL = process.env.OLLAMA_MODEL || 'qwen3.6';

// A very small wrapper that runs a prompt through the local ollama CLI.
function runPrompt(prompt, model = DEFAULT_MODEL, timeoutMs = 20000) {
  return new Promise((resolve, reject) => {
    const args = ['run', model, prompt, '--json'];
    const child = execFile(OLLAMA_CMD, args, { timeout: timeoutMs }, (err, stdout, stderr) => {
      if (err) return reject(err);
      try {
        // Ollama prints JSON with "output" field when --json is used; if not, return raw stdout
        const parsed = JSON.parse(stdout);
        if (parsed && parsed.output) return resolve(parsed.output);
        return resolve(parsed);
      } catch (e) {
        return resolve(stdout.trim());
      }
    });
  });
}

module.exports = {
  runPrompt
};

