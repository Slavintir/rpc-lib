import { validate } from 'class-validator';
import { RpcError, RpcErrorCore } from '../error.core';
import { IControllerMeta, ICtx, IMethod, Newable } from '../interfaces.core';

type Key = keyof typeof keysList;

const keysList = {
    ctx: (ctx: ICtx) => ({ value: ctx, hasType: false }),
    msg: (ctx: ICtx) => ({ value: ctx.msg, hasType: false }),
    params: (ctx: ICtx, Type: Newable<any>) => ({
        value: Type ? new Type(ctx.params) : ctx.params,
        hasType: !!Type,
    }),
    header: (ctx: ICtx, Type: Newable<any>) => ({
        value: Type ? new Type(ctx.msg?.properties.headers) : ctx.msg?.properties.headers,
        hasType: !!Type,
    }),
    _: () => ({ value: null, hasType: false }),
};

const processKey = (ctx: ICtx) => (
    ({ key, type }: { key: string, type: any }) => (keysList[key as Key] || keysList._)(ctx, type)
);

export function Method(name: string): any {
    return (target: IControllerMeta, propertyKey: string, descriptor: PropertyDescriptor) => {
        if (!target.$methods) {
            Object.assign(target, { $methods: {} });
        }

        const method: IMethod = {
            name,
            middlewares: [],
            interceptors: [],
            async handler(ctx: ICtx) {
                const paramsPromises = target.$params[propertyKey]
                    .map(v => processKey(ctx)(v))
                    .map(async ({ value, hasType }) => ({
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

                return ctx.error(new RpcError(RpcErrorCore.InvalidRequest));
            },
        };

        Object.assign(target.$methods, { [propertyKey]: method });
    };
}
