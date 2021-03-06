import { EventEmitter } from "eventemitter3";
import Hls from "hls.js";
import Playlist from "./Playlist";

class MoodyBlues extends EventEmitter {
  protected _video: HTMLVideoElement | null;
  protected _options: MoodyBlues.Options;
  protected _config: MoodyBlues.Config;
  protected _playlist: Playlist;
  protected _hls: Hls | null = null;
  protected _initialized = false;
  protected _supported = { MSE: false, native: false };
  protected _useNative = false;

  constructor(video: HTMLVideoElement, options: MoodyBlues.Options = {}) {
    super();
    this._video = video;
    this.checkSupported();

    if (!this._supported.MSE && !this._supported.native) {
      // MediaSoureceExtensions も native もサポートしていなければ例外をスロー
      throw new Error("HLS is not supported");
    }

    this._config = {
      debug: options.debug || false,
      useNativeWheneverPossible: options.useNativeWheneverPossible || false
    };
    this._useNative =
      this._supported.native && this._config.useNativeWheneverPossible;

    this._playlist = new Playlist();

    // `options` をコピーしておく
    this._options = { ...options };
    if (this._options.clips) {
      delete this._options.clips;
    }

    // video 要素のイベントハンドラを設定
    this._setupVideoEventHandlers();
    this.on(MoodyBlues.Events.Finish, () => {
      const clips = this._playlist.getShift();
      this.play(clips);
    });

    this._setup(options);
  }

  get supported() {
    return this._supported;
  }

  get useNative() {
    return this._useNative;
  }

  protected checkSupported() {
    let native = false;
    if (this._video) {
      native = this._video.canPlayType("application/vnd.apple.mpegurl") !== "";
    }
    this._supported = { MSE: Hls.isSupported(), native };
  }

  /**
   * 準備する
   */
  protected _setup(options: MoodyBlues.Options) {
    if (this._useNative) {
      this._setupNative(options);
    } else {
      this._setupHls(options);
    }
    this._initialized = true;
  }

  /**
   * ネイティブの HLS 再生を準備する
   */
  protected _setupNative(options: MoodyBlues.Options) {
    if (!this._initialized) {
      this._logger("Use native video element to playback HLS");
    }

    if (options.clips) {
      this._playlist.set(options.clips);
    }
    // 最初のクリップを再生する
    this._playNext();
  }

  /**
   * hls.js の HLS 再生を準備する
   */
  protected _setupHls(options: MoodyBlues.Options) {
    if (!this._initialized) {
      this._logger("Use hls.js to playback HLS");
    }

    // Hls 内部で hlsConfig の未指定プロパティにデフォルト値が適用されるためコピーを渡す
    this._hls = new Hls({ ...options.hlsConfig });
    this._setupHlsEventHandlers();

    if (options.clips) {
      this._playlist.set(options.clips);
    }
    // 最初のクリップを再生する
    this._hls.attachMedia(this._video!);
    this._hls.once(Hls.Events.MEDIA_ATTACHED, () => {
      this._playNext();
    });
  }

  /**
   * hls のイベントハンドラを設定
   */
  protected _setupHlsEventHandlers() {
    if (!this._hls) {
      return;
    }
    this._hls.on(Hls.Events.ERROR, this._onHlsError.bind(this));
  }

  /**
   * hls のイベントハンドラを削除
   */
  protected _removeHlsEventHandlers() {
    if (!this._hls) {
      return;
    }
    this._hls.off(Hls.Events.ERROR, this._onHlsError);
  }

