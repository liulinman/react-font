import { useEffect, useState } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { readMaterial } from "./api";
import type { Material } from "./types";
import MaterialLibrary from "./MaterialLibrary";
import ImportReview from "./ImportReview";
import ReadingWorkbench from "./ReadingWorkbench";
import "./intensiveReading.css";
export default function IntensiveReadingPage() {
  const { id } = useParams();
  const location = useLocation(),
    navigate = useNavigate();
  const [material, setMaterial] = useState<Material | null>(null),
    [error, setError] = useState("");
  useEffect(() => {
    let alive = true;
    setMaterial(null);
    setError("");
    if (id)
      readMaterial(id)
        .then((m) => alive && setMaterial(m))
        .catch((e) => alive && setError(e.message || "加载失败"));
    return () => {
      alive = false;
    };
  }, [id]);
  if (!id) return <MaterialLibrary />;
  if (error)
    return (
      <div className="ir-empty" role="alert">
        {error}
        <button onClick={() => navigate("/englishWorld/intensive-reading")}>
          返回材料库
        </button>
      </div>
    );
  if (!material || material.id !== id)
    return <div className="ir-empty">正在加载精读材料…</div>;
  return (
    <div className="ir-root">
      {location.pathname.endsWith("/review") || material.status !== "ready" ? (
        <ImportReview key={id} material={material} onChange={setMaterial} />
      ) : (
        <ReadingWorkbench key={id} material={material} onChange={setMaterial} />
      )}
    </div>
  );
}
