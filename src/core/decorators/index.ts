import { IControllerMeta, IJsonInterceptor, IUseMiddleware, Newable } from '../interfaces.core';

export function Controller(prefix: string) {
    return (constructor: Newable) => class extends constructor {
        prefix = prefix;
    };
}

export function Use(middleware: Newable<IUseMiddleware>) {
    return (target: IControllerMeta, propertyKey: string) => {
        if (!target.$methods[propertyKey]) {
            throw new Error(`you should decorate "${propertyKey}" as @Method()`);
        }

        // @ts-ignore
        // eslint-disable-next-line new-cap
        const instance = new middleware();
        target.$methods[propertyKey].middlewares.push(instance.use.bind(instance));
    };
}

export function Params() {
    return (target: IControllerMeta, propertyKey: string, parameterIndex: number) => {
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
    return (target: IControllerMeta, propertyKey: string, parameterIndex: number) => {
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
    return (target: IControllerMeta, propertyKey: string, parameterIndex: number) => {
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
    return (target: IControllerMeta, propertyKey: string, parameterIndex: number) => {
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
    return (target: IControllerMeta, propertyKey: string) => {
        if (!target.$methods[propertyKey]) {
            throw new Error(`you should decorate "${propertyKey}" as @Method()`);
        }

        // @ts-ignore
        // eslint-disable-next-line new-cap
        const instance = new interceptor();
        target.$methods[propertyKey].interceptors.push(instance.intercept.bind(instance));
    };
}

export { Method } from './method.decorator';
