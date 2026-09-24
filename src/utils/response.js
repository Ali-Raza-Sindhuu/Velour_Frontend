/**
 * Standard API response formatter
 */

export const sendResponse = (res, statusCode, success, data = null, message = null, pagination = null) => {
  const response = {
    success
  };

  if (message) response.message = message;
  
  // To stay backward compatible with existing frontend expecting "id" directly at the root in some POST/PUT
  if (data && data.insertId !== undefined) {
      response.id = data.insertId;
  } else if (data) {
      response.data = data;
  }

  if (pagination) response.pagination = pagination;

  return res.status(statusCode).json(response);
};

export const sendSuccess = (res, data = null, message = null, statusCode = 200, pagination = null) => {
  return sendResponse(res, statusCode, true, data, message, pagination);
};

export const sendCreated = (res, data = null, message = null) => {
  return sendResponse(res, 201, true, data, message);
};

export const sendError = (res, message = "Internal Server Error", statusCode = 500, data = null) => {
  return sendResponse(res, statusCode, false, data, message);
};
