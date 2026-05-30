import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260505225726 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "variant_goldies" ("id" text not null, "goldies_cost" integer not null default 0, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "variant_goldies_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_variant_goldies_deleted_at" ON "variant_goldies" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`drop table if exists "variant_points" cascade;`);

    this.addSql(`alter table if exists "goldie_order" rename column "total_points_cost" to "total_goldies_cost";`);
  }

  override async down(): Promise<void> {
    this.addSql(`create table if not exists "variant_points" ("id" text not null, "points_cost" integer not null default 0, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "variant_points_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_variant_points_deleted_at" ON "variant_points" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`drop table if exists "variant_goldies" cascade;`);

    this.addSql(`alter table if exists "goldie_order" rename column "total_goldies_cost" to "total_points_cost";`);
  }

}
