export enum RpcErrorCore {
    ParseError = -32700,
    InvalidRequest = -32600,
    MethodNotFound = -32601,
    InvalidParams = -32602,
    InternalError = -32603,
    ServerError = -32000,
}

export enum RpcErrorMessage {
    ParseError = 'parse_error',
    InvalidRequest = 'invalid_request',
    MethodNotFound = 'method_not_found',
    InvalidParams = 'invalid_params',
    InternalError = 'internal_error',
    ServerError = 'server_error',
}

export class RpcError extends Error {
    constructor(readonly code: RpcErrorCore, message?: string) {
        if (message) {
            super(message);
            return;
        }

        super(RpcErrorMessage.ServerError);
    }
}
