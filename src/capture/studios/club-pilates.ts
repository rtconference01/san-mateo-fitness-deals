import { notImplemented, type StudioAdapter } from "../adapter";
import { parseClubPilates } from "../parse-studios";

export const clubPilatesAdapter: StudioAdapter = {
  studioId: "club_pilates",
  capture() {
    return Promise.reject(notImplemented());
  },
  async parse(evidence) {
    return parseClubPilates(evidence.html).offers;
  },
};
