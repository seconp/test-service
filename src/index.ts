import { proxifyWithWait } from './proxify';
import './setBroker';
import './Test1Service';
import './Test2Service';

type test = {
  fn: () => any;
  call: () => any;
};
export const test1 = proxifyWithWait<test>('test1');
export const test2 = proxifyWithWait<test>('test2');

(async () => {
  test2.call();
})();
