export namespace MoodyBlues {
  export interface Options {
    clip?: Clip;
    hlsConfig?: Hls.Config;
  }

  export interface Clip {
    source: string;
    start?: number;
  }
}
