import { db } from "./src/db/index.ts";
import { customRoles } from "./src/db/schema.ts";

async function test() {
  try {
    const result = await db.insert(customRoles).values({
      name: "TEST_ROLE_" + Date.now(),
      permissions: {}
    }).returning();
    console.log("Success:", result);
  } catch (e) {
    console.error("Failed:", e);
  }
}
test();
