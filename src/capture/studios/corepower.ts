import { notImplemented, type StudioAdapter } from "../adapter";
import { parseCorePower } from "../parse-studios";

export const corePowerAdapter: StudioAdapter = {
  studioId: "corepower_yoga",
  capture() {
    return Promise.reject(notImplemented());
  },
  async parse(evidence) {
    return parseCorePower(evidence.html).offers;
  },
};
