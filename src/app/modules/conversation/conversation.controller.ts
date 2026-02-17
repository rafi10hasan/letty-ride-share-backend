import { RequestHandler } from 'express';
import httpStatus from 'http-status';
import asyncHandler from '../../../shared/asynchandler';
import sendResponse from '../../../shared/sendResponse';
import { ConversationService } from './conversation.service';


const getChatList: RequestHandler = asyncHandler(async (req, res) => {
  const result = await ConversationService.getConversation(
    req?.user?.id,
    req.query
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Conversation retrieved successfully',
    data: result,
  });
});

export const ConversationController = {
  getChatList,
};
