-- Json[]（jsonb の配列）を Json（中身が JSON の配列）にする。SQLite（D1）と同じ形にそろえるため。
-- prisma migrate dev に任せると列を消して作り直し、データが消えるので、USING で中身を移す。

-- Staff.unavailableTimes: jsonb[] -> jsonb（既定値は持たない。SQLite と同じにするため、作る側で [] を渡す）
ALTER TABLE "Staff" ALTER COLUMN "unavailableTimes" TYPE JSONB USING to_jsonb("unavailableTimes");
UPDATE "Staff" SET "unavailableTimes" = '[]'::jsonb WHERE "unavailableTimes" IS NULL;
ALTER TABLE "Staff" ALTER COLUMN "unavailableTimes" SET NOT NULL;

-- Room.timeTable: jsonb[] -> jsonb
ALTER TABLE "Room" ALTER COLUMN "timeTable" TYPE JSONB USING to_jsonb("timeTable");
UPDATE "Room" SET "timeTable" = '[]'::jsonb WHERE "timeTable" IS NULL;
ALTER TABLE "Room" ALTER COLUMN "timeTable" SET NOT NULL;
