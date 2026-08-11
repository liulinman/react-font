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

  it("accepts the public v4 context contract without a private answer", () => {
    const envelope: ActivityEnvelopeV1 = {
      schemaVersion: 1,
      mode: "micro_scene",
      phase: "understand",
      item: {
        itemType: "micro_scene_context_choice",
        itemUid: "context-7",
        wordId: 7,
        scene: {
          sceneKey: "office-alarm",
          title: "A False Alarm",
          theme: "work",
          sentences: ["One.", "Two.", "Three.", "Four."],
        },
        targetWords: [{ wordId: 7, word: "suppress", meaning: "压制" }],
        showStoryInitially: true,
        clozeSentence: "She tried to ___ her worry.",
        prompt: "根据语境选词。",
        choices: [
          { value: "opaque-1", label: "suppress" },
          { value: "opaque-2", label: "sustain" },
        ],
      },
    };

    expect(JSON.stringify(envelope)).not.toMatch(/correctValue|accepted/);
  });
});
