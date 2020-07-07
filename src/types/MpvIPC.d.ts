export interface MpvCommand {
    command: any[]
    request_id?: number
}

export type SocketType = 'command' | 'observe';