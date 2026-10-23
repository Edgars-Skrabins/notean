import {EscapeService} from "@services/escape.service";

export interface EscapeServiceStub {
  service: EscapeService;
  handlers: (() => void)[];
  press: () => void;
}

export function escapeServiceStub(): EscapeServiceStub {
  let handlers: (() => void)[] = [];
  const service = {
    push: (handler: () => void) => {
      handlers.push(handler);
      return () => {
        handlers = handlers.filter((item) => item !== handler);
      };
    },
  } as unknown as EscapeService;
  return {
    service,
    get handlers() {
      return handlers;
    },
    press: () => handlers[handlers.length - 1]?.(),
  };
}
