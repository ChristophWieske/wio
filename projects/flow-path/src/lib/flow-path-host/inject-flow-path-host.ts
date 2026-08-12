import { inject } from '@angular/core';
import { FlowPathHost } from './flow-path-host';
import { FlowPathHostApi } from './flow-path-host-api';
import { GlobalFlowPathHost } from './global-flow-path-host';

export function injectFlowPathHost(): FlowPathHostApi {
  return inject(FlowPathHost, { optional: true }) ?? inject(GlobalFlowPathHost);
}
