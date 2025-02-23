import { isEmpty } from 'lodash';

type Callback = (event: KeyboardEvent) => void;
type Node = { [key: string]: Node } & { callback?: Callback };

class SequenceKeyListener {
  root: Node;
  current: Node;
  lastKeyAt: number;
  target: Document;
  keyDownHandler: Callback;
  constructor(target: Document) {
    this.root = {};
    this.current = this.root;
    this.lastKeyAt = 0;
    this.target = target;
    this.keyDownHandler = this._keyDownHandler.bind(this);
  }

  bind(sequence: string[] | string, callback: Callback): void {
    if (this.target && isEmpty(this.root))
      this.target.addEventListener('keydown', this.keyDownHandler);

    sequence = Array.isArray(sequence) ? sequence : sequence.split('');
    let obj: Node = this.root;
    for (let i = 0; i < sequence.length; i++) {
      const key = sequence[i];
      if (obj[key] == null) obj[key] = {};
      obj = obj[key];

      if (obj.callback)
        throw new Error(
          `Cannot bind sequence ${sequence}: ${sequence.slice(
            0,
            i,
          )} already bound`,
        );
    }

    if (Object.keys(obj).length > 0)
      throw new Error(`Other sequence starting with ${sequence} already bound`);
    obj.callback = callback;
  }

  unbind(sequence: string[] | string, obj?: Node, index: number = 0): void {
    sequence = Array.isArray(sequence) ? sequence : sequence.split('');
    obj = obj || this.root;
    if (index >= sequence.length) {
      if (obj.callback) {
        delete obj.callback;
        return;
      }
    } else {
      const c = sequence[index];
      if (obj[c] != null) {
        this.unbind(sequence, obj[c], index + 1);
        if (Object.keys(obj[c]).length === 0) {
          delete obj[c];
        }
        if (this.target && isEmpty(this.root))
          this.target.removeEventListener('keydown', this.keyDownHandler);
        return;
      }
    }

    throw new Error('Cannot unbind missing sequence ' + sequence);
  }

  _keyDownHandler(event: KeyboardEvent): void {
    const { key, target, altKey, ctrlKey, metaKey } = event;
    if (
      key !== 'Escape' &&
      target instanceof HTMLInputElement &&
      (target.getAttribute('type') === 'text' ||
        target.getAttribute('type') == null)
    )
      return; // Ignore keys while typing in some <input, except the Escape key to unfocus
    if (altKey || ctrlKey || metaKey) {
      this.lastKeyAt = 0;
      return; // Ignore all combinations with modifier keys
    }

    const now = Date.now();
    if (now - this.lastKeyAt > 1000) this.current = this.root;

    this.lastKeyAt = now;
    this.current = this.current[key] || this.root[key] || this.root;
    if (this.current.callback) {
      event.preventDefault();
      this.current.callback(event);
      this.current = this.root;
    }
  }
}

export const listener = new SequenceKeyListener(window.document);
