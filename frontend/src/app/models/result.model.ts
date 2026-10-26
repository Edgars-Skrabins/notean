import {CommonErrorCode, ErrorCode} from "@config/errorCodes";

export type Failure<E extends ErrorCode = ErrorCode> = { success: false; code: E | CommonErrorCode };

export type Result<T extends object, E extends ErrorCode = CommonErrorCode> = ({ success: true } & T) | Failure<E>;

export type EditConflict<T> = { success: false; code: 'EDIT_CONFLICT'; latest: T };
