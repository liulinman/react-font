import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Dialog, Toast } from "antd-mobile";
import { useQueryClient } from "@tanstack/react-query";
import request from "@font/api";
import { uploadFile, wordAdd, wordExist, wordFilter, wordUpdate } from "@/server/word/word";
import type { WordList } from "@/server/word/word.type";
import { useAuth } from "@/contexts/AuthContext";
import { MobilePage } from "../../components/MobilePage";
import { MobileStateView } from "../../components/MobileStateView";
import { SafeAreaActions } from "../../components/SafeAreaActions";
import { useMobileActivityLock } from "../../offline/MobileActivityLockContext";
import { useConnectivity } from "../../offline/useConnectivity";
import { mobileStorage } from "../../offline/mobileStorage";
import { recentWordStore } from "../home/recentWordStore";
import { fetchMobileWordDetail, type MobileWordPage, wordKeys } from "./wordQueries";
import {
  isWordFormDraftWorthSaving,
  toWordAddPayload,
  toWordUpdatePayload,
  WORD_FORM_NEW_DRAFT_KEY,
  wordFormEditDraftKey,
  type MobileWordFormValues,
} from "./wordForm";

const AUTOSAVE_DEBOUNCE_MS = 400;

const EMPTY_VALUES: MobileWordFormValues = { englishWord: "" };

const TYPE_OPTIONS = [
  { value: 0, label: "单词" },
  { value: 1, label: "短语" },
  { value: 2, label: "句子" },
];

const LEVEL_OPTIONS = [
  { value: 0, label: "不会" },
  { value: 1, label: "一般" },
  { value: 2, label: "熟练" },
  { value: 3, label: "精通" },
];

const PART_SPEECH_OPTIONS = [
  { value: 1, label: "动词" },
  { value: 2, label: "名词" },
  { value: 3, label: "形容词" },
  { value: 4, label: "副词" },
  { value: 5, label: "代词" },
  { value: 6, label: "介词" },
  { value: 7, label: "连词" },
  { value: 8, label: "感叹词" },
  { value: 9, label: "未分类" },
];

function parseWordId(raw: string | undefined) {
  const id = raw ? Number(raw) : Number.NaN;
  return Number.isFinite(id) && id > 0 ? id : null;
}

/**
 * `wordAdd` returns an opaque `CommonRecord`, never the persisted id. Because we
 * guard with `wordExist` immediately before inserting, the just-added spelling
 * is unique, so a targeted `wordFilter` lookup resolves the authoritative record
 * (with its real server id) for the recent-word cache and detail routing. An
 * exact, case-sensitive match avoids picking up a partial/prefix sibling.
 */
async function resolveCreatedWord(englishWord: string): Promise<WordList | null> {
  const page = await request<MobileWordPage>(
    wordFilter({ page: 1, pageSize: 1, englishWord }),
  );
  return page.list.find((word) => word.englishWord === englishWord) ?? null;
}

/** Optional initial values handed over via route state (e.g. from the AI page). */
type MobileWordFormRouteState = {
  initialValues?: Partial<MobileWordFormValues>;
};

function applyInitialValues(base: MobileWordFormValues, incoming?: Partial<MobileWordFormValues>) {
  if (!incoming) return base;
  return { ...base, ...incoming };
}

