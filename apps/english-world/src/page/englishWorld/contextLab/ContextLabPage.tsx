import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
} from "react";
import {
  Button,
  Checkbox,
  ConfigProvider,
  Drawer,
  Dropdown,
  Empty,
  InputNumber,
  message,
  Modal,
  Radio,
  Segmented,
  Space,
  Spin,
  Tag,
  Typography,
  Input,
  theme as antdTheme,
  type ThemeConfig,
} from "antd";
import {
  DeleteOutlined,
  DownloadOutlined,
  ExperimentOutlined,
  FilePdfOutlined,
  FullscreenExitOutlined,
  FullscreenOutlined,
  HistoryOutlined,
  MoreOutlined,
  PlayCircleOutlined,
  ReloadOutlined,
  SearchOutlined,
  SendOutlined,
} from "@ant-design/icons";
import request from "@font/api";
import {
  wordAgentQuery,
  type WordAgentItem,
} from "@/server/wordAgent/wordAgent";
import { wordAdd, wordExist, wordImportMissing } from "@/server/word/word";
import type { WordList } from "@/server/word/word.type";
import {
  contextLabCreateTask,
  contextLabDeleteAttempt,
  contextLabDeleteTask,
  contextLabDetail,
  contextLabHistory,
  contextLabAttemptHistory,
  contextLabAttemptDetail,
  contextLabSubmit,
  downloadContextLabPdfTemplate,
  downloadContextLabTaskPdf,
  subscribeContextLabTaskEvents,
} from "../server/learning";
import type {
  ContextLabGenerateParams,
  ContextLabModelProvider,
  ContextLabSubmitResult,
  ContextLabAttempt,
  ContextLabTask,
} from "../types/learning";
import type { ExerciseResultItem } from "@/server/exerciseAgent/exerciseAgent";
import {
  DEFAULT_CONTEXT_LAB_MODEL_PROVIDER,
  DEFAULT_IELTS_BAND,
  IELTS_BAND_MAX,
  IELTS_BAND_MIN,
  IELTS_BAND_STEP,
  buildContextLabGenerateParams,
  normalizeIeltsBand,
  type ContextLabSourceMode,
} from "./contextLabPlanning";
import { useInRouterContext, useLocation, useNavigate } from "react-router-dom";
import {
  getContextLabErrorMessage,
  getContextLabStatusDescription,
  getContextLabStatusLabel,
  getContextLabStatusTone,
  isContextLabTaskActive,
} from "./contextLabTask";
import { EditAddModal, type AddInitialValues } from "../component/EditAddModal";
import {
  buildContextLabReference,
  parseContextLabReference,
} from "../utils/contextLabReference";
import {
  buildMicroGenerateParams,
  isInvalidMicroContextEntry,
  parseMicroContextEntry,
} from "./microContext";
import {
  buildLearningEventUid,
  recordLearningEvent,
} from "../analytics/learningEvents";
import { BulkImportPreviewModal } from "../bulkImport/BulkImportPreviewModal";
import {
  getBulkImportMessage,
  toBulkImportWordPayload,
} from "../bulkImport/bulkImportPreview";
import { stripGeneratedMarkdownEmphasis } from "./articleText";
import { formatContextLabQuestionTypeLabel } from "./contextLabQuestionType";

const { Text, Title } = Typography;
const { TextArea } = Input;

const CONTEXT_LAB_LIGHT_THEME = {
  algorithm: antdTheme.defaultAlgorithm,
  token: {
    colorPrimary: "#2563eb",
    borderRadius: 8,
  },
} satisfies ThemeConfig;
const ANSWER_LETTERS = ["A", "B", "C", "D"];
const PROFICIENCY_OPTIONS = [
  { label: "不会", value: 0 },
  { label: "一般", value: 1 },
  { label: "熟练", value: 2 },
  { label: "精通", value: 3 },
];
const ACTIVE_TASK_DELETE_MESSAGE =
  "生成中的练习包暂不支持删除，请等待任务完成或失败后再操作";

function createRequestUid() {
  return (
    globalThis.crypto?.randomUUID?.() ??
    `request-${Date.now()}-${Math.random().toString(16).slice(2)}`
  );
}

function getAnswerLetter(index: number) {
  return ANSWER_LETTERS[index] ?? String(index);
}

function formatOptionLabel(option: string, optionIndex: number) {
  return `${getAnswerLetter(optionIndex)}. ${option}`;
}

function normalizeOptionIndex(value: unknown) {
  if (value === null || value === undefined || value === "") return undefined;

  const index = Number(value);
  return Number.isInteger(index) && index >= 0 ? index : undefined;
}

type ContextLabAnswerItem = {
  questionId: string;
  selectedIndex?: unknown;
};

type ContextLabHistorySourceFilter = "all" | ContextLabTask["sourceType"];
type MarkedVocabularyItem = Omit<WordList, "id"> & {
  key: string;
};

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isContextLabAnswerItem(value: unknown): value is ContextLabAnswerItem {
  return isPlainRecord(value) && typeof value.questionId === "string";
}

function isContextLabResultItem(value: unknown): value is ExerciseResultItem {
  return (
    isPlainRecord(value) &&
    typeof value.questionId === "string" &&
    typeof value.correct === "boolean"
  );
}

function formatExplanationText(explanation: string, correctIndex: number) {
  const letter = getAnswerLetter(correctIndex);
  const toAnswerLetter = (_match: string, prefix: string, optionIndex: string) =>
    `${prefix} ${getAnswerLetter(Number(optionIndex))}`;

  return explanation
    .replace(/正确答案为\s*[0-3]/g, `正确答案为 ${letter}`)
    .replace(/正确答案是\s*[0-3]/g, `正确答案是 ${letter}`)
    .replace(/(你选(?:了)?)[\s：:]*([0-3])\b/g, toAnswerLetter);
}

