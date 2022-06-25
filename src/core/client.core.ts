import { IClient } from './interfaces.core';

export class RpcClient implements IClient {
    constructor(
        private readonly client: IClient,
    ) { }

    async call<R = any, P = any>(method: string, params: P): Promise<{ id: string, result: R }> {
        return this.client.call(method, params);
    }
}
