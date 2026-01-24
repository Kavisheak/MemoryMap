import { collection, deleteDoc, doc, getDocs, orderBy, query, setDoc, writeBatch } from "firebase/firestore";
import { db } from "../firebase/config";

export type MemoryDoc = {
  id: string;
  type: "image" | "video" | "note";
  uri?: string | null;
  imageUri?: string | null;
  videoUri?: string | null;
  imageUris?: string[];
  videoUris?: string[];
  media?: { uri: string; type: string }[];
  note?: string;
  title?: string;
  description?: string;
  date?: string;
  latitude: number;
  longitude: number;
  createdAt: number;
};

function memoriesCol(uid: string) {
  return collection(db, "users", uid, "memories");
}

// ✅ Firestore rejects `undefined`. Remove it (deep) before setDoc.
function stripUndefined<T>(value: T): T {
  if (Array.isArray(value)) {
    return value
      .map((v) => stripUndefined(v))
      .filter((v) => v !== undefined) as any;
  }

  if (value && typeof value === "object") {
    const out: any = {};
    for (const [k, v] of Object.entries(value as any)) {
      if (v === undefined) continue;
      out[k] = stripUndefined(v);
    }
    return out;
  }

  return value;
}

export async function listMemoriesCloud(uid: string): Promise<MemoryDoc[]> {
  const q = query(memoriesCol(uid), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as MemoryDoc);
}

export async function upsertMemoryCloud(uid: string, memory: MemoryDoc) {
  const clean = stripUndefined(memory);
  await setDoc(doc(db, "users", uid, "memories", memory.id), clean, { merge: true });
}

export async function deleteMemoryCloud(uid: string, id: string) {
  await deleteDoc(doc(db, "users", uid, "memories", id));
}

export async function deleteAllMemoriesCloud(uid: string): Promise<number> {
  const snap = await getDocs(memoriesCol(uid));
  if (snap.empty) return 0;

  const batch = writeBatch(db);
  for (const d of snap.docs) {
    batch.delete(d.ref);
  }
  await batch.commit();
  return snap.size;
}