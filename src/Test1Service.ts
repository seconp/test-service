import polka from 'polka';

import { api } from './Api';
import { ServiceClass } from './types/ServiceClass';

const PORT = process.env.PORT || 3034;

class Test1 extends ServiceClass {
	protected name?: string | undefined = 'test1';

	async started(): Promise<void> {
		console.log('test1 service started...');
	}

	fn1() {
		console.log('I am in fn of test1');
		return 'fn in test1';
	}
}

(async () => {
	// need to import service after models are registered

	api.registerService(new Test1());

	await api.start();

	// 每个service都可以通过/health查看健康状态
	polka()
		.get('/health', async function (_req, res) {
			try {
				await api.nodeList();
				res.end('ok');
			} catch (err) {
				console.error('Service not healthy', err);

				res.writeHead(500);
				res.end('not healthy');
			}
		})
		.listen(PORT);
})();
