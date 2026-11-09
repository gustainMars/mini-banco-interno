import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from "@nestjs/common";
import type { Request, Response } from 'express';
import { randomUUID } from "node:crypto";
import { STATUS_CODES } from "node:http";

type HttpErrorBody = {
    error?: string;
    message?: string | string[];
}

export const UNEXPECTED_ERROR_MESSAGE = 'Erro interno inesperado.';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
    private readonly logger = new Logger(AllExceptionsFilter.name);

    catch(exception: unknown, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest<Request>();
        
        const correlationId = request.header('x-correlation-id') ?? randomUUID();

        let status: number = HttpStatus.INTERNAL_SERVER_ERROR;
        let error = 'Internal Server Error';
        let message: string | string[] = UNEXPECTED_ERROR_MESSAGE;

        if (exception instanceof HttpException) {
            status = exception.getStatus();
            const body = exception.getResponse();

            if (typeof body === 'string') {
                message = body;
                error = STATUS_CODES[status] ?? 'Error';
            } else {
                const errorBody = body as HttpErrorBody;
                message = errorBody.message ?? exception.message;
                error = errorBody.error ?? STATUS_CODES[status] ?? 'Error';
            }
        } else {
            const stack = exception instanceof Error ? exception.stack : String(exception);
            this.logger.error(`[${correlationId}] Unhandled exception`, stack);
        }

        response
            .status(status)
            .json({
                statusCode: status,
                error,
                message,
                path: request.url,
                timestamp: new Date().toISOString(),
                correlationId,
            });
    }
}