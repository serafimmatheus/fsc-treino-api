export class ErrorConflict extends Error {
  statusCode: number;

  constructor(message: string) {
    super(message);
    this.name = "ErrorConflict";
    this.statusCode = 409;
  }
}
