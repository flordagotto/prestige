import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260504223360 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "goldie_order" drop constraint if exists "goldie_order_transaction_id_unique";`);
    this.addSql(`create table if not exists "goldie_transaction" ("id" text not null, "type" text check ("type" in ('earned', 'spent', 'topup', 'adjustment')) not null, "company_id" text not null, "employee_id" text null, "amount" integer not null, "reference_type" text not null, "reference_id" text not null, "performed_by" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "goldie_transaction_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_goldie_transaction_deleted_at" ON "goldie_transaction" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "goldie_order" ("id" text not null, "medusa_order_id" text not null, "employee_id" text not null, "transaction_id" text not null, "total_points_cost" integer not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "goldie_order_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_goldie_order_transaction_id_unique" ON "goldie_order" ("transaction_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_goldie_order_deleted_at" ON "goldie_order" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`alter table if exists "goldie_order" add constraint "goldie_order_transaction_id_foreign" foreign key ("transaction_id") references "goldie_transaction" ("id") on update cascade;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "goldie_order" drop constraint if exists "goldie_order_transaction_id_foreign";`);

    this.addSql(`drop table if exists "goldie_transaction" cascade;`);

    this.addSql(`drop table if exists "goldie_order" cascade;`);
  }

}
