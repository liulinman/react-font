import { useState } from "react";
import { BritishPronunciationButton } from "../../../component/BritishPronunciationButton";
import type {
  MicroSceneContextPublicItemV1,
  MicroScenePublicItemV1,
  MicroSceneThemeV1,
  MicroSceneTransferPublicItemV1,
} from "../../contracts/activity-contract";
import type { HintType, LearningAnswerDraft } from "../shared/answerDraft";
import { highlightStory } from "./highlightStory";

type MicroSceneItem =
  | MicroScenePublicItemV1
  | MicroSceneContextPublicItemV1
  | MicroSceneTransferPublicItemV1;

export interface MicroSceneActivityProps {
  item: MicroSceneItem;
  draft: LearningAnswerDraft;
  submitting?: boolean;
  hints?: readonly HintType[];
  onDraftChange(draft: LearningAnswerDraft): void;
  onRevealHint(hint: HintType): void;
  onSubmit(draft: LearningAnswerDraft): void;
}

const THEME_LABEL: Record<MicroSceneThemeV1, string> = {
  life: "日常生活",
  work: "工作沟通",
  travel: "旅行出行",
  study: "学习校园",
  public_service: "公共服务",
  news: "新闻信息",
};

export function MicroSceneActivity(props: MicroSceneActivityProps) {
  if (props.item.itemType === "micro_scene_choice") {
    return <LegacyMicroSceneActivity {...props} item={props.item} />;
  }
  if (props.item.itemType === "micro_scene_transfer_output") {
    return <TransferActivity {...props} item={props.item} />;
  }
  return <ContextActivity key={props.item.itemUid} {...props} item={props.item} />;
}

