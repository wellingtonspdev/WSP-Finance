import { AppError } from './AppError';

export class ServiceUnavailableError extends AppError {
  constructor(message = 'Serviço temporariamente indisponível.') {
    super(message, 503);
    Object.setPrototypeOf(this, ServiceUnavailableError.prototype);
  }
}
