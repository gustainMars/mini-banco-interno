Object.assign(process.env, {
    NODE_ENV: 'test',
    PORT: '3000',
    DB_HOST: 'localhost',
    DB_PORT: '1433',
    DB_USER: 'sa',
    DB_PASSWORD: 'Str0ng!Passw0rd',
    DB_NAME: 'mini_bank',
});