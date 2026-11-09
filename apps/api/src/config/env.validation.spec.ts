import { validateEnv } from './env.validation';

const validEnv = {
    NODE_ENV: 'test',
    PORT: '3000',
    DB_HOST: 'localhost',
    DB_PORT: '1433',
    DB_USER: 'sa',
    DB_PASSWORD: 'Str0ng!Passw0rd',
    DB_NAME: 'mini_bank',
};

describe('Validação das variáveis de ambiente', () => {

    it('validateEnv está ok, retorna configuração tipada', () => {
        const env = validateEnv(validEnv);

        expect(env.PORT).toBe(3000);
        expect(env.DB_PORT).toBe(1433);
    });

    it('validateEnv sem DB_NAME, deve lançar exceção', () => {
        const envSemDbName = { ...validEnv, DB_NAME: undefined };

        expect(() => validateEnv(envSemDbName)).toThrow('DB_NAME');
    });

    it('validateEnv PORT com valor incorreto, deve lançar exceção', () => {
        const envPortaInvalida = { ...validEnv, PORT: 'abc' };

        expect(() => validateEnv(envPortaInvalida)).toThrow('PORT');
    });

    it('validateEnv sem NODE_ENV e PORT, retorna configuração tipada e valores default', () => {
        const envSemNodeEnvEPort = { ...validEnv, PORT: undefined, NODE_ENV: undefined };
        const env = validateEnv(envSemNodeEnvEPort);

        expect(env.NODE_ENV).toBe('development');
        expect(env.PORT).toBe(3000);
    });
});