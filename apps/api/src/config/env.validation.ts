import { z } from 'zod';

const envSchema = z.object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(3000),
    DB_HOST: z.string().min(1),
    DB_PORT: z.coerce.number().int().positive().default(1433),
    DB_USER: z.string().min(1),
    DB_PASSWORD: z.string().min(1),
    DB_NAME: z.string().min(1)
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>) : Env {
    const result = envSchema.safeParse(config);

    if (!result.success) {
        throw new Error (
            `Invalid environment variables:\n${z.prettifyError(result.error)}`
        );
    }

    return result.data;
}