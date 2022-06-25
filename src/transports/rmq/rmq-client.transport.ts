/* eslint-disable import/no-extraneous-dependencies */
import { Message } from 'amqplib';
import { randomUUID } from 'crypto';
import { IClient } from '../../core/interfaces.core';
import { RmqCommon } from './rmq-common.transport';

export class RmqClient extends RmqCommon implements IClient {
    private isListen = false;
    private requests = new Map<string, { resolve: Function, timeout:() => void }>();
    private interval: NodeJS.Timer | null = null;

    async init() {
        if (this.isListen) {
            return;
        }

        await super.init();

        this.interval = setInterval(() => {
            this.requests.forEach((request, key) => {
                const requestTimestamp = parseInt(key.split('|')[0], 10);

                if (Date.now() - requestTimestamp > 5000) {
                    request.timeout();
                }
            });
        }, 1000);

        this.channel.consume(this.responseQueue, (msg) => {
            if (!msg) {
                return console.error('no_msg');
            }

            if (!msg.properties.correlationId) {
                return console.error('no_correlationId');
            }

            const handler = this.requests.get(msg.properties.correlationId);

            if (!handler) {
                return this.channel.nack(msg);
            }

            return handler.resolve(msg);
        });

        this.isListen = true;
    }

    async call<T extends object, R extends object>(method: string, params: T): Promise<R> {
        await this.init();
        const correlationId = `${Date.now()}|${randomUUID()}`;

        const isSent = this.channel.publish(
            this.exchange,
            this.requestRoutingKey,
            Buffer.from(JSON.stringify({ method, params, jsonrpc: '2.0', id: correlationId })),
            { correlationId, contentType: 'application/json' },
        );

        if (!isSent) {
            throw new Error('the message sent but not consumed');
        }

        return new Promise<R>((resolve, reject) => {
            this.requests.set(correlationId, {
                resolve: (msg: Message) => {
                    try {
                        resolve(JSON.parse(msg.content.toString()));
                        this.requests.delete(correlationId);
                        this.channel.ack(msg);
                    } catch (err) {
                        reject(err);
                        this.channel.reject(msg);
                    }
                },
                timeout: () => {
                    this.requests.delete(correlationId);
                    reject(new Error('timeout'));
                },
            });
        });
    }

    close() {
        const timer = setInterval(() => {
            if (!this.interval) {
                clearInterval(timer);
                this.channel.close();
                return;
            }

            if (this.requests.size === 0) {
                clearInterval(timer);
                clearInterval(this.interval);
                this.channel.close();
            }
        }, 100);
    }
}
