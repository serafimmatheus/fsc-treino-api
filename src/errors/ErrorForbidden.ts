export class ErrorForbidden extends Error {
  statusCode: number;

  constructor(message: string) {
    super(message);
    this.name = "ErrorForbidden";
    this.statusCode = 403;
  }
}
