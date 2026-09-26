export interface FieldError {
  field: string;
  message: string;
}

export class ApiError extends Error {
  readonly statusCode: number;
  readonly errors?: FieldError[];

  constructor(statusCode: number, message: string, errors?: FieldError[]) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.errors = errors;
  }

  static badRequest(message = 'Bad request', errors?: FieldError[]) {
    return new ApiError(400, message, errors);
  }
  static unauthorized(message = 'Authentication required') {
    return new ApiError(401, message);
  }
  static forbidden(message = 'You do not have permission to perform this action') {
    return new ApiError(403, message);
  }
  static notFound(message = 'Resource not found') {
    return new ApiError(404, message);
  }
  static conflict(message = 'Conflict', errors?: FieldError[]) {
    return new ApiError(409, message, errors);
  }
  static unprocessable(message = 'Validation failed', errors?: FieldError[]) {
    return new ApiError(422, message, errors);
  }
  static tooMany(message = 'Too many requests, please try again later') {
    return new ApiError(429, message);
  }
}
