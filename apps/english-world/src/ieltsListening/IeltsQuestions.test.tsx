import "@testing-library/jest-dom/vitest";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { IeltsQuestions } from "./IeltsQuestions";
afterEach(() => { cleanup(); vi.clearAllMocks(); });
describe("IELTS question sheet", () => {
  it("keeps note context and numbered accessible inputs", () => {
    const change = vi.fn();
    render(
      <IeltsQuestions
        group={{
          kind: "completion",
          title: "Furniture",
          instruction: "ONE WORD ONLY",
          questions: [
            { id: 1, prompt: "Shape", before: "Table:", after: "shape" },
          ],
        }}
        answers={{}}
        onChange={change}
        active={1}
        onActive={() => {}}
        disabled={false}
      />,
    );
    expect(screen.getByText("ONE WORD ONLY")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("第1题 Shape"), {
      target: { value: "round" },
    });
    expect(change).toHaveBeenCalledWith(1, "round");
    expect(screen.getByText("shape")).toBeInTheDocument();
  });
  it("offers letter choices next to a map with a non-drag interaction", () => {
    render(
      <IeltsQuestions
        group={{
          kind: "map",
          title: "Park",
          instruction: "Choose a letter",
          options: [
            { id: "A", text: "A" },
            { id: "B", text: "B" },
          ],
          map: {
            nodes: [
              { id: "A", x: 10, y: 20 },
              { id: "B", x: 70, y: 30 },
            ],
            landmarks: [{ label: "Entrance", x: 40, y: 90 }],
            paths: [],
          },
          questions: [{ id: 1, prompt: "Library" }],
        }}
        answers={{ "1": "A" }}
        onChange={() => {}}
        active={1}
        onActive={() => {}}
        disabled={false}
      />,
    );
    expect(screen.getByRole("img", { name: "Park 地图" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "第1题 Library" })).toHaveValue(
      "A",
    );
  });
});

describe("IELTS answer rules", () => {
  const options = [{ id: "A", text: "Art" }, { id: "B", text: "Biology" }, { id: "C", text: "Chemistry" }];
  const questions = [{ id: 1, prompt: "First" }, { id: 2, prompt: "Second" }];
  const props = { answers: { "1": "A" }, onChange: vi.fn(), active: 1, onActive: vi.fn(), disabled: false };
  it("shows the multiple-choice count and prevents selecting beyond numbered answer slots", () => {
    render(<IeltsQuestions {...props} group={{ kind: "multiple", title: "Courses", instruction: "Choose TWO letters", options, questions }} />);
    expect(screen.getByText("需选 2 个不同选项；仅有 2 个答题位，不能超选。" )).toBeInTheDocument();
    expect(screen.getAllByRole("combobox")).toHaveLength(2);
  });
  it("warns about non-reusable matching without changing the candidate answers", () => {
    render(<IeltsQuestions {...props} answers={{"1":"A", "2":"A"}} group={{ kind: "matching", reusable: false, title: "Matching", instruction: "Choose", options, questions }} />);
    const first = screen.getByRole("combobox", {name: "第1题 First"});
    const second = screen.getByRole("combobox", {name: "第2题 Second"});
    expect(first.querySelector('option[value="A"]')).not.toBeDisabled();
    expect(second.querySelector('option[value="A"]')).not.toBeDisabled();
    expect(screen.getByRole("status")).toHaveTextContent("本组各选项不可重复使用，请检查重复答案。");
    fireEvent.change(first, {target: {value: "B"}});
    expect(props.onChange).toHaveBeenCalledWith(1, "B");
    fireEvent.change(first, {target: {value: ""}});
    expect(props.onChange).toHaveBeenCalledWith(1, "");
  });
  it("allows reused matching choices when the material permits them", () => {
    render(<IeltsQuestions {...props} group={{ kind: "matching", reusable: true, title: "Reusable", instruction: "Choose", options, questions }} />);
    expect(screen.getByRole("combobox", {name: "第2题 Second"}).querySelector('option[value="A"]')).not.toBeDisabled();
  });
  it("keeps text-map positions stable through zoom and allows multiword text and clearing", () => {
    render(<IeltsQuestions {...props} group={{ kind: "map", title: "Text map", instruction: "NO MORE THAN TWO WORDS", questions: [{id: 1, prompt: "Place"}], map: { nodes: [{ id: "1", x: 20, y: 30 }], paths: [], landmarks: [{label: "North", x: 50, y: 5}] } }} />);
    const input = screen.getByLabelText("第1题 Place");
    fireEvent.change(input, {target: {value: "sports hall"}});
    expect(props.onChange).toHaveBeenCalledWith(1, "sports hall");
    const marker = screen.getByRole("img").querySelector("circle")!;
    fireEvent.click(screen.getByRole("button", {name: "放大地图"}));
    expect(marker).toHaveAttribute("cx", "20");
    expect(marker).toHaveAttribute("cy", "30");
    fireEvent.click(screen.getByRole("button", {name: "复位"}));
    expect(marker).toHaveAttribute("cx", "20");
    fireEvent.change(input, {target: {value: ""}});
    expect(props.onChange).toHaveBeenCalledWith(1, "");
  });
});

