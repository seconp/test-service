import { isMeteorError, MeteorError } from './MeteorErrors';
import EJSON from 'ejson';
import { Errors, Serializers, ServiceBroker } from 'moleculer';

import { NetworkBroker } from './NetworkBroker';

const {
  MS_NAMESPACE = '',
  TRANSPORTER = 'nats', // 默认为 TCP, 参考：https://moleculer.services/docs/0.14/networking#TCP-transporter
  CACHE = 'Memory', // 缓存类型，默认为内存缓存
  // SERIALIZER = 'MsgPack',
  SERIALIZER = 'EJSON', // 序列化器，默认为 EJSON
  MOLECULER_LOG_LEVEL = 'warn', // 日志级别，默认为警告级别
  BALANCE_STRATEGY = 'RoundRobin', // 负载均衡策略，默认为轮询
  BALANCE_PREFER_LOCAL = 'true', // 是否优先选择本地服务，默认为 true
  RETRY_FACTOR = '2', // 重试延迟因子，默认为 2
  RETRY_MAX_DELAY = '1000', // 最大重试延迟，默认为 1000 毫秒
  RETRY_DELAY = '100', // 初始重试延迟，默认为 100 毫秒
  RETRY_RETRIES = '5', // 最大重试次数，默认为 5 次
  RETRY_ENABLED = 'false', // 是否启用重试，默认为 false
  REQUEST_TIMEOUT = '60', // 请求超时时间，默认为 60 秒
  HEARTBEAT_INTERVAL = '10', // 心跳间隔，默认为 10 秒
  HEARTBEAT_TIMEOUT = '30', // 心跳超时时间，默认为 30 秒
  BULKHEAD_ENABLED = 'false', // 是否启用舱壁模式，默认为 false
  BULKHEAD_CONCURRENCY = '10', // 舱壁并发数，默认为 10
  BULKHEAD_MAX_QUEUE_SIZE = '10000', // 舱壁最大队列大小，默认为 10000
  MS_METRICS = 'false', // 是否启用指标，默认为 false
  MS_METRICS_PORT = '9458', // 指标端口，默认为 9458
  TRACING_ENABLED = 'false', // 是否启用追踪，默认为 false
  SKIP_PROCESS_EVENT_REGISTRATION = 'false', // 是否跳过进程事件注册，默认为 false
} = process.env;

const { Base } = Serializers;

class EJSONSerializer extends Base {
  serialize(obj: any): Buffer {
    return Buffer.from(EJSON.stringify(obj));
  }

  deserialize(buf: Buffer): any {
    return EJSON.parse(buf.toString());
  }
}

class CustomRegenerator extends Errors.Regenerator {
  restoreCustomError(plainError: any): Error | undefined {
    const { message, reason, details, errorType, isClientSafe } = plainError;

    if (errorType === 'Meteor.Error') {
      const error = new MeteorError(message, reason, details);
      if (typeof isClientSafe !== 'undefined') {
        error.isClientSafe = isClientSafe;
      }
      return error;
    }

    return undefined;
  }

  extractPlainError(err: Error | MeteorError): Errors.PlainMoleculerError {
    return {
      ...super.extractPlainError(err),
      ...(isMeteorError(err) && {
        isClientSafe: err.isClientSafe,
        errorType: err.errorType,
        reason: err.reason,
        details: err.details,
      }),
    };
  }
}

const network = new ServiceBroker({
  namespace: MS_NAMESPACE,
  skipProcessEventRegistration: SKIP_PROCESS_EVENT_REGISTRATION === 'true',
  transporter: TRANSPORTER,
  // 已开启性能记录
  metrics: {
    enabled: MS_METRICS === 'true',
    reporter: [
      {
        type: 'Prometheus',
        options: {
          port: MS_METRICS_PORT,
        },
      },
    ],
  },
  cacher: CACHE,
  serializer: SERIALIZER === 'EJSON' ? new EJSONSerializer() : SERIALIZER,
  logger: {
    type: 'Pino',
    options: {
      level: MOLECULER_LOG_LEVEL,
      pino: {
        options: {
          timestamp: () =>
            `,"time":"${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}"`,
          ...(process.env.NODE_ENV !== 'production'
            ? {
                transport: {
                  target: 'pino-pretty',
                  options: {
                    colorize: true,
                  },
                },
              }
            : {}),
        },
      },
    },
  },
  registry: {
    strategy: BALANCE_STRATEGY,
    preferLocal: BALANCE_PREFER_LOCAL !== 'false',
  },

  requestTimeout: parseInt(REQUEST_TIMEOUT) * 1000,
  retryPolicy: {
    enabled: RETRY_ENABLED === 'true',
    retries: parseInt(RETRY_RETRIES),
    delay: parseInt(RETRY_DELAY),
    maxDelay: parseInt(RETRY_MAX_DELAY),
    factor: parseInt(RETRY_FACTOR),
    check: (err: any): boolean => err && !!err.retryable,
  },

  maxCallLevel: 100,
  heartbeatInterval: parseInt(HEARTBEAT_INTERVAL),
  heartbeatTimeout: parseInt(HEARTBEAT_TIMEOUT),
  bulkhead: {
    enabled: BULKHEAD_ENABLED === 'true',
    concurrency: parseInt(BULKHEAD_CONCURRENCY),
    maxQueueSize: parseInt(BULKHEAD_MAX_QUEUE_SIZE),
  },
  // 暂未开启 tracing
  // 在微服务架构中，一个请求通常会涉及多个服务的调用。Tracing（分布式追踪）就是记录请求在各个服务之间传递的路径和耗时，以便更好地理解系统行为、分析性能瓶颈和排查故障。
  tracing: {
    enabled: TRACING_ENABLED === 'true',
    exporter: {
      type: 'Jaeger',
      options: {
        endpoint: null,
        host: 'jaeger',
        port: 6832,
        sampler: {
          // Sampler type. More info: https://www.jaegertracing.io/docs/1.14/sampling/#client-sampling-configuration
          type: 'Const',
          // Sampler specific options.
          options: {},
        },
        // Additional options for `Jaeger.Tracer`
        tracerOptions: {},
        // Default tags. They will be added into all span tags.
        defaultTags: null,
      },
    },
  },
  errorRegenerator: new CustomRegenerator(),
  started(): void {
    console.log('NetworkBroker started successfully.');
  },
});

export const broker = new NetworkBroker(network);
