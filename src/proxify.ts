import { api } from './Api';

// 这段代码使用了代理模式

// 简化远程调用： 将远程服务的方法调用转换为本地函数调用，隐藏了底层 RPC 的细节，使代码更简洁易懂。
// 类型安全： 利用 Prom<T> 和 PromOrError<T> 泛型类型，保证了代理对象的方法签名与远程服务的方法签名一致，提供了类型安全保障。
// 灵活的调用方式： 通过 waitService 参数，可以选择等待服务可用后再调用，或直接调用。
// 易于扩展： 可以方便地添加新的功能，例如错误处理、缓存等，只需修改 handler 函数即可。
type Prom<T> = {
  [K in keyof T as T[K] extends (...params: any) => any
    ? K
    : never]: T[K] extends (...params: any) => Promise<any>
    ? T[K]
    : T[K] extends (...params: infer P) => infer R
      ? (...params: P) => Promise<R>
      : never;
};

type PromOrError<T> = {
  [K in keyof T as T[K] extends (...params: any) => any
    ? K
    : never]: T[K] extends (...params: any) => Promise<any>
    ? T[K]
    : T[K] extends (...params: infer P) => infer R
      ? (...params: P) => Promise<R | Error>
      : never;
};

function handler<T extends object>(
  namespace: string,
  waitService: boolean,
): ProxyHandler<T> {
  return {
    get:
      (_target: T, prop: string): any =>
      (...params: any): Promise<any> =>
        api[waitService ? 'waitAndCall' : 'call'](
          `${namespace}.${prop}`,
          params,
        ),
  };
}

export function proxifyWithWait<T>(namespace: string): Prom<T> {
  return new Proxy({}, handler(namespace, true)) as unknown as Prom<T>;
}

export function proxify<T>(namespace: string): PromOrError<T> {
  return new Proxy({}, handler(namespace, false)) as unknown as PromOrError<T>;
}
