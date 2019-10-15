import { EventEmitter } from "eventemitter3";
import Hls from "hls.js";
import Playlist from "./Playlist";

class MoodyBlues extends EventEmitter {
  protected video: HTMLVideoElement | null;
  protected config: MoodyBlues.Config;
  protected playlist: Playlist;
  protected hls: Hls | null = null;

  constructor(video: HTMLVideoElement, options: MoodyBlues.Options = {}) {
    super();
    this.video = video;
    this.playlist = new Playlist();

    this.config = {
      debug: options.debug || false,
      useNativeWheneverPossible: options.useNativeWheneverPossible || false
    };

    if (!this.supported.MSE && !this.supported.native) {
      // MediaSoureceExtensions も native もサポートしていなければ例外をスロー
      throw new Error("HLS is not supported");
    }

    // video 要素のイベントハンドラを設定
    this.setupVideoEventHandlers();

    if (this.useNative) {
      this.setupNative(options);
    } else {
      this.setupHls(options);
    }

    this.on(MoodyBlues.Events.Finish, this.playNext, this);
  }

  /**
   * ブラウザの HLS のサポート状況を取得する
   */
  get supported() {
    let native = false;
    if (this.video) {
      native = this.video.canPlayType("application/vnd.apple.mpegurl") !== "";
    }
    return {
      MSE: Hls.isSupported(),
      native
    };
  }

  /**
   * ネイティブの HLS 再生を使用するか否かを取得する
   */
  get useNative() {
    return this.supported.native && this.config.useNativeWheneverPossible;
  }

  /**
   * ネイティブの HLS 再生を準備する
   */
  protected setupNative(options: MoodyBlues.Options) {
    this.logger("Use native video element to playback HLS");

    // 最初のクリップを再生する
    if (options.clip) {
      this.play(options.clip);
    }
  }

  /**
   * hls.js の HLS 再生を準備する
   */
  protected setupHls(options: MoodyBlues.Options) {
    this.logger("Use hls.js to playback HLS");

    this.hls = new Hls(options.hlsConfig);

    // hls のイベントハンドラを設定
    this.setupHlsEventHandlers();

    // 最初のクリップを再生する
    this.hls.attachMedia(this.video!);
    this.hls.once(Hls.Events.MEDIA_ATTACHED, () => {
      if (options.clip) {
        this.play(options.clip);
      }
    });
  }

  /**
   * hls のイベントハンドラを設定
   */
  protected setupHlsEventHandlers() {
    if (!this.hls) {
      return;
    }
    this.hls.on(Hls.Events.ERROR, this.onHlsError.bind(this));
  }

  /**
   * hls のイベントハンドラを削除
   */
  protected removeHlsEventHandlers() {
    if (!this.hls) {
      return;
    }
    this.hls.off(Hls.Events.ERROR, this.onHlsError);
  }

  protected onHlsError(event: "hlsError", data: Hls.errorData) {
    let type: MoodyBlues.ErrorTypes;
    switch (data.type) {
      case Hls.ErrorTypes.NETWORK_ERROR:
        type = MoodyBlues.ErrorTypes.NetworkError;
        break;
      case Hls.ErrorTypes.MEDIA_ERROR:
        type = MoodyBlues.ErrorTypes.MediaError;
        break;
      case Hls.ErrorTypes.KEY_SYSTEM_ERROR:
      case Hls.ErrorTypes.MUX_ERROR:
      case Hls.ErrorTypes.OTHER_ERROR:
      default:
        type = MoodyBlues.ErrorTypes.OtherError;
    }
    const errorData: MoodyBlues.ErrorData = {
      type,
      details: data.details
    };
    this.logger("Error", errorData);
    this.emit(MoodyBlues.Events.Error, errorData);
  }

  /**
   * video 要素のイベンドハンドラを設定
   */
  protected setupVideoEventHandlers() {
    if (!this.video) {
      return;
    }
    this.video.addEventListener("ended", this.onEnded.bind(this));
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
    if (this.useNative) {
      this.video.addEventListener("error", this.onError.bind(this));
    }
  }

  /**
   * video 要素のイベントハンドラを削除
   */
  protected removeVideoEventHandlers() {
    if (!this.video) {
      return;
    }
    this.video.removeEventListener("ended", this.onEnded);
    this.video.removeEventListener("loadedmetadata", this.onLoadedmetadata);
    this.video.removeEventListener("pause", this.onPause);
    this.video.removeEventListener("play", this.onPlay);
    this.video.removeEventListener("progress", this.onProgress);
    this.video.removeEventListener("ratechange", this.onRatechange);
    this.video.removeEventListener("seeked", this.onSeeked);
    this.video.removeEventListener("timeupdate", this.onTimeupdate);
    this.video.removeEventListener("volumechange", this.onVolumechange);
    if (this.useNative) {
      this.video.removeEventListener("error", this.onError);
    }
  }

  protected onEnded(e: Event) {
    this.logger("Finish");
    this.emit(MoodyBlues.Events.Finish);
  }

  protected onLoadedmetadata(e: Event) {
    this.logger("Ready");
    this.emit(MoodyBlues.Events.Ready);
  }

