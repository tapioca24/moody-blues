import Hls from "hls.js";
import VideoController from "./VideoController";
import Playlist from "./Playlist";

class MoodyBlues extends VideoController {
  protected config: MoodyBlues.Config;
  protected playlist: Playlist;
  protected hls: Hls | null = null;

  constructor(video: HTMLVideoElement, options: MoodyBlues.Options = {}) {
    super(video);
    this.playlist = new Playlist();
    this.config = {
      debug: options.debug || false,
      useNativeWheneverPossible: options.useNativeWheneverPossible || false
    };

    if (!this.supported.MSE && !this.supported.native) {
      // MediaSoureceExtensions も native もサポートしていなければ例外をスロー
      throw new Error("HLS is not supported");
    }

    if (this.useNative) {
      this.setupNative(options);
    } else {
      this.setupHls(options);
    }

    this.on(MoodyBlues.Events.Finish, this.playNext.bind(this));
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

    // play initial clip
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

    // setup event handlers
    this.hls.on(Hls.Events.ERROR, this.onHlsError.bind(this));

    // play initial clip
    this.hls.attachMedia(this.video!);
    this.hls.once(Hls.Events.MEDIA_ATTACHED, () => {
      if (options.clip) {
        this.play(options.clip);
      }
    });
  }

  protected onHlsError(event: "hlsError", data: Hls.errorData) {
    this.emit(MoodyBlues.Events.Error, {
      type: data.type,
      details: data.details
    });
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

  addClips(clips: MoodyBlues.Clip | MoodyBlues.Clip[]) {
    this.playlist.push(clips);
  }

  /**
   * 後始末
   */
  destroy() {
    this.logger("destroy");
    super.destroy();
    this.playlist.clear();
    if (this.hls) {
      this.hls.off(Hls.Events.ERROR, this.onHlsError);
      this.hls.destroy();
    }
    this.removeAllListeners();
  }

  protected logger(message: string) {
    if (this.config.debug) {
      console.log(`[moody-blues] ${message}`);
    }
  }
}

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

  export interface ErrorData {
    type: string;
    details: string;
  }
}

export default MoodyBlues;
