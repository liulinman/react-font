import React, { useState } from "react";
import { Button, Input, message, Spin } from "antd";
import { RobotOutlined, SearchOutlined } from "@ant-design/icons";
import request from "@font/api";
import { wordAgentQuery } from "@/server/wordAgent/wordAgent";
import type {
  WordAgentItem,
  WordAgentResponse,
} from "@/server/wordAgent/wordAgent";

export const WordAgentTab: React.FC = () => {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [words, setWords] = useState<WordAgentItem[]>([]);

  const handleQuery = async () => {
    const trimmed = input.trim();
    if (!trimmed) {
      message.warning("请输入要查询的单词");
      return;
    }

    setLoading(true);
    setWords([]);
    try {
      const data = await request<WordAgentResponse>(
        wordAgentQuery({ word: trimmed }),
      );
      if (data?.words?.length) {
        setWords(data.words);
        message.success(`已查询 ${data.words.length} 个单词`);
      } else {
        message.info("未返回结果");
      }
    } catch (e: unknown) {
      const err = e as { message?: string; code?: number };
      if (err?.code === 400) {
        message.warning("请至少输入一个单词");
      } else {
        message.error(err?.message || "查询失败，请稍后再试");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 920, margin: "0 auto", padding: "0 16px" }}>
      <div
        style={{
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          borderRadius: 16,
          padding: "28px 32px",
          boxShadow: "0 10px 40px rgba(102, 126, 234, 0.35)",
          marginBottom: 24,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 10,
          }}
        >
          <span
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: "rgba(255,255,255,0.2)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 22,
              color: "#fff",
            }}
          >
            <RobotOutlined />
          </span>
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: 22,
                fontWeight: 600,
                color: "#fff",
              }}
            >
              AI 单词查询
            </h1>
            <span
              style={{ fontSize: 13, color: "rgba(255,255,255,0.85)" }}
            ></span>
          </div>
        </div>
        <p
          style={{
            margin: 0,
            color: "rgba(255,255,255,0.9)",
            fontSize: 14,
            lineHeight: 1.6,
          }}
        >
          输入单词（支持多个，用逗号或空格分隔），获取释义、音标、例句与雅思案例。
        </p>
      </div>

      <div
        style={{
          background: "#fff",
          borderRadius: 16,
          padding: 24,
          boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
          border: "1px solid rgba(0,0,0,0.04)",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 12,
            alignItems: "flex-end",
            flexWrap: "wrap",
          }}
        >
          <Input.TextArea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="例如：confront 或 confront, reluctant, habitat"
            autoSize={{ minRows: 2, maxRows: 4 }}
            style={{
              flex: "1 1 280px",
              borderRadius: 12,
              border: "1px solid #e8e8e8",
              fontSize: 15,
            }}
            onPressEnter={(e) => {
              if (!e.shiftKey) {
                e.preventDefault();
                handleQuery();
              }
            }}
          />
          <Button
            type="primary"
            icon={<SearchOutlined />}
            onClick={handleQuery}
            loading={loading}
            size="large"
            style={{
              height: 44,
              paddingLeft: 24,
              paddingRight: 24,
              borderRadius: 12,
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              border: "none",
              fontWeight: 500,
              boxShadow: "0 4px 14px rgba(102, 126, 234, 0.4)",
            }}
          >
            查询
          </Button>
        </div>

        {loading && (
          <div
            style={{
              textAlign: "center",
              padding: "48px 24px",
              background: "linear-gradient(180deg, #fafbff 0%, #f5f6fa 100%)",
              borderRadius: 12,
              marginTop: 24,
            }}
          >
            <Spin size="large" tip="AI 正在查询..." />
          </div>
        )}

        {!loading && words.length > 0 && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 20,
              marginTop: 28,
            }}
          >
            {words.map((item, index) => (
              <div
                key={`${item.word}-${index}`}
                style={{
                  background: "#fff",
                  border: "1px solid #eee",
                  borderRadius: 14,
                  padding: "20px 24px",
                  boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
                }}
              >
                <div style={{ marginBottom: 12 }}>
                  <span
                    style={{
                      fontSize: 20,
                      fontWeight: 600,
                      color: "#667eea",
                      marginRight: 12,
                    }}
                  >
                    {item.word}
                  </span>
                  <span
                    style={{
                      color: "#64748b",
                      fontFamily: "monospace",
                      fontSize: 15,
                    }}
                  >
                    {item.phonetic}
                  </span>
                </div>
                <p
                  style={{
                    margin: "0 0 12px 0",
                    color: "#334155",
                    fontSize: 15,
                    lineHeight: 1.6,
                  }}
                >
                  <span style={{ color: "#64748b", fontWeight: 500 }}>
                    释义：
                  </span>
                  {item.meaning}
                </p>
                {item.examples?.length > 0 && (
                  <div style={{ marginTop: 14 }}>
                    <span
                      style={{
                        color: "#64748b",
                        fontWeight: 500,
                        fontSize: 14,
                      }}
                    >
                      例句
                    </span>
                    <ul
                      style={{
                        margin: "8px 0 0 0",
                        paddingLeft: 0,
                        listStyle: "none",
                      }}
                    >
                      {item.examples.map((ex, i) => (
                        <li
                          key={i}
                          style={{
                            marginBottom: 10,
                            padding: "6px 0",
                            borderBottom:
                              i < item.examples.length - 1
                                ? "1px solid #f0f0f0"
                                : "none",
                          }}
                        >
                          <div
                            style={{
                              color: "#333",
                              marginBottom: ex.zh ? 2 : 0,
                            }}
                          >
                            {ex.en}
                          </div>
                          {ex.zh && (
                            <div
                              style={{
                                color: "#8c8c8c",
                                fontSize: 12,
                                paddingLeft: 8,
                              }}
                            >
                              {ex.zh}
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {item.ieltsCase != null &&
                typeof item.ieltsCase === "object" ? (
                  <div
                    style={{
                      marginTop: 16,
                      padding: "16px 18px",
                      background:
                        "linear-gradient(135deg, #f0f4ff 0%, #faf5ff 100%)",
                      borderRadius: 12,
                      borderLeft: "4px solid #667eea",
                    }}
                  >
                    <span
                      style={{
                        color: "#667eea",
                        fontWeight: 600,
                        fontSize: 13,
                      }}
                    >
                      雅思案例
                    </span>
                    <div style={{ marginTop: 8 }}>
                      <span
                        className="ielts-source"
                        style={{
                          display: "inline-block",
                          fontSize: 12,
                          color: "#8c8c8c",
                          marginBottom: 8,
                        }}
                      >
                        {item.ieltsCase.source}
                      </span>
                      <div
                        className="ielts-question"
                        style={{
                          marginTop: 8,
                          padding: "10px 12px",
                          background: "rgba(255,255,255,0.8)",
                          borderRadius: 8,
                          borderLeft: "2px solid #a78bfa",
                          fontSize: 14,
                          color: "#334155",
                        }}
                      >
                        <div
                          style={{
                            marginBottom: item.ieltsCase.questionZh ? 4 : 0,
                          }}
                        >
                          {item.ieltsCase.question}
                        </div>
                        {item.ieltsCase.questionZh && (
                          <div
                            style={{
                              fontSize: 12,
                              color: "#8c8c8c",
                            }}
                          >
                            {item.ieltsCase.questionZh}
                          </div>
                        )}
                      </div>
                      <blockquote
                        className="ielts-sentence"
                        style={{
                          margin: "10px 0 0 0",
                          padding: "10px 0 0 14px",
                          borderLeft: "2px solid #667eea",
                          fontStyle: "italic",
                          color: "#475569",
                          fontSize: 14,
                        }}
                      >
                        <div
                          style={{
                            marginBottom: item.ieltsCase.sentenceZh ? 4 : 0,
                          }}
                        >
                          {item.ieltsCase.sentence}
                        </div>
                        {item.ieltsCase.sentenceZh && (
                          <div
                            style={{
                              fontSize: 12,
                              color: "#8c8c8c",
                              fontStyle: "normal",
                            }}
                          >
                            {item.ieltsCase.sentenceZh}
                          </div>
                        )}
                      </blockquote>
                    </div>
                  </div>
                ) : (
                  <div
                    style={{
                      marginTop: 12,
                      color: "#94a3b8",
                      fontSize: 13,
                    }}
                  >
                    雅思案例：暂无
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
