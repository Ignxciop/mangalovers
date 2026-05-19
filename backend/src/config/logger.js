import pino from "pino";

const isDev = process.env.ENVIRONMENT === "development" || process.env.NODE_ENV === "development";
const isTest = process.env.VITEST === "true";

const level = isTest ? "warn" : (process.env.LOG_LEVEL || (isDev ? "debug" : "info"));

let transport;
if (isTest) {
  transport = undefined;
} else if (isDev) {
  transport = pino.transport({
    target: "pino-pretty",
    options: { colorize: true, translateTime: "HH:MM:ss Z" },
  });
} else {
  const targets = [{ target: "pino/file", options: { destination: 1 } }];
  if (process.env.LOG_FILE) {
    targets.push({ target: "pino/file", options: { destination: process.env.LOG_FILE, mkdir: true } });
  }
  transport = pino.transport({ targets });
}

const opts = {
  level,
  redact: ["req.headers.authorization", "req.headers.cookie"],
};

const logger = transport ? pino(opts, transport) : pino(opts);

export default logger;
