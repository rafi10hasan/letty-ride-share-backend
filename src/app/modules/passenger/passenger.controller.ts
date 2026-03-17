import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import sendResponse from '../../../shared/sendResponse';

import asyncHandler from '../../../shared/asynchandler';
import { passengerService } from './passenger.service';



const createPassengerProfileIntoDb = asyncHandler(async (req: Request, res: Response) => {
  const result = await passengerService.createPassengerProfile(req.user, req.body);
  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: 'Passenger profile has been created successfully',
    data: result,
  });
});


const updatePassengerProfileIntoDb = asyncHandler(async (req: Request, res: Response) => {
  const result = await passengerService.updatePassengerProfile(req.user, req.body);
  // console.log(result);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Driver profile has been updated successfully',
    data: result,
  });
});


const getPassengerProfileIntoDb = asyncHandler(async (req: Request, res: Response) => {
  const result = await passengerService.updatePassengerProfile(req.user, req.body);
  // console.log(result);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Passenger profile has been retrieved successfully',
    data: result,
  });
});


const passengerUpcomingRides = async (req: Request, res: Response) => {
    const rides = await passengerService.getPassengerUpcomingRides(req.user);

    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: 'Upcoming rides fetched successfully',
        data: rides,
    });
};

const passengerOngoingRides = async (req: Request, res: Response) => {
    const ride = await passengerService.getPassengerOngoingRide(req.user);

    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: 'Ongoing ride fetched successfully',
        data: ride,
    });
};

const passengerCompletedRides = async (req: Request, res: Response) => {
    const rides = await passengerService.getPassengerCompletedRides(req.user);

    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: 'Completed rides fetched successfully',
        data: rides,
    });
};

// publish ride into db


export const passengerController = {
  createPassengerProfileIntoDb,
  updatePassengerProfileIntoDb,
  getPassengerProfileIntoDb,
  passengerUpcomingRides,
  passengerOngoingRides,
  passengerCompletedRides
};

/*



*/