export function MobileWordFormPage() {
  const params = useParams<{ wordId?: string }>();
  const editingId = parseWordId(params.wordId);
  const isEdit = editingId !== null;
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const online = useConnectivity();

  const routeState = (location.state ?? null) as MobileWordFormRouteState | null;
  const routeInitialValues = routeState?.initialValues;

  const draftKey = isEdit && editingId !== null
    ? wordFormEditDraftKey(editingId)
    : WORD_FORM_NEW_DRAFT_KEY;

  const [values, setValues] = useState<MobileWordFormValues>(EMPTY_VALUES);
  const [loaded, setLoaded] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [backConfirmOpen, setBackConfirmOpen] = useState(false);
  const submittingRef = useRef(false);
  useMobileActivityLock("mobile-word-form-submit", submitting);

  // Restore a saved draft first, then fall back to the editing record, then to
  // route-state initial values (AI handoff). New words seed from route state.
  useEffect(() => {
    if (!user) return;
    let active = true;
    void (async () => {
      const draft = await mobileStorage.getDraft<{ values: MobileWordFormValues }>(
        user.id,
        "word-form",
        draftKey,
      );
      if (!active) return;
      if (draft?.values) {
        setValues(draft.values);
        setLoaded(true);
        return;
      }
      if (isEdit && editingId !== null) {
        try {
          const word = await fetchMobileWordDetail(editingId);
          if (!active) return;
          setValues(toFormValues(word));
        } catch {
          if (!active) return;
          setValues(applyInitialValues(EMPTY_VALUES, routeInitialValues));
        }
      } else {
        setValues(applyInitialValues(EMPTY_VALUES, routeInitialValues));
      }
      setLoaded(true);
    })();
    return () => {
      active = false;
    };
    // Seed once per mount for the resolved draft key; route state and editing id
    // do not change in place for a given route instance.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftKey, user?.id]);

  // Debounced autosave. Only persist when the word field has content; an empty
  // word is not worth keeping and is removed so a re-open starts clean.
  useEffect(() => {
    if (!user || !loaded) return;
    const worthSaving = isWordFormDraftWorthSaving(values);
    const timer = window.setTimeout(() => {
      if (!worthSaving) {
        void mobileStorage.deleteDraft(user.id, "word-form", draftKey);
        return;
      }
      void mobileStorage.putDraft({
        key: draftKey,
        userId: user.id,
        kind: "word-form",
        updatedAt: new Date().toISOString(),
        value: { values },
      });
    }, AUTOSAVE_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [values, user, loaded, draftKey]);

  const setField = useCallback(
    <K extends keyof MobileWordFormValues>(key: K, value: MobileWordFormValues[K]) => {
      setValues((current) => ({ ...current, [key]: value }));
    },
    [],
  );

  const togglePartSpeech = useCallback((value: number) => {
    setValues((current) => {
      const currentParts = current.englishPartSpeech ?? [];
      const next = currentParts.includes(value)
        ? currentParts.filter((item) => item !== value)
        : [...currentParts, value];
      return { ...current, englishPartSpeech: next };
    });
  }, []);

  const handleImageUpload = useCallback(async (file: File) => {
    setImageUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const imageUrl = await request<string>(uploadFile(formData));
      setField("englishImg", imageUrl);
      Toast.show({ icon: "success", content: "图片上传成功" });
    } catch (error) {
      console.error("图片上传失败:", error);
      Toast.show({ icon: "fail", content: "图片上传失败" });
    } finally {
      setImageUploading(false);
    }
  }, [setField]);

  const wordInvalid = !values.englishWord.trim();

  const handleSubmit = useCallback(async () => {
    if (submittingRef.current) return;
    if (wordInvalid) {
      Toast.show({ content: "请输入单词或短语" });
      return;
    }
    if (!online) {
      // Keep the draft; the autosave effect already persists it. Tell the user
      // explicitly that saving needs the network.
      Toast.show({ content: "保存需要联网，你的输入已保留。" });
      return;
    }
    if (!user) return;
    submittingRef.current = true;
    setSubmitting(true);
    try {
      const englishWord = values.englishWord.trim();
      const payload = toWordAddPayload(values);

      if (isEdit && editingId !== null) {
        // Edit never re-checks `wordExist`; the user is editing the canonical
        // record and may legitimately keep the same spelling.
        await request(wordUpdate(toWordUpdatePayload(values, editingId)));
        await queryClient.invalidateQueries({ queryKey: wordKeys.all });
        await mobileStorage.deleteDraft(user.id, "word-form", draftKey);
        await recentWordStore.record(user.id, { ...payload, id: editingId });
        Toast.show({ icon: "success", content: "已保存" });
        navigate(`/mobile/words/${editingId}`);
        return;
      }

      // Add: duplicate guard first, then insert. `wordExist` returning truthy
      // means another word already owns this spelling — keep the form so the
      // user can rename rather than silently overwriting.
      const exists = await request<boolean>(wordExist({ englishWord }));
      if (exists) {
        Toast.show({ content: "该单词已存在" });
        return;
      }
      await request(wordAdd(payload));
      // `wordAdd` does not return the id; resolve the authoritative record so
      // the recent-word cache and detail route use the real server id.
      const created = await resolveCreatedWord(englishWord);
      await queryClient.invalidateQueries({ queryKey: wordKeys.all });
      await mobileStorage.deleteDraft(user.id, "word-form", draftKey);
      if (created) {
        await recentWordStore.record(user.id, created);
        Toast.show({ icon: "success", content: "已添加" });
        navigate(`/mobile/words/${created.id}`);
      } else {
        // Insert succeeded but the lookup missed (race/normalization). Fall
        // back to the library; the draft is cleared and the list is refreshed.
        Toast.show({ icon: "success", content: "已添加" });
        navigate("/mobile/words");
      }
    } catch (error) {
      console.error("保存单词失败:", error);
      Toast.show({
        icon: "fail",
        content: error instanceof Error ? error.message : "保存失败，请稍后重试",
      });
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }, [values, user, online, isEdit, editingId, wordInvalid, draftKey, queryClient, navigate]);

  const handleBack = useCallback(() => {
    if (!isWordFormDraftWorthSaving(values)) {
      navigate(-1);
      return;
    }
    setBackConfirmOpen(true);
  }, [values, navigate]);

  const partSpeechSet = useMemo(
    () => new Set(values.englishPartSpeech ?? []),
    [values.englishPartSpeech],
  );

  if (!loaded) {
    return (
      <MobilePage title={isEdit ? "编辑单词" : "添加单词"}>
        <MobileStateView state="loading" />
      </MobilePage>
    );
  }

  return (
    <MobilePage title={isEdit ? "编辑单词" : "添加单词"}>
      <a
        href={isEdit && editingId ? `/mobile/words/${editingId}` : "/mobile/words"}
        onClick={(event) => {
          event.preventDefault();
          handleBack();
        }}
      >
        返回
      </a>

      <label>
        单词或短语
        <input
          aria-label="单词或短语"
          onChange={(event) => setField("englishWord", event.target.value)}
          value={values.englishWord}
        />
      </label>

      <label>
        音标
        <input
          aria-label="音标"
          onChange={(event) => setField("englishPhonetic", event.target.value)}
          value={values.englishPhonetic ?? ""}
        />
      </label>

      <label>
        中文释义
        <textarea
          aria-label="中文释义"
          onChange={(event) => setField("englishChinese", event.target.value)}
          rows={2}
          value={values.englishChinese ?? ""}
        />
      </label>

      <fieldset>
        <legend>类型</legend>
        {TYPE_OPTIONS.map((option) => (
          <label key={option.value}>
            <input
              checked={values.englishType === option.value}
              onChange={() => setField("englishType", option.value)}
              type="radio"
            />
            {option.label}
          </label>
        ))}
      </fieldset>

      <fieldset>
        <legend>掌握程度</legend>
        {LEVEL_OPTIONS.map((option) => (
          <label key={option.value}>
            <input
              checked={values.englishLevel === option.value}
              onChange={() => setField("englishLevel", option.value)}
              type="radio"
            />
            {option.label}
          </label>
        ))}
      </fieldset>

      <fieldset>
        <legend>词性</legend>
        {PART_SPEECH_OPTIONS.map((option) => (
          <label key={option.value}>
            <input
              checked={partSpeechSet.has(option.value)}
              onChange={() => togglePartSpeech(option.value)}
              type="checkbox"
            />
            {option.label}
          </label>
        ))}
      </fieldset>

      <label>
        笔记
        <textarea
          aria-label="笔记"
          onChange={(event) => setField("englishNote", event.target.value)}
          rows={3}
          value={values.englishNote ?? ""}
        />
      </label>

      <label>
        引用来源
        <input
          aria-label="引用来源"
          onChange={(event) => setField("englishReference", event.target.value)}
          value={values.englishReference ?? ""}
        />
      </label>

      <label>
        图片
        <input
          accept="image/*"
          aria-label="上传单词图片"
          disabled={!online || imageUploading}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void handleImageUpload(file);
            event.target.value = "";
          }}
          type="file"
        />
        {values.englishImg && <img alt="单词图片" src={values.englishImg} />}
      </label>

      {values.englishImg && (
        <button onClick={() => setField("englishImg", undefined)} type="button">移除图片</button>
      )}

      {!online && (
        <p>当前离线，保存需要联网。你的输入已保留为草稿。</p>
      )}

      <SafeAreaActions>
        <button
          disabled={submitting || wordInvalid}
          onClick={() => void handleSubmit()}
          type="button"
        >
          {submitting ? "保存中" : "保存"}
        </button>
      </SafeAreaActions>

      <Dialog
        actions={[
          { key: "cancel", onClick: () => setBackConfirmOpen(false), text: "继续编辑" },
          { key: "confirm", onClick: () => navigate(-1), text: "放弃" },
        ]}
        aria-label="放弃未保存的内容？"
        closeOnAction
        closeOnMaskClick
        content="返回会保留草稿，下次进入可继续编辑。"
        onClose={() => setBackConfirmOpen(false)}
        title="放弃未保存的内容？"
        visible={backConfirmOpen}
      />
    </MobilePage>
  );
}

/** Drop the server-assigned id when seeding the editable form values. */
function toFormValues(word: WordList): MobileWordFormValues {
  const { id: _id, ...rest } = word;
  void _id;
  return rest;
}
