export interface DoneProgressInfo {
  file: string
  name: string
  status: 'done'
}

export interface DownloadProgressInfo {
  file: string
  name: string
  status: 'download'
}

export interface InitiateProgressInfo {
  file: string
  name: string
  status: 'initiate'
}

export type ProgressCallback = (progress: ProgressInfo) => void

export type ProgressInfo = DoneProgressInfo | DownloadProgressInfo | InitiateProgressInfo | ProgressStatusInfo | ReadyProgressInfo

export interface ProgressStatusInfo {
  file: string
  loaded: number
  name: string
  progress: number
  status: 'progress'
  total: number
}

export interface ReadyProgressInfo {
  model: string
  status: 'ready'
  task: string
}
