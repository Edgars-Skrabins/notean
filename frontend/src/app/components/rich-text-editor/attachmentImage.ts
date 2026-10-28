import {Node} from '@tiptap/core';

export interface AttachmentImageOptions {
  resolveUrl: (attachmentId: number) => Promise<string | null>;
}

export const AttachmentImage = Node.create<AttachmentImageOptions>({
  name: 'attachmentImage',
  group: 'block',
  atom: true,
  draggable: true,

  addOptions() {
    return {
      resolveUrl: () => Promise.resolve(null),
    };
  },

  addAttributes() {
    return {
      attachmentId: {
        default: null,
        parseHTML: (element) => Number(element.getAttribute('data-attachment-id')) || null,
        renderHTML: (attributes) => attributes['attachmentId'] ? {'data-attachment-id': attributes['attachmentId']} : {},
      },
      alt: {
        default: null,
        parseHTML: (element) => element.getAttribute('alt'),
        renderHTML: (attributes) => attributes['alt'] ? {alt: attributes['alt']} : {},
      },
      uploadKey: {
        default: null,
        rendered: false,
        parseHTML: () => null,
      },
    };
  },

  parseHTML() {
    return [{tag: 'img[data-attachment-id]'}];
  },

  renderHTML({HTMLAttributes}) {
    return ['img', HTMLAttributes];
  },

  addNodeView() {
    return ({node}) => {
      const dom = document.createElement('div');
      dom.className = 'attachmentImage attachmentImage--loading';
      const image = document.createElement('img');
      image.className = 'attachmentImage__image';
      dom.append(image);

      let shownId: number | null = null;
      const show = (attachmentId: number | null, alt: string | null) => {
        image.alt = alt ?? '';
        if (attachmentId === shownId) {
          return;
        }
        shownId = attachmentId;
        dom.classList.add('attachmentImage--loading');
        image.removeAttribute('src');
        if (attachmentId === null) {
          return;
        }
        this.options.resolveUrl(attachmentId).then((url) => {
          if (url && shownId === attachmentId) {
            image.src = url;
            dom.classList.remove('attachmentImage--loading');
          }
        });
      };

      show(node.attrs['attachmentId'], node.attrs['alt']);

      return {
        dom,
        update: (updated) => {
          if (updated.type !== node.type) {
            return false;
          }
          show(updated.attrs['attachmentId'], updated.attrs['alt']);
          return true;
        },
      };
    };
  },
});
