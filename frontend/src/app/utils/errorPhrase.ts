import {ERROR_CODES_BY_DOMAIN, ErrorCode, ErrorDomain} from "@config/errorCodes";

const DOMAIN_BY_CODE = new Map<string, ErrorDomain>(
  (Object.entries(ERROR_CODES_BY_DOMAIN) as [ErrorDomain, readonly string[]][])
    .flatMap(([domain, codes]) => codes.map((code) => [code, domain] as const))
);

export function errorPhrase(code: ErrorCode): string {
  return `ERRORS.${DOMAIN_BY_CODE.get(code)}.${code}`;
}
