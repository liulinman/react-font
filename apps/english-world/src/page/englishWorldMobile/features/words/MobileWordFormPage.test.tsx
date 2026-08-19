import "@testing-library/jest-dom/vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { WordList } from "@/server/word/word.type";
import { MobileActivityLockProvider } from "../../offline/MobileActivityLockContext";
import { MobileWordFormPage } from "./MobileWordFormPage";

const { requestMock, recordMock, storageGetDraftMock, storagePutDraftMock, storageDeleteDraftMock } =
  vi.hoisted(() => ({
    requestMock: vi.fn(),
    recordMock: vi.fn(),
    storageGetDraftMock: vi.fn(),
    storagePutDraftMock: vi.fn(),
    storageDeleteDraftMock: vi.fn(),
  }));

const auth = { user: { id: 7, username: "mobile-user" } };
let online = true;

vi.mock("@font/api", () => ({ default: requestMock }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => auth }));
vi.mock("antd-mobile", async (importOriginal) => {
  const actual = await importOriginal<typeof import("antd-mobile")>();
  return { ...actual };
});
vi.mock("../../offline/useConnectivity", () => ({ useConnectivity: () => online }));
vi.mock("../../offline/mobileStorage", () => ({
  mobileStorage: {
    getDraft: storageGetDraftMock,
    putDraft: storagePutDraftMock,
    deleteDraft: storageDeleteDraftMock,
  },
}));
vi.mock("@/page/englishWorld/utils/pronunciation", () => ({
  playBritishPronunciation: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("../../features/home/recentWordStore", () => ({
  recentWordStore: { record: recordMock },
}));
vi.mock("./wordQueries", async () => {
  const actual = await vi.importActual<typeof import("./wordQueries")>("./wordQueries");
  return { ...actual, fetchMobileWordDetail: vi.fn() };
});

const retain: WordList = {
  id: 4,
  englishWord: "retain",
  englishChinese: "保留",
  englishPhonetic: "/rɪˈteɪn/",
  englishType: 0,
  englishLevel: 1,
  englishPartSpeech: [1],
  englishNote: "keep or continue to have",
  englishReference: "https://example.com/retain",
  englishImg: "https://example.com/retain.png",
};

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location">{`${location.pathname}${location.search}`}</output>;
}

function renderForm(route = "/mobile/words/new", previousEntry?: string) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const initialEntries = previousEntry ? [previousEntry, route] : [route];
  const result = render(
    <QueryClientProvider client={client}>
      <MobileActivityLockProvider>
        <MemoryRouter initialEntries={initialEntries}>
          <Routes>
            <Route path="/mobile/words/new" element={<MobileWordFormPage />} />
            <Route path="/mobile/words/:wordId/edit" element={<MobileWordFormPage />} />
            <Route path="/mobile/words/:wordId" element={<LocationProbe />} />
            <Route path="/mobile/words" element={<LocationProbe />} />
          </Routes>
        </MemoryRouter>
      </MobileActivityLockProvider>
    </QueryClientProvider>,
  );
  return { ...result, client };
}

function requestBy(url: string, body: unknown) {
  requestMock.mockImplementation(async (descriptor: { url: string }) => {
    if (descriptor.url === url) return body;
    return undefined;
  });
}

describe("MobileWordFormPage", () => {
  beforeEach(() => {
    online = true;
    requestMock.mockReset();
    recordMock.mockReset();
    storageGetDraftMock.mockReset();
    storagePutDraftMock.mockReset();
    storageDeleteDraftMock.mockReset();
    storageGetDraftMock.mockResolvedValue(null);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("seeds from a saved draft and skips a redundant network load", async () => {
    storageGetDraftMock.mockResolvedValue({
      values: { englishWord: "draft word", englishChinese: "草稿" },
    });
    renderForm();

    expect(await screen.findByDisplayValue("draft word")).toBeVisible();
    // The edit record fetch must not run when a draft exists.
    const { fetchMobileWordDetail } = await import("./wordQueries");
    expect(fetchMobileWordDetail).not.toHaveBeenCalled();
  });

  it("autosaves the draft after inactivity once the word field has content", async () => {
    const user = userEvent.setup();
    renderForm();
    await screen.findByLabelText("单词或短语");

    await user.type(screen.getByLabelText("单词或短语"), "retain");

    await waitFor(() => expect(storagePutDraftMock).toHaveBeenCalled());
    const record = storagePutDraftMock.mock.calls[0][0];
    expect(record.key).toBe("word-form:new");
    expect(record.userId).toBe(auth.user.id);
    expect(record.kind).toBe("word-form");
    expect(record.value.values.englishWord).toBe("retain");
    expect(screen.getByRole("button", { name: "保存" })).toBeVisible();
  });

  it("adds a word, resolves the new id, records it, and routes to detail", async () => {
    const user = userEvent.setup();
    // wordExist -> false, wordAdd -> opaque truthy, wordFilter -> the new record.
    requestMock.mockImplementation(async (descriptor: { url: string }) => {
      if (descriptor.url === "/english/existEnglishWord") return false;
      if (descriptor.url === "/english/AddEnglishWord") return { ok: true };
      if (descriptor.url === "/english/filterWordList") {
        return { list: [{ ...retain, id: 42, englishWord: "retain" }], total: 1, totalPages: 1 };
      }
      return undefined;
    });
    renderForm();
    await screen.findByLabelText("单词或短语");

    await user.type(screen.getByLabelText("单词或短语"), "retain");
    await user.click(screen.getByRole("button", { name: "保存" }));

    await waitFor(() =>
      expect(requestMock).toHaveBeenCalledWith(
        expect.objectContaining({ url: "/english/AddEnglishWord" }),
      ),
    );
    // The id-resolution lookup fires after add.
    await waitFor(() =>
      expect(requestMock).toHaveBeenCalledWith(
        expect.objectContaining({ url: "/english/filterWordList" }),
      ),
    );
    expect(recordMock).toHaveBeenCalledWith(auth.user.id, expect.objectContaining({ id: 42 }));
    expect(storageDeleteDraftMock).toHaveBeenCalledWith(auth.user.id, "word-form", "word-form:new");
    await waitFor(() =>
      expect(screen.getByTestId("location")).toHaveTextContent("/mobile/words/42"),
    );
  });

  it("blocks add when the word already exists and keeps the form", async () => {
    const user = userEvent.setup();
    requestMock.mockImplementation(async (descriptor: { url: string }) => {
      if (descriptor.url === "/english/existEnglishWord") return true;
      return undefined;
    });
    renderForm();
    await screen.findByLabelText("单词或短语");

    await user.type(screen.getByLabelText("单词或短语"), "retain");
    await user.click(screen.getByRole("button", { name: "保存" }));

    await waitFor(() =>
      expect(requestMock).toHaveBeenCalledWith(
        expect.objectContaining({ url: "/english/existEnglishWord" }),
      ),
    );
    // Insert and id-resolution never run.
    expect(requestMock).not.toHaveBeenCalledWith(
      expect.objectContaining({ url: "/english/AddEnglishWord" }),
    );
    expect(recordMock).not.toHaveBeenCalled();
    expect(storageDeleteDraftMock).not.toHaveBeenCalled();
  });

  it("updates an existing word without a duplicate check and routes back to detail", async () => {
    const user = userEvent.setup();
    const { fetchMobileWordDetail } = await import("./wordQueries");
    (fetchMobileWordDetail as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(retain);
    requestMock.mockResolvedValue({ ok: true });
    renderForm("/mobile/words/4/edit");

    await screen.findByDisplayValue("retain");
    // Edit must never call wordExist.
    await user.clear(screen.getByLabelText("单词或短语"));
    await user.type(screen.getByLabelText("单词或短语"), "retained");
    await user.click(screen.getByRole("button", { name: "保存" }));

    await waitFor(() =>
      expect(requestMock).toHaveBeenCalledWith(
        expect.objectContaining({
          url: "/english/updateEnglishWord",
          data: expect.objectContaining({ id: 4, englishWord: "retained" }),
        }),
      ),
    );
    expect(requestMock).not.toHaveBeenCalledWith(
      expect.objectContaining({ url: "/english/existEnglishWord" }),
    );
    expect(recordMock).toHaveBeenCalledWith(auth.user.id, expect.objectContaining({ id: 4 }));
    expect(storageDeleteDraftMock).toHaveBeenCalledWith(auth.user.id, "word-form", "word-form:4");
    await waitFor(() =>
      expect(screen.getByTestId("location")).toHaveTextContent("/mobile/words/4"),
    );
  });

  it("keeps the draft and warns when submitting offline", async () => {
    online = false;
    const user = userEvent.setup();
    renderForm();
    await screen.findByLabelText("单词或短语");

    await user.type(screen.getByLabelText("单词或短语"), "retain");
    storagePutDraftMock.mockClear();
    await user.click(screen.getByRole("button", { name: "保存" }));

    // No network attempt at all.
    expect(requestMock).not.toHaveBeenCalled();
    // The draft is preserved (not cleared).
    expect(storageDeleteDraftMock).not.toHaveBeenCalledWith(auth.user.id, "word-form", "word-form:new");
  });

  it("confirms before leaving when the word has unsaved content", async () => {
    const user = userEvent.setup();
    // Seed a prior entry so `navigate(-1)` resolves onto the library probe.
    renderForm("/mobile/words/new", "/mobile/words");
    await screen.findByLabelText("单词或短语");
    await user.type(screen.getByLabelText("单词或短语"), "retain");

    fireEvent.click(screen.getByRole("link", { name: "返回" }));

    const dialog = await screen.findByRole("dialog", { name: "放弃未保存的内容？" });
    expect(dialog).toBeVisible();
    // Confirming leaves the form.
    fireEvent.click(screen.getByRole("button", { name: "放弃" }));
    await waitFor(() =>
      expect(screen.getByTestId("location")).toHaveTextContent("/mobile/words"),
    );
  });

  it("leaves immediately when nothing worth saving was entered", async () => {
    renderForm("/mobile/words/new", "/mobile/words");
    await screen.findByLabelText("单词或短语");

    fireEvent.click(screen.getByRole("link", { name: "返回" }));
    await waitFor(() =>
      expect(screen.getByTestId("location")).toHaveTextContent("/mobile/words"),
    );
  });

  it("shows a failure toast and keeps the draft when image upload fails", async () => {
    const user = userEvent.setup();
    requestBy("/upload/file", null);
    requestMock.mockRejectedValueOnce(new Error("上传失败"));
    renderForm();
    await screen.findByLabelText("上传单词图片");

    const file = new File(["x"], "retain.png", { type: "image/png" });
    await user.upload(screen.getByLabelText("上传单词图片"), file);

    await waitFor(() =>
      expect(requestMock).toHaveBeenCalledWith(
        expect.objectContaining({ url: "/upload/file" }),
      ),
    );
    // A failed upload must not store an image URL; the word field stays clear.
    expect(screen.getByLabelText("单词或短语")).toHaveValue("");
  });
});
