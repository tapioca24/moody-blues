import MoodyBlues from ".";
import { EventEmitter } from "events";

class VideoController extends EventEmitter {
  protected video: HTMLVideoElement | null;

  constructor(video: HTMLVideoElement) {
    super();
    this.video = video;
    this.setupVideoEventHandlers();
  }

  protected setupVideoEventHandlers() {
    if (!this.video) {
      return;
    }
    this.video.addEventListener("ended", this.onEnded.bind(this));
    this.video.addEventListener("error", this.onError.bind(this));
    this.video.addEventListener(
      "loadedmetadata",
      this.onLoadedmetadata.bind(this)
    );
    this.video.addEventListener("pause", this.onPause.bind(this));
    this.video.addEventListener("play", this.onPlay.bind(this));
    this.video.addEventListener("progress", this.onProgress.bind(this));
    this.video.addEventListener("ratechange", this.onRatechange.bind(this));
    this.video.addEventListener("seeked", this.onSeeked.bind(this));
    this.video.addEventListener("timeupdate", this.onTimeupdate.bind(this));
    this.video.addEventListener("volumechange", this.onVolumechange.bind(this));
  }

  protected removeVideoEventHandlers() {
    if (!this.video) {
      return;
    }
    this.video.removeEventListener("ended", this.onEnded);
    this.video.removeEventListener("error", this.onError);
    this.video.removeEventListener("loadedmetadata", this.onLoadedmetadata);
    this.video.removeEventListener("pause", this.onPause);
    this.video.removeEventListener("play", this.onPlay);
    this.video.removeEventListener("progress", this.onProgress);
    this.video.removeEventListener("ratechange", this.onRatechange);
    this.video.removeEventListener("seeked", this.onSeeked);
    this.video.removeEventListener("timeupdate", this.onTimeupdate);
    this.video.removeEventListener("volumechange", this.onVolumechange);
  }

  protected onEnded(e: Event) {
    this.emit(MoodyBlues.Events.Finish, e);
  }

  protected onError(e: Event) {
    this.emit(MoodyBlues.Events.Error, e);
  }

  protected onLoadedmetadata(e: Event) {
    this.emit(MoodyBlues.Events.Ready, e);
  }

  protected onPause(e: Event) {
    this.emit(MoodyBlues.Events.Pause, e);
  }

  protected onPlay(e: Event) {
    this.emit(MoodyBlues.Events.Resume, e);
  }

  protected onProgress(e: Event) {
    this.emit(MoodyBlues.Events.Buffer, e);
  }

  protected onRatechange(e: Event) {
    this.emit(MoodyBlues.Events.Speed, e);
  }

  protected onSeeked(e: Event) {
    this.emit(MoodyBlues.Events.Seek, e);
  }

  protected onTimeupdate(e: Event) {
    this.emit(MoodyBlues.Events.Progress, e);
  }

  protected onVolumechange(e: Event) {
    this.emit(MoodyBlues.Events.Volume, e);
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

  volume(level: number) {
    if (this.video) {
      this.video.volume = level;
    }
  }

  speed(val: number) {
    if (this.video) {
      this.video.playbackRate = val;
    }
  }

  destroy() {
    if (this.video) {
      this.removeVideoEventHandlers();
      this.video = null;
    }
  }
}

export default VideoController;
