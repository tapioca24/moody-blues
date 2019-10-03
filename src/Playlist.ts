class Playlist {
  private list: MoodyBlues.Clip[] = [];
  private index = -1;

  get size() {
    return this.list.length;
  }

  clear() {
    this.list = [];
    this.index = -1;
  }

  set(clips: MoodyBlues.Clip | MoodyBlues.Clip[]) {
    clips = this.wrap(clips);
    this.list = clips;
    this.index = -1;
  }

  push(clips: MoodyBlues.Clip | MoodyBlues.Clip[]) {
    clips = this.wrap(clips);
    this.list = this.list.concat(clips);
  }

  hasNext() {
    return this.index < this.size - 1
  }

  next() {
    if (!this.hasNext()) {
      return null
    }
    this.index++;
    return this.list[this.index]
  }

  private wrap(clips: MoodyBlues.Clip | MoodyBlues.Clip[]) {
    if (Array.isArray(clips)) {
      return clips;
    }
    return [clips];
  }
}

export default Playlist;
