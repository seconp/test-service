import polka from 'polka';

import { test1 } from '.';
import { api } from './Api';
import { ServiceClass } from './types/ServiceClass';

const PORT = process.env.PORT || 3035;

class Test2 extends ServiceClass {
  protected name?: string | undefined = 'test2';

  async started(): Promise<void> {
    console.log('test2 service started...');
  }

  fn1() {
    console.log('I am in fn of test2');
    return 'fn in test2';
  }

  async call() {
    console.log('I am gonna call test1.fn');
    const a = await test1.fn();
    console.log('-------------------------');
    console.log(a);
  }
}

(async () => {
  // need to import service after models are registered

  api.registerService(new Test2());

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
