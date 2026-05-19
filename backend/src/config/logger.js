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
  transport = pino.transport({
    targets: [
      { target: "pino/file", options: { destination: 1 } },
      { target: "pino/file", options: { destination: "./logs/app.log", mkdir: true } },
    ],
  });
}

const logger = pino({
  level,
  redact: ["req.headers.authorization", "req.headers.cookie"],
  ...(transport ? { transport } : {}),
});

export default logger;
