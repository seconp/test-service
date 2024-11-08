import type { EventSignatures } from './events';
import type { IApiService } from './types/IApiService';
import type { IBroker, IBrokerNode } from './types/IBroker';
import type { IServiceClass } from './types/ServiceClass';

/**
 * Api是一个启动微服务的中间类，通过调用Api的方法即可实现微服务的启动和调用
 */
export class Api implements IApiService {
	private services: Set<IServiceClass> = new Set<IServiceClass>();

	// Broker的作用：
	// 服务发现: Broker 维护一个服务注册表，记录所有可用的 Service 及其提供的 Actions。 当一个 Service 需要调用另一个 Service 的 Action 时，Broker 负责找到对应的 Service 实例。
	// 消息传递: Broker 负责在 Service 之间传递请求和响应消息，以及事件消息。 它使用 Transporter 模块来实现不同节点之间的通信。
	// 负载均衡: 当有多个 Service 实例提供相同的 Action 时，Broker 可以根据负载均衡策略将请求分发到不同的实例上，以提高系统的吞吐量和可用性。
	// 容错处理: Broker 具备容错机制，例如熔断、重试等，可以防止单个 Service 的故障影响整个系统的稳定性。
	// 事件管理: Broker 提供了事件机制，允许 Service 订阅和发布事件，实现 Service 之间的异步通信。
	private broker?: IBroker;

	// set a broker for the API and registers all services in the broker
	setBroker(broker: IBroker): void {
		this.broker = broker;
		// bind service on broker
		this.services.forEach((service) => this.broker?.createService(service));
	}

	async destroyService(instance: IServiceClass): Promise<void> {
		if (!this.services.has(instance)) {
			return;
		}
		if (this.broker) {
			await this.broker.destroyService(instance);
		}
		this.services.delete(instance);
	}

	/**
	 * 在broker中注册service
	 * @param instance - 要创建的service
	 * @param serviceDependencies - 注册的service启动时需要依赖的service
	 */
	registerService(instance: IServiceClass, serviceDependencies?: string[]): void {
		this.services.add(instance);
		instance.setApi(this);

		if (this.broker) {
			this.broker.createService(instance, serviceDependencies);
		}
	}

	/**
	 * 通过broker.call调用其他service的方法， 无需等待，确定该service是可用的。
	 * 参考：https://moleculer.services/docs/0.14/actions
	 * @param method - 调用的方法
	 * @param data - 方法的参数
	 * @returns 返回method所返回的值
	 */
	async call(method: string, data?: unknown): Promise<any> {
		return this.broker?.call(method, data);
	}

	/**
	 * 等待然后调用其他service的方法，需要等待。不确定该service是否可用
	 * @param method - 调用的方法
	 * @param data - 方法的参数
	 * @returns 返回method所返回的值
	 */
	async waitAndCall(method: string, data: any): Promise<any> {
		console.log('I am wait and call...');
		const result = this.broker?.waitAndCall(method, data);
		return result;
	}

	// https://moleculer.services/docs/0.14/events#Broadcast-event
	async broadcast<T extends keyof EventSignatures>(event: T, ...args: Parameters<EventSignatures[T]>): Promise<void> {
		if (!this.broker) {
			throw new Error(`No broker set to broadcast: ${event}`);
		}

		return this.broker.broadcast(event, ...args);
	}

	async broadcastToServices<T extends keyof EventSignatures>(
		services: string[],
		event: T,
		...args: Parameters<EventSignatures[T]>
	): Promise<void> {
		return this.broker?.broadcastToServices(services, event, ...args);
	}

	// // 广播事件给所有本地服务
	async broadcastLocal<T extends keyof EventSignatures>(event: T, ...args: Parameters<EventSignatures[T]>): Promise<void> {
		return this.broker?.broadcastLocal(event, ...args);
	}

	nodeList(): Promise<IBrokerNode[]> {
		if (!this.broker) {
			throw new Error('No broker set to start.');
		}
		return this.broker.nodeList();
	}

	async start(): Promise<void> {
		if (!this.broker) {
			throw new Error('No broker set to start.');
		}
		await this.broker.start();
	}
}

export const api = new Api();
