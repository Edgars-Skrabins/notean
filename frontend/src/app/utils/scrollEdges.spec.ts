import {scrollEdges} from "./scrollEdges";

describe('scrollEdges', () => {
  it('reports no edges when the content fits', () => {
    expect(scrollEdges({scrollLeft: 0, clientWidth: 800, scrollWidth: 800})).toEqual({start: false, end: false});
  });

  it('reports only the end at the start of an overflowing row', () => {
    expect(scrollEdges({scrollLeft: 0, clientWidth: 800, scrollWidth: 1400})).toEqual({start: false, end: true});
  });

  it('reports both edges in the middle', () => {
    expect(scrollEdges({scrollLeft: 300, clientWidth: 800, scrollWidth: 1400})).toEqual({start: true, end: true});
  });

  it('reports only the start at the end', () => {
    expect(scrollEdges({scrollLeft: 600, clientWidth: 800, scrollWidth: 1400})).toEqual({start: true, end: false});
  });

  it('treats a sub-pixel difference as no overflow', () => {
    expect(scrollEdges({scrollLeft: 0, clientWidth: 800, scrollWidth: 800.6})).toEqual({start: false, end: false});
    expect(scrollEdges({scrollLeft: 0.5, clientWidth: 800, scrollWidth: 800.5})).toEqual({start: false, end: false});
  });
});
