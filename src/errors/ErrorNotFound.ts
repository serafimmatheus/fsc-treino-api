export class ErrorNotFound extends Error {
  statusCode: number;

  constructor(message: string) {
    super(message);
    this.name = "ErrorNotFound";
    this.statusCode = 404;
  }
}
