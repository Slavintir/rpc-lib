/* eslint-disable import/no-extraneous-dependencies */
import rmq, { Message } from 'amqplib';
import { EventEmitter } from 'events';

export class RmqCommon extends EventEmitter {
    protected connection!: rmq.Connection;
    protected channel!: rmq.Channel;
    protected readonly requestsQueue;
    protected readonly responseQueue;
    protected readonly requestRoutingKey;
    protected readonly responseRoutingKey;
    protected readonly exchange = 'rpc';

    constructor(
        protected readonly clientName: string,
        protected readonly options: rmq.Options.Connect,
        protected readonly queuesOptions: rmq.Options.AssertQueue = { autoDelete: true, messageTtl: 5000 },
    ) {
        super();
        this.requestsQueue = `rpc-${clientName}-requests`;
        this.responseQueue = `rpc-${clientName}-responses`;
        this.responseRoutingKey = `${this.clientName}.response`;
        this.requestRoutingKey = `${this.clientName}.request`;
    }

    protected async init() {
        this.connection = await rmq.connect(this.options);
        this.channel = await this.connection.createChannel();

        this.connection.on('error', (err) => { console.error('rpc_connection_error =>', err.message); });
        this.channel.on('error', (err) => { console.error('rpc_channel_error =>', err.message); });
        this.channel.on('close', () => process.abort());

        await Promise.all([
            this.channel.assertExchange(this.exchange, 'topic'),
            this.channel.assertQueue(this.requestsQueue, this.queuesOptions),
            this.channel.assertQueue(this.responseQueue, this.queuesOptions),
            this.channel.bindQueue(this.requestsQueue, this.exchange, this.requestRoutingKey),
            this.channel.bindQueue(this.responseQueue, this.exchange, this.responseRoutingKey),
        ]);
    }

    json(msg: Message, result: any) {
        const { correlationId } = msg.properties;
        const { jsonrpc, method, id } = JSON.parse(msg.content.toString());

        const jsonContent = JSON.stringify({ jsonrpc, method, id, result });
        const content = Buffer.from(jsonContent);
        this.channel.publish(
            this.exchange,
            this.responseRoutingKey,
            content, { correlationId, contentType: 'application/json' },
        );

        this.channel.ack(msg);
    }

    error(msg: Message, code: number, message: string) {
        const { correlationId } = msg.properties;
        const { jsonrpc, id } = JSON.parse(msg.content.toString());

        const jsonContent = JSON.stringify({ jsonrpc, id, error: { code, message } });
        const content = Buffer.from(jsonContent);
        this.channel.publish(
            this.exchange,
            this.responseRoutingKey,
            content,
            { correlationId, contentType: 'application/json' },
        );

        this.channel.ack(msg);
    }

    end(msg: Message, data: string | Buffer) {
        if (!data || typeof data !== 'string' || !Buffer.isBuffer(data)) {
            throw new Error(`expected typeof data as 'string' or 'buffer', receive '${typeof data}'`);
        }

        const { correlationId } = msg.properties;
        const content = Buffer.isBuffer(data)
            ? data
            : Buffer.from(data);

        this.channel.publish(
            this.exchange,
            this.responseRoutingKey,
            content, { correlationId, contentType: 'application/text' },
        );

        this.channel.ack(msg);
    }
}
