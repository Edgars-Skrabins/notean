import {CommonErrorCode, ErrorCode} from "@config/errorCodes";

export type Failure<E extends ErrorCode = ErrorCode> = { success: false; code: E | CommonErrorCode };

export type Result<T extends object, E extends ErrorCode = CommonErrorCode> = ({ success: true } & T) | Failure<E>;
