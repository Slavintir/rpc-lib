import { validate } from 'class-validator';
import { ICtx, IJsonInterceptor, IMethod, IUseMiddleware, Newable } from './interfaces.core';

export function Controller(prefix: string) {
    return (constructor: any): any => class extends constructor {
        prefix = prefix;
    };
}

export function Use(middleware: Newable<IUseMiddleware>) {
    return (target: any, propertyKey: string) => {
        if (!target.$methods[propertyKey]) {
            throw new Error(`you should decorate "${propertyKey}" as @Method()`);
        }

        // @ts-ignore
        // eslint-disable-next-line new-cap
        const instance = new middleware();
        target.$methods[propertyKey].middlewares.push(instance.use.bind(instance));
    };
}

export function Method(name: string) {
    return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
        if (!target.$methods) {
            Object.assign(target, { $methods: {} });
        }

        const method: IMethod = {
            name,
            middlewares: [],
            interceptors: [],
            async handler(ctx: ICtx) {
                const paramsPromises = target.$params[propertyKey].map(({ key, type: Type }: any) => {
                    switch (key) {
                        case 'ctx':
                            return { value: ctx, hasType: false };

                        case 'msg':
                            return { value: ctx.msg, hasType: false };

                        case 'params':
                            return {
                                value: Type ? new Type(ctx.params) : ctx.params,
                                hasType: !!Type,
                            };

                        case 'headers':
                            return {
                                value: Type ? new Type(ctx.msg?.properties.headers) : ctx.msg?.properties.headers,
                                hasType: !!Type,
                            };

                        default:
                            return { value: null, hasType: false };
                    }
                }).map(async ({ value, hasType }: any) => ({
                    value,
                    errors: hasType ? await validate(value) : [],
                }));

                const params = await Promise.all(paramsPromises);
                const errors = params.filter((p: any) => p.errors.length);

                if (!errors.length) {
                    const result = await descriptor.value.call(target, ...params.map((p: any) => p.value));
                    return ctx.json(result);
                }

                if (this.errorHandler) {
                    return this.errorHandler(errors, ctx, () => undefined);
                }

                return ctx.error(0, 'bad_request');
            },
        };

        Object.assign(target.$methods, { [propertyKey]: method });
    };
}

export function Params() {
    return (target: any, propertyKey: string, parameterIndex: number) => {
        if (!target.$params) {
            Object.defineProperty(target, '$params', { value: { [propertyKey]: [] } });
        }

        if (!target.$params[propertyKey]) {
            Object.defineProperty(target.$params, propertyKey, { value: [] });
        }

        const paramTypes = Reflect.getMetadata('design:paramtypes', target, propertyKey);

        if (paramTypes) {
            target.$params[propertyKey].push({ key: 'params', type: paramTypes[parameterIndex] });
        }
    };
}

export function Ctx() {
    return (target: any, propertyKey: string, parameterIndex: number) => {
        if (!target.$params) {
            Object.defineProperty(target, '$params', { value: { [propertyKey]: [] } });
        }

        if (!target.$params[propertyKey]) {
            Object.defineProperty(target.$params, propertyKey, { value: [] });
        }

        target.$params[parameterIndex].push({ key: 'ctx', type: null });
    };
}

export function Msg() {
    return (target: any, propertyKey: string, parameterIndex: number) => {
        if (!target.$params) {
            Object.defineProperty(target, '$params', { value: { [propertyKey]: [] } });
        }

        if (!target.$params[propertyKey]) {
            Object.defineProperty(target.$params, propertyKey, { value: [] });
        }

        target.$params[parameterIndex].push({ key: 'msg', type: null });
    };
}

export function Headers() {
    return (target: any, propertyKey: string, parameterIndex: number) => {
        if (!target.$params) {
            Object.defineProperty(target, '$params', { value: { [propertyKey]: [] } });
        }

        if (!target.$params[propertyKey]) {
            Object.defineProperty(target.$params, propertyKey, { value: [] });
        }

        target.$params[parameterIndex].push({ key: 'headers', type: null });
    };
}

export function Intercept(interceptor: Newable<IJsonInterceptor>) {
    return (target: any, propertyKey: string) => {
        if (!target.$methods[propertyKey]) {
            throw new Error(`you should decorate "${propertyKey}" as @Method()`);
        }

        // @ts-ignore
        // eslint-disable-next-line new-cap
        const instance = new interceptor();
        target.$methods[propertyKey].interceptors.push(instance.intercept.bind(instance));
    };
}
