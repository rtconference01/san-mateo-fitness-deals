import { notImplemented, type StudioAdapter } from "../adapter";
import { parseRockSalt } from "../parse-studios";

export const rocksaltAdapter: StudioAdapter = {
  studioId: "rocksalt_pilates",
  capture() {
    return Promise.reject(notImplemented());
  },
  async parse(evidence) {
    return parseRockSalt(evidence.html).offers;
  },
};
