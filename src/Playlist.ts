import MoodyBlues from "./index";

class Playlist {
  private _list: MoodyBlues.Clip[] = [];
  private _index = -1;

  get size() {
    return this._list.length;
  }

  get currentClip() {
    if (this._index < 0 || this.size <= this._index) {
      return null;
    }
    return this._list[this._index];
  }

  clear() {
    this._list = [];
    this._index = -1;
  }

  set(clips: MoodyBlues.Clip | MoodyBlues.Clip[]) {
    clips = this._wrap(clips);
    this._list = clips;
    this._index = -1;
  }

  push(clips: MoodyBlues.Clip | MoodyBlues.Clip[]) {
    clips = this._wrap(clips);
    this._list = this._list.concat(clips);
  }

  hasNext() {
    return this._index < this.size - 1;
  }

  next() {
    if (!this.hasNext()) {
      return null;
    }
    this._index++;
    return this._list[this._index];
  }

  getShift() {
    this._list.shift();
    return this._list;
  }

  private _wrap(clips: MoodyBlues.Clip | MoodyBlues.Clip[]) {
    if (Array.isArray(clips)) {
      return clips;
    }
    return [clips];
  }
}

export default Playlist;
