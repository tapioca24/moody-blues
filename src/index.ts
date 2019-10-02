import Hls from "hls.js";

class MoodyBlues {
  hls: Hls;
  private video: HTMLVideoElement;

  constructor(video: HTMLVideoElement, options: MoodyBlues.Options = {}) {
    if (!Hls.isSupported()) {
      throw new Error("HLS is not supported");
    }

    this.video = video;
    this.hls = new Hls(options.hlsConfig);
    this.hls.attachMedia(this.video);
  }
}

export default MoodyBlues;
