import { notImplemented, type StudioAdapter } from "../adapter";
import { parseBodyrok } from "../parse-studios";

export const bodyrokAdapter: StudioAdapter = {
  studioId: "bodyrok",
  capture() {
    return Promise.reject(notImplemented());
  },
  async parse(evidence) {
    return parseBodyrok(evidence.html).offers;
  },
};
