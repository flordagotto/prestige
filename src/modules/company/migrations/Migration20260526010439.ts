import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260526010439 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "category_x_company" drop constraint if exists "category_x_company_category_id_foreign";`);

    this.addSql(`drop table if exists "category" cascade;`);

    this.addSql(`drop table if exists "category_x_company" cascade;`);
  }

  override async down(): Promise<void> {
    this.addSql(`create table if not exists "category" ("id" text not null, "name" text not null, "slug" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "category_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_category_deleted_at" ON "category" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "category_x_company" ("id" text not null, "category_id" text not null, "company_id" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "category_x_company_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_category_x_company_category_id" ON "category_x_company" ("category_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_category_x_company_company_id" ON "category_x_company" ("company_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_category_x_company_deleted_at" ON "category_x_company" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`alter table if exists "category_x_company" add constraint "category_x_company_category_id_foreign" foreign key ("category_id") references "category" ("id") on update cascade;`);
    this.addSql(`alter table if exists "category_x_company" add constraint "category_x_company_company_id_foreign" foreign key ("company_id") references "company" ("id") on update cascade;`);
  }

}
