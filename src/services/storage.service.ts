import { storage } from "../firebase/config";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";

type MediaKind = "image" | "video";

function isRemoteUri(uri: string) {
  return /^https?:\/\//i.test(uri);
}

function uriToBlob(uri: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    try {
      const xhr = new XMLHttpRequest();
      xhr.onload = () => resolve(xhr.response);
      xhr.onerror = () => reject(new Error("Failed to load file for upload"));
      xhr.responseType = "blob";
      xhr.open("GET", uri, true);
      xhr.send(null);
    } catch (e) {
      reject(e);
    }
  });
}

function guessContentType(kind: MediaKind, uri: string) {
  if (kind === "video") {
    if (/\.mov(\?|#|$)/i.test(uri)) return "video/quicktime";
    return "video/mp4";
  }

  if (/\.png(\?|#|$)/i.test(uri)) return "image/png";
  if (/\.(heic|heif)(\?|#|$)/i.test(uri)) return "image/heic";
  return "image/jpeg";
}

function guessExtension(kind: MediaKind, uri: string) {
  if (kind === "video") {
    if (/\.mov(\?|#|$)/i.test(uri)) return "mov";
    return "mp4";
  }
  if (/\.png(\?|#|$)/i.test(uri)) return "png";
  return "jpg";
}

export async function uploadImageAndGetUrl(localUri: string, uid: string, memoryId: string) {
  const blob = await uriToBlob(localUri);
  const storageRef = ref(storage, `users/${uid}/memories/${memoryId}.jpg`);
  try {
    await uploadBytes(storageRef, blob);
    return await getDownloadURL(storageRef); // https://...
  } finally {
    // React Native blobs sometimes support close()
    (blob as any)?.close?.();
  }
}

// Upload a single image/video and return its download URL.
// If `localUri` is already remote (https), it will be returned unchanged.
export async function uploadMediaAndGetUrl(
  localUri: string,
  uid: string,
  memoryId: string,
  kind: MediaKind,
  index: number
) {
  if (isRemoteUri(localUri)) return localUri;

  const blob = await uriToBlob(localUri);

  const ext = guessExtension(kind, localUri);
  const contentType = guessContentType(kind, localUri);
  const storageRef = ref(storage, `users/${uid}/memories/${memoryId}/media_${index}.${ext}`);

  try {
    await uploadBytes(storageRef, blob, { contentType });
    return await getDownloadURL(storageRef);
  } finally {
    (blob as any)?.close?.();
  }
}