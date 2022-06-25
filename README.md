# rpc lib

## Example client

```ts
import 'reflect-metadata';
import { IsInt } from 'class-validator';
import { plainToInstance } from 'class-transformer';

import {
    AppFactory,
    Transport,
    Controller,
    Method,
    Params,
    Use,
    Intercept,
    ICtx,
    IJsonInterceptor,
    IUseMiddleware,
} from '../src';

class SumRequestDto {
    @IsInt()
    public readonly a: number;

    @IsInt()
    public readonly b: number;

    constructor(data?: SumRequestDto) {
        if (data) {
            Object.assign(this, plainToInstance(SumRequestDto, data));
        }
    }
}

class LoggerMiddleware implements IUseMiddleware {
    use(ctx: ICtx, next: () => void) {
        console.log(`${ctx.method}_req =>`, ctx.params);
        next();
    }
}

class LoggerInterceptor implements IJsonInterceptor {
    intercept(ctx: ICtx, result: any, next: Function): void {
        console.log(`${ctx.method}_res =>`, result);
        next();
    }
}

@Controller('math')
class MathController {
    @Use(LoggerMiddleware)
    @Intercept(LoggerInterceptor)
    @Method('sum')
    sum(@Params() params: SumRequestDto) {
        return params.a + params.b;
    }
}

async function main() {
    const app = AppFactory.createMicroservice({
        type: Transport.RMQ,
        params: {
            serviceName: 'math',
            connect: { password: 'guest', username: 'guest' },
        },
        controllers: [MathController],
    });

    app.listen(() => {
        console.log('rmq server listening');
    });
}

main();
```

## Example service

```ts
import { RpcClient } from '../src/core/client.core';
import { RmqClient } from '../src/transports/rmq';

async function main() {
    const rmqClient = new RmqClient('math', { username: 'guest', password: 'guest' });
    const rpc = new RpcClient(rmqClient);
    await rpc.call('math.sum', { a: 1, b: 2 });

    const t = Date.now();
    const promises = new Array(1)
        .map((v, index) => rpc.call('math.sum', { a: index, b: 2 }));

    const res = await Promise.all(promises);
    console.log(res.slice(100, 110), (Date.now() - t) / 1000);
}

main();
```
