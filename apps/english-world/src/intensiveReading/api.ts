import request, { getApiBaseUrl } from "@font/api";
import type { Material, Source } from "./types";
const root = "/intensive-reading/materials";
export const readMaterial = (id: string) =>
  request<Material>({ url: `${root}/${id}`, method: "GET" });
export const listMaterials = (q = "", page = 1, signal?: AbortSignal) =>
  request<{
    list: Pick<
      Material,
      "id" | "title" | "status" | "sourceType" | "updatedAt"
    >[];
    total: number;
  }>({ url: root, method: "GET", data: { q, page }, config: { signal, suppressErrorMessage: true } });
export const createMaterial = (data: unknown) =>
  request<Material>({ url: root, method: "POST", data });
export const changeMaterial = (
  id: string,
  path: string,
  data: unknown,
  method = "POST",
) =>
  request<Material>({
    url: `${root}/${id}/${path}`,
    method,
    data,
    config: { suppressErrorMessage: true },
  });
export const readVersions = (id: string) =>
  request<
    {
      id: string;
      createdAt: string;
      snapshot: Pick<Material, "title" | "paragraphs" | "annotations">;
    }[]
  >({ url: `${root}/${id}/versions`, method: "GET" });
export async function uploadSource(id: string, file: File, uploadKey: string) {
  const data = new FormData();
  data.append("file", file);
  data.append("uploadKey", uploadKey);
  return request<Source>({
    url: `${root}/${id}/sources`,
    method: "POST",
    data,
    config: { headers: { "Content-Type": undefined } },
  });
}
export const sourceUrl = (id: string, sourceId: string) =>
  `${getApiBaseUrl()}${root}/${encodeURIComponent(id)}/sources/${encodeURIComponent(sourceId)}`;
export const requestId = () => {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join(
    "",
  );
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};
