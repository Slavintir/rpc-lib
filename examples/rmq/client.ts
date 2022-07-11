import { RpcClient, RmqClient } from '../../src';

const client = new RpcClient(() => new RmqClient('math', { username: 'guest', password: 'guest' }));

(async () => {
    const response = await client.call('math.sum', { numbers: [1, 2, 3] });
    console.log(response.result);
    await client.close();
})();
