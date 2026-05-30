import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260525223853 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "employee" add column if not exists "department" text null, add column if not exists "role" text null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "employee" drop column if exists "department", drop column if exists "role";`);
  }

}
