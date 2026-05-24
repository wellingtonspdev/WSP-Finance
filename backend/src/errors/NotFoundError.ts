import { AppError } from './AppError';

export class NotFoundError extends AppError {
  constructor(message = 'Recurso não encontrado.') {
    super(message, 404);
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}
