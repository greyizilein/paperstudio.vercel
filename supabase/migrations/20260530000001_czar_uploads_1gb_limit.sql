update storage.buckets
set file_size_limit = 1073741824  -- 1 GB per file
where id = 'czar-uploads';