function cleanSelectedVocabularyText(text: string) {
  return text
    .replace(/\s+/g, " ")
    .replace(/^[\s"'“‘([{]+|[\s"'”’)\]}.,;:!?]+$/g, "")
    .trim();
}

function getVocabularyKey(text: string) {
  return cleanSelectedVocabularyText(text).toLocaleLowerCase();
}

function wordAgentItemToAddInitial(
  item: WordAgentItem,
  fallbackWord: string,
): AddInitialValues {
  const englishWord = cleanSelectedVocabularyText(item.word || fallbackWord);
  return {
    englishWord,
    englishPhonetic: item.phonetic,
    englishChinese: item.meaning,
    englishPartSpeech: item.partOfSpeech?.length ? item.partOfSpeech : undefined,
    englishLevel: 0,
    englishType: englishWord.includes(" ") ? 1 : 0,
  };
}

function buildMarkedVocabularyItem(
  text: string,
  currentTask: ContextLabTask | null,
): MarkedVocabularyItem {
  const englishWord = cleanSelectedVocabularyText(text);
  return {
    key: getVocabularyKey(englishWord),
    englishWord,
    englishLevel: 0,
    englishType: englishWord.includes(" ") ? 1 : 0,
    englishReference:
      currentTask && currentTask.taskId
        ? buildContextLabReference(currentTask, englishWord)
        : undefined,
  };
}

function toImportWordPayload(item: MarkedVocabularyItem): Omit<WordList, "id"> {
  const { key: _key, ...word } = item;
  return toBulkImportWordPayload(word, item.englishLevel ?? 0);
}

function mergeImportPreviewWithAi(
  currentWords: MarkedVocabularyItem[],
  originalWords: MarkedVocabularyItem[],
  aiWords: WordAgentItem[],
) {
  const aiWordsByKey = new Map(
    aiWords
      .filter((item) => item.word)
      .map((item) => [getVocabularyKey(item.word), item]),
  );
  const originalWordsByKey = new Map(
    originalWords.map((item) => [item.key, item]),
  );

  return currentWords.map((currentWord, index) => {
    const originalWord = originalWordsByKey.get(currentWord.key);
    const aiWord = aiWordsByKey.get(currentWord.key) ?? aiWords[index];
    if (!aiWord) return currentWord;

    const originalEnglishWord = originalWord?.englishWord ?? "";
    const aiEnglishWord = cleanSelectedVocabularyText(
      aiWord.word || currentWord.englishWord,
    );
    const currentEnglishWord = cleanSelectedVocabularyText(
      currentWord.englishWord,
    );
    const canUpdateWord =
      currentEnglishWord === cleanSelectedVocabularyText(originalEnglishWord);
    const nextEnglishWord = canUpdateWord
      ? aiEnglishWord
      : currentWord.englishWord;

    return {
      ...currentWord,
      englishWord: nextEnglishWord,
      englishPhonetic:
        currentWord.englishPhonetic || aiWord.phonetic || undefined,
      englishChinese: currentWord.englishChinese || aiWord.meaning || undefined,
      englishPartSpeech: currentWord.englishPartSpeech?.length
        ? currentWord.englishPartSpeech
        : aiWord.partOfSpeech?.length
          ? aiWord.partOfSpeech
          : currentWord.englishPartSpeech,
      englishType: nextEnglishWord.includes(" ") ? 1 : 0,
    };
  });
}

function splitArticleParagraphs(article: string) {
  return stripGeneratedMarkdownEmphasis(article)
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

function parseArticleContent(article: string) {
  const blocks = splitArticleParagraphs(article);
  if (blocks.length >= 4) {
    return {
      topic: blocks[0],
      paragraphs: blocks.slice(1),
    };
  }
  return {
    topic: undefined,
    paragraphs: blocks,
  };
}

function getContextLabQuestionLabel(task: ContextLabTask | null, questionId: string) {
  return task?.questions?.find((question) => question.id === questionId);
}

function getContextLabSourceLabel(sourceType: ContextLabTask["sourceType"]) {
  const labels: Record<ContextLabTask["sourceType"], string> = {
    custom: "手输词组",
    "ielts-core": "雅思核心词",
    proficiency: "薄弱词",
    random: "随机 IELTS",
  };
  return labels[sourceType] ?? "练习包";
}

function getContextLabSearchSourceType(
  sourceType: ContextLabHistorySourceFilter,
) {
  return sourceType === "all" ? undefined : sourceType;
}

export function formatElapsedSeconds(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(
    2,
    "0",
  )}`;
}

function ContextLabPageContent({
  initialSearch,
  onOpenWordLibrary,
  onBackToReciteResult,
  onMicroTaskReady,
  onBackToToday,
}: {
  initialSearch: string;
  onOpenWordLibrary?: () => void;
  onBackToReciteResult?: (sessionId: number) => void;
  onMicroTaskReady?: (taskId: number) => void;
  onBackToToday?: () => void;
}) {
  const [sourceMode, setSourceMode] = useState<ContextLabSourceMode>("weak");
  const [count, setCount] = useState(20);
  const [proficiencyLevels, setProficiencyLevels] = useState<number[]>([]);
  const [customWords, setCustomWords] = useState("");
  const [ieltsBand, setIeltsBand] = useState<number | null>(
    DEFAULT_IELTS_BAND,
  );
  const [modelProvider, setModelProvider] = useState<ContextLabModelProvider>(
    DEFAULT_CONTEXT_LAB_MODEL_PROVIDER,
  );
  const [creating, setCreating] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [history, setHistory] = useState<ContextLabTask[]>([]);
  const [historyKeyword, setHistoryKeyword] = useState("");
  const [historySourceType, setHistorySourceType] =
    useState<ContextLabHistorySourceFilter>("all");
  const [currentTask, setCurrentTask] = useState<ContextLabTask | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [results, setResults] = useState<ExerciseResultItem[]>([]);
  const [submitSummary, setSubmitSummary] =
    useState<ContextLabSubmitResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [downloading, setDownloading] = useState(false);
  const [downloadingTaskId, setDownloadingTaskId] = useState<number | null>(
    null,
  );
  const [sourcePreviewOpen, setSourcePreviewOpen] = useState(false);
  const [sourcePreviewFullscreen, setSourcePreviewFullscreen] = useState(false);
  const [practiceModalOpen, setPracticeModalOpen] = useState(false);
  const [practiceFullscreen, setPracticeFullscreen] = useState(false);
  const [attemptDrawerOpen, setAttemptDrawerOpen] = useState(false);
  const [attemptTask, setAttemptTask] = useState<ContextLabTask | null>(null);
  const [attempts, setAttempts] = useState<ContextLabAttempt[]>([]);
  const [attemptsLoading, setAttemptsLoading] = useState(false);
  const [selectedAttemptId, setSelectedAttemptId] = useState<number | null>(null);
  const [attemptDetails, setAttemptDetails] = useState<
    Record<number, ContextLabAttempt>
  >({});
  const [attemptDetailLoadingId, setAttemptDetailLoadingId] = useState<
    number | null
  >(null);
  const [selectedVocabulary, setSelectedVocabulary] = useState("");
  const [selectionMenu, setSelectionMenu] = useState<{
    open: boolean;
    x: number;
    y: number;
  }>({ open: false, x: 0, y: 0 });
  const [markedVocabulary, setMarkedVocabulary] = useState<
    MarkedVocabularyItem[]
  >([]);
  const [importPreviewOpen, setImportPreviewOpen] = useState(false);
  const [importPreviewWords, setImportPreviewWords] = useState<
    MarkedVocabularyItem[]
  >([]);
  const [importOverwriteExisting, setImportOverwriteExisting] = useState(false);
  const [addingSelectedWord, setAddingSelectedWord] = useState(false);
  const [translatingSelectedWord, setTranslatingSelectedWord] = useState(false);
  const [importingMarkedWords, setImportingMarkedWords] = useState(false);
  const [confirmingMarkedImport, setConfirmingMarkedImport] = useState(false);
  const [translationResult, setTranslationResult] =
    useState<WordAgentItem | null>(null);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [addInitialValues, setAddInitialValues] =
    useState<AddInitialValues | null>(null);
  const [highlightWord, setHighlightWord] = useState("");
  const [microCreateError, setMicroCreateError] = useState("");
  const [microWaitLong, setMicroWaitLong] = useState(false);
  const microEntry = useMemo(
    () => parseMicroContextEntry(initialSearch),
    [initialSearch],
  );
  const invalidMicroEntry = useMemo(
    () => isInvalidMicroContextEntry(initialSearch),
    [initialSearch],
  );
  const microTaskId = useMemo(() => {
    if (!microEntry) return null;
    const value = Number(new URLSearchParams(initialSearch).get("taskId"));
    return Number.isInteger(value) && value > 0 ? value : null;
  }, [initialSearch, microEntry]);
  const isMicroMode = microEntry !== null || invalidMicroEntry;
  const autoCreateMicroKeyRef = useRef<string | null>(null);
  const microCreateInFlightRef = useRef(false);
  const activeMicroTaskIdRef = useRef<number | null>(null);
  const generatedMicroTaskIdsRef = useRef(new Set<number>());
  const completedMicroTaskIdsRef = useRef(new Set<number>());
  const microRequestUidRef = useRef<string | null>(null);
  const submitInFlightRef = useRef(false);

  const closeSelectionMenu = () => {
    setSelectionMenu((prev) => ({ ...prev, open: false }));
    setTranslationResult(null);
  };

  const requestBody = useMemo<ContextLabGenerateParams>(() => {
    if (microEntry) {
      return buildMicroGenerateParams(
        microEntry.reciteSessionId,
        microEntry.words,
      );
    }
    return buildContextLabGenerateParams({
      sourceMode,
      count,
      customWords,
      proficiencyLevels,
      ieltsBand,
      modelProvider,
    });
  }, [
    count,
    customWords,
    ieltsBand,
    microEntry,
    modelProvider,
    proficiencyLevels,
    sourceMode,
  ]);

  const recordMicroGenerated = useCallback(async (task: ContextLabTask) => {
    if (!microEntry || generatedMicroTaskIdsRef.current.has(task.taskId)) return;
    const saved = await recordLearningEvent({
      eventUid: buildLearningEventUid("micro_context_generated", task.taskId),
      eventType: "micro_context_generated",
      reciteSessionId: microEntry.reciteSessionId,
      contextTaskId: task.taskId,
      wordCount: microEntry.words.length,
      timezoneOffsetMinutes: -new Date().getTimezoneOffset(),
      status: "succeeded",
    });
    if (saved) generatedMicroTaskIdsRef.current.add(task.taskId);
  }, [microEntry]);

  const createMicroTask = useCallback(async (renewRequestUid = false) => {
    if (!microEntry || microCreateInFlightRef.current) return;
    if (renewRequestUid || !microRequestUidRef.current) {
      microRequestUidRef.current = createRequestUid();
    }
    microCreateInFlightRef.current = true;
    setCreating(true);
    setMicroCreateError("");
    setMicroWaitLong(false);
    activeMicroTaskIdRef.current = null;
    setCurrentTask(null);
    setAnswers({});
    setResults([]);
    setSubmitSummary(null);
    setElapsedSeconds(0);
    try {
      const task = await request(
        contextLabCreateTask(
          buildMicroGenerateParams(
            microEntry.reciteSessionId,
            microEntry.words,
            microRequestUidRef.current,
          ),
        ),
      );
      activeMicroTaskIdRef.current = task.taskId;
      setCurrentTask(task);
      onMicroTaskReady?.(task.taskId);
      if (task.status === "succeeded") {
        void recordMicroGenerated(task);
        setPracticeModalOpen(true);
      }
    } catch (error: unknown) {
      setMicroCreateError(
        error instanceof Error ? error.message : "错词语境生成失败",
      );
      message.error(error instanceof Error ? error.message : "错词语境生成失败");
    } finally {
      microCreateInFlightRef.current = false;
      setCreating(false);
    }
  }, [microEntry, onMicroTaskReady, recordMicroGenerated]);

  const refreshCurrentMicroTask = async () => {
    if (!microEntry || !currentTask) return;
    try {
      const task = await request<ContextLabTask>(
        contextLabDetail({ taskId: currentTask.taskId }),
      );
      if (task.reciteSessionId !== microEntry.reciteSessionId) return;
      setCurrentTask(task);
      if (task.status === "succeeded") {
        void recordMicroGenerated(task);
        setPracticeModalOpen(true);
      }
    } catch (error: unknown) {
      message.error(error instanceof Error ? error.message : "任务状态刷新失败");
    }
  };

  const trimmedHistoryKeyword = historyKeyword.trim();
  const historySearchActive =
    Boolean(trimmedHistoryKeyword) || historySourceType !== "all";

  const answeredCount =
    currentTask?.questions?.filter((question, index) => {
      const key = question.id || `q-${index}`;
      return answers[key] != null;
    }).length ?? 0;

  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      const response = await request(
        contextLabHistory({
          page: 1,
          pageSize: 10,
          ...(trimmedHistoryKeyword ? { keyword: trimmedHistoryKeyword } : {}),
          ...(getContextLabSearchSourceType(historySourceType)
            ? { sourceType: getContextLabSearchSourceType(historySourceType) }
            : {}),
        }),
      );
      const nextHistory = response.list ?? [];
      setHistory(nextHistory);
      setCurrentTask((prev) => {
        if (!prev) return prev;
        return (
          response.list?.find((task) => task.taskId === prev.taskId) ?? prev
        );
      });
    } catch (error: unknown) {
      message.error(error instanceof Error ? error.message : "历史记录加载失败");
    } finally {
      setHistoryLoading(false);
    }
  };

  const loadAttempts = async (task: ContextLabTask) => {
    setAttemptTask(task);
    setAttemptDrawerOpen(true);
    setAttemptsLoading(true);
    setSelectedAttemptId(null);
    setAttemptDetails({});
    try {
      const response = await request(
        contextLabAttemptHistory({ taskId: task.taskId, page: 1, pageSize: 20 }),
      );
      const nextAttempts = response.list ?? [];
      setAttempts(nextAttempts);
      setSelectedAttemptId((prev) =>
        nextAttempts.some((attempt) => attempt.attemptId === prev) ? prev : null,
      );
    } catch (error: unknown) {
      message.error(error instanceof Error ? error.message : "练习记录加载失败");
    } finally {
      setAttemptsLoading(false);
    }
  };

  const handleOpenAttemptDetail = async (attempt: ContextLabAttempt) => {
    if (selectedAttemptId === attempt.attemptId) {
      setSelectedAttemptId(null);
      return;
    }

    if (attemptDetails[attempt.attemptId]) {
      setSelectedAttemptId(attempt.attemptId);
      return;
    }

    setSelectedAttemptId(attempt.attemptId);
    setAttemptDetailLoadingId(attempt.attemptId);
    try {
      const detail = await request(
        contextLabAttemptDetail({ attemptId: attempt.attemptId }),
      );
      setAttemptDetails((prev) => ({
        ...prev,
        [attempt.attemptId]: detail,
      }));
    } catch (error: unknown) {
      message.error(error instanceof Error ? error.message : "练习详情加载失败");
    } finally {
      setAttemptDetailLoadingId((current) =>
        current === attempt.attemptId ? null : current,
      );
    }
  };

  useEffect(() => {
    if (isMicroMode) return;
    const timer = window.setTimeout(() => {
      void loadHistory();
    }, 300);
    return () => window.clearTimeout(timer);
  }, [historyKeyword, historySourceType, isMicroMode]);

  useEffect(() => {
    return subscribeContextLabTaskEvents((task) => {
      setHistory((prev) => {
        const exists = prev.some((item) => item.taskId === task.taskId);
        if (!exists) {
          return historySearchActive ? prev : [task, ...prev].slice(0, 10);
        }
        return prev.map((item) =>
          item.taskId === task.taskId ? { ...item, ...task } : item,
        );
      });
      setCurrentTask((prev) =>
        prev?.taskId === task.taskId ? { ...prev, ...task } : prev,
      );
      if (
        microEntry &&
        task.taskId === activeMicroTaskIdRef.current &&
        task.reciteSessionId === microEntry.reciteSessionId &&
        task.status === "succeeded"
      ) {
        void recordMicroGenerated(task);
        setPracticeModalOpen(true);
      }
    });
  }, [historySearchActive, microEntry, recordMicroGenerated]);

  useEffect(() => {
    if (!microEntry || !microTaskId) return;
    let cancelled = false;
    void request<ContextLabTask>(
      {
        ...contextLabDetail({ taskId: microTaskId }),
        config: { suppressErrorMessage: true },
      },
    )
      .then((task) => {
        if (
          cancelled ||
          task.mode !== "micro" ||
          task.reciteSessionId !== microEntry.reciteSessionId
        ) {
          if (!cancelled) setMicroCreateError("修复任务与来源回合不一致");
          return;
        }
        activeMicroTaskIdRef.current = task.taskId;
        setCurrentTask(task);
        if (task.latestAttempt) {
          completedMicroTaskIdsRef.current.add(task.taskId);
          setResults(task.latestAttempt.results ?? []);
          setSubmitSummary(task.latestAttempt as ContextLabSubmitResult);
        }
        if (task.status === "succeeded") {
          void recordMicroGenerated(task);
          setPracticeModalOpen(true);
        }
      })
      .catch(() => {
        if (!cancelled) setMicroCreateError("修复任务不可用，请重新生成");
      });
    return () => {
      cancelled = true;
    };
  }, [microEntry, microTaskId, recordMicroGenerated]);

  useEffect(() => {
    if (
      !microEntry ||
      !currentTask ||
      !isContextLabTaskActive(currentTask.status)
    ) {
      return;
    }
    let cancelled = false;
    const refresh = async () => {
      try {
        const task = await request<ContextLabTask>(
          {
            ...contextLabDetail({ taskId: currentTask.taskId }),
            config: { suppressErrorMessage: true },
          },
        );
        if (
          cancelled ||
          task.taskId !== activeMicroTaskIdRef.current ||
          task.reciteSessionId !== microEntry.reciteSessionId
        ) {
          return;
        }
        setCurrentTask(task);
        if (task.status === "succeeded") {
          void recordMicroGenerated(task);
          setPracticeModalOpen(true);
        }
      } catch {
        // SSE may reconnect later; polling keeps trying while the task is active.
      }
    };
    void refresh();
    const pollTimer = window.setInterval(() => void refresh(), 2000);
    const waitTimer = window.setTimeout(() => setMicroWaitLong(true), 90_000);
    return () => {
      cancelled = true;
      window.clearInterval(pollTimer);
      window.clearTimeout(waitTimer);
    };
  }, [currentTask, microEntry, recordMicroGenerated]);

  useEffect(() => {
    if (!microEntry || microTaskId) return;
    const entryKey = `${microEntry.reciteSessionId}:${microEntry.words.join("|")}`;
    if (autoCreateMicroKeyRef.current === entryKey) return;
    autoCreateMicroKeyRef.current = entryKey;
    void createMicroTask();
  }, [createMicroTask, microEntry, microTaskId]);

  useEffect(() => {
    const params = new URLSearchParams(initialSearch);
    const words = (params.get("words") ?? "")
      .split(",")
      .map((word) => word.trim())
      .filter(Boolean)
      .slice(0, 20);

    if (params.get("source") === "cockpit" && words.length > 0) {
      const timer = window.setTimeout(() => {
        setSourceMode("custom");
        setCustomWords(words.join(", "));
      }, 0);
      return () => window.clearTimeout(timer);
    }
  }, [initialSearch]);

  useEffect(() => {
    if (microEntry) return;
    const reference = parseContextLabReference(
      `/englishWorld/context-lab${initialSearch}`,
    );
    if (!reference?.taskId) return;

    let cancelled = false;
    void (async () => {
      try {
        const existingTask = history.find(
          (task) => task.taskId === reference.taskId,
        );
        const task =
          existingTask?.status === "succeeded" && existingTask.article
            ? existingTask
            : await request<ContextLabTask>(
                {
                  ...contextLabDetail({ taskId: reference.taskId }),
                  config: { suppressErrorMessage: true },
                },
              );
        if (cancelled) return;
        setCurrentTask(task);
        setAnswers({});
        setResults([]);
        setSubmitSummary(null);
        setElapsedSeconds(0);
        setSourcePreviewFullscreen(false);
        setHighlightWord(reference.word ?? "");
        setPracticeModalOpen(false);
        setSourcePreviewOpen(true);
      } catch {
        if (!cancelled) {
          message.warning("来源文章已删除或不可访问");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [history, initialSearch, microEntry]);

  useEffect(() => {
    const timer = window.setTimeout(() => setMarkedVocabulary([]), 0);
    return () => window.clearTimeout(timer);
  }, [currentTask?.taskId]);

  useEffect(() => {
    if (
      !practiceModalOpen ||
      currentTask?.status !== "succeeded" ||
      !currentTask.questions?.length ||
      results.length > 0
    ) {
      return;
    }

    const timer = window.setInterval(() => {
      setElapsedSeconds((seconds) => seconds + 1);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [
    currentTask?.questions?.length,
    currentTask?.status,
    currentTask?.taskId,
    practiceModalOpen,
    results.length,
  ]);

  const handleGenerate = async () => {
    setCreating(true);
    setCurrentTask(null);
    setAnswers({});
    setResults([]);
    setSubmitSummary(null);
    setElapsedSeconds(0);
    try {
      const task = await request(contextLabCreateTask(requestBody));
      setHistory((prev) => [
        task,
        ...prev.filter((item) => item.taskId !== task.taskId),
      ]);
      message.success("生成任务已提交");
      await loadHistory();
      setCurrentTask(task);
    } catch (error: unknown) {
      message.error(error instanceof Error ? error.message : "任务提交失败");
    } finally {
      setCreating(false);
    }
  };

  const handleDownloadTemplate = async () => {
    setDownloading(true);
    try {
      await downloadContextLabPdfTemplate();
      message.success("PDF 模板已开始下载");
    } catch (error: unknown) {
      message.error(error instanceof Error ? error.message : "PDF 模板下载失败");
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadTaskPdf = async (task: ContextLabTask) => {
    setDownloadingTaskId(task.taskId);
    try {
      await downloadContextLabTaskPdf(task.taskId);
      message.success("本次练习 PDF 已开始下载");
    } catch (error: unknown) {
      message.error(error instanceof Error ? error.message : "本次练习 PDF 下载失败");
    } finally {
      setDownloadingTaskId(null);
    }
  };

  const handleOpenTask = (task: ContextLabTask) => {
    setCurrentTask(task);
    setAnswers({});
    setResults([]);
    setSubmitSummary(null);
    setElapsedSeconds(0);
    setHighlightWord("");
    setSourcePreviewFullscreen(false);
    setSourcePreviewOpen(false);
    setPracticeFullscreen(false);
    setPracticeModalOpen(true);
  };

  const handleStartPracticeFromSource = () => {
    if (!currentTask) return;
    setAnswers({});
    setResults([]);
    setSubmitSummary(null);
    setElapsedSeconds(0);
    setSourcePreviewFullscreen(false);
    setSourcePreviewOpen(false);
    setPracticeFullscreen(false);
    setPracticeModalOpen(true);
  };

  const handleDeleteAttempt = (attempt: ContextLabAttempt) => {
    Modal.confirm({
      title: "确认删除练习记录",
      content: "删除后不可恢复，本次练习记录将永久移除。",
      okText: "确认删除",
      cancelText: "取消",
      okButtonProps: { danger: true },
      transitionName: "",
      maskTransitionName: "",
      onOk: async () => {
        try {
          await request(contextLabDeleteAttempt({ attemptId: attempt.attemptId }));
          message.success("练习记录已删除");
          if (attemptTask) {
            await loadAttempts(attemptTask);
          }
          setAttemptDetails((prev) => {
            const nextDetails = { ...prev };
            delete nextDetails[attempt.attemptId];
            return nextDetails;
          });
          setSelectedAttemptId((current) =>
            current === attempt.attemptId ? null : current,
          );
          await loadHistory();
        } catch (error: unknown) {
          message.error(error instanceof Error ? error.message : "练习记录删除失败");
        }
      },
    });
  };

  const handleDeleteTask = (task: ContextLabTask) => {
    if (isContextLabTaskActive(task.status)) {
      message.warning(ACTIVE_TASK_DELETE_MESSAGE);
      return;
    }

    Modal.confirm({
      title: "确认删除练习包",
      content: "删除后不可恢复，本练习包及其所有练习记录将永久移除。",
      okText: "确认删除",
      cancelText: "取消",
      okButtonProps: { danger: true },
      transitionName: "",
      maskTransitionName: "",
      onOk: () => {
        void (async () => {
          try {
            await request(contextLabDeleteTask({ taskId: task.taskId }));
            message.success("练习包已删除");
            if (currentTask?.taskId === task.taskId) {
              setCurrentTask(null);
              setSourcePreviewOpen(false);
              setSourcePreviewFullscreen(false);
              setPracticeModalOpen(false);
            }
            if (attemptTask?.taskId === task.taskId) {
              setAttemptDrawerOpen(false);
              setAttemptTask(null);
              setAttempts([]);
              setAttemptDetails({});
              setSelectedAttemptId(null);
            }
            await loadHistory();
          } catch (error: unknown) {
            message.error(error instanceof Error ? error.message : "练习包删除失败");
          }
        })();
      },
    });
  };

  const handleSubmit = async () => {
    if (!currentTask?.questions?.length) return;
    if (submitInFlightRef.current) return;
    const sessionId = currentTask.articleExerciseId ?? currentTask.taskId;
    const questionKeys = currentTask.questions.map((question, index) =>
      question.id || `q-${index}`,
    );
    const unanswered = questionKeys.filter((key) => answers[key] == null);
    if (unanswered.length > 0) {
      message.warning(`还有 ${unanswered.length} 题未作答`);
      return;
    }

    submitInFlightRef.current = true;
    setSubmitting(true);
    try {
      const response = await request(
        contextLabSubmit({
          sessionId,
          elapsedSeconds,
          answers: currentTask.questions.map((question, index) => {
            const key = question.id || `q-${index}`;
            return {
              questionId: key,
              selectedIndex: answers[key],
            };
          }),
        }),
      );
      setResults(response.results ?? []);
      setSubmitSummary(response);
      if (microEntry) {
        if (
          response.attemptId &&
          !completedMicroTaskIdsRef.current.has(currentTask.taskId)
        ) {
          const saved = await recordLearningEvent({
          eventUid: buildLearningEventUid(
            "micro_context_completed",
            currentTask.taskId,
          ),
          eventType: "micro_context_completed",
          reciteSessionId: microEntry.reciteSessionId,
          contextTaskId: currentTask.taskId,
          attemptId: response.attemptId,
          wordCount: microEntry.words.length,
          correctCount: response.correctCount,
          elapsedSeconds,
          timezoneOffsetMinutes: -new Date().getTimezoneOffset(),
          status: "completed",
          });
          if (saved) completedMicroTaskIdsRef.current.add(currentTask.taskId);
        }
      } else {
        await loadHistory();
      }
      message.success("练习已提交");
    } catch (error: unknown) {
      message.error(error instanceof Error ? error.message : "提交失败");
    } finally {
      submitInFlightRef.current = false;
      setSubmitting(false);
    }
  };

  const handleReadingContextMenu = (event: MouseEvent<HTMLElement>) => {
    const text = cleanSelectedVocabularyText(
      window.getSelection()?.toString() || "",
    );
    if (!text) return;
    event.preventDefault();
    setSelectedVocabulary(text);
    setTranslationResult(null);
    setSelectionMenu({
      open: true,
      x: event.clientX,
      y: event.clientY,
    });
  };

  const handleMarkSelectedVocabulary = () => {
    const text = cleanSelectedVocabularyText(selectedVocabulary);
    if (!text) {
      message.warning("请先选中单词或短语");
      return;
    }

    const key = getVocabularyKey(text);
    if (markedVocabulary.some((item) => item.key === key)) {
      message.info("这个词已经标记过了");
      closeSelectionMenu();
      window.getSelection()?.removeAllRanges();
      return;
    }

    setMarkedVocabulary((prev) => [
      ...prev,
      buildMarkedVocabularyItem(text, currentTask),
    ]);
    setImportPreviewWords([]);
    setImportPreviewOpen(false);
    setImportOverwriteExisting(false);
    message.success("已标记，稍后可一键导入");
    closeSelectionMenu();
    window.getSelection()?.removeAllRanges();
  };

  const handleRemoveMarkedVocabulary = (key: string) => {
    setMarkedVocabulary((prev) => prev.filter((item) => item.key !== key));
    setImportPreviewWords([]);
    setImportPreviewOpen(false);
    setImportOverwriteExisting(false);
  };

  const handleClearMarkedVocabulary = () => {
    setMarkedVocabulary([]);
    setImportPreviewWords([]);
    setImportPreviewOpen(false);
    setImportOverwriteExisting(false);
  };

  const handleCloseImportPreview = () => {
    setImportPreviewOpen(false);
    setImportPreviewWords([]);
    setImportOverwriteExisting(false);
  };

  const handleImportMarkedVocabulary = async () => {
    if (markedVocabulary.length === 0) {
      message.warning("还没有标记生词");
      return;
    }

    const wordsSnapshot = markedVocabulary;
    setImportPreviewWords(wordsSnapshot);
    setImportOverwriteExisting(false);
    setImportPreviewOpen(true);
    setImportingMarkedWords(true);
    try {
      const response = await request(
        wordAgentQuery({
          words: wordsSnapshot.map((item) => item.englishWord),
        }),
      );
      setImportPreviewWords((prev) =>
        mergeImportPreviewWithAi(
          prev.length ? prev : wordsSnapshot,
          wordsSnapshot,
          response.words ?? [],
        ),
      );
    } catch (error: unknown) {
      message.error(error instanceof Error ? error.message : "AI 补全标记词失败");
    } finally {
      setImportingMarkedWords(false);
    }
  };

  const handleConfirmMarkedVocabularyImport = async () => {
    if (importPreviewWords.length === 0) {
      message.warning("没有可导入的预览词");
      return;
    }

    setConfirmingMarkedImport(true);
    try {
      const response = await request(
        wordImportMissing({
          overwriteExisting: importOverwriteExisting,
          words: importPreviewWords.map(toImportWordPayload),
        }),
      );
      const updated = response.updated ?? 0;
      if (response.inserted > 0 || updated > 0) {
        message.success(getBulkImportMessage(response));
      } else {
        message.info("标记词都已在词库，无需重复导入");
      }
      handleClearMarkedVocabulary();
      setImportPreviewWords([]);
    } catch (error: unknown) {
      message.error(error instanceof Error ? error.message : "导入标记词失败");
    } finally {
      setConfirmingMarkedImport(false);
    }
  };

  useEffect(() => {
    if (!selectionMenu.open) return;

    const handlePointerDown = () => closeSelectionMenu();
    window.addEventListener("pointerdown", handlePointerDown);

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [selectionMenu.open]);

  const querySelectedVocabulary = async (text: string) => {
    const data = await request<{ words: WordAgentItem[] }>(
      wordAgentQuery({ word: text }),
    );
    return data?.words?.[0] ?? null;
  };

  const handleTranslateSelectedVocabulary = async () => {
    const text = cleanSelectedVocabularyText(selectedVocabulary);
    if (!text) {
      message.warning("请先选中单词或短语");
      return;
    }
    setTranslatingSelectedWord(true);
    try {
      const item = await querySelectedVocabulary(text);
      if (!item) {
        message.warning("AI 没有返回翻译结果");
        return;
      }
      setTranslationResult(item);
    } catch (error: unknown) {
      message.error(error instanceof Error ? error.message : "翻译失败");
    } finally {
      setTranslatingSelectedWord(false);
    }
  };

  const handleAddSelectedVocabulary = async () => {
    const text = cleanSelectedVocabularyText(selectedVocabulary);
    if (!text) {
      message.warning("请先选中单词或短语");
      return;
    }
    setAddingSelectedWord(true);
    try {
      const item = await querySelectedVocabulary(text);
      if (!item) {
        message.warning("AI 没有返回可添加的词条");
        return;
      }
      setAddInitialValues({
        ...wordAgentItemToAddInitial(item, text),
        englishReference:
          currentTask && currentTask.taskId
            ? buildContextLabReference(currentTask, text)
            : undefined,
      });
      setAddModalVisible(true);
      setSelectionMenu((prev) => ({ ...prev, open: false }));
      window.getSelection()?.removeAllRanges();
    } catch (error: unknown) {
      message.error(error instanceof Error ? error.message : "AI 补全失败");
    } finally {
      setAddingSelectedWord(false);
    }
  };

  const handleAddModalOk = async (
    data: WordList,
    type: "edit" | "add",
  ): Promise<boolean> => {
    if (type !== "add") return false;
    const englishWord = (data.englishWord ?? "").trim();
    if (!englishWord) {
      message.warning("请输入单词名");
      return false;
    }
    try {
      const exists = await request<boolean>(wordExist({ englishWord }));
      if (exists) {
        message.warning("该词已在词库，无需重复添加");
        setAddInitialValues((prev) =>
          prev ??
          wordAgentItemToAddInitial(
            {
              word: englishWord,
              phonetic: data.englishPhonetic ?? "",
              meaning: data.englishChinese ?? "",
              partOfSpeech: data.englishPartSpeech,
              examples: [],
              ieltsCase: null,
            },
            englishWord,
          ),
        );
        return false;
      }
      await request(wordAdd(data));
      message.success(
        data.englishReference
          ? "已保存到词库，并关联当前阅读来源"
          : "已保存到单词本",
      );
      setAddModalVisible(false);
      setAddInitialValues(null);
      return true;
    } catch (error: unknown) {
      message.error(error instanceof Error ? error.message : "保存失败");
      return false;
    }
  };

  const handleAddModalCancel = () => {
    setAddModalVisible(false);
    setAddInitialValues(null);
  };

  const renderTaskStatus = (task: ContextLabTask) => (
    <div className="context-lab-task-status">
      <div>
        <Text className="learning-cockpit-label">Task #{task.taskId}</Text>
        <Title level={4}>{getContextLabStatusLabel(task.status)}</Title>
        <Text type="secondary">
          {task.errorMessage
            ? getContextLabErrorMessage(task.errorMessage)
            : getContextLabStatusDescription(task.status)}
        </Text>
      </div>
      <Space>
        {task.status === "succeeded" && !isMicroMode && (
          <Button
            aria-label="下载本次练习 PDF"
            icon={<DownloadOutlined />}
            loading={downloadingTaskId === task.taskId}
            onClick={() => handleDownloadTaskPdf(task)}
          >
            下载本次练习 PDF
          </Button>
        )}
        <Tag color={getContextLabStatusTone(task.status)}>
          {getContextLabStatusLabel(task.status)}
        </Tag>
      </Space>
    </div>
  );

  const renderTaskMetrics = (task: ContextLabTask) => {
    if (task.attemptCount) {
      return (
        <>
          <span className="context-lab-history-summary">
            练习 {task.attemptCount} 次 · 最近得分 {task.latestScore ?? 0} · 错题{" "}
            {task.latestWrongCount ?? 0}
          </span>
          <span>练习 {task.attemptCount} 次</span>
          <span>最近得分 {task.latestScore ?? 0}</span>
          <span>错题 {task.latestWrongCount ?? 0}</span>
        </>
      );
    }

    if (task.status === "failed") {
      return <span>{getContextLabErrorMessage(task.errorMessage)}</span>;
    }

    if (isContextLabTaskActive(task.status)) {
      return <span>{getContextLabStatusDescription(task.status)}</span>;
    }

    return <span>还没有提交记录，开始练习后会出现在这里。</span>;
  };

  const renderHighlightedArticleText = (text: string) => {
    const highlightTerms = [
      ...markedVocabulary.map((item) => ({
        className:
          "context-lab-article-highlight context-lab-marked-vocabulary-highlight",
        key: item.key,
        text: item.englishWord,
      })),
      ...(highlightWord.trim()
        ? [
            {
              className: "context-lab-article-highlight",
              key: getVocabularyKey(highlightWord),
              text: highlightWord.trim(),
            },
          ]
        : []),
    ].reduce<Array<{ className: string; key: string; lowerText: string; text: string }>>(
      (items, item) => {
        const cleanText = cleanSelectedVocabularyText(item.text);
        if (!cleanText || items.some((existing) => existing.key === item.key)) {
          return items;
        }
        return [
          ...items,
          {
            ...item,
            lowerText: cleanText.toLocaleLowerCase(),
            text: cleanText,
          },
        ];
      },
      [],
    );

    if (highlightTerms.length === 0) return text;

    const sortedTerms = [...highlightTerms].sort(
      (left, right) => right.text.length - left.text.length,
    );
    const lowerText = text.toLocaleLowerCase();
    const segments: Array<{ className?: string; text: string }> = [];
    let cursor = 0;

    while (cursor < text.length) {
      const nextMatch = sortedTerms.reduce<
        | {
            className: string;
            index: number;
            length: number;
          }
        | undefined
      >((bestMatch, term) => {
        const index = lowerText.indexOf(term.lowerText, cursor);
        if (index < 0) return bestMatch;
        if (!bestMatch || index < bestMatch.index) {
          return {
            className: term.className,
            index,
            length: term.text.length,
          };
        }
        if (index === bestMatch.index && term.text.length > bestMatch.length) {
          return {
            className: term.className,
            index,
            length: term.text.length,
          };
        }
        return bestMatch;
      }, undefined);

      if (!nextMatch) {
        segments.push({ text: text.slice(cursor) });
        break;
      }

      if (nextMatch.index > cursor) {
        segments.push({ text: text.slice(cursor, nextMatch.index) });
      }

      segments.push({
        className: nextMatch.className,
        text: text.slice(nextMatch.index, nextMatch.index + nextMatch.length),
      });
      cursor = nextMatch.index + nextMatch.length;
    }

    return segments.map((segment, index) =>
      segment.className ? (
        <mark className={segment.className} key={`${segment.text}-${index}`}>
          {segment.text}
        </mark>
      ) : (
        <span key={`${segment.text}-${index}`}>{segment.text}</span>
      ),
    );
  };

  const renderResultReview = () => {
    if (!submitSummary) return null;
    const weakWords = submitSummary.weakWords ?? [];
    const nextSuggestions = submitSummary.nextSuggestions ?? [];

    return (
      <section
        aria-label="结果复盘"
        className="context-lab-result-review"
      >
        <div>
          <Text className="learning-cockpit-label">Result</Text>
          <Title level={4}>{isMicroMode ? "语境结果" : "结果复盘"}</Title>
        </div>
        <div className="context-lab-result-metrics">
          <strong>{submitSummary.score ?? 0}</strong>
          <span>得分</span>
          <Tag color={(submitSummary.wrongCount ?? 0) > 0 ? "orange" : "green"}>
            {isMicroMode
              ? (submitSummary.wrongCount ?? 0) > 0
                ? "还需复查"
                : "语境通过"
              : `错题 ${submitSummary.wrongCount ?? 0}`}
          </Tag>
        </div>
        {weakWords.length > 0 && (
          <div className="learning-cockpit-word-strip">
            {weakWords.map((word) => (
              <Tag key={word} color="red">
                {word}
              </Tag>
            ))}
          </div>
        )}
        <ul>
          {nextSuggestions.map((suggestion) => (
            <li key={suggestion}>{suggestion}</li>
          ))}
        </ul>
        {isMicroMode && <Text type="secondary">下一自然日再确认</Text>}
        <Space wrap>
          {isMicroMode ? (
            <Button
              onClick={() => {
                setAnswers({});
                setResults([]);
                setSubmitSummary(null);
                setElapsedSeconds(0);
                setSubmitting(false);
              }}
            >
              整组再答一次
            </Button>
          ) : weakWords.length > 0 ? (
            <Button
              onClick={() => {
                setSourceMode("custom");
                setCustomWords(weakWords.join(", "));
                setPracticeModalOpen(false);
              }}
            >
              用薄弱词再练一套
            </Button>
          ) : null}
          <Button onClick={onOpenWordLibrary}>
            打开词库
          </Button>
        </Space>
      </section>
    );
  };

  const renderArticleReadingPane = () => {
    if (
      currentTask?.status !== "succeeded" ||
      !currentTask.article
    ) {
      return null;
    }

    return (
      <section
        aria-label="文章阅读区"
        className="context-lab-reading-pane"
        onScroll={closeSelectionMenu}
      >
        <div
          className="context-lab-article"
          onContextMenu={isMicroMode ? undefined : handleReadingContextMenu}
        >
          {(() => {
            const articleContent = parseArticleContent(currentTask.article);
            return (
              <>
                <div className="context-lab-article-topic-wrap">
                  <Text className="learning-cockpit-label">雅思阅读</Text>
                  {articleContent.topic && (
                    <>
                      <Text className="context-lab-topic-label">文章主题</Text>
                      <span
                        aria-hidden="true"
                        className="context-lab-topic-divider"
                      >
                        /
                      </span>
                      <h4 className="context-lab-article-topic">
                        {renderHighlightedArticleText(articleContent.topic)}
                      </h4>
                    </>
                  )}
                </div>
                {articleContent.paragraphs.map((paragraph, index) => (
                  <p
                    className="context-lab-article-paragraph"
                    key={`${paragraph}-${index}`}
                  >
                    {renderHighlightedArticleText(paragraph)}
                  </p>
                ))}
              </>
            );
          })()}
        </div>
        {!isMicroMode && markedVocabulary.length > 0 && (
          <section
            aria-label="已标记生词"
            className="context-lab-marked-vocabulary"
          >
            <div className="context-lab-marked-vocabulary-head">
              <div>
                <Text className="learning-cockpit-label">Marked</Text>
                <strong>已标记 {markedVocabulary.length} 个生词</strong>
              </div>
              <Space size={6}>
                <Button
                  size="small"
                  type="link"
                  onClick={handleClearMarkedVocabulary}
                >
                  清空
                </Button>
                <Button
                  loading={importingMarkedWords}
                  size="small"
                  type="primary"
                  onClick={handleImportMarkedVocabulary}
                >
                  预览并导入
                </Button>
              </Space>
            </div>
            <div className="context-lab-marked-vocabulary-list">
              {markedVocabulary.map((item) => (
                <Tag
                  closable
                  color="gold"
                  key={item.key}
                  onClose={(event) => {
                    event.preventDefault();
                    handleRemoveMarkedVocabulary(item.key);
                  }}
                >
                  {item.englishWord}
                </Tag>
              ))}
            </div>
          </section>
        )}
        <div className="learning-cockpit-word-strip">
          {currentTask.words.map((word) => (
            <Tag key={word} color="blue">
              {word}
            </Tag>
          ))}
        </div>
        {!isMicroMode && selectionMenu.open && (
          <div
            className="context-lab-selection-menu"
            onPointerDown={(event) => event.stopPropagation()}
            style={{ left: selectionMenu.x, top: selectionMenu.y }}
          >
            <div className="context-lab-selection-menu-actions">
              <Button
                size="small"
                type="text"
                onClick={handleMarkSelectedVocabulary}
              >
                标记生词
              </Button>
              <Button
                loading={translatingSelectedWord}
                size="small"
                type="text"
                onClick={handleTranslateSelectedVocabulary}
              >
                翻译
              </Button>
              <Button
                loading={addingSelectedWord}
                size="small"
                type="text"
                onClick={handleAddSelectedVocabulary}
              >
                一键添加到词库
              </Button>
            </div>
            {translationResult && (
              <div className="context-lab-selection-translation">
                <strong>{translationResult.word || selectedVocabulary}</strong>
                {translationResult.phonetic && (
                  <span>{translationResult.phonetic}</span>
                )}
                <p>{translationResult.meaning || "暂无释义"}</p>
              </div>
            )}
          </div>
        )}
      </section>
    );
  };

  const renderPracticeWorkspace = () => {
    if (
      currentTask?.status !== "succeeded" ||
      !currentTask.article ||
      !currentTask.questions
    ) {
      return null;
    }

    return (
      <div className="context-lab-practice-pack">
        <div className="context-lab-practice-workspace">
          {renderArticleReadingPane()}

          <section aria-label="题目作答区" className="context-lab-question-pane">
            <div className="context-lab-question-toolbar">
              <div>
                <Text className="learning-cockpit-label">Questions</Text>
                <Title level={4}>题目</Title>
              </div>
              <div className="context-lab-timer">
                <Text>做题计时</Text>
                <strong>{formatElapsedSeconds(elapsedSeconds)}</strong>
                <span>
                  已答 {answeredCount}/{currentTask.questions.length}
                </span>
              </div>
            </div>

            <div className="context-lab-question-list">
              {currentTask.questions.map((question, index) => {
                const questionKey = question.id || `q-${index}`;
                const result = results.find(
                  (item) => item.questionId === questionKey,
                );
                const questionTypeLabel = formatContextLabQuestionTypeLabel(
                  question.questionType,
                );
                return (
                  <section
                    className="context-lab-question-card"
                    key={questionKey}
                  >
                    <div className="context-lab-question-meta">
                      <div className="context-lab-question-index">
                        第 {index + 1} 题
                      </div>
                      {questionTypeLabel && (
                        <Tag className="context-lab-question-type">
                          {questionTypeLabel}
                        </Tag>
                      )}
                    </div>
                    {isMicroMode && question.targetWord && (
                      <Tag className="context-lab-target-word">
                        目标词：{question.targetWord}
                      </Tag>
                    )}
                    <p>{question.stem}</p>
                    {result && (
                      <Tag color={result.correct ? "green" : "red"}>
                        {result.correct ? "正确" : "需要复盘"}
                      </Tag>
                    )}
                    {result?.explanation && (
                      <div className="context-lab-question-explanation">
                        <Text className="learning-cockpit-label">解析</Text>
                        <p>
                          {formatExplanationText(
                            result.explanation,
                            result.correctIndex,
                          )}
                        </p>
                      </div>
                    )}
                    <Radio.Group
                      value={answers[questionKey]}
                      onChange={(event) =>
                        setAnswers((prev) => ({
                          ...prev,
                          [questionKey]: event.target.value,
                        }))
                      }
                      options={question.options.map((option, optionIndex) => ({
                        label: formatOptionLabel(option, optionIndex),
                        value: optionIndex,
                      }))}
                    />
                  </section>
                );
              })}
            </div>

            {renderResultReview()}

            <div className="context-lab-question-actions">
              <Button
                aria-label="提交练习"
                disabled={submitting}
                type="primary"
                loading={submitting}
                onClick={handleSubmit}
              >
                提交练习
              </Button>
            </div>
          </section>
        </div>
      </div>
    );
  };

  return (
    <>
      <div
        className={`context-lab-page${
          isMicroMode ? " context-lab-page-micro" : ""
        }`}
      >
        {isMicroMode && (
          <section className="learning-cockpit-hero context-lab-hero">
            <div>
              <Text className="learning-cockpit-label">Context Repair</Text>
              <Title level={1}>错词语境巩固</Title>
              <p>用一篇短语境和三道题，重新建立这组错词的理解线索。</p>
            </div>
            <Tag className="context-lab-hero-tag" icon={<ExperimentOutlined />}>
              约 3 分钟
            </Tag>
          </section>
        )}

        {invalidMicroEntry ? (
          <section className="learning-cockpit-card context-lab-micro-intro">
            <div className="learning-cockpit-card-heading">
              <div>
                <Text className="learning-cockpit-label">链接无效</Text>
                <Title level={3}>修复词或来源回合无效</Title>
                <Text type="secondary">
                  这次不会自动降级为普通生成，请从复习结果重新进入。
                </Text>
              </div>
              <Button type="primary" onClick={onBackToToday}>
                返回今日路线
              </Button>
            </div>
          </section>
        ) : isMicroMode && microEntry ? (
          <section className="learning-cockpit-card context-lab-micro-intro">
            <div className="learning-cockpit-card-heading">
              <div>
                <Text className="learning-cockpit-label">本次目标词</Text>
                <Title level={3}>先在短语境里再认一次</Title>
              </div>
              <Button
                onClick={() =>
                  onBackToReciteResult?.(microEntry.reciteSessionId)
                }
              >
                返回复习结果
              </Button>
            </div>
            <div className="learning-cockpit-word-strip">
              {microEntry.words.map((word) => (
                <Tag color="blue" key={word}>
                  {word}
                </Tag>
              ))}
            </div>
            {creating && (
              <div className="context-lab-history-empty">
                <Spin />
                <Text type="secondary">正在生成专属短语境...</Text>
              </div>
            )}
            {microWaitLong && isContextLabTaskActive(currentTask?.status ?? "failed") && (
              <div className="context-lab-micro-retry">
                <Text type="secondary">仍在生成，你可以刷新状态或先返回结果页。</Text>
                <Space>
                  <Button onClick={() => void refreshCurrentMicroTask()}>
                    刷新状态
                  </Button>
                  <Button
                    onClick={() =>
                      onBackToReciteResult?.(microEntry.reciteSessionId)
                    }
                  >
                    返回复习结果
                  </Button>
                </Space>
              </div>
            )}
            {currentTask && renderTaskStatus(currentTask)}
            {(microCreateError || currentTask?.status === "failed") && (
              <div className="context-lab-micro-retry">
                {microCreateError && (
                  <Text type="danger">{microCreateError}</Text>
                )}
                <Button
                  type="primary"
                  loading={creating}
                  onClick={() =>
                    void createMicroTask(currentTask?.status === "failed")
                  }
                >
                  重新生成
                </Button>
              </div>
            )}
            {currentTask?.status === "succeeded" && (
              <Button
                type="primary"
                icon={<PlayCircleOutlined />}
                onClick={() => handleOpenTask(currentTask)}
              >
                开始语境巩固
              </Button>
            )}
          </section>
        ) : (
          <div className="context-lab-shell">
            <header
              aria-label="AI 语境实验室工具栏"
              className="context-lab-utility-header"
            >
              <div className="context-lab-utility-title">
                <ExperimentOutlined aria-hidden="true" />
                <div>
                  <Title level={2}>AI 语境实验室</Title>
                  <Text type="secondary">
                    创建练习包，在弹窗中完成阅读、答题与复盘
                  </Text>
                </div>
              </div>
              <Space size={8}>
                <Button
                  icon={<ReloadOutlined aria-hidden="true" />}
                  loading={historyLoading}
                  onClick={loadHistory}
                >
                  刷新
                </Button>
                <Button
                  icon={<DownloadOutlined aria-hidden="true" />}
                  loading={downloading}
                  onClick={handleDownloadTemplate}
                >
                  下载 PDF 模板
                </Button>
              </Space>
            </header>

            <div className="context-lab-shell-body">
              <aside
                aria-label="新建语境练习"
                className="context-lab-sidebar"
              >
        <section
          className="context-lab-generator-card"
        >
          <div className="learning-cockpit-card-heading">
            <div>
              <Text className="learning-cockpit-label">Create</Text>
              <Title level={3}>生成练习</Title>
              <Text type="secondary">
                选择一组词，生成一套可阅读、可做题、可复盘的练习包。
              </Text>
            </div>
          </div>

          <Radio.Group
            aria-label="词汇来源"
            buttonStyle="solid"
            className="context-lab-source-mode"
            optionType="button"
            value={sourceMode}
            onChange={(event) =>
              setSourceMode(event.target.value as ContextLabSourceMode)
            }
            options={[
              { label: "今日薄弱词", value: "weak" },
              { label: "按掌握程度", value: "proficiency" },
              { label: "雅思核心", value: "ielts-core" },
              { label: "随机 IELTS", value: "ielts-random" },
              { label: "手输词", value: "custom" },
            ]}
          />

          <div className="context-lab-source-panel">
            {(sourceMode === "weak" ||
              sourceMode === "ielts-core" ||
              sourceMode === "ielts-random") && (
              <Space>
                <Text>生成数量</Text>
                <InputNumber
                  aria-label="生成数量"
                  min={3}
                  max={20}
                  value={count}
                  onChange={(value) => setCount(value ?? 8)}
                />
              </Space>
            )}

            <Space direction="vertical" size={6}>
              <Text>生成模型</Text>
              <Segmented
                aria-label="生成模型"
                value={modelProvider}
                onChange={(value) =>
                  setModelProvider(value as ContextLabModelProvider)
                }
                options={[
                  { label: "DeepSeek", value: "deepseek" },
                  { label: "GPT-5.6", value: "gpt" },
                ]}
              />
            </Space>

            <Space
              className="context-lab-ielts-band-field"
              direction="vertical"
              size={6}
            >
              <Text>雅思分数等级</Text>
              <InputNumber
                aria-label="雅思分数等级"
                min={IELTS_BAND_MIN}
                max={IELTS_BAND_MAX}
                step={IELTS_BAND_STEP}
                value={ieltsBand}
                onBlur={() =>
                  setIeltsBand((value) => normalizeIeltsBand(value))
                }
                onChange={(value) =>
                  setIeltsBand(
                    value === null || value === undefined
                      ? null
                      : normalizeIeltsBand(value),
                  )
                }
              />
              <Text type="secondary">
                5 到 9 分，每 0.5 分一档，控制文章和题目的雅思难度。
              </Text>
            </Space>

            {(sourceMode === "proficiency" || sourceMode === "ielts-core") && (
              <Space direction="vertical" size={8}>
                <Text>掌握程度</Text>
                <Checkbox.Group
                  className="context-lab-level-picker"
                  options={PROFICIENCY_OPTIONS}
                  value={proficiencyLevels}
                  onChange={(value) =>
                    setProficiencyLevels(value.map((item) => Number(item)))
                  }
                />
                <Text type="secondary">
                  {sourceMode === "ielts-core"
                    ? "从这些掌握程度里筛选你的雅思核心词。"
                    : "从这些掌握程度里抽词生成一篇文章。未选择时默认不会和一般。"}
                </Text>
              </Space>
            )}

            {sourceMode === "proficiency" && (
              <Space>
                <Text>生成数量</Text>
                <InputNumber
                  aria-label="生成数量"
                  min={3}
                  max={20}
                  value={count}
                  onChange={(value) => setCount(value ?? 8)}
                />
              </Space>
            )}

          {sourceMode === "custom" && (
            <TextArea
                rows={4}
                value={customWords}
                onChange={(event) => setCustomWords(event.target.value)}
                placeholder="输入单词，用空格、英文逗号或中文逗号分隔"
              />
            )}
          </div>

          <div className="context-lab-generator-actions">
            <Button
              block
              type="primary"
              icon={<SendOutlined />}
              loading={creating}
              onClick={handleGenerate}
            >
              生成练习包
            </Button>
          </div>
        </section>
              </aside>

              <main
                aria-label="练习包管理"
                className="context-lab-pack-workspace"
              >
        <section
          className="context-lab-queue-card"
        >
          <div className="learning-cockpit-card-heading">
            <div>
              <Text className="learning-cockpit-label">Tasks</Text>
              <Title level={3}>练习包</Title>
            </div>
          </div>

          <div className="context-lab-history-search">
            <Input
              allowClear
              aria-label="搜索练习包"
              className="context-lab-history-search-input"
              placeholder="搜索练习包、单词、来源、状态"
              prefix={<SearchOutlined aria-hidden />}
              value={historyKeyword}
              onChange={(event) => setHistoryKeyword(event.target.value)}
            />
            <Segmented<ContextLabHistorySourceFilter>
              aria-label="练习包来源筛选"
              value={historySourceType}
              onChange={setHistorySourceType}
              options={[
                { label: "全部", value: "all" },
                { label: "薄弱词", value: "proficiency" },
                { label: "核心", value: "ielts-core" },
                { label: "随机", value: "random" },
                { label: "手输", value: "custom" },
              ]}
            />
            {historySearchActive && (
              <div className="context-lab-history-search-summary">
                找到 {history.length} 个练习包
                <Button
                  size="small"
                  type="link"
                  onClick={() => {
                    setHistoryKeyword("");
                    setHistorySourceType("all");
                  }}
                >
                  清空搜索
                </Button>
              </div>
            )}
          </div>

          {historyLoading && (
            <div className="context-lab-history-empty">
              <Spin />
              <Text type="secondary">正在读取生成历史...</Text>
            </div>
          )}

          {!historyLoading && history.length === 0 && (
            <Empty
              description={
                historySearchActive
                  ? "没有找到相关练习包"
                  : "还没有生成记录。先提交一组词。"
              }
            >
              {historySearchActive && (
                <Button
                  type="link"
                  onClick={() => {
                    setHistoryKeyword("");
                    setHistorySourceType("all");
                  }}
                >
                  清空搜索
                </Button>
              )}
            </Empty>
          )}

          <div className="context-lab-history-list">
            {history.map((task) => (
              <article
                className={`context-lab-history-item context-lab-history-item-${task.status}${
                  currentTask?.taskId === task.taskId
                    ? " context-lab-history-item-selected"
                    : ""
                }`}
                key={task.taskId}
                onClick={() => {
                  if (task.status === "succeeded") {
                    handleOpenTask(task);
                  }
                }}
              >
                <div className="context-lab-history-main">
                  <div className="context-lab-history-kicker">
                    <Tag color={getContextLabStatusTone(task.status)}>
                      {getContextLabStatusLabel(task.status)}
                    </Tag>
                    <span>{getContextLabSourceLabel(task.sourceType)}</span>
                    <span>{task.words.length} 个词</span>
                  </div>
                  <h4 className="context-lab-history-title">
                    {task.words.slice(0, 5).join(" / ")}
                    {task.words.length > 5 ? " / ..." : ""}
                  </h4>
                  <div className="context-lab-history-metrics">
                    {renderTaskMetrics(task)}
                  </div>
                </div>
                <div className="context-lab-history-actions">
                  {task.status === "succeeded" && (
                    <Button
                      type="primary"
                      size="small"
                      icon={<PlayCircleOutlined aria-hidden="true" />}
                      onClick={(event) => {
                        event.stopPropagation();
                        handleOpenTask(task);
                      }}
                    >
                      开始练习
                    </Button>
                  )}
                  {task.status === "failed" && (
                    <Button
                      size="small"
                      type="primary"
                      onClick={(event) => {
                        event.stopPropagation();
                        void handleGenerate();
                      }}
                    >
                      重新生成
                    </Button>
                  )}
                  <Dropdown
                    menu={{
                      items: [
                        ...(isContextLabTaskActive(task.status)
                          ? [
                              {
                                key: "refresh",
                                icon: <ReloadOutlined />,
                                label: "刷新状态",
                              },
                            ]
                          : []),
                        ...(task.status === "succeeded"
                          ? [
                              {
                                key: "attempts",
                                icon: <HistoryOutlined />,
                                label: "查看记录",
                              },
                              {
                                key: "pdf",
                                icon: <FilePdfOutlined />,
                                label:
                                  downloadingTaskId === task.taskId
                                    ? "正在下载"
                                    : "下载 PDF",
                                disabled: downloadingTaskId === task.taskId,
                              },
                            ]
                          : []),
                        {
                          type: "divider",
                        },
                        {
                          danger: true,
                          key: "delete",
                          icon: <DeleteOutlined />,
                          label: "删除练习包",
                        },
                      ],
                      onClick: ({ domEvent, key }) => {
                        domEvent.stopPropagation();
                        if (key === "refresh") {
                          void loadHistory();
                        } else if (key === "attempts") {
                          void loadAttempts(task);
                        } else if (key === "pdf") {
                          void handleDownloadTaskPdf(task);
                        } else if (key === "delete") {
                          handleDeleteTask(task);
                        }
                      },
                    }}
                    trigger={["click"]}
                  >
                    <Button
                      aria-label={`任务 ${task.taskId} 更多操作`}
                      icon={<MoreOutlined aria-hidden="true" />}
                      size="small"
                      type="text"
                      onClick={(event) => event.stopPropagation()}
                    />
                  </Dropdown>
                </div>
              </article>
            ))}
          </div>
        </section>
              </main>
            </div>
          </div>
        )}
      </div>

      <Modal
        aria-label={isMicroMode ? "错词语境巩固" : "AI 语境练习"}
        className={`context-lab-practice-modal${
          practiceFullscreen ? " context-lab-practice-modal-fullscreen" : ""
        }`}
        destroyOnHidden={false}
        footer={null}
        open={practiceModalOpen}
        title={
          <div className="context-lab-practice-modal-title">
            <span>{isMicroMode ? "错词语境巩固" : "AI 语境练习"}</span>
            <Button
              aria-label={practiceFullscreen ? "退出满屏" : "占满屏幕"}
              icon={
                practiceFullscreen ? (
                  <FullscreenExitOutlined />
                ) : (
                  <FullscreenOutlined />
                )
              }
              size="small"
              type="text"
              onClick={() => setPracticeFullscreen((value) => !value)}
            >
              {practiceFullscreen ? "退出满屏" : "占满屏幕"}
            </Button>
          </div>
        }
        width={practiceFullscreen ? "100vw" : "min(1280px, 96vw)"}
        onCancel={() => {
          closeSelectionMenu();
          setHighlightWord("");
          setPracticeFullscreen(false);
          setPracticeModalOpen(false);
        }}
      >
        <section
          aria-label={isMicroMode ? "错词语境巩固内容" : "AI 语境练习内容"}
          className="context-lab-active-practice"
        >
          {renderPracticeWorkspace()}
        </section>
      </Modal>

      <Drawer
        aria-label="练习记录"
        destroyOnHidden
        open={attemptDrawerOpen}
        placement="right"
        title="练习记录"
        width={520}
        onClose={() => setAttemptDrawerOpen(false)}
      >
        {attemptsLoading ? (
          <div className="context-lab-history-empty">
            <Spin />
            <Text type="secondary">正在读取练习记录...</Text>
          </div>
        ) : attempts.length === 0 ? (
          <Empty description="还没有提交记录，开始练习后会出现在这里。" />
        ) : (
          <div className="context-lab-attempt-list">
            {attempts.map((attempt) => {
              const isAttemptDetailOpen =
                selectedAttemptId === attempt.attemptId;

              return (
              <section className="context-lab-attempt-item" key={attempt.attemptId}>
                <Space wrap>
                  <Tag color={attempt.wrongCount > 0 ? "orange" : "green"}>
                    得分 {attempt.score}
                  </Tag>
                  <Text>错题 {attempt.wrongCount}</Text>
                  {attempt.elapsedSeconds != null && (
                    <Text type="secondary">
                      用时 {formatElapsedSeconds(attempt.elapsedSeconds)}
                    </Text>
                  )}
                  {attempt.createTime && (
                    <Text type="secondary">{attempt.createTime}</Text>
                  )}
                </Space>
                {attempt.weakWords.length > 0 && (
                  <div className="learning-cockpit-word-strip">
                    {attempt.weakWords.map((word) => (
                      <Tag key={word}>{word}</Tag>
                    ))}
                  </div>
                )}
                <Space wrap>
                  <Button
                    size="small"
                    onClick={() => void handleOpenAttemptDetail(attempt)}
                  >
                    {isAttemptDetailOpen ? "收起详情" : "查看详情"}
                  </Button>
                  <Button
                    danger
                    size="small"
                    onClick={() => handleDeleteAttempt(attempt)}
                  >
                    删除记录
                  </Button>
                </Space>
                {isAttemptDetailOpen && (
                  <div className="context-lab-attempt-detail">
                    {attemptDetailLoadingId === attempt.attemptId &&
                    !attemptDetails[attempt.attemptId] ? (
                      <Space>
                        <Spin size="small" />
                        <Text type="secondary">正在读取本次练习详情...</Text>
                      </Space>
                    ) : (
                      (() => {
                        const detail = attemptDetails[attempt.attemptId];
                        if (!detail) return null;
                        const resultItems =
                          detail.results.filter(isContextLabResultItem);
                        const answerItems =
                          detail.answers.filter(isContextLabAnswerItem);
                        const detailItems =
                          resultItems.length > answerItems.length
                            ? resultItems
                            : answerItems;

                        return (
                          <>
                            {detail.nextSuggestions.length > 0 && (
                              <div>
                                <Text className="learning-cockpit-label">
                                  Next
                                </Text>
                                <ul className="context-lab-attempt-suggestions">
                                  {detail.nextSuggestions.map((suggestion) => (
                                    <li key={suggestion}>{suggestion}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            <div className="context-lab-attempt-question-list">
                              {detailItems.length === 0 ? (
                                <Empty
                                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                                  description="暂无可展示的作答详情"
                                />
                              ) : detailItems.map((item, index) => {
                                const isResultItem =
                                  isContextLabResultItem(item);
                                const result = isResultItem
                                  ? item
                                  : resultItems.find(
                                      (resultItem) =>
                                        resultItem.questionId === item.questionId,
                                    ) || resultItems[index];
                                const answer = isResultItem
                                  ? answerItems.find(
                                      (answerItem) =>
                                        answerItem.questionId === item.questionId,
                                    ) || answerItems[index]
                                  : item;
                                const questionId =
                                  answer?.questionId || result?.questionId || "";
                                const selectedIndex =
                                  normalizeOptionIndex(answer?.selectedIndex) ??
                                  normalizeOptionIndex(result?.userSelectedIndex);
                                const correctIndex = normalizeOptionIndex(
                                  result?.correctIndex,
                                );
                                const question = getContextLabQuestionLabel(
                                  attemptTask,
                                  questionId,
                                );
                                const selectedLabel =
                                  selectedIndex !== undefined
                                    ? question?.options?.[selectedIndex]
                                    : undefined;
                                const correctLabel =
                                  correctIndex !== undefined
                                    ? question?.options?.[correctIndex]
                                    : undefined;

                                return (
                                  <section
                                    className="context-lab-attempt-question"
                                    key={questionId || index}
                                  >
                                    <Text strong>
                                      {question?.stem || `第 ${index + 1} 题`}
                                    </Text>
                                    <div>
                                      <Text>
                                        你的作答{" "}
                                        {selectedIndex !== undefined && selectedLabel
                                          ? formatOptionLabel(
                                              selectedLabel,
                                              selectedIndex,
                                            )
                                          : selectedIndex !== undefined
                                            ? getAnswerLetter(selectedIndex)
                                            : "未作答"}
                                      </Text>
                                    </div>
                                    {result && (
                                      <>
                                        <Tag color={result.correct ? "green" : "red"}>
                                          {result.correct ? "回答正确" : "回答错误"}
                                        </Tag>
                                        {correctIndex !== undefined && correctLabel && (
                                          <div>
                                            <Text>
                                              正确答案{" "}
                                              {formatOptionLabel(
                                                correctLabel,
                                                correctIndex,
                                              )}
                                            </Text>
                                          </div>
                                        )}
                                        {result.explanation && (
                                          <div className="context-lab-question-explanation">
                                            <Text className="learning-cockpit-label">
                                              解析
                                            </Text>
                                            <p>
                                              {correctIndex !== undefined
                                                ? formatExplanationText(
                                                    result.explanation,
                                                    correctIndex,
                                                  )
                                                : result.explanation}
                                            </p>
                                          </div>
                                        )}
                                      </>
                                    )}
                                  </section>
                                );
                              })}
                            </div>
                          </>
                        );
                      })()
                    )}
                  </div>
                )}
              </section>
              );
            })}
          </div>
        )}
      </Drawer>

      <Modal
        className={`context-lab-source-modal${
          sourcePreviewFullscreen ? " context-lab-source-modal-fullscreen" : ""
        }`}
        destroyOnHidden={false}
        footer={[
          <Button
            key="close"
            onClick={() => {
              closeSelectionMenu();
              setSourcePreviewOpen(false);
              setSourcePreviewFullscreen(false);
            }}
          >
            关闭
          </Button>,
          <Button
            key="practice"
            type="primary"
            icon={<PlayCircleOutlined aria-hidden="true" />}
            onClick={handleStartPracticeFromSource}
          >
            开始练习
          </Button>,
        ]}
        open={sourcePreviewOpen}
        title={
          <div className="context-lab-source-modal-title">
            <span>单词来源文章</span>
            <Button
              aria-label={sourcePreviewFullscreen ? "退出满屏" : "占满屏幕"}
              icon={
                sourcePreviewFullscreen ? (
                  <FullscreenExitOutlined />
                ) : (
                  <FullscreenOutlined />
                )
              }
              size="small"
              type="text"
              onClick={() => setSourcePreviewFullscreen((value) => !value)}
            >
              {sourcePreviewFullscreen ? "退出满屏" : "占满屏幕"}
            </Button>
          </div>
        }
        width={sourcePreviewFullscreen ? "100vw" : "min(980px, 92vw)"}
        onCancel={() => {
          closeSelectionMenu();
          setSourcePreviewOpen(false);
          setSourcePreviewFullscreen(false);
        }}
      >
        <div className="context-lab-source-preview">
          <div className="context-lab-source-preview-head">
            <div>
              <Text className="learning-cockpit-label">Word Source</Text>
              <Title level={4}>
                {highlightWord ? `定位：${highlightWord}` : "来源定位"}
              </Title>
            </div>
            <Text type="secondary">
              这里只查看单词出现的原文，需要做题时再开始练习。
            </Text>
          </div>
          {renderArticleReadingPane()}
        </div>
      </Modal>

      <BulkImportPreviewModal
        ariaLabel="导入预览"
        bodyClassName="context-lab-import-preview"
        bodyDialogLabel="导入预览"
        cancelText="继续标记"
        centered
        className="bulk-import-preview-modal context-lab-import-preview-modal"
        confirming={confirmingMarkedImport}
        defaultLevel={0}
        description={
          <>
            <Text type="secondary">
              {importingMarkedWords
                ? "预览已打开，AI 正在补全音标、释义和词性；你也可以先手动编辑。"
                : "AI 已补齐标记词内容，你可以先修改再确认导入；开启覆盖后会更新已有词条并计入覆盖统计。"}
            </Text>
            {importingMarkedWords && <Tag color="processing">AI 补全中</Tag>}
          </>
        }
        destroyOnHidden
        fieldAriaLabel={(_item, index, field) => {
          const labels = {
            word: "单词",
            phonetic: "音标",
            chinese: "释义",
            note: "备注",
          };
          return `第 ${index + 1} 个词${labels[field]}`;
        }}
        getWordKey={(item) => item.key}
        inlineFooter
        inlineFooterClassName="context-lab-import-preview-actions"
        onCancel={handleCloseImportPreview}
        onConfirm={handleConfirmMarkedVocabularyImport}
        onOverwriteExistingChange={setImportOverwriteExisting}
        onWordsChange={setImportPreviewWords}
        open={importPreviewOpen}
        overwriteExisting={importOverwriteExisting}
        title="导入预览"
        width={720}
        words={importPreviewWords}
      />

      {addModalVisible && (
        <EditAddModal
          addInitialValues={addInitialValues}
          currentRecord={null}
          isModalVisible={addModalVisible}
          type="add"
          onCancel={handleAddModalCancel}
          onOk={handleAddModalOk}
        />
      )}
    </>
  );
}

function ContextLabPageRouter() {
  const location = useLocation();
  const navigate = useNavigate();
  return (
    <ContextLabPageContent
      initialSearch={location.search}
      onOpenWordLibrary={() => navigate("/englishWorld/words")}
      onBackToReciteResult={(sessionId) =>
        navigate(`/englishWorld/recite?view=result&sessionId=${sessionId}`)
      }
      onMicroTaskReady={(taskId) => {
        const params = new URLSearchParams(location.search);
        params.set("taskId", String(taskId));
        navigate(`${location.pathname}?${params.toString()}`, { replace: true });
      }}
      onBackToToday={() => navigate("/englishWorld")}
    />
  );
}

export function ContextLabPage() {
  const inRouterContext = useInRouterContext();

  if (inRouterContext) {
    return (
      <ConfigProvider theme={CONTEXT_LAB_LIGHT_THEME}>
        <ContextLabPageRouter />
      </ConfigProvider>
    );
  }

  const initialSearch =
    typeof window !== "undefined" ? window.location.search : "";

  return (
    <ConfigProvider theme={CONTEXT_LAB_LIGHT_THEME}>
      <ContextLabPageContent
        initialSearch={initialSearch}
        onOpenWordLibrary={() => window.location.assign("/englishWorld/words")}
        onBackToReciteResult={(sessionId) =>
          window.location.assign(
            `/englishWorld/recite?view=result&sessionId=${sessionId}`,
          )
        }
        onMicroTaskReady={(taskId) => {
          const params = new URLSearchParams(window.location.search);
          params.set("taskId", String(taskId));
          window.history.replaceState(
            null,
            "",
            `${window.location.pathname}?${params.toString()}`,
          );
        }}
        onBackToToday={() => window.location.assign("/englishWorld")}
      />
    </ConfigProvider>
  );
}
