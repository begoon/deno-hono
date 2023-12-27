#!/usr/bin/env -S deno run -A --unstable
import { spawnSync } from "node:child_process";
import * as process from "node:process";
import { Command } from "npm:commander@11.1.0";

import chalk from "npm:chalk@5.3.0";
import yesno from "npm:yesno@0.4.0";

const { red, green, yellow, blue, magenta, cyan, white, gray } = chalk.bold;

const program = new Command();

program
    .name("GCP tool for Cloud Run and Artifact Registry")
    .version("0.1.0")
    .option("-v, --verbose", "verbose output");

program
    .command("last-tags")
    .description("display the last few tags of a docker image")
    .argument("image", "docker image")
    .action((image) => console.log(lastTags(image)));

program
    .command("describe")
    .description("describe a service")
    .argument("service", "service name")
    .requiredOption("-p, --project <string>", "project name")
    .requiredOption("-r, --region <string>", "region name")
    .action((service, options) => console.log(describe(service, options)));

program
    .command("deploy")
    .description("deploy a service")
    .argument("service", "service name")
    .argument("image", "docker image")
    .option("-t, --tag <string>", "tag")
    .requiredOption("-p, --project <string>", "project name")
    .requiredOption("-r, --region <string>", "region name")
    .action(async (service, image, options) => {
        await deploy(service, image, options);
        console.info("done");
    });

await program.parseAsync();
console.info("done!!!");

function trace(...args: unknown[]) {
    console.log(gray(...args));
}

type Image = {
    createTime: string;
    package: string;
    tags: string;
    updateTime: string;
    version: string;
};

function gcloud<T>(args: string): T {
    const cmd = "gcloud";
    trace(cmd, args);
    const { status, stdout, stderr } = spawnSync(cmd, args.split(" "), {
        stdio: ["ignore", "pipe", "pipe"],
        encoding: "utf-8",
    });
    if (status !== 0) console.error("error:", stderr), process.exit(1);
    try {
        return JSON.parse(stdout);
    } catch (e) {
        console.error(red("error:"), e, stdout);
        process.exit(1);
    }
}

function lastTags(image: string): string[] {
    const args =
        `artifacts docker images list ${image}` +
        ` --include-tags --sort-by ~UPDATE_TIME --limit 3 --format=json`;
    const images = gcloud<Image[]>(args);
    return images
        .map((image: Image) => image.tags.split(", "))
        .flat()
        .filter((tag) => tag !== "latest");
}

type Service = {
    status: {
        url: string;
        traffic: { revisionName: string }[];
        latestCreatedRevisionName: string;
        latestReadyRevisionName: string;
    };
    spec: { template: { spec: { containers: { image: string }[] } } };
};

type RunningService = {
    url: string;
    image: string;
    revision: string;
};

function runningService(service: Service): RunningService {
    return {
        url: service.status.url,
        image: service.spec.template.spec.containers[0].image,
        revision: service.status.traffic[0].revisionName,
    };
}

type Options = {
    tag?: string;
    project: string;
    region: string;
};

function describe(service: string, options: Options): RunningService {
    const { project, region } = options;
    const args =
        `run services describe ${service}` +
        ` --project ${project} --region=${region} --format=json`;

    const result = gcloud<Service>(args);
    return runningService(result);
}

async function deploy(service: string, image: string, options: Options) {
    if (image.includes(":")) {
        console.error(red("error:"), "image should not include a tag");
        process.exit(1);
    }
    const tags = lastTags(image);
    console.log(blue("last tags"), "[");
    tags.forEach((tag, i) => console.log("  ", i == 0 ? white(tag) : tag));
    console.log("]");

    const { tag, project, region } = options;
    const running = describe(service, options);
    console.log(cyan("running"), "{");
    const [runningImage, runningTag] = running.image.split(":");
    console.log("  image:", runningImage + ":" + white(runningTag));
    console.log("  url:", running.url);
    console.log("  revision", running.revision);
    console.log("}");

    const tag_ = tag ?? tags[0];
    console.info(`service`, yellow(service));
    console.info(`image`, yellow(image));
    console.info(`tag`, white(tag_));
    console.info(`project`, gray(project));
    console.info(`region`, gray(region));

    if (!tags.includes(tag_)) {
        console.error(red(`error:`), `tag`, yellow(tag_), `is not available`);
        process.exit(1);
    }

    if (runningTag === tag_) {
        console.warn(
            magenta(`warning:`),
            `running image tag`,
            yellow(tag_),
            `is the same as the tag to deploy`
        );
        const ask = { question: `continue (y/N)?`, defaultValue: false };
        if (!(await yesno(ask))) {
            console.info(red("aborted"));
            process.exit(1);
        }
    }

    const ask = {
        question: `deploy ${white(tag_)} (y/N)?`,
        defaultValue: false,
    };
    if (await yesno(ask)) {
        const args =
            `run deploy ${service} --format=json` +
            ` --project ${project} --region=${region}` +
            ` --image ${image}:${tag_}` +
            ` --update-env-vars TAG=${tag_}` +
            ` --allow-unauthenticated`;
        const deployed = gcloud<Service>(args);
        const running = runningService(deployed);
        console.log("running {");
        const [runningImage, runningTag] = running.image.split(":");
        console.log("  image:", runningImage + ":" + white(runningTag));
        console.log("  url:", running.url);
        console.log("  revision:", running.revision);
        console.log("}");
        process.exit(0);
    }
}
