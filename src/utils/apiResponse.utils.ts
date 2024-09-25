/* eslint-disable @typescript-eslint/no-explicit-any */
export type ControllerResponse = {
  isSuccess: number;
  statusCode: number;
  message: string;
  data?: any;
  error?: any;
};

export const APIResponse = {
  create: (
    isSuccess: number,
    statusCode: number,
    message?: string,
    data?: any,
    error?: any,
  ): ControllerResponse => {
    const response: ControllerResponse = { isSuccess, statusCode, message };
    if (error) {
      response.error = error;
    } else if (!error && data) {
      response.data = data;
    } else {
      response.data = {};
    }

    return response;
  },
};
