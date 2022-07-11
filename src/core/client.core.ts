import { IClient } from './interfaces.core';

type ClientParams = (() => IClient) | IClient;

export class RpcClient implements IClient {
    private readonly client: IClient;

    constructor(params: ClientParams) {
        if (typeof params === 'function') {
            this.client = params();
        } else {
            this.client = params as IClient;
        }
    }

    async call<R = any, P = any>(method: string, params: P): Promise<{ id: string, result: R }> {
        return this.client.call(method, params);
    }

    close() {
        return this.client.close();
    }
}
