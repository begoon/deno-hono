import { swaggerUI } from "npm:@hono/swagger-ui";
import { OpenAPIHono, createRoute, z } from "npm:@hono/zod-openapi";
import { logger } from "npm:hono/logger";

import { serveStatic } from "npm:@hono/node-server/serve-static";

const GetUserSchema = z.object({
    id: z
        .string()
        .min(3)
        .openapi({ param: { name: "id", in: "path" }, example: "123456" }),
});

const UserSchema = z
    .object({
        id: z.string().openapi({ example: "123" }),
        name: z.string().openapi({ example: "John Doe" }),
        age: z.number().openapi({ example: 42 }),
    })
    .openapi("User");

const route = createRoute({
    method: "get",
    path: "/users/{id}",
    request: { params: GetUserSchema },
    responses: {
        200: {
            content: { "application/json": { schema: UserSchema } },
            description: "Retrieve the user",
        },
    },
});

const app = new OpenAPIHono();

app.use("*", logger());

app.openapi(route, (c) => {
    const { id } = c.req.valid("param");
    return c.jsonT({ id, age: 20, name: "ultra-man" });
});

app.doc("/openapi.json", {
    openapi: "3.0.0",
    info: { version: "1.0.0", title: "Deno/Hono/Zod API" },
});

app.use("/favicon.ico", serveStatic({ path: "./favicon.ico" }));

app.get("/swagger", swaggerUI({ url: "/openapi.json" }));
app.get("/", (c) => c.redirect("/swagger"));

const PORT = Number(Deno.env.get("PORT")) || 9000;

Deno.serve({
    port: PORT,
    handler: app.fetch,
    onListen: (c) => console.log(`listening on http://${c.hostname}:${c.port}`),
});
