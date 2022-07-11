/* eslint-disable import/no-extraneous-dependencies */
import { RpcError } from '../../core/error.core';
import { ICtx, ITransport } from '../../core/interfaces.core';
import { RmqCommon } from './rmq-common.transport';

export class RmqTransport extends RmqCommon implements ITransport {
    async listen() {
        await this.init();

        this.channel.consume(this.requestsQueue, (msg) => {
            if (!msg?.content) {
                return console.log('rpc_no_content');
            }

            if (!msg?.fields.routingKey) {
                return console.log('rpc_no_routingKey');
            }

            if (!this.listenerCount('message')) {
                return this.channel.nack(msg);
            }

            const { method, params } = JSON.parse(msg.content.toString());
            const ctx: ICtx = {
                msg,
                method,
                params,
                end: (result) => this.end(msg, result),
                json: (result) => this.json(msg, result),
                error: (err: RpcError) => this.error(msg, err.code, err.message),
                content: msg.content,
            };

            this.emit('message', ctx);
            return undefined;
        });
    }

    async close() {
        await this.connection.close();
    }
}
