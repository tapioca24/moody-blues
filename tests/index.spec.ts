import MoodyBlues from "../src/index";
import Hls from "hls.js";

const video = document.createElement("video");

describe("MoodyBlues", () => {
  describe("constructor", () => {
    it("HLS に対応していればインスタンスが生成される", () => {
      Hls.isSupported = jest.fn(() => true);
      const mb = new MoodyBlues(video);
      expect(mb.hls).not.toBeNull();
    });
  });
});
