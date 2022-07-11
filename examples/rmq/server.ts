/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable max-classes-per-file */
import 'reflect-metadata';
import { IsArray, IsNumber, validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { Message } from 'amqplib';

import {
    AppFactory,
    Transporter,
    Controller,
    Params,
    Intercept,
    IJsonInterceptor,
    ICtx,
    RpcError,
    RpcErrorCore,
    Method,
    IUseMiddleware,
} from '../../src';

class ValidateInterceptor implements IJsonInterceptor {
    async intercept(ctx: ICtx<any>, result: any, next: Function) {
        const errors = await validate(result);

        if (errors.length) {
            const error = new RpcError(RpcErrorCore.InvalidParams, 'validation_error', errors);
            return ctx.error(error);
        }

        return next();
    }
}

class LoggerMiddleware implements IUseMiddleware {
    async use(ctx: ICtx<Message>, next: () => void) {
        if (ctx.msg) {
            const { headers } = ctx.msg.properties;
            const { method, params } = ctx;
            console.debug('req =>', { method, params, headers });
        }

        return next();
    }
}

class MathSumParamsDto {
    constructor(data: MathSumResultDto) {
        if (data) {
            Object.assign(this, plainToInstance(MathSumParamsDto, data));
        }
    }

    @IsNumber({}, { each: true })
    readonly numbers: number[];
}

class MathSumResultDto {
    constructor(data: MathSumResultDto) {
        if (data) {
            Object.assign(this, plainToInstance(MathSumResultDto, data));
        }
    }

    @IsNumber()
    readonly sum: number;
}

@Controller('math')
class MathController {
    @Intercept(ValidateInterceptor)
    @Method('sum')
    async sum(@Params() params: MathSumParamsDto): Promise<MathSumResultDto> {
        const { numbers } = params;

        return new MathSumResultDto({ sum: numbers.reduce((acc, curr) => (acc + curr), 0) });
    }
}

const app = AppFactory.createMicroservice({
    params: { serviceName: 'math', connect: { username: 'guest', password: 'guest' } },
    transporter: Transporter.RMQ,
    controllers: [MathController],
    middlewares: [LoggerMiddleware],
});

(async () => {
    app.listen(() => console.debug('rmq server has started'));
})();
