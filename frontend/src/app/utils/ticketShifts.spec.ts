import {shiftedPosition} from "./ticketShifts";
import {TicketShift} from "@models/ticket.model";

describe('shiftedPosition', () => {
  it('shifts positions inside a closed range, including both ends', () => {
    const shifts: TicketShift[] = [{columnId: 4, fromPosition: 1, toPosition: 3, delta: 1}];

    expect([0, 1, 2, 3, 4].map((position) => shiftedPosition(position, 4, shifts))).toEqual([0, 2, 3, 4, 4]);
  });

  it('shifts every position from the start of an open range', () => {
    const shifts: TicketShift[] = [{columnId: null, fromPosition: 2, toPosition: null, delta: -1}];

    expect([1, 2, 50].map((position) => shiftedPosition(position, null, shifts))).toEqual([1, 1, 49]);
  });

  it('applies each range of a group to its own positions only once', () => {
    const shifts: TicketShift[] = [
      {columnId: 4, fromPosition: 4, toPosition: 6, delta: -1},
      {columnId: 4, fromPosition: 8, toPosition: 9, delta: -2},
      {columnId: 4, fromPosition: 11, toPosition: null, delta: -3},
    ];

    expect([0, 4, 6, 8, 9, 11, 12].map((position) => shiftedPosition(position, 4, shifts))).toEqual([0, 3, 5, 6, 7, 8, 9]);
  });

  it('leaves other groups alone', () => {
    const shifts: TicketShift[] = [{columnId: 4, fromPosition: 0, toPosition: null, delta: 1}];

    expect(shiftedPosition(2, null, shifts)).toBe(2);
    expect(shiftedPosition(2, 5, shifts)).toBe(2);
  });
});
