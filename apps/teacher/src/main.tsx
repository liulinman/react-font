import { useCallback, useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { createRoot } from "react-dom/client";
import { ClassroomChat } from "@font/ui/classroom";
import {
  ClassroomApiError,
  classroomError,
  classroomRequest as api,
} from "@font/ui/classroom-api";
import "@font/ui/classroom.css";
import { PaperEditor, NewPaper, PaperScores } from "./reading";
import type { Classroom, PaperSummary } from "./reading";
import logo from "./freewing.png";
import "./style.css";

function useRoute() {
  const [route, setRoute] = useState(() => location.hash.slice(1));
  useEffect(() => {
    const change = () => setRoute(location.hash.slice(1));
    window.addEventListener("hashchange", change);
    return () => window.removeEventListener("hashchange", change);
  }, []);
  return route.split("/");
}

function Login({ done }: { done: () => void }) {
  const [captcha, setCaptcha] = useState<{
    captchaId: string;
    imageDataUrl: string;
  }>();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async (previousCaptchaId?: string) => {
    try {
      setCaptcha(await api("/user/captcha", { previousCaptchaId }));
    } catch (cause) {
      setError(classroomError(cause));
    }
  }, []);
  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!captcha || busy) return;
    const fields = event.currentTarget;
    setBusy(true);
    setError("");
    try {
      await api("/user/login", {
        ...Object.fromEntries(new FormData(fields)),
        captchaId: captcha.captchaId,
      });
      done();
    } catch (cause) {
      setError(classroomError(cause));
      fields.reset();
      await refresh(captcha.captchaId);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="panel narrow">
      <form className="stack pad" onSubmit={(event) => void submit(event)}>
        <h1>教师端登录</h1>
        <label>
          用户名
          <input name="username" autoComplete="username" required />
        </label>
        <label>
          密码
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
        </label>
        <label>
          图形验证码
          <input name="captchaCode" required />
        </label>
        <button
          type="button"
          className="captcha"
          onClick={() => void refresh(captcha?.captchaId)}
          disabled={busy}
        >
          {captcha ? (
            <img alt="刷新图形验证码" src={captcha.imageDataUrl} />
          ) : (
            "载入验证码"
          )}
        </button>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <button className="primary" disabled={busy || !captcha}>
          {busy ? "登录中…" : "登录"}
        </button>
      </form>
    </section>
  );
}

interface ClassSummary {
  id: number;
  name: string;
  memberCount: number;
}

