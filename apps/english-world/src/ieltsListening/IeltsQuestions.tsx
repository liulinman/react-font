import { useState } from "react";
import type { Group, Question } from "./types";
export function IeltsQuestions({
  group: g,
  answers,
  onChange,
  active,
  onActive,
  disabled,
}: {
  group: Group;
  answers: Record<string, string>;
  onChange: (id: number, value: string) => void;
  active: number;
  onActive: (id: number) => void;
  disabled: boolean;
}) {
  const [zoom, setZoom] = useState(1);
  const structuredTable = g.format === "table" && g.questions.length > 0 && g.questions.every(q => q.category?.trim());
  const structuredFlow = g.format === "flow" && g.questions.length > 0 && g.questions.every(q => q.stage?.trim());
  // Only combine consecutive stages: question order must follow the recording.
  const stages: {name: string; questions: Question[]}[] = [];
  if (structuredFlow) for (const q of g.questions) {
    const previous = stages[stages.length - 1];
    if (previous?.name === q.stage) previous.questions.push(q);
    else stages.push({name: q.stage!, questions: [q]});
  }
  const questionLabel = (q: Question) => (<>
              <label htmlFor={`ielts-answer-${q.id}`}>
                <span className="ielts-q-number">{q.id}</span>{" "}
                {q.before ?? q.prompt}
              </label>{" "}
  </>);
  const answerControl = (q: Question) => (<>
              {g.options ? (
                <select
                  id={`ielts-answer-${q.id}`}
                  aria-label={`第${q.id}题 ${q.prompt}`}
                  value={answers[q.id] || ""}
                  disabled={disabled}
                  onFocus={() => onActive(q.id)}
                  onChange={(e) => onChange(q.id, e.target.value)}
                >
                  <option value="">选择答案</option>
                  {g.options.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.id}
                      {o.text !== o.id ? ` · ${o.text}` : ""}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  id={`ielts-answer-${q.id}`}
                  aria-label={`第${q.id}题 ${q.prompt}`}
                  placeholder={String(q.id)}
                  value={answers[q.id] || ""}
                  maxLength={200}
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  disabled={disabled}
                  onFocus={() => onActive(q.id)}
                  onChange={(e) => onChange(q.id, e.target.value)}
                />
              )}{" "}
    {q.after && <span>{q.after}</span>}
  </>);
  const answerRow = (q: Question) => (
    <div key={q.id} id={`ielts-question-${q.id}`} className={`ielts-answer-row${active === q.id ? " is-active" : ""}`}>
      {questionLabel(q)} {answerControl(q)}
    </div>
  );
  return (
    <section
      className={`ielts-group ielts-format-${g.format || g.kind}`}
      aria-label={g.title}
    >
      <h3>{g.title}</h3>
      <p className="ielts-instruction">{g.instruction}</p>
      {g.kind === "multiple" && (
        <p>需选 {g.questions.length} 个不同选项；仅有 {g.questions.length} 个答题位，不能超选。</p>
      )}
      {g.kind === "matching" && (
        <p>{g.reusable ? "选项可重复使用" : "各选项不可重复使用"}</p>
      )}
      {g.options && !g.map && (
        <ul className="ielts-options">
          {g.options.map((o) => (
            <li key={o.id}>
              <strong>{o.id}</strong> {o.text}
            </li>
          ))}
        </ul>
      )}
      <div className={g.map ? "ielts-map-layout" : ""}>
        {g.map && (
          <div>
            <div className="ielts-map-tools">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(2, z + 0.25))}
                disabled={zoom >= 2}
              >
                放大地图
              </button>
              <button type="button" onClick={() => setZoom(1)}>
                复位
              </button>
            </div>
            <div className="ielts-map-scroll">
              <svg
                role="img"
                aria-label={`${g.title} 地图`}
                viewBox="0 0 100 100"
                style={{ width: `${zoom * 100}%`, height:zoom*400, minWidth: 300 }}
              >
                <rect
                  x="1"
                  y="1"
                  width="98"
                  height="98"
                  fill="#f7f8f5"
                  stroke="#99a9a1"
                  strokeWidth=".4"
                />
                {g.map.paths.map((p, i) => (
                  <line
                    key={i}
                    x1={p.from.x}
                    y1={p.from.y}
                    x2={p.to.x}
                    y2={p.to.y}
                    stroke="#b9c3bb"
                    strokeWidth="2"
                  />
                ))}
                {g.map.landmarks.map((n, i) => (
                  <g key={i}>
                    <rect
                      x={n.x - 1}
                      y={n.y - 1}
                      width="2"
                      height="2"
                      fill="#465d50"
                    />
                    <text
                      x={n.x}
                      y={n.y + (n.x <= 10 ? 7 : 4)}
                      textAnchor={n.x <= 10 ? "start" : "middle"}
                      fontSize="3"
                      fill="#23372b"
                    >
                      {n.label}
                    </text>
                  </g>
                ))}
                {g.map.nodes.map((n) => (
                  <g key={n.id}>
                    <circle
                      cx={n.x}
                      cy={n.y}
                      r="3.3"
                      fill="white"
                      stroke="#355779"
                      strokeWidth=".5"
                    />
                    <text
                      x={n.x}
                      y={n.y + 1.2}
                      textAnchor="middle"
                      fontSize="3.4"
                      fontWeight="700"
                      fill="#203e5c"
                    >
                      {n.id}
                    </text>
                  </g>
                ))}
              </svg>
            </div>
          </div>
        )}
        <div className="ielts-answer-list">
          {(g.kind === "multiple" || (g.kind === "matching" && !g.reusable)) &&
            new Set(g.questions.map((q) => answers[q.id]).filter(Boolean))
              .size < g.questions.filter((q) => answers[q.id]).length && (
              <p role="status">{g.kind === "multiple" ? "存在重复选项，每个正确选项只计一次。" : "本组各选项不可重复使用，请检查重复答案。"}</p>
            )}
          {structuredTable ? (
            <table className="ielts-completion-table" aria-label={g.title}>
              <thead><tr><th scope="col">分类 / Category</th><th scope="col">任务 / Task</th><th scope="col">作答 / Response</th></tr></thead>
              <tbody>{g.questions.map(q => (
                <tr key={q.id} id={`ielts-question-${q.id}`} className={`ielts-answer-row${active === q.id ? " is-active" : ""}`}>
                  <th scope="row">{q.category}</th><td>{questionLabel(q)}</td><td>{answerControl(q)}</td>
                </tr>
              ))}</tbody>
            </table>
          ) : structuredFlow ? (
            <ol className="ielts-flow-stages" aria-label={`${g.title} 阶段`}>
              {stages.map((stage, index) => <li key={index}>
                <h4>{stage.name}</h4>
                {stage.questions.map(answerRow)}
                {index < stages.length - 1 && <span className="ielts-flow-arrow" aria-hidden="true">↓</span>}
              </li>)}
            </ol>
          ) : g.questions.map(answerRow)}
        </div>
      </div>
    </section>
  );
}
