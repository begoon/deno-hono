import { contentType } from "https://deno.land/std@0.210.0/media_types/mod.ts";
import {
    extname,
    join,
    resolve,
} from "https://deno.land/std@0.210.0/path/mod.ts";
import { swaggerUI } from "npm:@hono/swagger-ui@0.2.0";
import { OpenAPIHono, createRoute, z } from "npm:@hono/zod-openapi@0.9.5";
import { serveStatic } from "npm:hono@3.11.11/deno";
import { HTTPException } from "npm:hono@3.11.11/http-exception";
import { logger } from "npm:hono@3.11.11/logger";
import nunjucks from "npm:nunjucks@3.2.4";
import { RouteConfig } from "npm:zod-to-openapi/5.5.0";

const version = JSON.parse(Deno.readTextFileSync("./deno.json")).version;
const tag = Deno.env.get("TAG") || "dev";

const app = new OpenAPIHono({ strict: false });

// @ts-ignore deno-ts(2769)
app.use("*", logger());

app.openapi(
    createRoute({
        method: "get",
        path: "/user/{id}",
        request: {
            params: z.object({
                id: z
                    .string()
                    .min(3)
                    .openapi({
                        param: { name: "id", in: "path" },
                        example: "123456",
                    }),
            }),
        },
        responses: {
            200: {
                content: {
                    "application/json": {
                        schema: z
                            .object({
                                id: z.string().openapi({ example: "123" }),
                                name: z
                                    .string()
                                    .openapi({ example: "John Doe" }),
                                age: z.number().openapi({ example: 42 }),
                            })
                            .openapi("User"),
                    },
                },
                description: "Retrieve the user",
            },
        },
    }),
    (c) => {
        const { id } = c.req.valid("param");
        return c.json({ id, age: 20, name: "ultra-man" });
    }
);

app.openapi(
    createRoute({
        method: "boom" as RouteConfig.method,
        path: "/boom/{id}",
        request: {
            params: z.object({
                id: z
                    .string()
                    .min(3)
                    .openapi({
                        param: { name: "id", in: "path" },
                        example: "123456",
                    }),
            }),
            query: z.object({
                name: z.string().openapi({
                    param: { name: "name", in: "query" },
                    example: "John Doe",
                }),
            }),
        },
        responses: {
            200: {
                content: {
                    "application/json": {
                        schema: z
                            .object({
                                message: z
                                    .string()
                                    .openapi({ example: "BOOM" }),
                                id: z.string().openapi({ example: "123" }),
                                name: z
                                    .string()
                                    .openapi({ example: "John Doe" }),
                            })
                            .openapi("Boom"),
                    },
                },
                description: "Retrieve the boom",
            },
        },
    }),
    (c) => {
        console.log("BOOM", c.req.path);
        const { id } = c.req.valid("param");
        const { name } = c.req.valid("query");
        return c.json({ message: "BOOM", id, name });
    }
);

app.doc("/openapi.json", {
    openapi: "3.0.0",
    info: { version, title: "Deno/Hono/Zod API" },
});

// @ts-ignore deno-ts(2769)
app.use("/favicon.ico", serveStatic({ path: "./favicon.ico" }));

const template = nunjucks.compile(`
<html>
<head>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="p-2">
<div class="fixed top-0 right-0 p-2">{{ version }} | {{ tag }}</div>
<table class="border-collapse">
{% if parent %}
<tr>
<td colspan="6"><a href="{{ parent }}">..</a></td>
</tr>
{% endif %}
{% for file in files %}
<tr>
<td class="px-1">{{ file.icon }}</td>
<td class="px-1"><a href="{{ file.href }}" class="underline">{{ file.name }}</a></td>
<td class="px-1">{{ file.stat.size }}</td>
<td class="px-1">{{ file.type }}</td>
<td class="px-1">{{ file.stat.date }}</td>
<td class="px-1">{{ file.stat.time }}</td>
</tr>
{% endfor %}
</table>
</body>
`);

function directory(path: string) {
    const root = path === "/";
    const dir = Deno.readDirSync(path);
    const files = [];
    for (const file of dir) {
        let stat: Deno.FileInfo & { date?: string; time?: string };
        try {
            stat = Deno.statSync(resolve(join(path, file.name)));
            stat.date = stat.mtime?.toLocaleDateString();
            stat.time = stat.mtime?.toLocaleTimeString();
        } catch (_e: unknown) {
            stat = {} as Deno.FileInfo;
        }
        const href = resolve(join(FS, path, file.name));
        const icon = file.isDirectory ? "📁" : "📄";
        const type = (
            contentType(extname(file.name)) || "application/octet-stream"
        ).split("; ")[0];
        files.push({ ...file, href, stat, icon, type });
    }
    const parent = !root ? resolve(join(FS, path, "..")) : "";
    return template.render({ files, path, parent, version, tag });
}

function file(path: string) {
    const type = (
        contentType(extname(path)) || "application/octet-stream"
    ).split("; ")[0];
    return { type, content: Deno.readFileSync(path) };
}

const FS = "/fs";

app.get(FS + "/*", (c) => {
    const path_ = decodeURI(c.req.path);
    const path = resolve(join("/", path_.slice(FS.length), "/"));
    const stat = Deno.statSync(path);
    if (stat.isDirectory) return c.html(directory(path));
    else {
        const { content, type } = file(path);
        return new Response(content, { headers: { "content-type": type } });
    }
});

// @ts-ignore deno-ts(2769)
app.get("/swagger", swaggerUI({ url: "/openapi.json" }));
app.get("/ui", (c) => c.redirect("/swagger"));

app.on("FATAL", "/", (c) => {
    console.log("FATAL", c.req.path);
    return c.text("FATAL");
});

app.get("/exception", (_c) => {
    throw new Error("Boom!");
});

app.get("/error", (_c) => {
    throw new HTTPException(410, { message: "ERROR!" });
});

app.get("/env", (c) => {
    return c.json(Deno.env.toObject());
});

app.onError((err, c) => {
    if (err instanceof HTTPException) {
        return c.text(err.cause as string, err.status);
    }
    console.error(`${err}`);
    return c.text("custom error message", 418);
});

app.get("/*", (c) => {
    const redirect = "https://iproov.com" + c.req.path;
    console.log("redirecting to", redirect);
    return fetch(redirect);
});

const PORT = Number(Deno.env.get("PORT")) || 9000;

Deno.serve({
    port: PORT,
    handler: app.fetch,
    onListen: (c) => console.log(`listening on http://${c.hostname}:${c.port}`),
});
