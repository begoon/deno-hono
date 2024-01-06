import { contentType } from 'std/media_types/content_type.ts';

import fs from 'node:fs';
import { extname, join, resolve } from 'node:path';
import process from 'node:process';

import { swaggerUI } from '@hono/swagger-ui';
import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';

import type { RouteConfig } from 'npm:zod-to-openapi/index.ts';

import { serveStatic } from 'hono/deno';
import { showRoutes } from 'hono/dev';
import { HTTPException } from 'hono/http-exception';
import type { FC } from 'hono/jsx';
import { renderToReadableStream, Suspense } from 'hono/jsx/streaming';
import { logger } from 'hono/logger';
import { streamSSE } from 'hono/streaming';

const version = JSON.parse(fs.readFileSync('./deno.json').toString()).version;
const tag = process.env.TAG || 'dev';

const app = new OpenAPIHono({ strict: false });

app.doc('/openapi.json', {
    openapi: '3.0.0',
    info: { version, title: 'Deno/Hono/TSX/Zod API' },
});

// @ts-ignore deno-ts(2769)
app.use('/favicon.ico', serveStatic({ path: './favicon.ico' }));
app.use('/stream.js', serveStatic({ path: './stream.js' }));

// @ts-ignore deno-ts(2769)
app.use('*', logger());

app.onError((err, c) => {
    if (err instanceof HTTPException) {
        return c.text(err.cause as string, err.status);
    }
    console.error(`${err}`);
    return c.text('custom error message', 418);
});

app.openapi(
    createRoute({
        method: 'get' as RouteConfig.method,
        path: '/user/{id}',
        request: {
            params: z.object({
                id: z
                    .string()
                    .min(3)
                    .openapi({
                        param: { name: 'id', in: 'path' },
                        example: '123456',
                    }),
            }),
        },
        responses: {
            200: {
                content: {
                    'application/json': {
                        schema: z
                            .object({
                                id: z.string().openapi({ example: '123' }),
                                name: z
                                    .string()
                                    .openapi({ example: 'John Doe' }),
                                age: z.number().openapi({ example: 42 }),
                            })
                            .openapi('User'),
                    },
                },
                description: 'Retrieve the user',
            },
        },
    }),
    (c) => {
        const { id } = c.req.valid('param');
        return c.json({ id, age: 20, name: 'ultra-man' });
    },
);

app.openapi(
    createRoute({
        method: 'boom' as RouteConfig.method,
        path: '/boom/{id}',
        request: {
            params: z.object({
                id: z
                    .string()
                    .min(3)
                    .openapi({
                        param: { name: 'id', in: 'path' },
                        example: '123456',
                    }),
            }),
            query: z.object({
                name: z.string().openapi({
                    param: { name: 'name', in: 'query' },
                    example: 'John Doe',
                }),
            }),
        },
        responses: {
            200: {
                content: {
                    'application/json': {
                        schema: z
                            .object({
                                message: z
                                    .string()
                                    .openapi({ example: 'BOOM' }),
                                id: z.string().openapi({ example: '123' }),
                                name: z
                                    .string()
                                    .openapi({ example: 'John Doe' }),
                            })
                            .openapi('Boom'),
                    },
                },
                description: 'Retrieve the boom',
            },
        },
    }),
    (c) => {
        console.log('BOOM', c.req.path);
        const { id } = c.req.valid('param');
        const { name } = c.req.valid('query');
        return c.json({ message: 'BOOM', id, name });
    },
);

const Version: FC = () => {
    return (
        <div class='fixed top-0 right-0 p-2'>
            {version} | {tag}
        </div>
    );
};

const Layout: FC = (props) => {
    return (
        <html>
            <head>
                <meta charset='UTF-8' />
                <meta
                    name='viewport'
                    content='width=device-width, initial-scale=1.0'
                />
                <script src='https://cdn.tailwindcss.com'></script>
            </head>
            <body class='p-2'>
                {props.children}
            </body>
        </html>
    );
};

const File = (props: { entry: Entry }) => {
    const { entry } = props;
    const { name, href, stat, icon, type } = entry;
    return (
        <tr>
            <td class='px-1'>{icon}</td>
            <td class='px-1'>
                <a href={href} class='underline'>
                    {name}
                </a>
            </td>
            <td class='px-1'>{stat?.size}</td>
            <td class='px-1'>{type}</td>
            <td class='px-1'>{stat?.date}</td>
            <td class='px-1'>{stat?.time}</td>
        </tr>
    );
};

const Parent = (props: { parent: string }) => {
    return (
        <tr>
            <td colspan={6}>
                <a href={props.parent}>..</a>
            </td>
        </tr>
    );
};