  protected onPause(e: Event) {
    this.logger("Pause");
    this.emit(MoodyBlues.Events.Pause);
  }

  protected onPlay(e: Event) {
    this.logger("Resume");
    this.emit(MoodyBlues.Events.Resume);
  }

  protected onProgress(e: Event) {
    const video = e.target as HTMLVideoElement
    this.logger("Buffer", video.buffered);
    this.emit(MoodyBlues.Events.Buffer, video.buffered);
  }

  protected onRatechange(e: Event) {
    const video = e.target as HTMLVideoElement;
    this.logger("Speed", video.playbackRate);
    this.emit(MoodyBlues.Events.Speed, video.playbackRate);
  }

  protected onSeeked(e: Event) {
    const video = e.target as HTMLVideoElement;
    this.logger("Seek", video.currentTime);
    this.emit(MoodyBlues.Events.Seek, video.currentTime);
  }

  protected onTimeupdate(e: Event) {
    const video = e.target as HTMLVideoElement;
    this.logger("Progress", video.currentTime);
    this.emit(MoodyBlues.Events.Progress, video.currentTime);
  }

  protected onVolumechange(e: Event) {
    const video = e.target as HTMLVideoElement;
    const info = {
      volume: video.volume,
      muted: video.muted
    };
    this.logger("Volume", info);
    this.emit(MoodyBlues.Events.Volume, info);
  }

  protected onError(e: Event) {
    const video = e.target as HTMLVideoElement;
    if (video.error) {
      let type: MoodyBlues.ErrorTypes;
      switch (video.error.code) {
        case MediaError.MEDIA_ERR_NETWORK:
        case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
          type = MoodyBlues.ErrorTypes.NetworkError;
          break;
        case MediaError.MEDIA_ERR_DECODE:
          type = MoodyBlues.ErrorTypes.MediaError;
          break;
        case MediaError.MEDIA_ERR_ABORTED:
        default:
          type = MoodyBlues.ErrorTypes.OtherError;
      }
      const errorData: MoodyBlues.ErrorData = {
        type,
        details: video.error.message
      };
      this.logger("Error", errorData);
      this.emit(MoodyBlues.Events.Error, errorData);
    }
  }

  get currentClip () {
    return this.playlist.currentClip
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

  toggle() {
    if (this.video) {
      if (this.video.paused) {
        this.video.play();
      } else {
        this.video.pause();
      }
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

  mute(muted: boolean) {
    if (this.video) {
      this.video.muted = muted
    }
  }

  speed(rate: number) {
    if (this.video) {
      this.video.playbackRate = rate;
    }
  }

  /**
   * clip または clip の配列を再生する
   */
  play(clips: MoodyBlues.Clip | MoodyBlues.Clip[]) {
    this.playlist.set(clips);
    this.playNext();
  }

  /**
   * 次の clip があればそれを再生する
   */
  protected playNext() {
    const clip = this.playlist.next();
    if (!clip) {
      // 次の `clip` がなければ何もしない
      return;
    }

    const seekOnStart = () => {
      if (clip.start) {
        this.seek(clip.start);
      }
    };

    if (this.useNative) {
      if (!this.video) {
        return;
      }
      this.video.src = clip.source;
      this.video.addEventListener("loadedmetadata", () => seekOnStart(), {
        once: true
      });
    } else {
      if (!this.hls) {
        return;
      }
      this.hls.loadSource(clip.source);
      this.hls.once(Hls.Events.MANIFEST_PARSED, () => seekOnStart());
    }
  }

  /**
   * 既存のプレイリストにクリップを追加する
   * @param clips 追加するクリップ、またはその配列
   */
  addClips(clips: MoodyBlues.Clip | MoodyBlues.Clip[]) {
    this.playlist.push(clips);
  }

  /**
   * 後始末
   */
  destroy() {
    this.logger("destroy");
    if (this.video) {
      this.removeVideoEventHandlers();
      this.video = null;
    }
    this.playlist.clear();
    if (this.hls) {
      this.removeHlsEventHandlers();
      this.hls.destroy();
    }
    this.removeAllListeners();
  }

  /**
   * ログを出力
   * @param ...args ログ
   */
  protected logger(...args: any) {
    if (this.config.debug) {
      console.log("[moody-blues]", ...args);
    }
  }
}

/**
 * MoodyBlues 関連の型定義
 */
namespace MoodyBlues {
  export interface Options {
    debug?: boolean;
    useNativeWheneverPossible?: boolean;
    clip?: Clip;
    hlsConfig?: Partial<Hls.Config>;
  }

  export interface Config {
    debug: boolean;
    useNativeWheneverPossible: boolean;
  }

  export interface Clip {
    source: string;
    start?: number;
    live?: boolean;
  }

  export enum Events {
    Finish = "finish",
    Ready = "ready",
    Pause = "pause",
    Resume = "resume",
    Buffer = "buffer",
    Speed = "speed",
    Seek = "seek",
    Progress = "progress",
    Volume = "volume",
    Error = "error"
  }

  export enum ErrorTypes {
    NetworkError = "networkError",
    MediaError = "mediaError",
    OtherError = "otherError"
  }

  export interface ErrorData {
    type: ErrorTypes;
    details: string | undefined;
  }
}

export default MoodyBlues;