  protected _onHlsError(event: "hlsError", data: Hls.errorData) {
    if (!this._hls) {
      return;
    }

    // fatal エラーの場合はリカバーする
    if (data.fatal) {
      switch (data.type) {
        case Hls.ErrorTypes.NETWORK_ERROR:
          console.log("network error", data.details);
          this._hls.startLoad();
          break;
        case Hls.ErrorTypes.MEDIA_ERROR:
          console.log("media error", data.details);
          this._hls.recoverMediaError();
          break;
      }
    }

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
      details: data.details,
      fatal: data.fatal
    };
    this._logger("Error", errorData);
    this.emit(MoodyBlues.Events.Error, errorData);
  }

  /**
   * video 要素のイベンドハンドラを設定
   */
  protected _setupVideoEventHandlers() {
    if (!this._video) {
      return;
    }
    this._video.addEventListener("ended", this._onEnded.bind(this));
    this._video.addEventListener(
      "loadedmetadata",
      this._onLoadedmetadata.bind(this)
    );
    this._video.addEventListener("pause", this._onPause.bind(this));
    this._video.addEventListener("play", this._onPlay.bind(this));
    this._video.addEventListener("progress", this._onProgress.bind(this));
    this._video.addEventListener("ratechange", this._onRatechange.bind(this));
    this._video.addEventListener("seeked", this._onSeeked.bind(this));
    this._video.addEventListener("timeupdate", this._onTimeupdate.bind(this));
    this._video.addEventListener(
      "volumechange",
      this._onVolumechange.bind(this)
    );
    if (this._useNative) {
      this._video.addEventListener("error", this._onError.bind(this));
    }
  }

  /**
   * video 要素のイベントハンドラを削除
   */
  protected _removeVideoEventHandlers() {
    if (!this._video) {
      return;
    }
    this._video.removeEventListener("ended", this._onEnded);
    this._video.removeEventListener("loadedmetadata", this._onLoadedmetadata);
    this._video.removeEventListener("pause", this._onPause);
    this._video.removeEventListener("play", this._onPlay);
    this._video.removeEventListener("progress", this._onProgress);
    this._video.removeEventListener("ratechange", this._onRatechange);
    this._video.removeEventListener("seeked", this._onSeeked);
    this._video.removeEventListener("timeupdate", this._onTimeupdate);
    this._video.removeEventListener("volumechange", this._onVolumechange);
    if (this._useNative) {
      this._video.removeEventListener("error", this._onError);
    }
  }

  protected _onEnded(e: Event) {
    this._logger("Finish");
    this.emit(MoodyBlues.Events.Finish);
  }

  protected _onLoadedmetadata(e: Event) {
    this._logger("Ready");
    this.emit(MoodyBlues.Events.Ready);
  }

  protected _onPause(e: Event) {
    this._logger("Pause");
    this.emit(MoodyBlues.Events.Pause);
  }

  protected _onPlay(e: Event) {
    this._logger("Resume");
    this.emit(MoodyBlues.Events.Resume);
  }

  protected _onProgress(e: Event) {
    const video = e.target as HTMLVideoElement;
    this._logger("Buffer", video.buffered);
    this.emit(MoodyBlues.Events.Buffer, video.buffered);
  }

  protected _onRatechange(e: Event) {
    const video = e.target as HTMLVideoElement;
    this._logger("Speed", video.playbackRate);
    this.emit(MoodyBlues.Events.Speed, video.playbackRate);
  }

  protected _onSeeked(e: Event) {
    const video = e.target as HTMLVideoElement;
    this._logger("Seek", video.currentTime);
    this.emit(MoodyBlues.Events.Seek, video.currentTime);
  }

  protected _onTimeupdate(e: Event) {
    const video = e.target as HTMLVideoElement;
    this._logger("Progress", video.currentTime);
    this.emit(MoodyBlues.Events.Progress, video.currentTime);
  }

  protected _onVolumechange(e: Event) {
    const video = e.target as HTMLVideoElement;
    const info = {
      volume: video.volume,
      muted: video.muted
    };
    this._logger("Volume", info);
    this.emit(MoodyBlues.Events.Volume, info);
  }

  protected _onError(e: Event) {
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
      this._logger("Error", errorData);
      this.emit(MoodyBlues.Events.Error, errorData);
    }
  }

  get currentClip() {
    return this._playlist.currentClip;
  }

  get hasNext() {
    return this._playlist.hasNext();
  }

  get video() {
    return this._video;
  }

  resume() {
    if (this._video) {
      this._video.play();
    }
  }

  pause() {
    if (this._video) {
      this._video.pause();
    }
  }

  toggle() {
    if (this._video) {
      if (this._video.paused) {
        this._video.play();
      } else {
        this._video.pause();
      }
    }
  }

  seek(time: number) {
    if (!this._video) {
      return;
    }
    if (time < 0 || this._video.duration < time) {
      return;
    }
    this._video.currentTime = time;
  }

  volume(level: number) {
    if (this._video) {
      this._video.volume = level;
    }
  }

  mute(muted: boolean) {
    if (this._video) {
      this._video.muted = muted;
    }
  }

  speed(rate: number) {
    if (this._video) {
      this._video.playbackRate = rate;
    }
  }

  /**
   * clip または clip の配列を再生する
   */
  play(clips: MoodyBlues.Clip | MoodyBlues.Clip[]) {
    this._destroy();
    this._playlist.set(clips);
    this._setup(this._options);
  }

  /**
   * 次の clip があればそれを再生する
   */
  protected _playNext() {
    const clip = this._playlist.next();
    if (!clip) {
      // 次の `clip` がなければ何もしない
      return;
    }

    const seekOnStart = () => {
      if (clip.start) {
        this.seek(clip.start);
      }
    };

    if (this._useNative) {
      if (!this._video) {
        return;
      }
      this._video.src = clip.source;
      this._video.addEventListener("loadedmetadata", () => seekOnStart(), {
        once: true
      });
    } else {
      if (!this._hls) {
        return;
      }
      this._hls.loadSource(clip.source);
      this._hls.once(Hls.Events.MANIFEST_PARSED, () => seekOnStart());
    }
  }

  /**
   * 既存のプレイリストにクリップを追加する
   * @param clips 追加するクリップ、またはその配列
   */
  addClips(clips: MoodyBlues.Clip | MoodyBlues.Clip[]) {
    this._playlist.push(clips);
  }

  protected _destroy() {
    this._playlist.clear();
    if (this._hls) {
      this._removeHlsEventHandlers();
      this._hls.destroy();
      this._hls = null;
    }
  }

  /**
   * 後始末
   */
  destroy() {
    this._logger("destroy");
    if (this._video) {
      this._removeVideoEventHandlers();
      this._video = null;
    }
    this._destroy();
    this.removeAllListeners();
  }

  /**
   * ログを出力
   * @param ...args ログ
   */
  protected _logger(...args: any) {
    if (this._config.debug) {
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
    clips?: Clip | Clip[];
    hlsConfig?: Partial<Hls.Config>;
  }

  export interface Config {
    debug: boolean;
    useNativeWheneverPossible: boolean;
  }

  export interface Clip {
    source: string;
    start?: number;
    [key: string]: any;
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
    details?: string;
    fatal?: boolean;
  }
}

export default MoodyBlues;
