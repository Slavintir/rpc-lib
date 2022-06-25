/* eslint-disable import/no-extraneous-dependencies */
import rmq from 'amqplib';

import { RpcServer } from './server.core';
import { RmqTransport } from '../transports/rmq/rmq-server.transport';
import { ITransport, Newable, IControllerMeta, IMethod, IMiddleware } from './interfaces.core';

export enum Transport {
    RMQ = 'RabbitMq',
}

interface CommandOptions {
    controllers?: any[],
    middlewares?: IMiddleware[],
}

export interface RMQOptions extends CommandOptions {
    type: Transport.RMQ;
    params: {
        serviceName: string;
        connect: rmq.Options.Connect;
        assertQueue?: rmq.Options.AssertQueue;
    };
}

export type Options = RMQOptions;

export class AppFactory {
    static createMicroservice(options: Options) {
        let transport: ITransport;
        const { controllers = [], middlewares = [] } = options;

        switch (options.type) {
            case Transport.RMQ: {
                const { connect, serviceName, assertQueue } = options.params;
                transport = new RmqTransport(serviceName, connect, assertQueue);
                break;
            }

            default:
                throw new Error('transport type is not defined');
        }

        const methods = controllers
            .flatMap((Controller: Newable<IControllerMeta>) => {
                const controller = new Controller();

                const fn = (acc: IMethod[], method: IMethod): IMethod[] => ([
                    ...acc,
                    {
                        ...method,
                        middlewares: [...middlewares, ...method.middlewares],
                        name: controller.prefix
                            ? `${controller.prefix}.${method.name}`
                            : method.name,
                    },
                ]);

                return Object.values(controller.$methods).reduce(fn, []);
            });

        return new RpcServer(transport, methods);
    }
}
