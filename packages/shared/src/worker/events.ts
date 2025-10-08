import type { ProgressInfo } from '@huggingface/transformers'

export type ErrorMessageEvents<E = unknown>
  = | WorkerMessageEvent<{ error?: E, message?: string }, 'error'>

export type LoadMessageEvents<D = undefined, T extends string = string>
  = | WorkerMessageEvent<D, T>
    | WorkerMessageEvent<{ message: string }, 'info'>
    | WorkerMessageEvent<{ message?: string, status: 'loading' | 'ready' }, 'status'>
    | WorkerMessageEvent<{ progress: ProgressInfo }, 'progress'>

export type ProcessMessageEvents<D = unknown, T = unknown>
  = | WorkerMessageEvent<D, T>

export interface WorkerMessageEvent<D, T> {
  data: D
  type: T
}

export type WorkerMessageEvents<D = undefined, T extends string = string>
  = | LoadMessageEvents<D, T>
    | ProcessMessageEvents<D, T>
