import { Link } from "react-router-dom";
import { MobilePage } from "../../components/MobilePage";
import {
  EditSOutline,
  HistogramOutline,
  SearchOutline,
  SoundOutline,
} from "antd-mobile-icons";
export function MobileToolsPage() {
  return (
    <MobilePage title="学习工具" className="study-tools">
      <p className="study-muted">把词汇变成自己的表达。</p>
      <div className="study-tool-grid">
        {[
          {title: "知识笔记", note: "记录语法、句型和易错点", path: "/mobile/tools/knowledge-notes", icon: <EditSOutline />},
          {title: "文章阅读与练习", note: "读文章、做题、看解析", path: "/mobile/tools/context-lab", icon: <EditSOutline />},
          {
            title: "默写练习",
            note: "两种方向，检验记忆",
            path: "/mobile/review",
            icon: <EditSOutline />,
          },
          {
            title: "学习记录",
            note: "回顾结果，重练错词",
            path: "/mobile/cockpit",
            icon: <HistogramOutline />,
          },
          {
            title: "查词与发音",
            note: "搜索自己的词库",
            path: "/mobile/words",
            icon: <SoundOutline />,
          },
          {
            title: "添加单词",
            note: "收下今天遇见的新词",
            path: "/mobile/words/new",
            icon: <SearchOutline />,
          },
        ].map((t) => (
          <Link to={t.path} key={t.path}>
            <span className="study-tool-icon">{t.icon}</span>
            <h2>{t.title}</h2>
            <p>{t.note}</p>
            <span aria-hidden="true">↗</span>
          </Link>
        ))}
      </div>
    </MobilePage>
  );
}