const Directory: FC<{ parent: string; files: Entry[] }> = (props) => {
    return (
        <Layout>
            <table class='border-collapse'>
                {props.parent && <Parent parent={props.parent} />}
                {props.files.map((file) => <File entry={file} />)}
            </table>
            <Version />
        </Layout>
    );
};

type Entry = {
    name: string;
    href: string;
    stat?: fs.Stats & { date?: string; time?: string };
    icon: string;
    type: string;
};

function file_type(name: string) {
    const default_ = 'application/octet-stream';
    return (contentType(extname(name)) || default_).split('; ')[0];
}

function directory(path: string) {
    const root = path === '/';
    const dir = fs.readdirSync(path);
    const files: Entry[] = [];
    for (const name of dir) {
        let stat: fs.Stats & { date?: string; time?: string } | undefined;
        try {
            stat = fs.statSync(resolve(join(path, name)));
            stat.date = stat.mtime?.toLocaleDateString();
            stat.time = stat.mtime?.toLocaleTimeString();
        } catch (_e: unknown) {
            stat = undefined;
        }
        const href = resolve(join(FS, path, name));
        const icon = stat?.isDirectory() ? '📁' : '📄';
        const type = file_type(name);
        files.push({ name, href, stat, icon, type });
    }
    const parent = !root ? resolve(join(FS, path, '..')) : '';
    return Directory({ parent, files });
}

function file(path: string) {
    return { type: file_type(path), content: fs.readFileSync(path).toString() };
}

const FS = '/fs';

app.get(FS + '/*', (c) => {
    const path_ = decodeURI(c.req.path);
    const path = resolve(join('/', path_.slice(FS.length), '/'));
    const stat = fs.statSync(path);
    if (stat.isDirectory()) return c.html(directory(path));
    else {
        const { content, type } = file(path);
        return new Response(content, { headers: { 'content-type': type } });
    }
});

// @ts-ignore deno-ts(2769)
app.get('/swagger', swaggerUI({ url: '/openapi.json' }));

const Loading = async () => {
    await new Promise((r) => setTimeout(r, 2000));
    return <div>loaded</div>;
};

let id = 0;
app.get('/sse', (c) => {
    return streamSSE(c, async (stream) => {
        while (true) {
            const message = `It is ${new Date().toISOString()}`;
            await stream.writeSSE({
                data: message,
                event: 'time-update',
                id: String(id++),
            });
            await stream.sleep(1000);
        }
    });
});

const Messages = () => {
    return (
        <html>
            <body>
                <div id='messages'></div>
                <script src='stream.js'></script>
            </body>
        </html>
    );
};

app.get('/messages', (c) => {
    return c.html(Messages());
});

app.openapi(
    createRoute({
        method: 'get' as RouteConfig.method,
        path: '/streaming',
        description: `
            curl -v -X GET 'http://localhost:9000/streaming' -H 'accept: */*'`,
        responses: {
            200: {
                description: 'Streaming response',
            },
        },
    }),
    (c) => {
        return c.streamText(async (stream) => {
            await stream.writeln(`started`);
            for (let i = 0; i < 10; i++) {
                await new Promise((r) => setTimeout(r, 1000));
                await stream.writeln(`${i}`);
            }
            await stream.writeln('done');
        });
    },
);

app.get('/loading', (c) => {
    const stream = renderToReadableStream(
        <html>
            <body>
                <Suspense fallback={<div>loading...</div>}>
                    <Loading />
                </Suspense>
            </body>
        </html>,
    );
    return c.body(stream, {
        headers: {
            'Content-Type': 'text/html; charset=UTF-8',
            'Transfer-Encoding': 'chunked',
        },
    });
});

app.on('FATAL', '/', (c) => {
    console.log('FATAL', c.req.path);
    return c.text('FATAL');
});

app.get('/exception', (_c) => {
    throw new Error('Boom!');
});

app.get('/error', (_c) => {
    throw new HTTPException(410, { message: 'ERROR!' });
});

app.openapi(
    createRoute({
        method: 'get', // as RouteConfig.method,
        path: '/env',
        responses: {
            200: {
                description: 'Environment variables',
                content: {
                    'application/json': {
                        schema: z
                            .object({})
                            .openapi('Variable'),
                    },
                },
            },
        },
    }),
    (c) => c.json(process.env),
);

app.get('/*', (c) => {
    const redirect = 'https://iproov.com' + c.req.path;
    console.log('redirecting to', redirect);
    return fetch(redirect);
});

const PORT = Number(process.env.PORT) || 9000;

showRoutes(app, { colorize: !Deno.env.get('K_SERVICE') });

Deno.serve({
    port: PORT,
    handler: app.fetch,
    onListen: (c) => console.log(`listening on http://${c.hostname}:${c.port}`),
});
