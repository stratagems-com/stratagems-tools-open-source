import winston from 'winston';
import LokiTransport from 'winston-loki';
import { config } from './config';

const level = config.NODE_ENV === 'development' ? 'debug' : 'info';

const enumerateErrorFormat = winston.format((info) => {
    if (info instanceof Error) {
        return Object.assign(info, { message: info.stack });
    }
    return info;
});

const transports: any[] = [
    new winston.transports.Console({
        stderrLevels: ['error'],
    }),
];

// Add Loki transport if LOKI_HOST is provided
if (config.LOKI_HOST) {
    transports.push(
        new LokiTransport({
            host: config.LOKI_HOST,
            labels: {
                app: config.LOKI_APP_NAME,
                environment: config.NODE_ENV,
            },
            json: true,
            format: winston.format.json(),
            replaceTimestamp: true,
            onConnectionError: (err) => console.error(err),
        }),
    );
}

const logger = winston.createLogger({
    level: level,
    format: winston.format.combine(
        enumerateErrorFormat(),
        winston.format.timestamp({ format: 'YYYY-MM-DDTHH:mm:ssZ' }),
        winston.format.json(),
        winston.format.printf(({ level, message, timestamp, ...metadata }) => {
            let msg = `${timestamp} [${level}] : ${message} `;
            if (metadata) {
                msg += JSON.stringify(metadata);
            }
            return msg;
        }),
    ),
    transports: transports,
});

export default logger; 