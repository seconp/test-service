import { FibersContextStore } from './ContextStore';
import type { IServiceContext } from './types/ServiceClass';

// TODO Evalute again using AsyncContextStore instead of FibersContextStore in a future Meteor release (after 2.5)
export const asyncLocalStorage = new FibersContextStore<IServiceContext>();