function ContextActivity({
  item,
  draft,
  submitting,
  hints = [],
  onDraftChange,
  onRevealHint,
  onSubmit,
}: MicroSceneActivityProps & { item: MicroSceneContextPublicItemV1 }) {
  const [reading, setReading] = useState(item.showStoryInitially);
  const [storyOpen, setStoryOpen] = useState(
    item.showStoryInitially || hints.includes("show_meaning"),
  );
  const [activeWordId, setActiveWordId] = useState(item.wordId);
  const selectedValue = draft.kind === "choice" ? draft.selectedValue : "";

  const revealStory = () => {
    onRevealHint("show_meaning");
    setStoryOpen(true);
  };

  return (
    <section aria-label="微场景练习" className="learning-activity micro-scene-activity">
      {storyOpen ? (
        <StoryCard
          item={item}
          activeWordId={activeWordId}
          onSelectWord={setActiveWordId}
        />
      ) : null}

      {reading ? (
        <div className="micro-scene-reading-actions">
          <p>先理解故事发生了什么，再进入回忆。</p>
          <button
            type="button"
            className="learning-primary-action"
            disabled={submitting}
            onClick={() => {
              setReading(false);
              setStoryOpen(false);
            }}
          >
            读完了，开始回忆
          </button>
        </div>
      ) : (
        <div className="micro-scene-recall-card">
          <div className="micro-scene-step-label">第 2 步 · 语境回忆</div>
          <p className="micro-scene-cloze">{item.clozeSentence}</p>
          <fieldset disabled={submitting}>
            <legend>{item.prompt}</legend>
            <div className="micro-scene-choice-grid">
              {item.choices.map((choice) => (
                <label key={choice.value} className="learning-choice micro-scene-choice">
                  <input
                    type="radio"
                    name={`micro-scene-${item.itemUid}`}
                    value={choice.value}
                    checked={selectedValue === choice.value}
                    onChange={() =>
                      onDraftChange({ kind: "choice", selectedValue: choice.value })
                    }
                  />
                  <span>{choice.label}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <div className="learning-activity-actions">
            <button
              type="button"
              disabled={submitting}
              onClick={storyOpen ? () => setStoryOpen(false) : revealStory}
            >
              {storyOpen ? "收起原文" : "查看原文"}
            </button>
            <button
              type="button"
              className="learning-primary-action"
              disabled={submitting || !selectedValue}
              onClick={() => onSubmit({ kind: "choice", selectedValue })}
            >
              提交答案
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={() => onSubmit({ kind: "skip", reason: "dont_know" })}
            >
              暂时不会
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function StoryCard({
  item,
  activeWordId,
  onSelectWord,
}: {
  item: MicroSceneContextPublicItemV1;
  activeWordId: number;
  onSelectWord(wordId: number): void;
}) {
  return (
    <article className="micro-scene-story-card">
      <header>
        <div>
          <span className="micro-scene-step-label">第 1 步 · 阅读理解</span>
          <h2>{item.scene.title}</h2>
        </div>
        <span className="micro-scene-theme">{THEME_LABEL[item.scene.theme]}</span>
      </header>
      <div className="micro-scene-story-copy">
        {item.scene.sentences.map((sentence, index) => (
          <p key={`${item.scene.sceneKey}-${index}`}>
            {highlightStory(sentence, item.targetWords, onSelectWord)}
          </p>
        ))}
      </div>
      <div className="micro-scene-glossary" aria-label="本文目标词">
        {item.targetWords.map((target) => (
          <article
            key={target.wordId}
            className={
              target.wordId === activeWordId
                ? "micro-scene-word-card micro-scene-word-card-active"
                : "micro-scene-word-card"
            }
          >
            <div>
              <button type="button" onClick={() => onSelectWord(target.wordId)}>
                {target.word}
              </button>
              <BritishPronunciationButton
                word={target.word}
                ariaLabel={`播放 ${target.word} 的英式发音`}
              />
            </div>
            <p>{target.meaning}</p>
          </article>
        ))}
      </div>
    </article>
  );
}

function TransferActivity({
  item,
  draft,
  hints = [],
  submitting,
  onDraftChange,
  onRevealHint,
  onSubmit,
}: MicroSceneActivityProps & { item: MicroSceneTransferPublicItemV1 }) {
  const text = draft.kind === "output" ? draft.text : "";
  const showSpelling = hints.includes("show_spelling");
  return (
    <section aria-label="微场景练习" className="learning-activity micro-scene-activity">
      <article className="micro-scene-transfer-card">
        <span className="micro-scene-step-label">第 3 步 · 迁移运用</span>
        <h2>{item.sceneTitle}</h2>
        <p className="micro-scene-transfer-meaning">词义：{item.meaning}</p>
        <p className="micro-scene-cloze">{item.transferSentence}</p>
        <p className="micro-scene-usage-note">{item.usageNote}</p>
        <label className="micro-scene-output-field">
          <span>写出目标单词</span>
          <input
            aria-label="写出目标单词"
            autoComplete="off"
            disabled={submitting}
            value={text}
            onChange={(event) =>
              onDraftChange({ kind: "output", text: event.target.value })
            }
          />
        </label>
        {showSpelling ? (
          <p className="listening-spelling-hint">
            首字母 {item.cue.firstLetter}，共 {item.cue.length} 个字母
          </p>
        ) : (
          <button
            type="button"
            className="micro-scene-hint-action"
            disabled={submitting}
            onClick={() => onRevealHint("show_spelling")}
          >
            显示拼写提示
          </button>
        )}
        <div className="learning-activity-actions">
          <button
            type="button"
            className="learning-primary-action"
            disabled={submitting || !text.trim()}
            onClick={() => onSubmit({ kind: "output", text })}
          >
            提交答案
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={() => onSubmit({ kind: "skip", reason: "dont_know" })}
          >
            暂时不会
          </button>
        </div>
      </article>
    </section>
  );
}

function LegacyMicroSceneActivity({
  item,
  draft,
  submitting,
  onDraftChange,
  onSubmit,
}: MicroSceneActivityProps & { item: MicroScenePublicItemV1 }) {
  const selectedValue = draft.kind === "choice" ? draft.selectedValue : "";
  return (
    <section aria-label="微场景练习" className="learning-activity micro-scene-activity">
      <blockquote>{item.scene}</blockquote>
      <fieldset disabled={submitting}>
        <legend>{item.prompt}</legend>
        {item.choices.map((choice) => (
          <label key={choice.value} className="learning-choice">
            <input
              type="radio"
              name={`micro-scene-${item.itemUid}`}
              value={choice.value}
              checked={selectedValue === choice.value}
              onChange={() =>
                onDraftChange({ kind: "choice", selectedValue: choice.value })
              }
            />
            {choice.label}
          </label>
        ))}
      </fieldset>
      <div className="learning-activity-actions">
        <button
          type="button"
          disabled={submitting || !selectedValue}
          onClick={() => onSubmit({ kind: "choice", selectedValue })}
        >
          提交答案
        </button>
        <button
          type="button"
          disabled={submitting}
          onClick={() => onSubmit({ kind: "skip", reason: "dont_know" })}
        >
          暂时不会
        </button>
      </div>
    </section>
  );
}
