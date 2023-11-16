import { serveStatic } from "npm:@hono/node-server/serve-static";
import { swaggerUI } from "npm:@hono/swagger-ui";
import { OpenAPIHono, createRoute, z } from "npm:@hono/zod-openapi";
import { HTTPException } from "npm:hono/http-exception";
import { logger } from "npm:hono/logger";

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

const app = new OpenAPIHono({ strict: false });

app.use("*", logger());

app.openapi(route, (c) => {
    const { id } = c.req.valid("param");
    return c.jsonT({ id, age: 20, name: "ultra-man" });
});

app.doc("/openapi.json", {
    openapi: "3.0.0",
    info: { version: "1.0.1", title: "Deno/Hono/Zod API" },
});

app.use("/favicon.ico", serveStatic({ path: "./favicon.ico" }));

app.get("/swagger", swaggerUI({ url: "/openapi.json" }));
app.get("/ui", (c) => c.redirect("/swagger"));

app.get("/boom", (_c) => {
    throw new Error("Boom!");
});

app.get("/error", (_c) => {
    throw new HTTPException(410, { message: "ERROR!" });
});

app.onError((err, c) => {
    if (err instanceof HTTPException) {
        return err.getResponse();
    }
    console.error(`${err}`);
    return c.text("custom error message", 418);
});

app.get("*", (c) => {
    return c.stream(async (stream) => {
        const redirect = "https://iproov.com" + c.req.path;
        const target = await fetch(redirect);
        if (target.body) await stream.pipe(target.body);
    });
});

app.showRoutes();

const PORT = Number(Deno.env.get("PORT")) || 9000;

Deno.serve({
    port: PORT,
    handler: app.fetch,
    onListen: (c) => console.log(`listening on http://${c.hostname}:${c.port}`),
});
