import Hls from "hls.js";
import { EventEmitter } from "events";

import Playlist from "@/Playlist";

class MoodyBlues extends EventEmitter {
  hls: Hls | null;
  private video: HTMLVideoElement | null;
  private playlist: Playlist;

  constructor(video: HTMLVideoElement, options: MoodyBlues.Options = {}) {
    super();

    if (!Hls.isSupported()) {
      throw new Error("HLS is not supported");
    }

    this.video = video;
    this.playlist = new Playlist();
    this.hls = new Hls(options.hlsConfig);
    this.setupHlsEventHandler();
    this.hls.attachMedia(this.video);
    this.hls.once(Hls.Events.MEDIA_ATTACHED, () => {
      console.log("media attached");
      if (options.clip) {
        this.play(options.clip);
      }
    });
  }

  play(clips: MoodyBlues.Clip | MoodyBlues.Clip[]) {
    this.playlist.set(clips);
    this.playNext();
  }

  playNext() {
    if (!this.hls) {
      return;
    }
    const clip = this.playlist.next();
    if (!clip) {
      return;
    }
    this.hls.loadSource(clip.source);
    this.hls.once(Hls.Events.MANIFEST_PARSED, () => {
      if (clip.start) {
        this.seek(clip.start);
      }
    });
  }

  resume() {
    if (this.video) {
      this.video.play();
    }
  }

  pause() {
    if (this.video) {
      this.video.pause();
    }
  }

  seek(time: number) {
    if (!this.video) {
      return;
    }
    if (time < 0 || this.video.duration < time) {
      return;
    }
    this.video.currentTime = time;
  }

  destroy() {
    if (this.hls) {
      this.hls.destroy();
    }
    if (this.video) {
      this.video = null;
    }
    this.playlist.clear();
  }

  private setupHlsEventHandler() {
    if (!this.hls) {
      return;
    }
    // 再生中のメディアが終了したら playlist の次の動画を再生する
    this.hls.on(Hls.Events.BUFFER_EOS, () => this.playNext());
  }
}

export default MoodyBlues;
