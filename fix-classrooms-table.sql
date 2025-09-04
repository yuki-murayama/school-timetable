-- 教室テーブルに欠落カラムを追加するSQLスクリプト

-- countカラムを追加
ALTER TABLE classrooms ADD COLUMN count INTEGER DEFAULT 1;

-- locationカラムを追加  
ALTER TABLE classrooms ADD COLUMN location TEXT DEFAULT '';

-- orderカラムを追加（バッククォートでエスケープ）
ALTER TABLE classrooms ADD COLUMN `order` INTEGER DEFAULT 0;