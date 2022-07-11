/* eslint-disable import/no-extraneous-dependencies */
import { EventEmitter } from 'events';
import { RpcError } from './error.core';

export type IPayload = string | object | object[];

export interface ICtx<M = any, P = any> {
    method: string;
    content: Buffer;
    params: P;
    msg?: M;
    end(o: string): void;
    json(o: object | number | string | (object | number | string)[]): void;
    error(err: RpcError): void;
}

export interface IMiddleware {
    (ctx: ICtx, next: () => void): Promise<void> | void;
}

export interface IUseMiddleware {
    use(ctx: ICtx, next: () => void): Promise<void> | void;
}

export interface IJsonInterceptor {
    intercept(ctx: ICtx, result: any, next: (result: any) => void): Promise<void> | void;
}

export interface IHandler {
    (ctx: ICtx): Promise<void> | void
}

export interface IInterceptor {
    (ctx: ICtx, result: any, next: (result: any) => void): Promise<void> | void;
}

export interface IErrorHandler {
    (err: any, ctx: ICtx, next: () => undefined): Promise<void> | void
}

export interface IServer {
    on(method: string, handler: IHandler, ...middlewares: IMiddleware[]): IServer;
    intercept(method: string, ...interceptors: IInterceptor[]): IServer;
    listen: {
        (cb: () => void): void;
        (): Promise<void>;
    }
    close(): Promise<void>;
}

export interface IClient {
    call(method: string, payload: any): Promise<any>;
    close(): Promise<void>;
}

export interface IMethod {
    name: string;
    handler: IHandler;
    middlewares: IMiddleware[];
    interceptors: IInterceptor[];
    errorHandler?: IErrorHandler | null;
}

export interface RequestHandler {
    (ctx: ICtx): Promise<void> | void
}

export interface ITransport extends EventEmitter {
    listen: () => Promise<void>;
    close: () => Promise<void>;
}

export interface Newable<T = {}> {
    new (args?: any): T
}

export interface IControllerMeta extends Newable {
    prefix?: string;
    $methods: { [methodName: string]: IMethod };
    $params: { [methodName: string]: { key: string, type: Newable | null }[] };
}
