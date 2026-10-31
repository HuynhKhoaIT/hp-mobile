// Ảnh trong form: ảnh đã có trên Storage (sửa tin) hoặc ảnh mới đã nén ở trình duyệt, chờ upload khi bấm Đăng / Lưu nháp.
export type FormPhoto =
  | { key: string; kind: 'existing'; path: string }
  | {
      key: string;
      kind: 'new';
      blob: Blob;
      contentType: 'image/webp' | 'image/jpeg';
      /** Object URL để xem trước (thu hồi khi xoá ảnh / rời form). */
      preview: string;
      /** Path Storage sau khi upload thành công (null = chưa upload). */
      path: string | null;
      failed: boolean;
    };

/** Path của ảnh theo thứ tự (ảnh đầu = bìa). null nếu còn ảnh chưa upload. */
export function photoPaths(photos: FormPhoto[]): string[] | null {
  const paths: string[] = [];
  for (const p of photos) {
    if (!p.path) return null;
    paths.push(p.path);
  }
  return paths;
}
