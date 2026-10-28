import {droppedFiles, hasDraggedFiles, isImageFile, pastedFiles} from "./fileDrop";

describe('fileDrop', () => {
  const file = new File(['x'], 'a.png', {type: 'image/png'});

  function transfer(...files: File[]): DataTransfer {
    const data = new DataTransfer();
    files.forEach((item) => data.items.add(item));
    return data;
  }

  it('reads files from drops and pastes', () => {
    expect(droppedFiles(new DragEvent('drop', {dataTransfer: transfer(file)}))).toEqual([file]);
    expect(pastedFiles(new ClipboardEvent('paste', {clipboardData: transfer(file)}))).toEqual([file]);
  });

  it('detects drags that carry files', () => {
    const text = new DataTransfer();
    text.setData('text/plain', 'hello');

    expect(hasDraggedFiles(new DragEvent('dragover', {dataTransfer: transfer(file)}))).toBeTrue();
    expect(hasDraggedFiles(new DragEvent('dragover', {dataTransfer: text}))).toBeFalse();
  });

  it('only treats previewable image types as images', () => {
    expect(isImageFile(file)).toBeTrue();
    expect(isImageFile(new File(['x'], 'a.svg', {type: 'image/svg+xml'}))).toBeFalse();
  });
});
