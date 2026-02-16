import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';

const notFound = (req: Request, res: Response): void => {
  const url = req.url
  console.log(url)
  res.status(StatusCodes.NOT_FOUND).json({
    status: "failed",
    statusCode: StatusCodes.NOT_FOUND,
    message: `${url} - Route doesn't exist`,
  });
};

export default notFound;
