DROP POLICY IF EXISTS "vai_tro_doc" ON public.vai_tro;
CREATE POLICY "vai_tro_doc" ON public.vai_tro
FOR SELECT TO authenticated
USING (
  public.la_quan_tri_vien(auth.uid())
  OR EXISTS (
    SELECT 1
    FROM public.nguoi_dung nd
    WHERE nd."MaNguoiDung" = auth.uid()
      AND nd."MaVaiTro" = vai_tro."MaVaiTro"
  )
);

DROP POLICY IF EXISTS "media read" ON storage.objects;
CREATE POLICY "media read" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'media'
  AND (storage.foldername(name))[1] = auth.uid()::text
);