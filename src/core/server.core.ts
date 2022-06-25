import { COUNT_OF_ARGS_ERROR_HANDLER, COUNT_OF_ARGS_HANDLER, COUNT_OF_ARGS_MIDDLEWARE } from './constants.core';
import {
    ICtx,
    IErrorHandler,
    IHandler,
    IInterceptor,
    IMethod,
    IMiddleware,
    IServer,
    ITransport,
} from './interfaces.core';

export class RpcServer implements IServer {
    private readonly methods: Map<string, IMethod>;

    constructor(private readonly transport: ITransport, methods: IMethod[]) {
        this.methods = methods.reduce((acc, method) => acc.set(method.name, method), new Map());
        this.transport.on('message', this.onMessage.bind(this));
    }

    on(name: string, ...handlers: (IMiddleware | IErrorHandler | IHandler)[]): IServer {
        const middlewares: IMiddleware[] = [];
        let handler: IHandler | null = null;
        let errorHandler: IErrorHandler | null = null;

        handlers.forEach(func => {
            switch (func.length) {
                case COUNT_OF_ARGS_HANDLER:
                    handler = func as IHandler;
                    break;
                case COUNT_OF_ARGS_MIDDLEWARE:
                    middlewares.push(func as IMiddleware);
                    break;
                case COUNT_OF_ARGS_ERROR_HANDLER:
                    errorHandler = func as IErrorHandler;
                    break;
                default:
                    throw Error('function has unexpected count of arguments');
            }
        });

        if (!handler) {
            throw new Error(`${name}'s handler is not defined`);
        }

        this.methods.set(name, { name, handler, errorHandler, middlewares, interceptors: [] });

        return this;
    }

    intercept(name: string, ...interceptors: IInterceptor[]): RpcServer {
        const method = this.methods.get(name);

        if (!method) {
            throw new Error('use before intercept method "on"');
        }

        this.methods.set(name, { ...method, interceptors: [...method.interceptors, ...interceptors] });
        return this;
    }

    listen(): Promise<void>;
    listen(cb: () => void): void;
    listen(cb?: () => void): void | Promise<void> {
        if (cb) {
            this.transport
                .listen()
                .then(() => cb());

            return undefined;
        }

        return this.transport.listen();
    }

    close() {
        return this.transport.close();
    }

    private async onMessage(ctx: ICtx): Promise<void> {
        const method = this.methods.get(ctx.method);

        if (!method) {
            return ctx.error(-32601, 'method not found');
        }

        return this.handel(ctx, method);
    }

    private async handel(ctx: ICtx, method: IMethod) {
        const { errorHandler, middlewares, interceptors } = method;
        let indexOfMiddleware = 0;
        let indexOfInterceptor = 0;

        // @ts-ignore
        const json = (result: object) => {
            const interceptor: IInterceptor | undefined = interceptors[indexOfInterceptor];

            if (interceptor) {
                indexOfInterceptor += 1;
                return interceptor(ctx, result, (o = result) => json(o));
            }

            return ctx.json(result);
        };

        const next = () => {
            const middleware: IMiddleware | undefined = middlewares[indexOfMiddleware];

            if (middleware) {
                indexOfMiddleware += 1;
                return middleware(ctx, next);
            }

            return method.handler({ ...ctx, json });
        };

        try {
            return await next();
        } catch (err) {
            if (errorHandler) errorHandler(err, ctx, () => undefined);
            throw err;
        }
    }
}
