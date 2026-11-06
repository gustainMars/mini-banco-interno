import { Test, TestingModule } from '@nestjs/testing';
import { Body, Controller, Get, HttpStatus, INestApplication, Post } from '@nestjs/common';
import { IsInt, IsString, Min } from 'class-validator';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { STATUS_CODES } from 'http';
import { MENSAGEM_ERRO_INESPERADO as UNEXPECTED_ERROR_MESSAGE } from '../src/common/filters/all-exceptions.filter';

class FakeDto { 
    @IsString()
    name: string;

    @IsInt()
    @Min(1)
    quantity: number;
}

@Controller('test-errors')
class FakeController {
    @Post()
    create(@Body() body: FakeDto) {
        return body;
    }

    @Get('boom')
    boom() {
        throw new Error('boom');
    }
}

describe('Formato único de erro (e2e)', () => {
    let app: INestApplication<App>;

    beforeAll(async () => {
        const moduleRef: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
            controllers: [FakeController]
        }).compile();
        
        app = moduleRef.createNestApplication();
        configureApp(app);
        await app.init();
    })

    afterAll(async () => {
        await app.close();
    })

    it('GEt /health retorna 200 com status ok', async () => {
        const res = await request(app.getHttpServer()).get('/health').expect(HttpStatus.OK);

        expect(res.body).toEqual({ status: 'ok' });
    })

    it('rota inexistente retorna 404 no formato único', async () => {
        const res = await request(app.getHttpServer())
            .get('/nao-existe')
            .expect(HttpStatus.NOT_FOUND);

        expect(res.body).toEqual({
            statusCode: HttpStatus.NOT_FOUND,
            error: STATUS_CODES[HttpStatus.NOT_FOUND],
            message: expect.any(String),
            path: '/nao-existe',
            timestamp: expect.any(String),
            correlationId: expect.any(String)
        });
    });

    it('POST com corpo inválido retorna 400 e lista os erros em message', async () => {
        const res = await request(app.getHttpServer())
            .post('/test-errors')
            .send({ name: 123, quantity: 0 })
            .expect(HttpStatus.BAD_REQUEST);

        expect(res.body).toEqual({
            statusCode: HttpStatus.BAD_REQUEST,
            error: STATUS_CODES[HttpStatus.BAD_REQUEST],
            message: expect.arrayContaining([expect.stringContaining('name'), expect.stringContaining('quantity')]),
            path: '/test-errors',
            timestamp: expect.any(String),
            correlationId: expect.any(String)
        });
    });

    it('POST com campo não declarado no DTO retorna 400', async () => {
        const res = await request(app.getHttpServer())
            .post('/test-errors')
            .send({ name: 'book', quantity: 2, price: 21 })
            .expect(HttpStatus.BAD_REQUEST);

        expect(res.body).toEqual({
            statusCode: HttpStatus.BAD_REQUEST,
            error: STATUS_CODES[HttpStatus.BAD_REQUEST],
            message: expect.arrayContaining([expect.stringContaining('price')]),
            path: '/test-errors',
            timestamp: expect.any(String),
            correlationId: expect.any(String)
        });
    });

    it('erro inesperado retorna 500 genérico, sem stack e sem "boom"', async () => {
        const res = await request(app.getHttpServer())
            .get('/test-errors/boom')
            .expect(HttpStatus.INTERNAL_SERVER_ERROR);
        
        expect(res.body).toEqual({
            statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
            error: STATUS_CODES[HttpStatus.INTERNAL_SERVER_ERROR],
            message: UNEXPECTED_ERROR_MESSAGE,
            path: '/test-errors/boom',
            timestamp: expect.any(String),
            correlationId: expect.any(String)
        });
    });

    it('sem header, gera um UUID', async () => {
        const res = await request(app.getHttpServer())
            .get('/nao-existe')
            .expect(HttpStatus.NOT_FOUND);

        expect(res.body.correlationId).toMatch(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/);
    });

    it('devolve o x-correlation-id recebido; com header, retornar mesmo correlationId', async () => {
        const res = await request(app.getHttpServer())
            .get('/nao-existe')
            .set('x-correlation-id', 'teste-id-123')    
            .expect(HttpStatus.NOT_FOUND);

        expect(res.body.correlationId).toBe('teste-id-123');
    });
})