describe("structured completion formats", () => {
  const props = { answers: { "1": "sample" }, onChange: vi.fn(), active: 1, onActive: vi.fn(), disabled: false };
  const questions = [
    { id: 1, prompt: "Equipment", before: "Collect", after: "for sampling", category: "Field work", stage: "Preparation" },
    { id: 2, prompt: "Location", category: "Field work", stage: "Preparation" },
    { id: 3, prompt: "Result", category: "Analysis", stage: "Evaluation" },
  ];
  it("renders category, task and response table cells with accessible answers", () => {
    render(<IeltsQuestions {...props} group={{kind: "completion", format: "table", title: "Research", instruction: "ONE WORD", questions}} />);
    const table = screen.getByRole("table", {name: "Research"});
    expect(table.querySelectorAll("thead th")).toHaveLength(3);
    expect(table.querySelectorAll('tbody th[scope="row"]')).toHaveLength(3);
    expect(table.querySelectorAll("tbody tr")).toHaveLength(3);
    expect(screen.getAllByText("Field work")).toHaveLength(2);
    const input = screen.getByRole("textbox", {name: "第1题 Equipment"});
    expect(input).toHaveValue("sample");
    fireEvent.focus(input);
    expect(props.onActive).toHaveBeenCalledWith(1);
    fireEvent.change(input, {target: {value: "kit"}});
    expect(props.onChange).toHaveBeenCalledWith(1, "kit");
    expect(screen.getByText("for sampling")).toBeInTheDocument();
  });
  it("groups ordered flow questions by the actual stage and preserves unique ids", () => {
    const {container, rerender} = render(<IeltsQuestions {...props} group={{kind: "completion", format: "flow", title: "Method", instruction: "ONE WORD", questions}} />);
    const stages = screen.getByRole("list", {name: "Method 阶段"});
    expect(stages.children).toHaveLength(2);
    expect(stages.children[0]).toHaveTextContent("Preparation");
    expect(stages.children[0].querySelectorAll("input")).toHaveLength(2);
    expect(stages.children[1]).toHaveTextContent("Evaluation");
    const ids = Array.from(container.querySelectorAll("[id]")).map(n => n.id);
    expect(new Set(ids).size).toBe(ids.length);
    rerender(<IeltsQuestions {...props} disabled group={{kind: "completion", format: "flow", title: "Method", instruction: "ONE WORD", questions}} />);
    expect(screen.getAllByRole("textbox").every(input => input.hasAttribute("disabled"))).toBe(true);
  });
  it.each(["table", "flow", "form", "note", "summary"])("keeps legacy %s questions editable without grouping metadata", (format) => {
    render(<IeltsQuestions {...props} group={{kind: "completion", format, title: "Legacy", instruction: "ONE WORD", questions: [{id: 1, prompt: "Name"}]}} />);
    expect(screen.getByLabelText("第1题 Name")).toHaveValue("sample");
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });
});


describe("structured completion keyboard controls", () => {
  it.each(["table", "flow"])("supports tab, typing and clearing in %s without losing focus", async (format) => {
    function Sheet() {
      const [answers, setAnswers] = useState<Record<string, string>>({});
      return <IeltsQuestions group={{kind: "completion", format, title: "Research", instruction: "ONE WORD", questions: [
        {id: 1, prompt: "Equipment", category: "Collection", stage: "Prepare"},
        {id: 2, prompt: "Result", category: "Analysis", stage: "Evaluate"},
      ]}} answers={answers} onChange={(id, value) => setAnswers(current => ({...current, [id]: value}))} active={1} onActive={() => {}} disabled={false} />;
    }
    const user = userEvent.setup();
    render(<Sheet />);
    await user.tab();
    const first = screen.getByLabelText("第1题 Equipment");
    expect(first).toHaveFocus();
    await user.keyboard("sample kit");
    expect(first).toHaveValue("sample kit");
    await user.clear(first);
    expect(first).toHaveValue("");
    await user.tab();
    expect(screen.getByLabelText("第2题 Result")).toHaveFocus();
  });
});


it.each(["table", "flow"])("preserves labeled selection and disabled behavior in structured %s", (format) => {
  const onChange = vi.fn();
  const props = {group: {kind: "completion", format, title: "Method", instruction: "Choose", options: [{id: "A", text: "Manual"}], questions: [{id: 1, prompt: "Method", category: "Research", stage: "Prepare"}]}, answers: {"1": "A"}, onChange, active: 1, onActive: vi.fn(), disabled: false};
  const {rerender} = render(<IeltsQuestions {...props} />);
  const select = screen.getByLabelText("第1题 Method");
  expect(select).toHaveValue("A");
  fireEvent.change(select, {target: {value: ""}});
  expect(onChange).toHaveBeenCalledWith(1, "");
  rerender(<IeltsQuestions {...props} disabled />);
  expect(select).toBeDisabled();
});