function ClassList({
  list,
  reload,
}: {
  list: ClassSummary[];
  reload: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const name = new FormData(event.currentTarget).get("name");
    setBusy(true);
    setError("");
    try {
      const result = await api<{ id: number }>("/teacher/classrooms", { name });
      dialog.current?.close();
      location.hash = `class/${result.id}`;
      reload();
    } catch (cause) {
      setError(classroomError(cause));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="page-title">
        <h1>我的课堂</h1>
        <button className="primary" onClick={() => dialog.current?.showModal()}>
          创建课堂
        </button>
      </div>
      <section className="panel">
        {list.length ? (
          <table>
            <thead>
              <tr>
                <th>课堂</th>
                <th>学生</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {list.map((item) => (
                <tr key={item.id}>
                  <td>
                    <strong>{item.name}</strong>
                  </td>
                  <td>{item.memberCount} 人</td>
                  <td>
                    <a className="button" href={`#class/${item.id}`}>
                      进入课堂
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="pad muted">
            还没有课堂。创建课堂后，可以通过链接邀请学生。
          </p>
        )}
      </section>
      <dialog ref={dialog} aria-label="创建课堂">
        <form className="stack pad" onSubmit={(event) => void create(event)}>
          <h2>创建课堂</h2>
          <label>
            课堂名称
            <input
              name="name"
              required
              maxLength={60}
              placeholder="例如：雅思阅读提高班"
            />
          </label>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <div className="actions">
            <button
              type="button"
              onClick={() => dialog.current?.close()}
              disabled={busy}
            >
              取消
            </button>
            <button className="primary" disabled={busy}>
              创建课堂
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}

function ClassPage({
  id,
  view,
  paper,
}: {
  id: number;
  view?: string;
  paper?: number;
}) {
  const [data, setData] = useState<Classroom>();
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const invite = useRef<HTMLDialogElement>(null);
  const path = `/teacher/classrooms/${id}`;
  const route = `#class/${id}`;
  const reload = useCallback(async () => {
    try {
      setData(await api(path));
      setError("");
    } catch (cause) {
      setError(classroomError(cause));
    }
  }, [path]);
  useEffect(() => {
    void reload();
  }, [reload, view, paper]);
  useEffect(() => {
    if (
      !data?.papers.some(
        (row) => row.status === "queued" || row.status === "generating",
      )
    )
      return;
    const timer = setInterval(() => void reload(), 3000);
    return () => clearInterval(timer);
  }, [data, reload]);

  if (!data)
    return error ? (
      <p role="alert">
        {error} <button onClick={() => void reload()}>重试</button>
      </p>
    ) : (
      <p role="status">正在载入课堂…</p>
    );
  const localStudent = new URL(location.origin);
  if (import.meta.env.DEV) localStudent.port = "5173";
  const studentOrigin =
    import.meta.env.VITE_STUDENT_ORIGIN || localStudent.origin;
  const inviteUrl = new URL(
    `/englishWorld/classrooms/join/${data.inviteCode}`,
    studentOrigin,
  ).href;
  async function rotate() {
    if (busy || !confirm("更新链接后，原邀请链接会失效。继续更新？")) return;
    setBusy(true);
    try {
      await api(path + "/invite", {});
      await reload();
      setNotice("邀请链接已更新");
    } catch (cause) {
      setNotice(classroomError(cause));
    } finally {
      setBusy(false);
    }
  }

  const paperTable = (
    <section className="panel">
      <div className="section-title">
        <h2>阅读作业</h2>
        <a href={route + "/new"} className="button primary">
          新建作业
        </a>
      </div>
      {data.papers.length ? (
        <table>
          <thead>
            <tr>
              <th>作业名称</th>
              <th>状态</th>
              <th>已提交 / 接收</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {data.papers.map((item: PaperSummary) => (
              <tr key={item.id}>
                <td>
                  <strong>{item.title}</strong>
                </td>
                <td>
                  {(
                    {
                      draft: "草稿",
                      queued: "排队中",
                      generating: "处理中",
                      failed: "处理失败",
                      published: "已发布",
                      withdrawn: "已撤回",
                    } as Record<string, string>
                  )[item.status] ?? item.status}
                </td>
                <td>
                  {item.publishedAt ||
                  item.status === "published" ||
                  item.status === "withdrawn"
                    ? `${item.submittedCount} / ${item.assignedCount} 人`
                    : "—"}
                </td>
                <td>
                  <div className="actions">
                    {item.status === "published" ||
                    item.status === "withdrawn" ? (
                      <>
                        <a
                          className="button"
                          href={route + "/scores/" + item.id}
                        >
                          查看成绩
                        </a>
                        {item.status === "published" && (
                          <a
                            className="button"
                            href={route + "/assign/" + item.id}
                          >
                            补发
                          </a>
                        )}
                      </>
                    ) : (
                      <a className="button" href={route + "/paper/" + item.id}>
                        {item.status === "draft" ? "编辑草稿" : "查看进度"}
                      </a>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="pad muted">暂无阅读作业。</p>
      )}
    </section>
  );

  return (
    <>
      <a className="back" href="#">
        ‹ 我的课堂
      </a>
      <div className="page-title">
        <h1>{data.name}</h1>
        <button
          onClick={() => {
            setNotice("");
            invite.current?.showModal();
          }}
        >
          邀请学生
        </button>
      </div>
      <nav aria-label="课堂内容" className="tabs">
        <a aria-current={!view ? "page" : undefined} href={route}>
          阅读作业
        </a>
        <a
          aria-current={view === "members" ? "page" : undefined}
          href={route + "/members"}
        >
          学生名单（{data.members.length}）
        </a>
        <a
          aria-current={view === "chat" ? "page" : undefined}
          href={route + "/chat"}
        >
          班级群
        </a>
      </nav>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {view === "members" ? (
        <section className="panel">
          {data.members.length ? (
            <table>
              <thead>
                <tr>
                  <th>学生</th>
                  <th>账号状态</th>
                </tr>
              </thead>
              <tbody>
                {data.members.map((member) => (
                  <tr key={member.id}>
                    <td>{member.name}</td>
                    <td>{member.status === "active" ? "有效" : "停用"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="pad muted">还没有学生。复制邀请链接分享给学生。</p>
          )}
        </section>
      ) : view === "chat" ? (
        <ClassroomChat key={id} id={id} />
      ) : view === "new" ? (
        <NewPaper path={path} route={route} />
      ) : view === "paper" && paper ? (
        <PaperEditor
          key={paper}
          path={path}
          route={route}
          paper={paper}
          members={data.members}
          reload={reload}
        />
      ) : (view === "scores" || view === "assign") && paper ? (
        <PaperScores
          key={view + paper}
          path={path}
          route={route}
          paper={paper}
          members={data.members}
          assigning={view === "assign"}
          reload={reload}
        />
      ) : (
        paperTable
      )}
      <dialog ref={invite} aria-label="邀请学生">
        <div className="stack pad">
          <h2>邀请学生</h2>
          <p>学生打开链接并登录后，直接加入 {data.name}。</p>
          <label>
            邀请链接
            <input
              value={inviteUrl}
              readOnly
              onFocus={(event) => event.currentTarget.select()}
            />
          </label>
          <p role="status">{notice}</p>
          <div className="actions">
            <button onClick={() => invite.current?.close()}>关闭</button>
            <button disabled={busy} onClick={() => void rotate()}>
              更新链接
            </button>
            <button
              className="primary"
              onClick={() =>
                void navigator.clipboard.writeText(inviteUrl).then(
                  () => setNotice("链接已复制"),
                  () => setNotice("请选择链接并手动复制"),
                )
              }
            >
              复制链接
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}

function App() {
  const [section, id, view, paper] = useRoute();
  const [list, setList] = useState<ClassSummary[]>();
  const [error, setError] = useState<ClassroomApiError>();
  const [notice, setNotice] = useState("");
  const load = useCallback(async () => {
    try {
      setList(await api("/teacher/classrooms"));
      setError(undefined);
    } catch (cause) {
      setError(
        cause instanceof ClassroomApiError
          ? cause
          : new ClassroomApiError(classroomError(cause), 0),
      );
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  async function logout() {
    try {
      await api("/user/logout", {});
      setList(undefined);
      location.hash = "";
      await load();
    } catch (cause) {
      setNotice(classroomError(cause));
    }
  }

  return (
    <>
      <header className="top">
        <a className="brand" href="#">
          <img alt="" src={logo} />
          Freewing <span>教师端</span>
        </a>
        {list && <button onClick={() => void logout()}>退出登录</button>}
      </header>
      <main>
        {notice && (
          <p role="alert" className="error">
            {notice}
          </p>
        )}
        {error?.status === 401 ? (
          <Login done={() => void load()} />
        ) : error ? (
          <section className="panel pad">
            <h1>{error.status === 403 ? "教师端未开通" : "无法载入课堂"}</h1>
            <p role="alert">{error.message}</p>
            <div className="actions">
              <button onClick={() => void load()}>重新加载</button>
              {error.status === 403 && (
                <button onClick={() => void logout()}>退出登录</button>
              )}
            </div>
          </section>
        ) : !list ? (
          <p role="status">正在载入教师端…</p>
        ) : section === "class" && /^[1-9]\d*$/.test(id ?? "") ? (
          <ClassPage
            key={id}
            id={Number(id)}
            view={view}
            paper={Number(paper)}
          />
        ) : (
          <ClassList list={list} reload={() => void load()} />
        )}
      </main>
    </>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
