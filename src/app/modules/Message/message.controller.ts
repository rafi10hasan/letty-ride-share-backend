import { RequestHandler } from 'express';
import httpStatus from 'http-status';

import asyncHandler from '../../../shared/asynchandler';
import sendResponse from '../../../shared/sendResponse';
import { TChatImages } from './message.interface';
import { MessageServices } from './message.service';

const newMessage: RequestHandler = asyncHandler(async (req, res) => {
  const files = req.files as TChatImages
  console.log(files)
  const result = await MessageServices.newMessageIntoDb(
    req.user,
    req.body,
    files
  );

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Successfully Send By The Message',
    data: result,
  });
});

const updateMessageById: RequestHandler = asyncHandler(async (req, res) => {
  const { messageId } = req.params;
  console.log(req.body)
  const result = await MessageServices.updateMessageByIdIntoDb(
    messageId,
    req.body.text,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Message updated successfully',
    data: result,
  });
});

const deleteMessageById: RequestHandler = asyncHandler(async (req, res) => {
  const result = await MessageServices.deleteMessageByIdIntoDb(
    req.params.messageId,
    req.body
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Successfully Delete Message',
    data: result,
  });
});

export const MessageController = {
  newMessage,
  updateMessageById,
  deleteMessageById,
};
