import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ClassroomChat } from "@font/ui/classroom";
import { classroomError, classroomRequest } from "@font/ui/classroom-api";
import "@font/ui/classroom.css";

interface Classroom {
  id: number;
  name: string;
}
const base = "/englishWorld/classrooms";
const reading = "/englishWorld/reading-practices";

export default function StudentClassrooms() {
  const { code, classroomId } = useParams();
  const [data, setData] = useState<Classroom[]>();
  const [joined, setJoined] = useState<Classroom>();
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (classroomId) return;
    const controller = new AbortController();
    setData(undefined);
    setJoined(undefined);
    setError("");
    const request = code
      ? classroomRequest<Classroom>(
          `/classrooms/join/${encodeURIComponent(code)}`,
          {},
          controller.signal,
        ).then(setJoined)
      : classroomRequest<Classroom[]>(
          "/classrooms/mine",
          undefined,
          controller.signal,
        ).then(setData);
    void request.catch((cause) => {
      if (!controller.signal.aborted) setError(classroomError(cause));
    });
    return () => controller.abort();
  }, [classroomId, code, retry]);

  if (classroomId)
    return (
      <section className="reading-workspace">
        <header className="reading-workspace-heading">
          <h1>班级群</h1>
          <Link to={base}>返回我的班级群</Link>
        </header>
        {/^[1-9]\d*$/.test(classroomId) ? (
          <ClassroomChat key={classroomId} id={Number(classroomId)} showTitle />
        ) : (
          <p role="alert">班级不存在</p>
        )}
      </section>
    );

  return (
    <section className="reading-workspace">
      <header className="reading-workspace-heading">
        <h1>{code ? (joined ? "已加入课堂" : "加入课堂") : "我的班级群"}</h1>
      </header>
      {error && (
        <p role="alert">
          {error}{" "}
          <button onClick={() => setRetry((value) => value + 1)}>重试</button>
        </p>
      )}
      {!data && !joined && !error && (
        <p role="status">{code ? "正在加入课堂…" : "正在读取课堂…"}</p>
      )}
      {joined && (
        <>
          <h2>{joined.name}</h2>
          <p>
            <Link to={`${base}/${joined.id}`}>进入班级群</Link>
          </p>
        </>
      )}
      {data?.length === 0 && (
        <p>你还没有加入班级。打开老师发来的邀请链接即可加入。</p>
      )}
      {!!data?.length && (
        <ul>
          {data.map((item) => (
            <li key={item.id}>
              <Link to={`${base}/${item.id}`}>{item.name}</Link>
            </li>
          ))}
        </ul>
      )}
      <p>
        <Link to={reading}>前往老师发的题</Link>
      </p>
    </section>
  );
}
