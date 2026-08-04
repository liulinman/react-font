import { describe, expect, it } from "vitest";
import activityEnvelope from "./fixtures/activity-envelope-v1.json";
import type { ActivityEnvelopeV1 } from "./activity-contract";

describe("ActivityEnvelopeV1 fixture", () => {
  it("contains only the public listening activity envelope", () => {
    const envelope: ActivityEnvelopeV1 = {
      schemaVersion: 1,
      mode: "listening",
      phase: "recall",
      item: {
        itemType: "listening_spelling",
        itemUid: "listening-spelling-7",
        wordId: 7,
        audio: {
          britishUrl: "/audio-assets/7c2a91-uk.mp3",
          americanUrl: "/audio-assets/7c2a91-us.mp3",
        },
        spellingCue: { firstLetter: "i", length: 7 },
      },
    };

    expect(activityEnvelope).toEqual(envelope);
  });
});
