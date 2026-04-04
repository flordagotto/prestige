import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260404012556 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "goldie_transaction" ("id" text not null, "type" text check ("type" in ('company_assignment', 'employee_assignment', 'redemption', 'adjustment')) not null, "company_id" text not null, "employee_id" text null, "product_id" text null, "amount" integer not null, "performed_by" text not null, "note" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "goldie_transaction_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_goldie_transaction_deleted_at" ON "goldie_transaction" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "redemption_request" ("id" text not null, "employee_id" text not null, "product_id" text not null, "goldies_cost" integer not null, "payment_intent_id" text null, "payment_status" text check ("payment_status" in ('pending', 'paid', 'failed')) not null default 'pending', "status" text check ("status" in ('pending', 'processing', 'completed', 'cancelled')) not null default 'pending', "delivery_full_name" text not null, "delivery_street" text not null, "delivery_city" text not null, "delivery_state" text null, "delivery_postal_code" text not null, "delivery_country" text not null, "delivery_phone" text null, "delivery_notes" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "redemption_request_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_redemption_request_deleted_at" ON "redemption_request" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "goldie_transaction" cascade;`);

    this.addSql(`drop table if exists "redemption_request" cascade;`);
  }

}
