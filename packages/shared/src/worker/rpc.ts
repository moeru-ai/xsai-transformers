import { defineInvokeEventa } from '@unbird/eventa'

import type { LoadMessageEvents } from './events'

export function createLoadDefinition<Params, StreamEventBody = undefined, StreamEventType extends string = string>() {
  return defineInvokeEventa<LoadMessageEvents<StreamEventBody, StreamEventType>, Params>('load')
}

export function createProcessDefinition<Params, Results, T extends string = string>(onResultType: T) {
  return defineInvokeEventa<Results, Params>(onResultType)
}
