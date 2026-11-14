import { bodyrokAdapter } from "./studios/bodyrok";
import { clubPilatesAdapter } from "./studios/club-pilates";
import { corePowerAdapter } from "./studios/corepower";
import { rocksaltAdapter } from "./studios/rocksalt";
import type { StudioAdapter } from "./adapter";

export const studioAdapters: StudioAdapter[] = [
  corePowerAdapter,
  bodyrokAdapter,
  clubPilatesAdapter,
  rocksaltAdapter,
];

export type { CandidateOffer, RawEvidence, StudioAdapter } from "./adapter";
