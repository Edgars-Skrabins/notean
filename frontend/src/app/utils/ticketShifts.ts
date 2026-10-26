import {TicketShift} from "@models/ticket.model";

export function shiftedPosition(position: number, columnId: number | null, shifts: TicketShift[]): number {
  const shift = shifts.find((item) => item.columnId === columnId
    && position >= item.fromPosition
    && (item.toPosition === null || position <= item.toPosition));
  return shift ? position + shift.delta : position;
}
